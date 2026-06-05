import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useProducts } from '@/lib/products-context'
import { inputCls } from '@/lib/utils'
import type { SalesStatus } from '@/lib/types'

const SALES_STATUSES: SalesStatus[] = ['사용중', '종료 예정', '판매 종료 (P)', '판매 종료 (C)']

function addYears(date: Date, years: number): string {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

const BRANDS = ['GENTLE MONSTER', 'TAMBURINS']

const MID_CATEGORIES: Record<string, string[]> = {
  'GENTLE MONSTER': ['SUNGLASS', 'OPTICAL', 'ACCESSORY'],
  'TAMBURINS':      ['SUNGLASS', 'OPTICAL'],
}

const SUB_CATEGORIES: Record<string, string[]> = {
  SUNGLASS:  ['SUNGLASS COMBI', 'SUNGLASS ACETATE', 'SUNGLASS METAL', 'SUNGLASS INJECTION'],
  OPTICAL:   ['OPTICAL COMBI', 'OPTICAL ACETATE', 'OPTICAL METAL'],
  ACCESSORY: ['CASE', 'CLEANING KIT'],
}

const FACTORIES = ['WZ-A1', 'WZ-B2', 'SZ-C3', 'SH-D4']

type Form = {
  productCode: string
  barcode: string
  name: string
  brandCategory: string
  midCategory: string
  subCategory: string
  factory1: string
  factory2: string
  factory3: string
  releaseDate: string
  partsRetentionPeriod: string
  salesStatus: SalesStatus
  stockLocation: string
  isSafetyStock: boolean
  quantity: string
  hasDecoration: boolean
  isRestorationRequest: boolean
}

const init: Form = {
  productCode: '', barcode: '', name: '',
  brandCategory: BRANDS[0], midCategory: '', subCategory: '',
  factory1: '', factory2: '', factory3: '',
  releaseDate: '', partsRetentionPeriod: '',
  salesStatus: '사용중',
  stockLocation: '', isSafetyStock: false,
  quantity: '', hasDecoration: false, isRestorationRequest: false,
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-gray-600 mb-1.5">
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  )
}

function SelectField({
  label, required, value, onChange, children, disabled,
}: {
  label: string; required?: boolean; value: string
  onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <div>
      <FieldLabel text={label} required={required} />
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`${inputCls} w-full appearance-none pl-3 pr-8 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

export function ProductNewPage() {
  const navigate = useNavigate()
  const { langCode, id } = useParams()
  const pfx = `/${langCode}`
  const { products, addProduct, updateProduct } = useProducts()

  const isEdit = !!id
  const existing = isEdit ? products.find(p => p.id === id) : null

  const nextPsCode = useMemo(() => {
    const codes = products
      .filter(p => p.dataSource === 'PS' && /^14\d{6}$/.test(p.productCode))
      .map(p => parseInt(p.productCode, 10))
    const max = codes.length > 0 ? Math.max(...codes) : 14000000
    return String(max + 1)
  }, [products])

  const [form, setForm] = useState<Form>(init)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        productCode: existing.productCode,
        barcode: existing.barcode,
        name: existing.name,
        brandCategory: existing.brandCategory,
        midCategory: existing.midCategory,
        subCategory: existing.subCategory,
        factory1: existing.factory1,
        factory2: existing.factory2 ?? '',
        factory3: existing.factory3 ?? '',
        releaseDate: existing.releaseDate,
        partsRetentionPeriod: existing.partsRetentionPeriod,
        salesStatus: existing.salesStatus,
        stockLocation: existing.stockLocation,
        isSafetyStock: existing.isSafetyStock,
        quantity: String(existing.quantity),
        hasDecoration: existing.hasDecoration ?? false,
        isRestorationRequest: existing.isRestorationRequest,
      })
    } else {
      setForm(prev => ({ ...prev, productCode: nextPsCode }))
    }
  }, [])

  function handleSalesStatusChange(status: SalesStatus) {
    setForm(prev => ({
      ...prev,
      salesStatus: status,
      partsRetentionPeriod: status === '종료 예정'
        ? (prev.partsRetentionPeriod || addYears(new Date(), 3))
        : prev.partsRetentionPeriod,
    }))
  }

  const set = (key: keyof Form) => (val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }))

  function handleBrandChange(brand: string) {
    setForm(prev => ({ ...prev, brandCategory: brand, midCategory: '', subCategory: '' }))
  }

  function handleMidChange(mid: string) {
    setForm(prev => ({ ...prev, midCategory: mid, subCategory: '' }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof Form, string>> = {}
    if (!form.barcode.trim()) errs.barcode = '필수 입력입니다.'
    if (!form.name.trim()) errs.name = '필수 입력입니다.'
    if (!form.midCategory) errs.midCategory = '중분류를 선택하세요.'
    if (!form.subCategory) errs.subCategory = '소분류를 선택하세요.'
    if (!form.factory1) errs.factory1 = '생산공장1을 선택하세요.'
    if (!form.releaseDate) errs.releaseDate = '출시일을 입력하세요.'
    if (!form.stockLocation.trim()) errs.stockLocation = '필수 입력입니다.'
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      errs.quantity = '0 이상의 숫자를 입력하세요.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      id: isEdit ? existing!.id : `P${Date.now()}`,
      productCode: form.productCode,
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      brandCategory: form.brandCategory,
      midCategory: form.midCategory,
      subCategory: form.subCategory,
      factory1: form.factory1,
      factory2: form.factory2 || null,
      factory3: form.factory3 || null,
      releaseDate: form.releaseDate,
      partsRetentionPeriod: form.partsRetentionPeriod,
      salesStatus: form.salesStatus,
      stockLocation: form.stockLocation.trim(),
      isSafetyStock: form.isSafetyStock,
      quantity: Number(form.quantity),
      hasDecoration: form.hasDecoration,
      isRestorationRequest: form.isRestorationRequest,
      dataSource: 'PS' as const,
      registeredBy: isEdit ? existing!.registeredBy : 'monster001',
      registeredAt: isEdit ? existing!.registeredAt : new Date().toISOString().slice(0, 19),
    }
    if (isEdit) updateProduct(payload)
    else addProduct(payload)
    navigate(`${pfx}/products`)
  }

  const midOptions = MID_CATEGORIES[form.brandCategory] ?? []
  const subOptions = form.midCategory ? (SUB_CATEGORIES[form.midCategory] ?? []) : []

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* 상단 네비 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`${pfx}/products`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          제품 목록
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`${pfx}/products`)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            저장
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '제품 수정' : '제품 추가'}</h1>
        <p className="text-sm text-gray-500 mt-1">{isEdit ? '제품 정보를 수정하세요.' : '새 제품 정보를 입력하세요.'}</p>
      </div>

      {/* 기본 정보 */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="제품코드" required />
            <input
              type="text"
              value={form.productCode}
              readOnly
              className={`${inputCls} w-full bg-gray-50 text-gray-500 cursor-default select-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1">PS 등록 제품코드는 자동 부여됩니다.</p>
          </div>
          <div>
            <FieldLabel text="바코드" required />
            <input
              type="text"
              placeholder="예: 8809639031001"
              value={form.barcode}
              onChange={e => { set('barcode')(e.target.value); setErrors(p => ({ ...p, barcode: '' })) }}
              className={`${inputCls} w-full ${errors.barcode ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.barcode && <p className="text-[11px] text-red-400 mt-1">{errors.barcode}</p>}
          </div>
          <div>
            <FieldLabel text="제품명" required />
            <input
              type="text"
              placeholder="예: HYPEOB-01"
              value={form.name}
              onChange={e => { set('name')(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              className={`${inputCls} w-full ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>
        </div>
      </section>

      {/* 분류 */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">분류</h2>
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="브랜드" required value={form.brandCategory} onChange={handleBrandChange}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </SelectField>
          <div>
            <SelectField
              label="중분류" required
              value={form.midCategory}
              onChange={handleMidChange}
              disabled={midOptions.length === 0}
            >
              <option value="">선택</option>
              {midOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </SelectField>
            {errors.midCategory && <p className="text-[11px] text-red-400 mt-1">{errors.midCategory}</p>}
          </div>
          <div>
            <SelectField
              label="소분류" required
              value={form.subCategory}
              onChange={v => { set('subCategory')(v); setErrors(p => ({ ...p, subCategory: '' })) }}
              disabled={subOptions.length === 0}
            >
              <option value="">선택</option>
              {subOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            {errors.subCategory && <p className="text-[11px] text-red-400 mt-1">{errors.subCategory}</p>}
          </div>
        </div>
      </section>

      {/* 생산 정보 */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">생산 정보</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <SelectField label="생산공장1" required value={form.factory1} onChange={v => { set('factory1')(v); setErrors(p => ({ ...p, factory1: '' })) }}>
              <option value="">선택</option>
              {FACTORIES.map(f => <option key={f} value={f}>{f}</option>)}
            </SelectField>
            {errors.factory1 && <p className="text-[11px] text-red-400 mt-1">{errors.factory1}</p>}
          </div>
          <SelectField label="생산공장2" value={form.factory2} onChange={set('factory2')}>
            <option value="">없음</option>
            {FACTORIES.map(f => <option key={f} value={f}>{f}</option>)}
          </SelectField>
          <SelectField label="생산공장3" value={form.factory3} onChange={set('factory3')}>
            <option value="">없음</option>
            {FACTORIES.map(f => <option key={f} value={f}>{f}</option>)}
          </SelectField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="출시일" required />
            <input
              type="date"
              value={form.releaseDate}
              onChange={e => { set('releaseDate')(e.target.value); setErrors(p => ({ ...p, releaseDate: '' })) }}
              className={`${inputCls} w-full ${errors.releaseDate ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.releaseDate && <p className="text-[11px] text-red-400 mt-1">{errors.releaseDate}</p>}
          </div>
          <SelectField label="판매 상태" required value={form.salesStatus} onChange={v => handleSalesStatusChange(v as SalesStatus)}>
            {SALES_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </SelectField>
          <div>
            <FieldLabel text="부품보유기간 만료일" />
            <input
              type="date"
              value={form.partsRetentionPeriod}
              onChange={e => set('partsRetentionPeriod')(e.target.value)}
              className={`${inputCls} w-full`}
            />
            <p className="text-[11px] text-gray-400 mt-1">종료 예정 시 자동으로 오늘 +3년이 설정됩니다.</p>
          </div>
        </div>
      </section>

      {/* 재고 정보 — 신규 등록 시에만 표시 */}
      {!isEdit && <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">재고 정보</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="재고보관위치" required />
            <input
              type="text"
              placeholder="예: A1-01"
              value={form.stockLocation}
              onChange={e => { set('stockLocation')(e.target.value); setErrors(p => ({ ...p, stockLocation: '' })) }}
              className={`${inputCls} w-full ${errors.stockLocation ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.stockLocation && <p className="text-[11px] text-red-400 mt-1">{errors.stockLocation}</p>}
          </div>
          <div>
            <FieldLabel text="수량" required />
            <input
              type="number"
              min={0}
              placeholder="0"
              value={form.quantity}
              onChange={e => { set('quantity')(e.target.value); setErrors(p => ({ ...p, quantity: '' })) }}
              className={`${inputCls} w-full ${errors.quantity ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.quantity && <p className="text-[11px] text-red-400 mt-1">{errors.quantity}</p>}
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('isSafetyStock')(!form.isSafetyStock)}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                form.isSafetyStock ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.isSafetyStock ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
            <span className="text-sm text-gray-700">안전재고</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('isRestorationRequest')(!form.isRestorationRequest)}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                form.isRestorationRequest ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.isRestorationRequest ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
            <span className="text-sm text-gray-700">복원의뢰</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('hasDecoration')(!form.hasDecoration)}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                form.hasDecoration ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.hasDecoration ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
            <span className="text-sm text-gray-700">장식보유</span>
          </label>
        </div>
      </section>}

    </div>
  )
}
