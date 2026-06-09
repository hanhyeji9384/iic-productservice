import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileDown,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { downloadCsv } from '@/lib/csv'
import { BRANCHES } from '@/lib/mock-data'
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

const initFilters = {
  color: 'all',
  storageLocation: '',
}
type Filters = typeof initFilters

function SelectFilter({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
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

function parseStorageUpdates(text: string) {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter(line => line.trim())

  const [headerLine, ...bodyLines] = lines
  if (!headerLine) return []

  const headers = parseCsvLine(headerLine).map(normalizeHeader)
  const partCodeIndex = headers.findIndex(header =>
    ['부속품id', '부속품아이디', 'partcode', 'accessoryid'].includes(header)
  )
  const storageIndex = headers.findIndex(header =>
    ['변경보관위치', '부속품보관위치', '보관위치', 'storagelocation', 'location'].includes(header)
  )
  if (partCodeIndex < 0 || storageIndex < 0) return []

  return bodyLines
    .map(parseCsvLine)
    .map(row => ({
      partCode: row[partCodeIndex] ?? '',
      storageLocation: row[storageIndex] ?? '',
    }))
    .filter(row => row.partCode.trim() && row.storageLocation.trim())
}

export function PartsPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { parts, partChangeLogs, deletePart, updatePartStorageLocations } = useParts()
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

  const [activeBranch, setActiveBranch] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [uploadResult, setUploadResult] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStorageLocation, setBulkStorageLocation] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  const effectiveBranch = activeBranch || branchOptions[0]?.code || ''
  const branchParts = useMemo(() =>
    parts.filter(part => !effectiveBranch || productMap.get(part.productCode)?.branchCode === effectiveBranch),
    [effectiveBranch, parts, productMap]
  )
  const colors = useMemo(() => [...new Set(branchParts.map(part => part.color).filter(Boolean))].sort(), [branchParts])

  const set = (key: keyof Filters) => (val: string) => setFilters(prev => ({ ...prev, [key]: val }))

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

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(key => applied[key] !== initFilters[key] && applied[key] !== '').length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const query = appliedSearch.toLowerCase()
    return branchParts.filter(part => {
      const product = productMap.get(part.productCode)
      const productName = product?.name ?? ''
      if (query) {
        const text = [
          part.productCode,
          productName,
          part.partCode,
          part.name,
          part.specification,
          part.color,
          part.storageLocation,
        ].join(' ').toLowerCase()
        if (!text.includes(query)) return false
      }
      if (applied.color !== 'all' && part.color !== applied.color) return false
      if (applied.storageLocation && !part.storageLocation.toLowerCase().includes(applied.storageLocation.toLowerCase())) return false
      return true
    })
  }, [applied, appliedSearch, branchParts, productMap])

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

  function handleSearch() {
    setAppliedSearch(search)
    setApplied(filters)
    setPage(1)
    setSelected(new Set())
  }

  function handleReset() {
    setSearch('')
    setAppliedSearch('')
    setFilters(initFilters)
    setApplied(initFilters)
    setPage(1)
    setSelected(new Set())
  }

  function handleBranchChange(branchCode: string) {
    setActiveBranch(branchCode)
    setPage(1)
    setSelected(new Set())
    setBulkStorageLocation('')
  }

  function handleExport() {
    downloadCsv(
      `parts_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '제품명', '부속품 ID', '부속품명', '규격', '컬러', '부속품 보관위치'],
      filtered.map(part => {
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

  function handleTemplateDownload() {
    downloadCsv(
      `parts_location_upload_template_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '제품명', '부속품 ID', '부속품명', '현재 보관위치', '변경 보관위치'],
      filtered.map(part => {
        const product = productMap.get(part.productCode)
        return [
          part.productCode,
          product?.name ?? '',
          part.partCode,
          part.name,
          part.storageLocation,
          '',
        ]
      })
    )
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const updates = parseStorageUpdates(await file.text())
    if (updates.length === 0) {
      setUploadResult('업로드 항목을 찾지 못했습니다.')
      event.target.value = ''
      return
    }
    const changedCount = updatePartStorageLocations(updates)
    setUploadResult(`${changedCount}건의 보관위치를 업데이트했습니다.`)
    setUploadOpen(false)
    setSelected(new Set())
    setBulkStorageLocation('')
    event.target.value = ''
  }

  function handleBulkStorageApply() {
    const storageLocation = bulkStorageLocation.trim()
    if (!storageLocation) {
      setUploadResult('변경할 보관위치를 입력해 주세요.')
      return
    }
    const updates = parts
      .filter(part => selected.has(part.id))
      .map(part => ({ partCode: part.partCode, storageLocation }))
    const changedCount = updatePartStorageLocations(updates)
    setUploadResult(`${changedCount}건의 보관위치를 수정했습니다.`)
    setSelected(new Set())
    setBulkStorageLocation('')
  }

  function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`선택한 부속품 ${selected.size}개를 삭제할까요?`)) return
    selected.forEach(id => deletePart(id))
    setUploadResult(`${selected.size}개 부속품을 삭제했습니다.`)
    setSelected(new Set())
    setBulkStorageLocation('')
  }

  const tabs = [
    { key: 'list' as const, label: '부속품 목록', Icon: List },
    { key: 'history' as const, label: '변경 이력', Icon: Clock },
  ]

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
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleUpload} className="hidden" />
            <div className="relative">
              <button
                onClick={() => setUploadOpen(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  uploadOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Excel 업로드
              </button>
              {uploadOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 translate-x-2 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">보관위치 일괄 업로드</p>
                    </div>
                    <button
                      onClick={() => setUploadOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <button
                      onClick={handleTemplateDownload}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-white">
                        <FileDown className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">업로드 템플릿 다운로드</span>
                      </span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
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
                setBulkStorageLocation('')
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="max-w-xs">
              <SelectFilter label="법인" value={effectiveBranch} onChange={handleBranchChange}>
                {branchOptions.map(branch => <option key={branch.code} value={branch.code}>{branchLabel(branch.code)}</option>)}
              </SelectFilter>
            </div>
          </div>
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[260px]">
              <input
                type="text"
                placeholder="제품코드, 제품명, 부속품 ID, 부속품명으로 검색..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              />
            </div>
            <button onClick={handleSearch} className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Search className="w-4 h-4" />검색
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              상세검색
              {activeFilterCount > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${showFilters ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5" />초기화
              </button>
            )}
          </div>

          {showFilters && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <SelectFilter label="컬러" value={filters.color} onChange={set('color')}>
                  <option value="all">전체</option>
                  {colors.map(color => <option key={color} value={color}>{color}</option>)}
                </SelectFilter>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">부속품 보관위치</p>
                  <input
                    type="text"
                    placeholder="예: P-A1-01"
                    value={filters.storageLocation}
                    onChange={event => set('storageLocation')(event.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>
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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                    { key: 'productCode', label: '제품코드', sort: 'productCode' },
                    { key: 'productName', label: '제품명', sort: 'productName' },
                    { key: 'partCode', label: '부속품 ID', sort: 'partCode' },
                    { key: 'name', label: '부속품명', sort: 'name' },
                    { key: 'specification', label: '규격', sort: 'specification' },
                    { key: 'color', label: '컬러', sort: 'color' },
                    { key: 'storageLocation', label: '부속품 보관위치', sort: 'storageLocation' },
                  ] as { key: string; label: string; sort: SortKey | null }[]).map(col => (
                    <th key={col.key} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      {col.sort ? (
                        <button onClick={() => handleSort(col.sort!)} className="group flex items-center gap-1.5 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                          {col.label} <SortIcon col={col.sort} />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
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
            <div className="flex items-center gap-4 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-gray-700">
              <span className="text-sm font-semibold whitespace-nowrap">{selected.size}개 선택</span>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">보관위치</span>
                <input
                  type="text"
                  placeholder="변경할 위치"
                  value={bulkStorageLocation}
                  onChange={event => setBulkStorageLocation(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleBulkStorageApply()}
                  className="w-32 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white placeholder:text-gray-500"
                />
              </div>
              <button
                onClick={handleBulkStorageApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                수정
              </button>
              <div className="w-px h-5 bg-gray-600" />
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 text-red-200 text-sm font-semibold rounded-xl hover:bg-red-500/20 hover:text-red-100 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                선택 삭제
              </button>
              <button
                onClick={() => { setSelected(new Set()); setBulkStorageLocation('') }}
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
