import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Search, X } from 'lucide-react'
import { useParts } from '@/lib/parts-context'
import { generatePartCode } from '@/lib/part-code'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'
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

const PART_NAME_KEYS: Record<string, string> = {
  '힌지 (좌)': 'parts.option.part_name.hinge_left',
  '힌지 (우)': 'parts.option.part_name.hinge_right',
  노즈패드: 'parts.option.part_name.nose_pad',
  '렌즈 (클리어)': 'parts.option.part_name.lens_clear',
  '렌즈 (그레이)': 'parts.option.part_name.lens_gray',
  '힌지 세트': 'parts.option.part_name.hinge_set',
  '템플 (좌)': 'parts.option.part_name.temple_left',
  '템플 (우)': 'parts.option.part_name.temple_right',
  '나사 세트': 'parts.option.part_name.screw_set',
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'ko'))
}

function colorKey(color: string) {
  return `common.color.${color.trim().toLowerCase()}`
}

function FieldLabel({ text, i18nKey, required }: { text: string; i18nKey?: string; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-gray-600 mb-1.5">
      {i18nKey ? <I18nText i18nKey={i18nKey} display="tooltip">{text}</I18nText> : text}
      {required && <span className="text-red-400 ml-0.5">*</span>}
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
  const i18nLabel = useI18nLabel()
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
      <FieldLabel text="연결 제품" i18nKey="parts.label.connected_product" required />
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
            {selected ? `${selected.productCode} / ${selected.name}` : i18nLabel('parts.placeholder.product_search', '제품 검색')}
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
                    placeholder={i18nLabel('parts.placeholder.product_search_input', '제품명, 코드, 바코드 입력')}
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
                  <I18nText i18nKey="common.button.search" display="tooltip">검색</I18nText>
                </button>
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {!searchedQuery.trim()
                ? <li className="px-3 py-4 text-center text-xs text-gray-400"><I18nText i18nKey="parts.empty.product_search_initial">제품명 또는 코드를 입력 후 검색해주세요.</I18nText></li>
                : filtered.length === 0
                  ? <li className="px-3 py-4 text-center text-xs text-gray-400"><I18nText i18nKey="common.empty.no_results">조회 결과가 없습니다.</I18nText></li>
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
  const i18nLabel = useI18nLabel()
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
  const [toast, setToast] = useState<{ title: string; message: string; titleKey: string; messageKey: string; tone: 'error' | 'success' } | null>(null)
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
    if (!isEdit && !form.productCode) nextErrors.productCode = i18nLabel('parts.error.product_required', '연결 제품을 선택하세요.')
    if (!isEdit && !form.name.trim()) nextErrors.name = i18nLabel('common.error.required', '필수 입력입니다.')
    if (!isEdit && !form.specification.trim()) nextErrors.specification = i18nLabel('common.error.required', '필수 입력입니다.')
    if (!isEdit && !form.color.trim()) nextErrors.color = i18nLabel('common.error.required', '필수 입력입니다.')
    if (!form.storageLocation.trim()) nextErrors.storageLocation = i18nLabel('common.error.required', '필수 입력입니다.')
    setErrors(nextErrors)
    const valid = Object.keys(nextErrors).length === 0
    if (!valid) {
      setToast({
        title: '저장 실패',
        message: '필수값을 입력해 주세요.',
        titleKey: 'common.toast.validation_failed.title',
        messageKey: 'parts.toast.required_missing',
        tone: 'error',
      })
    }
    return valid
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
    setToast({
      title: '저장 완료',
      message: '저장이 완료되었습니다.',
      titleKey: 'common.toast.saved.title',
      messageKey: 'common.toast.saved.description',
      tone: 'success',
    })
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
          <I18nText i18nKey="nav.master_management.parts" display="tooltip">부품 관리</I18nText>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`${pfx}/parts`)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <I18nText i18nKey="common.button.cancel" display="tooltip">취소</I18nText>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            <I18nText i18nKey="common.label.saved" display="tooltip">저장</I18nText>
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '부품 수정' : <I18nText i18nKey="parts.create.title" display="tooltip">부품 등록</I18nText>}</h1>
        <p className="text-sm text-gray-500 mt-1">
          <I18nText i18nKey="parts.create.description">제품 하위로 관리되는 부품 정보를 입력하세요.</I18nText>
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900"><I18nText i18nKey="parts.section.basic" display="tooltip">기본 정보</I18nText></h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="부품 ID" i18nKey="parts.label.part_code" />
            <input
              type="text"
              value={isEdit ? (existing?.partCode ?? '') : nextPartCode}
              readOnly
              className={`${inputCls} w-full bg-gray-50 text-gray-500 cursor-default select-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1"><I18nText i18nKey="parts.create.auto_code_hint">영문 포함 8자리로 자동 생성됩니다.</I18nText></p>
          </div>
          <div>
            <ProductSearchCombo products={products} value={form.productCode} onChange={set('productCode')} disabled={isEdit} />
            {errors.productCode && <p className="text-[11px] text-red-400 mt-1">{errors.productCode}</p>}
          </div>
          <div>
            <FieldLabel text="부품명" i18nKey="parts.label.part_name" required />
            <select
              value={form.name}
              disabled={isEdit}
              onChange={e => set('name')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'} ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
            >
              <option value="">{i18nLabel('parts.placeholder.part_name_select', '부품명 선택')}</option>
              {partNameOptions.map(option => (
                <option key={option} value={option}>{i18nLabel(PART_NAME_KEYS[option] ?? `parts.option.part_name.${option}`, option)}</option>
              ))}
            </select>
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel text="규격" i18nKey="parts.label.specification" required />
            <input
              type="text"
              placeholder={i18nLabel('parts.placeholder.specification', '예: HNG-L')}
              value={form.specification}
              disabled={isEdit}
              onChange={e => set('specification')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : ''} ${errors.specification ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.specification && <p className="text-[11px] text-red-400 mt-1">{errors.specification}</p>}
          </div>
          <div>
            <FieldLabel text="컬러" i18nKey="common.label.color" required />
            <select
              value={form.color}
              disabled={isEdit}
              onChange={e => set('color')(e.target.value)}
              className={`${inputCls} w-full ${isEdit ? 'bg-gray-50 text-gray-500 cursor-default' : 'cursor-pointer'} ${errors.color ? 'border-red-300 focus:border-red-400' : ''}`}
            >
              <option value="">{i18nLabel('parts.placeholder.color_select', '컬러 선택')}</option>
              {colorOptions.map(option => (
                <option key={option} value={option}>{i18nLabel(colorKey(option), option)}</option>
              ))}
            </select>
            {errors.color && <p className="text-[11px] text-red-400 mt-1">{errors.color}</p>}
          </div>
          <div>
            <FieldLabel text="부품 보관위치" i18nKey="parts.label.storage_location" required />
            <input
              type="text"
              placeholder={i18nLabel('parts.placeholder.storage_location', '예: P-A1-01')}
              value={form.storageLocation}
              onChange={e => set('storageLocation')(e.target.value)}
              className={`${inputCls} w-full ${errors.storageLocation ? 'border-red-300 focus:border-red-400' : ''}`}
            />
            {errors.storageLocation && <p className="text-[11px] text-red-400 mt-1">{errors.storageLocation}</p>}
          </div>
        </div>
      </section>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[10000] w-[min(360px,calc(100vw-48px))] rounded-xl px-4 py-3 text-white shadow-lg ${toast.tone === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <p className="text-sm font-semibold"><I18nText i18nKey={toast.titleKey} className="text-white">{toast.title}</I18nText></p>
          <p className="mt-1 text-xs leading-relaxed text-white/90"><I18nText i18nKey={toast.messageKey} className="text-white">{toast.message}</I18nText></p>
        </div>
      )}
    </div>
  )
}
