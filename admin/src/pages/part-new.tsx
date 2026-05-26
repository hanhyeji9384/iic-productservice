import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import { inputCls } from '@/lib/utils'
import type { PartCategory } from '@/lib/types'

const CATEGORIES: PartCategory[] = ['렌즈', '힌지', '노즈패드', '나사', '템플', '기타']

type Form = {
  productCode: string
  name: string
  category: PartCategory
  quantity: string
  status: 'active' | 'inactive'
  note: string
}

const init: Form = {
  productCode: '',
  name: '',
  category: '기타',
  quantity: '',
  status: 'active',
  note: '',
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

export function PartNewPage() {
  const navigate = useNavigate()
  const { langCode, id } = useParams()
  const pfx = `/${langCode}`
  const { parts, addPart, updatePart } = useParts()
  const { products } = useProducts()

  const isEdit = !!id
  const existing = isEdit ? parts.find(p => p.id === id) : null

  const nextPartCode = useMemo(() => {
    const nums = parts
      .map(p => p.partCode.match(/^PT-(\d+)$/)?.[1])
      .filter(Boolean)
      .map(n => parseInt(n!, 10))
    const max = nums.length > 0 ? Math.max(...nums) : 0
    return `PT-${String(max + 1).padStart(5, '0')}`
  }, [parts])

  const [form, setForm] = useState<Form>(init)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        productCode: existing.productCode,
        name: existing.name,
        category: existing.category,
        quantity: String(existing.quantity),
        status: existing.status,
        note: existing.note,
      })
    }
  }, [])

  const set = (key: keyof Form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  function validate(): boolean {
    const errs: Partial<Record<keyof Form, string>> = {}
    if (!form.productCode) errs.productCode = '연결 제품을 선택하세요.'
    if (!form.name.trim()) errs.name = '필수 입력입니다.'
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      errs.quantity = '0 이상의 숫자를 입력하세요.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      id: isEdit ? existing!.id : `PT${Date.now()}`,
      productCode: form.productCode,
      partCode: isEdit ? existing!.partCode : nextPartCode,
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity),
      status: form.status,
      note: form.note.trim(),
      registeredBy: isEdit ? existing!.registeredBy : 'monster001',
      registeredAt: isEdit ? existing!.registeredAt : new Date().toISOString().slice(0, 19),
    }
    if (isEdit) updatePart(payload)
    else addPart(payload)
    navigate(`${pfx}/parts`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* 상단 네비 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`${pfx}/parts`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          부품 목록
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`${pfx}/parts`)}
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
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '부품 수정' : '부품 등록'}</h1>
        <p className="text-sm text-gray-500 mt-1">{isEdit ? '부품 정보를 수정하세요.' : '새 부품 정보를 입력하세요.'}</p>
      </div>

      {/* 기본 정보 */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="부품코드" />
            <input
              type="text"
              value={isEdit ? (existing?.partCode ?? '') : nextPartCode}
              readOnly
              className={`${inputCls} w-full bg-gray-50 text-gray-500 cursor-default select-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1">자동 부여됩니다.</p>
          </div>
          <div>
            <FieldLabel text="부품명" required />
            <input
              type="text"
              placeholder="예: 힌지 (좌)"
              value={form.name}
              onChange={e => { set('name')(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              className={`${inputCls} w-full ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>
          <SelectField label="분류" required value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </SelectField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="연결 제품" required />
            <div className="relative">
              <select
                value={form.productCode}
                onChange={e => { set('productCode')(e.target.value); setErrors(p => ({ ...p, productCode: '' })) }}
                className={`${inputCls} w-full appearance-none pl-3 pr-8 cursor-pointer ${errors.productCode ? 'border-red-300 focus:border-red-400' : ''}`}
              >
                <option value="">제품 선택</option>
                {products.map(p => (
                  <option key={p.id} value={p.productCode}>{p.productCode} — {p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {errors.productCode && <p className="text-[11px] text-red-400 mt-1">{errors.productCode}</p>}
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
          <SelectField label="상태" value={form.status} onChange={set('status')}>
            <option value="active">사용</option>
            <option value="inactive">미사용</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel text="비고" />
          <input
            type="text"
            placeholder="추가 정보 (선택)"
            value={form.note}
            onChange={e => set('note')(e.target.value)}
            className={`${inputCls} w-full`}
          />
        </div>
      </section>

    </div>
  )
}
