import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Clock,
  Download,
  FileDown,
  Filter,
  List,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { BRANCHES } from '@/lib/mock-data'
import { generatePartCode } from '@/lib/part-code'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import type { Part, PartChangeLog } from '@/lib/types'

type SortKey = 'productCode' | 'productName' | 'partCode' | 'name' | 'specification' | 'color' | 'storageLocation'
type Tab = 'list' | 'history'

const ITEMS_PER_PAGE = 15
const HISTORY_PER_PAGE = 15
const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const CHANGE_TYPE_STYLES: Record<PartChangeLog['changeType'], { bg: string; label: string; i18nKey: string }> = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정', i18nKey: 'common.label.update' },
  delete: { bg: 'bg-red-50 text-red-700', label: '삭제', i18nKey: 'common.label.delete' },
}

const PART_COL_KEYS: Record<string, string> = {
  productCode: 'common.label.product_code',
  productName: 'common.label.product_name',
  partCode: 'parts.label.part_code',
  partName: 'parts.label.part_name',
  specification: 'parts.label.specification',
  color: 'common.label.color',
  storageLocation: 'parts.label.storage_location',
}

function normalizeHeader(header: string) {
  return header.replace(/^\ufeff/, '').replace(/\s/g, '').toLowerCase()
}

function cellText(value: unknown) {
  return String(value ?? '').trim()
}

function readXlsxRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : null
  if (!sheet) return []
  return XLSX.utils
    .sheet_to_json<Array<string | number | boolean | null>>(sheet, { header: 1, defval: '' })
    .map(row => row.map(cellText))
    .filter(row => row.some(Boolean))
}

function downloadXlsx(filename: string, rows: string[][], sheetName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(branch => branch.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function colorKey(color: string) {
  return `common.color.${color.trim().toLowerCase()}`
}

function parseBulkRegisterRows(sheetRows: string[][]) {
  const [headerLine, ...bodyLines] = sheetRows
  if (!headerLine) return { rows: [], error: null as 'required-missing' | null }

  const headers = headerLine.map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(header => aliases.includes(header))

  const productCodeIdx = idx(['제품코드', 'productcode', 'product_code'])
  const partCodeIdx = idx(['부품id', '부품아이디', '부속품id', '부속품아이디', 'partcode', 'part_code'])
  const nameIdx = idx(['부품명', '부속품명', 'name', 'partname', 'part_name'])
  const specIdx = idx(['규격', 'specification'])
  const colorIdx = idx(['컬러', 'color'])
  const locationIdx = idx(['보관위치', '부품보관위치', '부속품보관위치', 'storagelocation', 'storage_location', 'location'])

  if (productCodeIdx < 0 || nameIdx < 0) return { rows: [], error: 'required-missing' as const }

  const rows: Array<{
    productCode: string
    partCode: string
    name: string
    specification: string
    color: string
    storageLocation: string
  }> = []

  for (const cells of bodyLines) {
    const productCode = cells[productCodeIdx]?.trim() ?? ''
    const name = cells[nameIdx]?.trim() ?? ''
    if (!productCode || !name) return { rows: [], error: 'required-missing' as const }
    rows.push({
      productCode,
      partCode: partCodeIdx >= 0 ? (cells[partCodeIdx]?.trim() ?? '') : '',
      name,
      specification: specIdx >= 0 ? (cells[specIdx]?.trim() ?? '') : '',
      color: colorIdx >= 0 ? (cells[colorIdx]?.trim() ?? '') : '',
      storageLocation: locationIdx >= 0 ? (cells[locationIdx]?.trim() ?? '') : '',
    })
  }

  return { rows, error: null }
}

function parseBulkUpdateRows(sheetRows: string[][]) {
  const [headerLine, ...bodyLines] = sheetRows
  if (!headerLine) return { rows: [], error: null as 'empty-value' | null }

  const headers = headerLine.map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(header => aliases.includes(header))

  const partCodeIdx = idx(['부품id', '부품아이디', '부속품id', '부속품아이디', 'partcode', 'part_code'])
  const specIdx = idx(['규격', 'specification'])
  const colorIdx = idx(['컬러', 'color'])
  const locationIdx = idx(['보관위치', '부품보관위치', '부속품보관위치', 'storagelocation', 'storage_location', 'location'])

  if (partCodeIdx < 0) return { rows: [], error: 'empty-value' as const }

  const rows: Array<{
    partCode: string
    specification?: string
    color?: string
    storageLocation?: string
  }> = []

  for (const cells of bodyLines) {
    const partCode = cells[partCodeIdx]?.trim() ?? ''
    if (!partCode) return { rows: [], error: 'empty-value' as const }

    const specification = specIdx >= 0 ? (cells[specIdx]?.trim() ?? '') : undefined
    const color = colorIdx >= 0 ? (cells[colorIdx]?.trim() ?? '') : undefined
    const storageLocation = locationIdx >= 0 ? (cells[locationIdx]?.trim() ?? '') : undefined

    if ([specification, color, storageLocation].some(value => value !== undefined && !value)) {
      return { rows: [], error: 'empty-value' as const }
    }

    rows.push({ partCode, specification, color, storageLocation })
  }

  return { rows, error: null }
}

export function PartsPage() {
  const i18nLabel = useI18nLabel()
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const bulkRegisterInputRef = useRef<HTMLInputElement>(null)
  const bulkUpdateInputRef = useRef<HTMLInputElement>(null)
  const uploadToastTimerRef = useRef<number | null>(null)
  const { parts, partChangeLogs, addParts, updatePartManagementFields, deletePart } = useParts()
  const { products } = useProducts()

  const productMap = useMemo(() => new Map(products.map(product => [product.productCode, product])), [products])
  const branchOptions = useMemo(() => {
    const branchCodes = new Set(
      parts
        .map(part => productMap.get(part.productCode)?.branchCode)
        .filter((branchCode): branchCode is string => Boolean(branchCode))
    )
    return BRANCHES.filter(branch => branchCodes.has(branch.code))
  }, [parts, productMap])
  const defaultBranchCode = branchOptions.find(branch => branch.code === '1110')?.code ?? branchOptions[0]?.code ?? ''

  const [activeBranch, setActiveBranch] = useState<string>(defaultBranchCode)
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>({})
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [uploadResult, setUploadResult] = useState('')
  const [uploadToast, setUploadToast] = useState<{ message: string; messageKey: string } | null>(null)
  const [bulkRegisterOpen, setBulkRegisterOpen] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSpec, setBulkSpec] = useState('')
  const [bulkColor, setBulkColor] = useState('')
  const [bulkStorageLocation, setBulkStorageLocation] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  useEffect(() => {
    if (!defaultBranchCode || activeBranch) return
    setActiveBranch(defaultBranchCode)
  }, [activeBranch, defaultBranchCode])

  useEffect(() => {
    if (selected.size > 0) return
    clearBulkEditFields()
  }, [selected.size])

  useEffect(() => {
    return () => {
      if (uploadToastTimerRef.current) window.clearTimeout(uploadToastTimerRef.current)
    }
  }, [])

  const effectiveBranch = activeBranch || defaultBranchCode
  const branchParts = useMemo(
    () => parts.filter(part => !effectiveBranch || productMap.get(part.productCode)?.branchCode === effectiveBranch),
    [effectiveBranch, parts, productMap]
  )
  const colors = useMemo(() => [...new Set(branchParts.map(part => part.color).filter(Boolean))].sort(), [branchParts])

  const filtered = useMemo(() => {
    return branchParts.filter(part => {
      const product = productMap.get(part.productCode)
      const productName = product?.name ?? ''
      if (appliedColumnFilters.productCode && !part.productCode.toLowerCase().includes(appliedColumnFilters.productCode.toLowerCase())) return false
      if (appliedColumnFilters.productName && !productName.toLowerCase().includes(appliedColumnFilters.productName.toLowerCase())) return false
      if (appliedColumnFilters.partCode && !part.partCode.toLowerCase().includes(appliedColumnFilters.partCode.toLowerCase())) return false
      if (appliedColumnFilters.partName && !part.name.toLowerCase().includes(appliedColumnFilters.partName.toLowerCase())) return false
      if (appliedColumnFilters.color && part.color !== appliedColumnFilters.color) return false
      if (appliedColumnFilters.storageLocation && !part.storageLocation.toLowerCase().includes(appliedColumnFilters.storageLocation.toLowerCase())) return false
      return true
    })
  }, [appliedColumnFilters, branchParts, productMap])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'productName' ? (productMap.get(a.productCode)?.name ?? '') : a[sortKey as keyof Part]
      const bv = sortKey === 'productName' ? (productMap.get(b.productCode)?.name ?? '') : b[sortKey as keyof Part]
      return (String(av ?? '') < String(bv ?? '') ? -1 : String(av ?? '') > String(bv ?? '') ? 1 : 0) * dir
    })
  }, [filtered, productMap, sortDir, sortKey])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const paginatedLogs = partChangeLogs.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
  const allPageSelected = paginated.length > 0 && paginated.every(part => selected.has(part.id))
  const somePageSelected = paginated.some(part => selected.has(part.id)) && !allPageSelected
  const hasBulkFieldChanges = Boolean(bulkSpec.trim() || bulkColor || bulkStorageLocation.trim())
  const hasAnyFilter = Object.values(appliedColumnFilters).some(Boolean)

  function clearBulkEditFields() {
    setBulkSpec('')
    setBulkColor('')
    setBulkStorageLocation('')
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 flex-shrink-0 text-gray-300 group-hover:text-gray-400" />
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 flex-shrink-0 text-gray-700" />
    return <ArrowDown className="h-3 w-3 flex-shrink-0 text-gray-700" />
  }

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allPageSelected) paginated.forEach(part => next.delete(part.id))
      else paginated.forEach(part => next.add(part.id))
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyFilter(updates: Record<string, string | undefined>) {
    setColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) delete next[key]
        else next[key] = value
      })
      return next
    })
    setAppliedColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) delete next[key]
        else next[key] = value
      })
      return next
    })
    setPage(1)
    setFilterPopover(null)
  }

  function applyCurrentFilters() {
    setAppliedColumnFilters({ ...columnFilters })
    setPage(1)
    setFilterPopover(null)
  }

  function handleReset() {
    setColumnFilters({})
    setAppliedColumnFilters({})
    setPage(1)
    setSelected(new Set())
    clearBulkEditFields()
    setActiveBranch(defaultBranchCode)
    setBulkRegisterOpen(false)
    setBulkUpdateOpen(false)
  }

  function handleBranchChange(branchCode: string) {
    setActiveBranch(branchCode)
    setPage(1)
    setSelected(new Set())
    clearBulkEditFields()
  }

  function showUploadError(message: string, messageKey: string) {
    if (uploadToastTimerRef.current) window.clearTimeout(uploadToastTimerRef.current)
    setUploadResult('')
    setUploadToast({ message, messageKey })
    uploadToastTimerRef.current = window.setTimeout(() => setUploadToast(null), 3000)
  }

  function handleExport() {
    downloadXlsx(
      `parts_${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        ['제품 코드', '제품명', '부품 ID', '부품명', '규격', '컬러', '부품 보관위치'],
        ...sorted.map(part => {
          const product = productMap.get(part.productCode)
          return [
            part.productCode,
            product?.name ?? '',
            part.partCode,
            part.name,
            part.specification,
            part.color,
            part.storageLocation,
          ]
        }),
      ],
      '부품 관리'
    )
  }

  function handleBulkRegisterTemplateDownload() {
    downloadXlsx(
      `parts_bulk_register_template_${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        ['product_code', 'part_code', 'part_name', 'specification', 'color', 'storage_location'],
        ['11000100', 'PT-00000', '부품명', '규격', '컬러', '보관위치'],
      ],
      '일괄 등록'
    )
  }

  function handleBulkUpdateTemplateDownload() {
    downloadXlsx(
      `parts_bulk_update_template_${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        ['part_code', 'part_name', 'specification', 'color', 'storage_location'],
        ...sorted.map(part => [
          part.partCode,
          part.name,
          part.specification,
          part.color,
          part.storageLocation,
        ]),
      ],
      '일괄 변경'
    )
  }

  async function handleBulkUpdateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, error } = parseBulkUpdateRows(readXlsxRows(await file.arrayBuffer()))
    event.target.value = ''
    if (error === 'empty-value') {
      showUploadError(
        '일괄 변경 파일에 빈값이 있습니다. 값을 입력한 뒤 다시 업로드해 주세요.',
        'parts.toast.bulk_update_empty_value'
      )
      return
    }
    if (rows.length === 0) {
      setUploadResult('변경 항목을 찾지 못했습니다.')
      return
    }

    const changedCount = updatePartManagementFields(rows)
    setBulkUpdateOpen(false)
    setSelected(new Set())
    setUploadResult(`${changedCount}건 변경 완료`)
  }

  async function handleBulkRegisterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, error } = parseBulkRegisterRows(readXlsxRows(await file.arrayBuffer()))
    event.target.value = ''
    if (error === 'required-missing') {
      showUploadError(
        '필수값이 누락되었습니다. 제품 코드와 부품명을 확인해 주세요.',
        'parts.toast.bulk_register_required_missing'
      )
      return
    }
    if (rows.length === 0) {
      setUploadResult('등록 항목을 찾지 못했습니다.')
      return
    }

    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const base = String(now.getTime())
    const existingPartCodes = new Set(parts.map(part => part.partCode))
    const generatedPartCodes = new Set<string>()
    const newParts: Part[] = rows.map((row, index) => {
      const partCode = row.partCode || generatePartCode(existingPartCodes, generatedPartCodes)
      generatedPartCodes.add(partCode)
      return {
        id: `part-bulk-${base}-${index}`,
        productCode: row.productCode,
        partCode,
        name: row.name,
        specification: row.specification,
        color: row.color,
        storageLocation: row.storageLocation,
        registeredBy: 'monster563',
        registeredAt: nowStr,
      }
    })

    addParts(newParts)
    setBulkRegisterOpen(false)
    setUploadResult(`${newParts.length}건 등록 완료`)
  }

  function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`선택한 부품 ${selected.size}개를 삭제할까요?`)) return
    selected.forEach(id => deletePart(id))
    setUploadResult(`${selected.size}개 부품을 삭제했습니다.`)
    setSelected(new Set())
    clearBulkEditFields()
  }

  function handleSelectedBulkUpdate() {
    if (selected.size === 0 || !hasBulkFieldChanges) return
    const updates = parts
      .filter(part => selected.has(part.id))
      .map(part => ({
        partCode: part.partCode,
        specification: bulkSpec.trim() || undefined,
        color: bulkColor || undefined,
        storageLocation: bulkStorageLocation.trim() || undefined,
      }))
    const changedCount = updatePartManagementFields(updates)
    setUploadResult(`${changedCount}건 변경 완료`)
    setSelected(new Set())
    clearBulkEditFields()
  }

  const tabs = [
    { key: 'list' as const, label: '부품 목록', i18nKey: 'parts.tab.list', Icon: List },
    { key: 'history' as const, label: '변경 이력', i18nKey: 'common.label.history', Icon: Clock },
  ]

  function renderFilterPopoverContent(col: string) {
    if (col === 'productCode' || col === 'productName' || col === 'partCode' || col === 'partName') {
      const placeholder =
        col === 'productCode'
          ? '제품 코드 검색...'
          : col === 'productName'
            ? '제품명 검색...'
            : col === 'partCode'
              ? '부품 ID 검색...'
              : '부품명 검색...'
      return (
        <div className="w-44 space-y-1.5">
          <input
            type="text"
            value={columnFilters[col] ?? ''}
            onChange={event => setColumnFilters(prev => ({ ...prev, [col]: event.target.value }))}
            onKeyDown={event => event.key === 'Enter' && applyCurrentFilters()}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-gray-300 focus:outline-none"
          />
          <div className="flex gap-1.5">
            {columnFilters[col] && (
              <button
                onClick={() => applyFilter({ [col]: undefined })}
                className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
              </button>
            )}
            <button
              onClick={applyCurrentFilters}
              className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
            </button>
          </div>
        </div>
      )
    }

    if (col === 'color') {
      return (
        <div className="space-y-1">
          <button
            onClick={() => applyFilter({ color: undefined })}
            className={`block whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              !columnFilters.color ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <I18nText i18nKey="common.filter.all" display="tooltip">전체</I18nText>
          </button>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => applyFilter({ color })}
              className={`block whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                columnFilters.color === color ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <I18nText i18nKey={colorKey(color)} display="tooltip">{color}</I18nText>
            </button>
          ))}
        </div>
      )
    }

    if (col === 'storageLocation') {
      return (
        <div className="w-44 space-y-1.5">
          <input
            type="text"
            value={columnFilters.storageLocation ?? ''}
            onChange={event => setColumnFilters(prev => ({ ...prev, storageLocation: event.target.value }))}
            onKeyDown={event => event.key === 'Enter' && applyCurrentFilters()}
            placeholder="보관위치 검색..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-gray-300 focus:outline-none"
          />
          <div className="flex gap-1.5">
            {columnFilters.storageLocation && (
              <button
                onClick={() => applyFilter({ storageLocation: undefined })}
                className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
              </button>
            )}
            <button
              onClick={applyCurrentFilters}
              className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  function renderBulkMenu(type: 'update' | 'register') {
    const isUpdate = type === 'update'
    const open = isUpdate ? bulkUpdateOpen : bulkRegisterOpen
    const close = () => (isUpdate ? setBulkUpdateOpen(false) : setBulkRegisterOpen(false))
    if (!open) return null

    return (
      <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              <I18nText i18nKey={isUpdate ? 'parts.bulk_update.title' : 'parts.bulk_register.title'} display="tooltip">
                {isUpdate ? '부품 변경사항 일괄 변경' : '부품 일괄 등록'}
              </I18nText>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              <I18nText i18nKey={isUpdate ? 'parts.bulk_update.description' : 'parts.bulk_register.description'}>
                {isUpdate ? '규격, 컬러, 부품 보관위치만 수정' : '제품 코드와 부품명 기준 신규 부품 등록'}
              </I18nText>
            </p>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 p-3">
          <button
            onClick={isUpdate ? handleBulkUpdateTemplateDownload : handleBulkRegisterTemplateDownload}
            className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-white">
              <FileDown className="h-4 w-4" />
            </span>
            <span className="block text-sm font-semibold text-gray-900">
              <I18nText i18nKey="common.button.template_download" display="tooltip">업로드 템플릿 다운로드</I18nText>
            </span>
          </button>
          <button
            onClick={() => (isUpdate ? bulkUpdateInputRef : bulkRegisterInputRef).current?.click()}
            className="group flex w-full items-center gap-3 rounded-xl bg-gray-950 px-3.5 py-3 text-left text-white transition-colors hover:bg-gray-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <Upload className="h-4 w-4" />
            </span>
            <span className="block text-sm font-semibold">
              <I18nText i18nKey="common.button.file_select" display="tooltip">파일 선택</I18nText>
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 overflow-x-auto duration-500">
      <div className="min-w-[1180px] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            <I18nText i18nKey="nav.master_management.parts" display="tooltip">부품 관리</I18nText>
          </h1>

          {activeTab === 'list' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                <I18nText i18nKey="common.button.excel_download" display="tooltip">Excel 다운로드</I18nText>
              </button>
              <input ref={bulkRegisterInputRef} type="file" accept={XLSX_ACCEPT} onChange={handleBulkRegisterUpload} className="hidden" />
              <input ref={bulkUpdateInputRef} type="file" accept={XLSX_ACCEPT} onChange={handleBulkUpdateUpload} className="hidden" />

              <div className="relative">
                <button
                  onClick={() => {
                    setBulkUpdateOpen(prev => !prev)
                    setBulkRegisterOpen(false)
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    bulkUpdateOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <I18nText i18nKey="common.button.bulk_update" display="tooltip">일괄 변경</I18nText>
                </button>
                {renderBulkMenu('update')}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setBulkRegisterOpen(prev => !prev)
                    setBulkUpdateOpen(false)
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    bulkRegisterOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <I18nText i18nKey="common.button.bulk_register" display="tooltip">일괄 등록</I18nText>
                </button>
                {renderBulkMenu('register')}
              </div>

              <button
                onClick={() => navigate(`${pfx}/parts/new`)}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                <I18nText i18nKey="common.label.register" display="tooltip">등록</I18nText>
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(({ key, label, i18nKey, Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
                setSelected(new Set())
                clearBulkEditFields()
                setBulkRegisterOpen(false)
                setBulkUpdateOpen(false)
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <I18nText i18nKey={i18nKey} display="tooltip">{label}</I18nText>
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <select
                  value={activeBranch || defaultBranchCode}
                  onChange={event => handleBranchChange(event.target.value)}
                  className="w-64 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
                >
                  {branchOptions.map(branch => (
                    <option key={branch.code} value={branch.code}>{branchLabel(branch.code)}</option>
                  ))}
                </select>
                {hasAnyFilter && (
                  <button onClick={handleReset} className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                    <X className="h-3 w-3" />
                    <I18nText i18nKey="common.button.reset" display="tooltip">초기화</I18nText>
                  </button>
                )}
                {hasAnyFilter && (
                  <span className="ml-auto text-xs text-gray-400">
                    <I18nText i18nKey="common.filter.applied_count">{Object.values(appliedColumnFilters).filter(Boolean).length}개 필터 적용 중</I18nText>
                  </span>
                )}
              </div>

              {uploadResult && (
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-600">
                  <span>{uploadResult}</span>
                  <button onClick={() => setUploadResult('')} className="p-1 text-gray-400 hover:text-gray-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-10 bg-gray-50/50 py-4 pl-5 pr-2">
                        <button
                          onClick={toggleSelectAll}
                          className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                            allPageSelected ? 'border-gray-900 bg-gray-900' : somePageSelected ? 'border-gray-300 bg-gray-300' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {(allPageSelected || somePageSelected) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </button>
                      </th>
                      {([
                        { col: 'productCode', sort: 'productCode' as SortKey, label: '제품 코드' },
                        { col: 'productName', sort: 'productName' as SortKey, label: '제품명' },
                        { col: 'partCode', sort: 'partCode' as SortKey, label: '부품 ID' },
                        { col: 'partName', sort: 'name' as SortKey, label: '부품명' },
                      ]).map(({ col, sort, label }) => {
                        const isFiltered = !!appliedColumnFilters[col]
                        return (
                          <th key={col} className={`whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left align-top text-xs font-semibold tracking-wide ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleSort(sort)} className="group flex items-center gap-1 text-xs font-semibold tracking-wide transition-colors hover:text-gray-700">
                                <I18nText i18nKey={PART_COL_KEYS[col]} display="tooltip">{label}</I18nText> <SortIcon col={sort} />
                              </button>
                              <button
                                onClick={event => {
                                  const rect = event.currentTarget.getBoundingClientRect()
                                  setFilterPopover(prev => prev?.col === col ? null : { col, rect })
                                }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${filterPopover?.col === col || isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="h-3 w-3" />
                              </button>
                            </div>
                            {isFiltered && <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">{appliedColumnFilters[col]}</div>}
                          </th>
                        )
                      })}
                      <th className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                        <button onClick={() => handleSort('specification')} className="group flex items-center gap-1 text-xs font-semibold tracking-wide transition-colors hover:text-gray-700">
                          <I18nText i18nKey="parts.label.specification" display="tooltip">규격</I18nText> <SortIcon col="specification" />
                        </button>
                      </th>
                      <th className={`whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide ${appliedColumnFilters.color ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('color')} className="group flex items-center gap-1 text-xs font-semibold tracking-wide transition-colors hover:text-gray-700">
                            <I18nText i18nKey="common.label.color" display="tooltip">컬러</I18nText> <SortIcon col="color" />
                          </button>
                          <button
                            onClick={event => {
                              const rect = event.currentTarget.getBoundingClientRect()
                              setFilterPopover({ col: 'color', rect })
                            }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${appliedColumnFilters.color ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="h-3 w-3" />
                          </button>
                        </div>
                        {appliedColumnFilters.color && <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">{appliedColumnFilters.color}</div>}
                      </th>
                      <th className={`whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide ${appliedColumnFilters.storageLocation ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('storageLocation')} className="group flex items-center gap-1 text-xs font-semibold tracking-wide transition-colors hover:text-gray-700">
                            <I18nText i18nKey="parts.label.storage_location" display="tooltip">부품 보관위치</I18nText> <SortIcon col="storageLocation" />
                          </button>
                          <button
                            onClick={event => {
                              const rect = event.currentTarget.getBoundingClientRect()
                              setFilterPopover({ col: 'storageLocation', rect })
                            }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${appliedColumnFilters.storageLocation ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="h-3 w-3" />
                          </button>
                        </div>
                        {appliedColumnFilters.storageLocation && <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">{appliedColumnFilters.storageLocation}</div>}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                          <I18nText i18nKey="common.empty.no_results">조회 결과가 없습니다.</I18nText>
                        </td>
                      </tr>
                    ) : paginated.map(part => {
                      const product = productMap.get(part.productCode)
                      const isSelected = selected.has(part.id)
                      return (
                        <tr key={part.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                          <td className="py-3.5 pl-5 pr-2">
                            <button
                              onClick={() => toggleSelect(part.id)}
                              className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                                isSelected ? 'border-gray-900 bg-gray-900' : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm font-medium text-gray-900">{part.productCode}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900">{product?.name ?? '-'}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">{part.partCode}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-800">{part.name}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">{part.specification}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">{part.color}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-700">{part.storageLocation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
            </div>

            {filterPopover && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
                <div
                  className="fixed z-[50] w-max rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                  style={{
                    top: filterPopover.rect.bottom + 6,
                    ...(filterPopover.rect.left + 240 > window.innerWidth
                      ? { right: Math.max(8, window.innerWidth - filterPopover.rect.right) }
                      : { left: filterPopover.rect.left }),
                  }}
                >
                  {renderFilterPopoverContent(filterPopover.col)}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="common.label.processed_at" display="tooltip">처리 일시</I18nText>
                    </th>
                    <th className="w-[80px] whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="common.label.type" display="tooltip">유형</I18nText>
                    </th>
                    <th className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="parts.label.target_part" display="tooltip">대상 부품</I18nText>
                    </th>
                    <th className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="common.label.product_code" display="tooltip">제품 코드</I18nText>
                    </th>
                    <th className="bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="common.label.change_summary" display="tooltip">변경 내용</I18nText>
                    </th>
                    <th className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                      <I18nText i18nKey="common.label.changed_by" display="tooltip">처리자</I18nText>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                        <I18nText i18nKey="common.empty.no_results">조회 결과가 없습니다.</I18nText>
                      </td>
                    </tr>
                  ) : paginatedLogs.map(log => {
                    const style = CHANGE_TYPE_STYLES[log.changeType]
                    return (
                      <tr key={log.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">{log.changedAt} <span className="font-sans text-gray-400">(KST)</span></td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
                            <I18nText i18nKey={style.i18nKey} display="tooltip">{style.label}</I18nText>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="text-sm font-semibold text-gray-900">{log.partName}</div>
                          <div className="mt-0.5 font-mono text-xs text-gray-400">{log.partCode}</div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">{log.productCode}</td>
                        <td className="px-5 py-3.5"><SummaryCell summary={log.summary} changeType={log.changeType === 'delete' ? undefined : log.changeType} /></td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
                          <div className="mt-0.5 font-mono text-xs text-gray-400">{log.changedById}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination total={partChangeLogs.length} perPage={HISTORY_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
          </div>
        )}

        {activeTab === 'list' && selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3.5 text-white shadow-2xl">
              <span className="whitespace-nowrap text-sm font-semibold">
                <I18nText i18nKey="common.bulk.selected_count" display="tooltip">{selected.size}개 선택</I18nText>
              </span>
              <div className="h-5 w-px bg-gray-600" />
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <I18nText i18nKey="parts.label.specification" display="tooltip">규격</I18nText>
                <input
                  type="text"
                  value={bulkSpec}
                  onChange={event => setBulkSpec(event.target.value)}
                  placeholder={i18nLabel('common.value.keep', '유지')}
                  className="h-8 w-28 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <I18nText i18nKey="common.label.color" display="tooltip">컬러</I18nText>
                <select
                  value={bulkColor}
                  onChange={event => setBulkColor(event.target.value)}
                  className="h-8 w-28 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="">{i18nLabel('common.value.keep', '유지')}</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{i18nLabel(colorKey(color), color)}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <I18nText i18nKey="parts.label.storage_location" display="tooltip">부품 보관위치</I18nText>
                <input
                  type="text"
                  value={bulkStorageLocation}
                  onChange={event => setBulkStorageLocation(event.target.value)}
                  placeholder={i18nLabel('common.value.keep', '유지')}
                  className="h-8 w-32 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <button
                onClick={handleSelectedBulkUpdate}
                disabled={!hasBulkFieldChanges}
                className="whitespace-nowrap rounded-xl bg-white px-4 py-1.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <I18nText i18nKey="parts.button.delete_selected" display="tooltip">선택 삭제</I18nText>
              </button>
              <button
                onClick={() => {
                  setSelected(new Set())
                  clearBulkEditFields()
                }}
                className="p-1.5 text-gray-400 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-[10000] w-[min(360px,calc(100vw-48px))] rounded-xl bg-red-600 px-4 py-3 text-white shadow-lg">
          <p className="text-sm font-semibold">
            <I18nText i18nKey="common.toast.upload_failed" className="text-white">업로드 실패</I18nText>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/90">
            <I18nText i18nKey={uploadToast.messageKey} className="text-white">{uploadToast.message}</I18nText>
          </p>
        </div>
      )}
    </div>
  )
}
