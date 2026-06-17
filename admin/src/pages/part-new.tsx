import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Search, X } from 'lucide-react'
import { useParts } from '@/lib/parts-context'
import { generatePartCode } from '@/lib/part-code'
import { useProducts } from '@/lib/products-context'
import { inputCls } from '@/lib/utils'
import type { Part, Product } from '@/lib/types'

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

const DEFAULT_PART_NAMES = ['힌지 (좌)', '힌지 (우)', '노즈패드', '렌즈 (클리어)', '렌즈 (그레이)', '힌지 세트', '템플 (좌)', '템플 (우)', '나사 세트']
const DEFAULT_COLORS = ['Black', 'Clear', 'Silver', 'Gray', 'Gold']

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'ko'))
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-gray-600 mb-1.5">
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  )
}

function ProductSearchCombo({
  products,
  value,
  onChange,
  disabled,
}: {
  products: Product[]
  value: string
  onChange: (productCode: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = products.find(product => product.productCode === value)

  const filtered = searchedQuery.trim()
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchedQuery.toLowerCase()) ||
        product.productCode.toLowerCase().includes(searchedQuery.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchedQuery.toLowerCase())
      )
    : []

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function handleScroll(event: Event) {
      if (dropdownRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (disabled) return
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClear(event: React.MouseEvent) {
    event.stopPropagation()
    onChange('')
  }

  return (
    <div>
      <FieldLabel text="연결 제품" required />
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`${inputCls} flex w-full items-center justify-between gap-2 pl-3 pr-2.5 text-left ${
            disabled ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'
          } ${open ? 'border-gray-400' : ''}`}
        >
          <span className={selected ? 'truncate text-gray-900' : 'text-gray-300'}>
            {selected ? `${selected.productCode} / ${selected.name}` : '제품 검색'}
          </span>
          <span className="flex items-center gap-1">
            {selected && !disabled && (
              <span onClick={handleClear} className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {open && dropdownRect && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]"
            style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}
          >
            <div className="border-b border-gray-100 p-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && setSearchedQuery(query)}
                    placeholder="제품명, 코드, 바코드 입력"
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); setSearchedQuery('') }} className="text-gray-300 hover:text-gray-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSearchedQuery(query)}
                  className="flex-shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                >
                  검색
                </button>
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {!searchedQuery.trim()
                ? <li className="px-3 py-4 text-center text-xs text-gray-400">제품명 또는 코드를 입력 후 검색해주세요</li>
                : filtered.length === 0
                  ? <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
                  : filtered.map(product => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(product.productCode)
                          setOpen(false)
                          setQuery('')
                          setSearchedQuery('')
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                          product.productCode === value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {product.name}
                        <span className="ml-2 font-mono text-[11px] text-gray-400">{product.productCode}</span>
                      </button>
                    </li>
                  ))
              }
            </ul>
          </div>,
          document.body
        )}
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

  const nextPartCode = useMemo(
    () => generatePartCode(parts.map(part => part.partCode)),
    [parts]
  )

  const [form, setForm] = useState<Form>(init)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const partNameOptions = useMemo(
    () => uniqueOptions([...DEFAULT_PART_NAMES, ...parts.map(part => part.name), form.name]),
    [parts, form.name]
  )
  const colorOptions = useMemo(
    () => uniqueOptions([...DEFAULT_COLORS, ...parts.map(part => part.color), form.color]),
    [parts, form.color]
  )

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
          <div>
            <ProductSearchCombo products={products} value={form.productCode} onChange={set('productCode')} disabled={isEdit} />
            {errors.productCode && <p className="text-[11px] text-red-400 mt-1">{errors.productCode}</p>}
          </div>
          <div>
            <FieldLabel text="부속품명" required />
            <select
              value={form.name}
              disabled={isEdit}
              onChange={e => set('name')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'} ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
            >
              <option value="">부속품명 선택</option>
              {partNameOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
            <select
              value={form.color}
              disabled={isEdit}
              onChange={e => set('color')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'} ${errors.color ? 'border-red-300 focus:border-red-400' : ''}`}
            >
              <option value="">컬러 선택</option>
              {colorOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
