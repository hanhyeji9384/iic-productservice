import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import { inputCls } from '@/lib/utils'
import type { Part } from '@/lib/types'

type Form = {
  productCode: string
  name: string
  specification: string
  color: string
  storageLocation: string
}

const init: Form = {
  productCode: '',
  name: '',
  specification: '',
  color: '',
  storageLocation: '',
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
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <div>
      <FieldLabel text={label} required={required} />
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`${inputCls} w-full appearance-none pl-3 pr-8 ${disabled ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'}`}
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
  const existing = isEdit ? parts.find(part => part.id === id) : null

  const nextPartCode = useMemo(() => {
    const nums = parts
      .map(part => part.partCode.match(/^PT-(\d+)$/)?.[1])
      .filter(Boolean)
      .map(num => parseInt(num!, 10))
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
        specification: existing.specification,
        color: existing.color,
        storageLocation: existing.storageLocation,
      })
    }
  }, [isEdit, existing])

  const set = (key: keyof Form) => (val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const nextErrors: Partial<Record<keyof Form, string>> = {}
    if (!isEdit && !form.productCode) nextErrors.productCode = '연결 제품을 선택하세요.'
    if (!isEdit && !form.name.trim()) nextErrors.name = '필수 입력입니다.'
    if (!isEdit && !form.specification.trim()) nextErrors.specification = '필수 입력입니다.'
    if (!isEdit && !form.color.trim()) nextErrors.color = '필수 입력입니다.'
    if (!form.storageLocation.trim()) nextErrors.storageLocation = '필수 입력입니다.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const now = new Date().toISOString().slice(0, 19)
    const payload: Part = {
      id: isEdit ? existing!.id : `PT${Date.now()}`,
      productCode: isEdit ? existing!.productCode : form.productCode,
      partCode: isEdit ? existing!.partCode : nextPartCode,
      name: isEdit ? existing!.name : form.name.trim(),
      specification: isEdit ? existing!.specification : form.specification.trim(),
      color: isEdit ? existing!.color : form.color.trim(),
      storageLocation: form.storageLocation.trim(),
      registeredBy: isEdit ? existing!.registeredBy : 'monster001',
      registeredAt: isEdit ? existing!.registeredAt : now,
      updatedAt: isEdit ? now : undefined,
    }
    if (isEdit) updatePart(payload)
    else addPart(payload)
    navigate(`${pfx}/parts`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
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
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '부속품 수정' : '부속품 등록'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          제품 하위로 관리되는 부속품 정보를 입력하세요.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="부속품 ID" />
            <input
              type="text"
              value={isEdit ? (existing?.partCode ?? '') : nextPartCode}
              readOnly
              className={`${inputCls} w-full bg-gray-50 text-gray-500 cursor-default select-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1">PS에서 자동 생성됩니다.</p>
          </div>
          <SelectField label="연결 제품" required value={form.productCode} onChange={set('productCode')} disabled={isEdit}>
            <option value="">제품 선택</option>
            {products.map(product => (
              <option key={product.id} value={product.productCode}>
                {product.productCode} / {product.name}
              </option>
            ))}
          </SelectField>
          <div>
            <FieldLabel text="부속품명" required />
            <input
              type="text"
              placeholder="예: 힌지 (좌)"
              value={form.name}
              disabled={isEdit}
              onChange={e => set('name')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : ''} ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="규격" required />
            <input
              type="text"
              placeholder="예: HNG-L"
              value={form.specification}
              disabled={isEdit}
              onChange={e => set('specification')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : ''} ${errors.specification ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.specification && <p className="text-[11px] text-red-400 mt-1">{errors.specification}</p>}
          </div>
          <div>
            <FieldLabel text="컬러" required />
            <input
              type="text"
              placeholder="예: Black"
              value={form.color}
              disabled={isEdit}
              onChange={e => set('color')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : ''} ${errors.color ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.color && <p className="text-[11px] text-red-400 mt-1">{errors.color}</p>}
          </div>
          <div>
            <FieldLabel text="부속품 보관위치" required />
            <input
              type="text"
              placeholder="예: P-A1-01"
              value={form.storageLocation}
              onChange={e => set('storageLocation')(e.target.value)}
              className={`${inputCls} w-full ${errors.storageLocation ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.storageLocation && <p className="text-[11px] text-red-400 mt-1">{errors.storageLocation}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
