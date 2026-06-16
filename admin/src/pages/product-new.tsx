import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useProducts } from '@/lib/products-context'
import { inputCls } from '@/lib/utils'

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
  stockLocation: string
  isSafetyStock: boolean
  quantity: string
  threePlQuantity: string
  hasDecoration: boolean
  isRestorationRepair: boolean
}

const init: Form = {
  productCode: '', barcode: '', name: '',
  brandCategory: BRANDS[0], midCategory: '', subCategory: '',
  factory1: '', factory2: '', factory3: '',
  releaseDate: '', partsRetentionPeriod: '',
  stockLocation: '', isSafetyStock: false,
  quantity: '', threePlQuantity: '0', hasDecoration: false,
  isRestorationRepair: false,
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
        stockLocation: existing.stockLocation,
        isSafetyStock: existing.isSafetyStock,
        quantity: String(existing.psQuantity ?? existing.quantity),
        threePlQuantity: String(existing.threePlQuantity ?? 0),
        hasDecoration: existing.hasDecoration ?? false,
        isRestorationRepair: existing.isRestorationRepair ?? false,
      })
    } else {
      setForm(prev => ({ ...prev, productCode: nextPsCode }))
    }
  }, [])

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
    if (!form.name.trim()) errs.name = '필수 입력입니다.'
    if (!form.midCategory) errs.midCategory = '중분류를 선택하세요.'
    if (!form.subCategory) errs.subCategory = '소분류를 선택하세요.'
    if (!form.factory1) errs.factory1 = '생산공장1을 선택하세요.'
    if (!form.releaseDate) errs.releaseDate = '출시일을 입력하세요.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const psQuantity = isEdit ? (existing!.psQuantity ?? existing!.quantity) : Number(form.quantity || 0)
    const threePlQuantity = isEdit ? (existing!.threePlQuantity ?? 0) : Number(form.threePlQuantity || 0)
    const payload = {
      id: isEdit ? existing!.id : `P${Date.now()}`,
      productCode: form.productCode,
      barcode: isEdit ? existing!.barcode : form.productCode,
      name: form.name.trim(),
      brandCategory: form.brandCategory,
      midCategory: form.midCategory,
      subCategory: form.subCategory,
      factory1: form.factory1,
      factory2: form.factory2 || null,
      factory3: form.factory3 || null,
      releaseDate: form.releaseDate,
      partsRetentionPeriod: form.partsRetentionPeriod,
      salesStatus: isEdit ? existing!.salesStatus : '사용중',
      stockLocation: isEdit ? existing!.stockLocation : '',
      isSafetyStock: form.isSafetyStock,
      quantity: psQuantity,
      psQuantity,
      threePlQuantity,
      hasDecoration: form.hasDecoration,
      isRestorationRepair: form.isRestorationRepair,
      dataSource: 'PS' as const,
      registeredBy: isEdit ? existing!.registeredBy : 'monster001',
      registeredAt: isEdit ? existing!.registeredAt : new Date().toISOString().slice(0, 19),
    }
    if (isEdit) updateProduct(payload)
    else addProduct(payload)
    navigate(`${pfx}/product-management`)
  }

  const midOptions = MID_CATEGORIES[form.brandCategory] ?? []
  const subOptions = form.midCategory ? (SUB_CATEGORIES[form.midCategory] ?? []) : []

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* 상단 네비 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`${pfx}/product-management`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          제품 관리
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`${pfx}/product-management`)}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel text="제품 ID" required />
            <input
              type="text"
              value={form.productCode}
              readOnly
              className={`${inputCls} w-full bg-gray-50 text-gray-500 cursor-default select-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1">제품 ID는 자동 부여됩니다.</p>
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
        <h2 className="text-sm font-semibold text-gray-900">제품범주</h2>
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
          <div>
            <FieldLabel text="부품보유기한" />
            <input
              type="date"
              value={form.partsRetentionPeriod}
              onChange={e => set('partsRetentionPeriod')(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
      </section>

      {/* 관리 정보 */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">관리 정보</h2>
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
            <span className="text-sm text-gray-700">안전재고여부</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('isRestorationRepair')(!form.isRestorationRepair)}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                form.isRestorationRepair ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.isRestorationRepair ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
            <span className="text-sm text-gray-700">복원 가능 여부</span>
          </label>
        </div>
      </section>

    </div>
  )
}
