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
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { downloadCsv } from '@/lib/csv'
import { BRANCHES } from '@/lib/mock-data'
import { generatePartCode } from '@/lib/part-code'
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import type { Part, PartChangeLog } from '@/lib/types'

type SortKey = 'productCode' | 'productName' | 'partCode' | 'name' | 'specification' | 'color' | 'storageLocation'
type Tab = 'list' | 'history'

const ITEMS_PER_PAGE = 15
const HISTORY_PER_PAGE = 15

const CHANGE_TYPE_STYLES: Record<PartChangeLog['changeType'], { bg: string; label: string }> = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
  delete: { bg: 'bg-red-50 text-red-700', label: '삭제' },
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map(cell => cell.trim())
}

function normalizeHeader(header: string) {
  return header.replace(/^\ufeff/, '').replace(/\s/g, '').toLowerCase()
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(branch => branch.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function parseBulkRegisterCsv(text: string) {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter(line => line.trim())
  const [headerLine, ...bodyLines] = lines
  if (!headerLine) return { rows: [], errorCount: 0 }

  const headers = parseCsvLine(headerLine).map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(h => aliases.includes(h))

  const productCodeIdx  = idx(['제품코드', 'productcode'])
  const partCodeIdx     = idx(['부속품id', 'partcode', '부속품아이디'])
  const nameIdx         = idx(['부속품명', 'name', 'partname'])
  const specIdx         = idx(['규격', 'specification'])
  const colorIdx        = idx(['컬러', 'color'])
  const locationIdx     = idx(['보관위치', 'storagelocation', 'location'])

  if (productCodeIdx < 0 || nameIdx < 0) return { rows: [], errorCount: 0 }

  let errorCount = 0
  const rows: Array<{
    productCode: string; partCode: string; name: string
    specification: string; color: string; storageLocation: string
  }> = []

  bodyLines.forEach(line => {
    const cells = parseCsvLine(line)
    const productCode = cells[productCodeIdx]?.trim() ?? ''
    const name        = cells[nameIdx]?.trim() ?? ''
    if (!productCode || !name) { errorCount++; return }
    rows.push({
      productCode,
      partCode:       partCodeIdx >= 0 ? (cells[partCodeIdx]?.trim() ?? '') : '',
      name,
      specification:  specIdx >= 0     ? (cells[specIdx]?.trim() ?? '')     : '',
      color:          colorIdx >= 0    ? (cells[colorIdx]?.trim() ?? '')    : '',
      storageLocation: locationIdx >= 0 ? (cells[locationIdx]?.trim() ?? '') : '',
    })
  })
  return { rows, errorCount }
}

function parseBulkUpdateCsv(text: string) {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter(line => line.trim())
  const [headerLine, ...bodyLines] = lines
  if (!headerLine) return { rows: [], errorCount: 0 }

  const headers = parseCsvLine(headerLine).map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(h => aliases.includes(h))

  const partCodeIdx = idx(['부속품id', '부속품아이디', 'partcode'])
  const specIdx = idx(['규격', 'specification'])
  const colorIdx = idx(['컬러', 'color'])
  const locationIdx = idx(['보관위치', '부속품보관위치', 'storagelocation', 'location'])

  if (partCodeIdx < 0) return { rows: [], errorCount: 0 }

  let errorCount = 0
  const rows: Array<{
    partCode: string
    specification?: string
    color?: string
    storageLocation?: string
  }> = []

  bodyLines.forEach(line => {
    const cells = parseCsvLine(line)
    const partCode = cells[partCodeIdx]?.trim() ?? ''
    if (!partCode) {
      errorCount += 1
      return
    }
    rows.push({
      partCode,
      specification: specIdx >= 0 ? (cells[specIdx]?.trim() ?? '') : undefined,
      color: colorIdx >= 0 ? (cells[colorIdx]?.trim() ?? '') : undefined,
      storageLocation: locationIdx >= 0 ? (cells[locationIdx]?.trim() ?? '') : undefined,
    })
  })

  return { rows, errorCount }
}

export function PartsPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const bulkRegisterInputRef = useRef<HTMLInputElement>(null)
  const bulkUpdateInputRef = useRef<HTMLInputElement>(null)
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
  const [bulkRegisterOpen, setBulkRegisterOpen] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSpec, setBulkSpec] = useState('')
  const [bulkColor, setBulkColor] = useState('')
  const [bulkStorageLocation, setBulkStorageLocation] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  useEffect(() => {
    if (!defaultBranchCode) return
    if (activeBranch) return
    setActiveBranch(defaultBranchCode)
  }, [activeBranch, defaultBranchCode])

  useEffect(() => {
    if (selected.size > 0) return
    setBulkSpec('')
    setBulkColor('')
    setBulkStorageLocation('')
  }, [selected.size])

  const effectiveBranch = activeBranch || defaultBranchCode
  const branchParts = useMemo(() =>
    parts.filter(part => !effectiveBranch || productMap.get(part.productCode)?.branchCode === effectiveBranch),
    [effectiveBranch, parts, productMap]
  )
  const colors = useMemo(() => [...new Set(branchParts.map(part => part.color).filter(Boolean))].sort(), [branchParts])

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
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

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

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(part => next.delete(part.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(part => next.add(part.id))
        return next
      })
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasAnyFilter = Object.values(appliedColumnFilters).some(Boolean)

  function applyFilter(updates: Record<string, string | undefined>) {
    setColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
      return next
    })
    setAppliedColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
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

  function clearBulkEditFields() {
    setBulkSpec('')
    setBulkColor('')
    setBulkStorageLocation('')
  }

  function handleExport() {
    downloadCsv(
      `parts_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '제품명', '부속품 ID', '부속품명', '규격', '컬러', '부속품 보관위치'],
      sorted.map(part => {
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
      })
    )
  }

  function handleBulkRegisterTemplateDownload() {
    downloadCsv(
      `parts_bulk_register_template_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '부속품명', '규격', '컬러', '보관위치'],
      []
    )
  }

  function handleBulkUpdateTemplateDownload() {
    downloadCsv(
      `parts_bulk_update_template_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '제품명', '부속품ID', '부속품명', '규격', '컬러', '부속품보관위치'],
      sorted.map(part => {
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
      })
    )
  }

  async function handleBulkUpdateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, errorCount } = parseBulkUpdateCsv(await file.text())
    event.target.value = ''
    if (rows.length === 0) {
      setUploadResult(errorCount > 0 ? `오류 ${errorCount}건 — 부속품 ID가 비어있습니다.` : '변경 항목을 찾지 못했습니다.')
      return
    }

    const changedCount = updatePartManagementFields(rows)
    setBulkUpdateOpen(false)
    setSelected(new Set())
    setUploadResult(
      errorCount > 0
        ? `${changedCount}건 변경 완료, ${errorCount}건 오류(부속품 ID 누락)`
        : `${changedCount}건 변경 완료`
    )
  }

  async function handleBulkRegisterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, errorCount } = parseBulkRegisterCsv(await file.text())
    event.target.value = ''
    if (rows.length === 0) {
      setUploadResult(errorCount > 0 ? `오류 ${errorCount}건 — 제품코드 또는 부속품명이 비어있습니다.` : '등록 항목을 찾지 못했습니다.')
      return
    }
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const base = String(now.getTime())
    const existingPartCodes = new Set(parts.map(part => part.partCode))
    const generatedPartCodes = new Set<string>()
    const newParts: Part[] = rows.map((row, i) => {
      const partCode = row.partCode || generatePartCode(existingPartCodes, generatedPartCodes)
      generatedPartCodes.add(partCode)
      return {
        id:              `part-bulk-${base}-${i}`,
        productCode:     row.productCode,
        partCode,
        name:            row.name,
        specification:   row.specification,
        color:           row.color,
        storageLocation: row.storageLocation,
        registeredBy:    'monster563',
        registeredAt:    nowStr,
      }
    })
    addParts(newParts)
    setBulkRegisterOpen(false)
    const msg = errorCount > 0
      ? `${newParts.length}건 등록 완료, ${errorCount}건 오류(제품코드 또는 부속품명 누락)`
      : `${newParts.length}건 등록 완료`
    setUploadResult(msg)
  }

  function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`선택한 부속품 ${selected.size}개를 삭제할까요?`)) return
    selected.forEach(id => deletePart(id))
    setUploadResult(`${selected.size}개 부속품을 삭제했습니다.`)
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
    { key: 'list' as const, label: '부속품 목록', Icon: List },
    { key: 'history' as const, label: '변경 이력', Icon: Clock },
  ]

  function renderFilterPopoverContent(col: string) {
    if (col === 'productCode' || col === 'productName' || col === 'partCode' || col === 'partName') {
      const placeholder = col === 'productCode' ? '제품코드 검색...' : col === 'productName' ? '제품명 검색...' : col === 'partCode' ? '부속품 아이디 검색...' : '부속품명 검색...'
      return (
        <div className="w-44 space-y-1.5">
          <input type="text" value={columnFilters[col] ?? ''}
            onChange={e => setColumnFilters(p => ({ ...p, [col]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
          <div className="flex gap-1.5">
            {columnFilters[col] && (
              <button onClick={() => applyFilter({ [col]: undefined })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
            )}
            <button onClick={applyCurrentFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
          </div>
        </div>
      )
    }
    if (col === 'color') {
      return (
        <div className="space-y-1">
          <button onClick={() => applyFilter({ color: undefined })}
            className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.color ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {colors.map(color => (
            <button key={color} onClick={() => applyFilter({ color })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.color === color ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{color}</button>
          ))}
        </div>
      )
    }
    if (col === 'storageLocation') {
      return (
        <div className="w-44 space-y-1.5">
          <input type="text" value={columnFilters.storageLocation ?? ''}
            onChange={e => setColumnFilters(p => ({ ...p, storageLocation: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
            placeholder="보관위치 검색..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
          />
          <div className="flex gap-1.5">
            {columnFilters.storageLocation && (
              <button onClick={() => applyFilter({ storageLocation: undefined })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
            )}
            <button onClick={applyCurrentFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1180px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">부품 관리</h1>
          </div>
          {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Excel 다운로드
            </button>
                <input ref={bulkRegisterInputRef} type="file" accept=".csv,text/csv" onChange={handleBulkRegisterUpload} className="hidden" />
                <input ref={bulkUpdateInputRef} type="file" accept=".csv,text/csv" onChange={handleBulkUpdateUpload} className="hidden" />

            {/* 일괄 변경 */}
            <div className="relative">
              <button
                onClick={() => {
                  setBulkUpdateOpen(prev => !prev)
                  setBulkRegisterOpen(false)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  bulkUpdateOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                일괄 변경
              </button>
              {bulkUpdateOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">부속품 일괄 변경</p>
                      <p className="mt-0.5 text-xs text-gray-400">목록 데이터 포함, 규격·컬러·보관위치만 변경</p>
                    </div>
                    <button onClick={() => setBulkUpdateOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <button
                      onClick={handleBulkUpdateTemplateDownload}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-white">
                        <FileDown className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">변경 양식 다운로드</span>
                        <span className="mt-0.5 block text-xs text-gray-400">현재 검색 결과 목록 포함</span>
                      </span>
                    </button>
                    <button
                      onClick={() => bulkUpdateInputRef.current?.click()}
                      className="group flex w-full items-center gap-3 rounded-xl bg-gray-950 px-3.5 py-3 text-left text-white hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Upload className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">파일 선택</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 일괄 등록 */}
            <div className="relative">
              <button
                onClick={() => {
                  setBulkRegisterOpen(prev => !prev)
                  setBulkUpdateOpen(false)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  bulkRegisterOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                일괄 등록
              </button>
              {bulkRegisterOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">부속품 일괄 등록</p>
                      <p className="mt-0.5 text-xs text-gray-400">제품코드, 부속품명 필수</p>
                    </div>
                    <button onClick={() => setBulkRegisterOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <button
                      onClick={handleBulkRegisterTemplateDownload}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-white">
                        <FileDown className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">등록 양식 다운로드</span>
                      </span>
                    </button>
                    <button
                      onClick={() => bulkRegisterInputRef.current?.click()}
                      className="group flex w-full items-center gap-3 rounded-xl bg-gray-950 px-3.5 py-3 text-left text-white hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Upload className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">파일 선택</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`${pfx}/parts/new`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              등록
            </button>
          </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
                setSelected(new Set())
                clearBulkEditFields()
                setBulkRegisterOpen(false)
                setBulkUpdateOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
        <>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <select
              value={activeBranch || defaultBranchCode}
              onChange={e => handleBranchChange(e.target.value)}
              className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {branchOptions.map(b => (
                <option key={b.code} value={b.code}>{branchLabel(b.code)}</option>
              ))}
            </select>
            {hasAnyFilter && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3 h-3" />초기화
              </button>
            )}
          </div>

        {uploadResult && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm text-gray-600 shadow-sm">
            <span>{uploadResult}</span>
            <button onClick={() => setUploadResult('')} className="p-1 text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

          <div className="overflow-x-auto">
            <table className="min-w-max w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pl-5 pr-2 py-4 bg-gray-50/50 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        allPageSelected ? 'bg-gray-900 border-gray-900' : somePageSelected ? 'bg-gray-300 border-gray-300' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {(allPageSelected || somePageSelected) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                  </th>
                  {([
                    { col: 'productCode', sort: 'productCode' as SortKey, label: '제품코드' },
                    { col: 'productName', sort: 'productName' as SortKey, label: '제품명' },
                    { col: 'partCode',    sort: 'partCode'    as SortKey, label: '부속품 ID' },
                    { col: 'partName',    sort: 'name'        as SortKey, label: '부속품명' },
                  ]).map(({ col, sort, label }) => {
                    const isFiltered = !!appliedColumnFilters[col]
                    return (
                      <th key={col} className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap align-top ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort(sort)} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            {label} <SortIcon col={sort} />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover(prev => prev?.col === col ? null : { col, rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${filterPopover?.col === col || isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {appliedColumnFilters[col]}
                          </div>
                        )}
                      </th>
                    )
                  })}
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                    <button onClick={() => handleSort('specification')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                      규격 <SortIcon col="specification" />
                    </button>
                  </th>
                  <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${appliedColumnFilters.color ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleSort('color')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                        컬러 <SortIcon col="color" />
                      </button>
                      <button
                        onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'color', rect }) }}
                        className={`flex-shrink-0 rounded p-0.5 transition-colors ${appliedColumnFilters.color ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                    {appliedColumnFilters.color && (
                      <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                        {appliedColumnFilters.color}
                      </div>
                    )}
                  </th>
                  <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${appliedColumnFilters.storageLocation ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleSort('storageLocation')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                        부속품 보관위치 <SortIcon col="storageLocation" />
                      </button>
                      <button
                        onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'storageLocation', rect }) }}
                        className={`flex-shrink-0 rounded p-0.5 transition-colors ${appliedColumnFilters.storageLocation ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                    {appliedColumnFilters.storageLocation && (
                      <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                        {appliedColumnFilters.storageLocation}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : paginated.map(part => {
                  const product = productMap.get(part.productCode)
                  const isSelected = selected.has(part.id)
                  return (
                    <tr key={part.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                      <td className="pl-5 pr-2 py-3.5">
                        <button
                          onClick={() => toggleSelect(part.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{part.productCode}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{product?.name ?? '-'}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{part.partCode}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-800">{part.name}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{part.specification}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{part.color}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-700">{part.storageLocation}</td>
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
              className="fixed z-[50] bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-max"
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-max w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">처리 일시</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap w-[80px]">유형</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">대상 부속품</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">제품코드</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50">변경 내용</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">처리자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">변경 이력이 없습니다.</td>
                    </tr>
                  ) : paginatedLogs.map(log => {
                    const style = CHANGE_TYPE_STYLES[log.changeType]
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.changedAt} <span className="text-gray-400 font-sans">(KST)</span></td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg}`}>{style.label}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{log.partName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.partCode}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.productCode}</td>
                        <td className="px-5 py-3.5"><SummaryCell summary={log.summary} changeType={log.changeType === 'delete' ? undefined : log.changeType} /></td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.changedById}</div>
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-4 py-3.5 shadow-2xl border border-gray-700">
              <span className="text-sm font-semibold whitespace-nowrap">{selected.size}개 선택</span>
              <div className="w-px h-5 bg-gray-600" />
              <label className="flex items-center gap-2 text-xs text-gray-300">
                규격
                <input
                  type="text"
                  value={bulkSpec}
                  onChange={event => setBulkSpec(event.target.value)}
                  placeholder="유지"
                  className="h-8 w-28 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                컬러
                <select
                  value={bulkColor}
                  onChange={event => setBulkColor(event.target.value)}
                  className="h-8 w-28 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="">유지</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                보관위치
                <input
                  type="text"
                  value={bulkStorageLocation}
                  onChange={event => setBulkStorageLocation(event.target.value)}
                  placeholder="유지"
                  className="h-8 w-32 rounded-lg border border-gray-700 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <button
                onClick={handleSelectedBulkUpdate}
                disabled={!hasBulkFieldChanges}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 transition-colors whitespace-nowrap"
              >
                적용
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 text-red-200 text-sm font-semibold rounded-xl hover:bg-red-500/20 hover:text-red-100 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                선택 삭제
              </button>
              <button
                onClick={() => {
                  setSelected(new Set())
                  clearBulkEditFields()
                }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
