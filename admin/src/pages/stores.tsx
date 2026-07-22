import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Download, ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Pagination } from '@/components/pagination'
import { STORES } from '@/lib/mock-data'
import type { Store } from '@/lib/types'

const ITEMS_PER_PAGE = 20

const STORE_GROUP_LABELS: Record<number, string> = {
  100: 'Flagship',
  110: '백화점',
  120: 'Mall',
  130: '면세점',
  140: '안경원',
  150: '편집샵',
  180: '해외법인(자회사)',
  200: 'Distributor',
}

type SortKey = 'code' | 'name' | 'city' | 'status' | 'storeGroup'

function groupLabel(storeGroup: number) {
  return STORE_GROUP_LABELS[storeGroup] ?? '기타'
}

function statusLabel(store: Store) {
  return store.active === 'N' ? '비활성' : '활성'
}

function displayValue(value?: string | null) {
  return value && value.trim() ? value.trim() : '-'
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function maskPhone(value?: string | null) {
  const raw = displayValue(value)
  if (raw === '-') return raw
  const parts = raw.split('-')
  if (parts.length >= 3) {
    return [parts[0], '*'.repeat(Math.max(parts[1].length, 3)), ...parts.slice(2)].join('-')
  }
  const digits = normalizeDigits(raw)
  if (digits.length < 7) return raw
  const head = digits.length > 10 ? digits.slice(0, 3) : digits.slice(0, Math.max(digits.length - 7, 2))
  const tail = digits.slice(-4)
  const middleLength = Math.max(digits.length - head.length - tail.length, 3)
  return `${head}-${'*'.repeat(middleLength)}-${tail}`
}

function getSortValue(store: Store, key: SortKey) {
  if (key === 'city') return displayValue(store.address1)
  if (key === 'status') return statusLabel(store)
  if (key === 'storeGroup') return groupLabel(store.storeGroup)
  return store[key]
}

export function StoresPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`

  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>({})
  const cities = useMemo(() => [...new Set(STORES.map(s => displayValue(s.address1)))].filter(city => city !== '-').sort(), [])
  const storeGroups = useMemo(() => [...new Set(STORES.map(s => s.storeGroup))].sort((a, b) => a - b), [])

  const filtered = useMemo(() => {
    return STORES.filter(store => {
      if (appliedColumnFilters.code && !store.code.toLowerCase().includes(appliedColumnFilters.code.toLowerCase())) return false
      if (appliedColumnFilters.name && !store.name.toLowerCase().includes(appliedColumnFilters.name.toLowerCase())) return false
      if (appliedColumnFilters.tel1) {
        const q = appliedColumnFilters.tel1.toLowerCase()
        const qDigits = normalizeDigits(q)
        const matched =
          (store.tel1 ?? '').toLowerCase().includes(q) ||
          (store.tel2 ?? '').toLowerCase().includes(q) ||
          (qDigits.length > 0 && (normalizeDigits(store.tel1).includes(qDigits) || normalizeDigits(store.tel2).includes(qDigits)))
        if (!matched) return false
      }
      if (appliedColumnFilters.city && displayValue(store.address1) !== appliedColumnFilters.city) return false
      if (appliedColumnFilters.status && (appliedColumnFilters.status === 'active' ? statusLabel(store) !== '활성' : statusLabel(store) !== '비활성')) return false
      if (appliedColumnFilters.storeGroup && String(store.storeGroup) !== appliedColumnFilters.storeGroup) return false
      return true
    })
  }, [appliedColumnFilters])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

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
  }

  function handleExport() {
    const headers = ['계정 ID', '이름', '시', '국가 지역', '전화번호', '대표담당자번호', '상태', '접수처유형']
    const rows = filtered.map(store => [
      store.code,
      store.name,
      displayValue(store.address1),
      store.country,
      maskPhone(store.tel1),
      maskPhone(store.tel2),
      statusLabel(store),
      groupLabel(store.storeGroup),
    ])
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '매장 거래처 관리')
    XLSX.writeFile(workbook, `stores_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function renderFilterPopoverContent(col: string) {
    if (col === 'code' || col === 'name') {
      const placeholder = col === 'code' ? '계정 ID 검색...' : '이름 검색...'
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
    if (col === 'tel1') {
      return (
        <div className="w-44 space-y-1.5">
          <input type="text" value={columnFilters.tel1 ?? ''}
            onChange={e => setColumnFilters(p => ({ ...p, tel1: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
            placeholder="전화번호 검색..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
          <div className="flex gap-1.5">
            {columnFilters.tel1 && (
              <button onClick={() => applyFilter({ tel1: undefined })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
            )}
            <button onClick={applyCurrentFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
          </div>
        </div>
      )
    }
    if (col === 'city') {
      return (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <button onClick={() => applyFilter({ city: undefined })}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.city ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {cities.map(city => (
            <button key={city} onClick={() => applyFilter({ city })}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.city === city ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{city}</button>
          ))}
        </div>
      )
    }
    if (col === 'status') {
      return (
        <div className="space-y-1">
          {([{ v: undefined, l: '전체' }, { v: 'active', l: '활성' }, { v: 'inactive', l: '비활성' }] as { v: string | undefined; l: string }[]).map(opt => (
            <button key={opt.l} onClick={() => applyFilter({ status: opt.v })}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${(opt.v ? columnFilters.status === opt.v : !columnFilters.status) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{opt.l}</button>
          ))}
        </div>
      )
    }
    if (col === 'storeGroup') {
      return (
        <div className="space-y-1">
          <button onClick={() => applyFilter({ storeGroup: undefined })}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.storeGroup ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {storeGroups.map(g => (
            <button key={g} onClick={() => applyFilter({ storeGroup: String(g) })}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.storeGroup === String(g) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{groupLabel(g)}</button>
          ))}
        </div>
      )
    }
    return null
  }

  const FILTERABLE_COLS = new Set(['code', 'name', 'tel1', 'city', 'status', 'storeGroup'])
  const hasAnyFilter = Object.values(appliedColumnFilters).some(Boolean)

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[900px] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">매장/거래처 관리</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Excel 다운로드
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {hasAnyFilter && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-3 h-3" />초기화
            </button>
          </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {([
                    { key: 'code',       label: '계정 ID',      sort: 'code' as SortKey },
                    { key: 'name',       label: '이름',         sort: 'name' as SortKey },
                    { key: 'city',       label: '시',           sort: 'city' as SortKey },
                    { key: 'country',    label: '국가 지역',    sort: null },
                    { key: 'tel1',       label: '전화번호',     sort: null },
                    { key: 'tel2',       label: '대표담당자번호', sort: null },
                    { key: 'status',     label: '상태',         sort: 'status' as SortKey },
                    { key: 'storeGroup', label: '접수처유형',   sort: 'storeGroup' as SortKey },
                  ] as { key: string; label: string; sort: SortKey | null }[]).map(col => {
                    const isFiltered = !!appliedColumnFilters[col.key]
                    const hasFilter = FILTERABLE_COLS.has(col.key)
                    return (
                      <th
                        key={col.key}
                        className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap align-top ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.sort ? (
                            <button onClick={() => handleSort(col.sort!)} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                              {col.label} <SortIcon col={col.sort} />
                            </button>
                          ) : col.label}
                          {hasFilter && (
                            <button
                              onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover(prev => prev?.col === col.key ? null : { col: col.key, rect }) }}
                              className={`flex-shrink-0 rounded p-0.5 transition-colors ${filterPopover?.col === col.key || isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                              <Filter className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {col.key === 'code'       && appliedColumnFilters.code}
                            {col.key === 'name'       && appliedColumnFilters.name}
                            {col.key === 'tel1'       && appliedColumnFilters.tel1}
                            {col.key === 'city'       && appliedColumnFilters.city}
                            {col.key === 'status'     && (appliedColumnFilters.status === 'active' ? '활성' : '비활성')}
                            {col.key === 'storeGroup' && groupLabel(Number(appliedColumnFilters.storeGroup))}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(store => (
                  <tr
                    key={store.code}
                    onClick={() => navigate(`${pfx}/stores/${store.code}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`${pfx}/stores/${store.code}`) }}
                    tabIndex={0}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer focus:outline-none focus:bg-gray-50"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{store.code}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{store.name}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{displayValue(store.address1)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{store.country}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{maskPhone(store.tel1)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{maskPhone(store.tel2)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        statusLabel(store) === '활성' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {statusLabel(store)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{groupLabel(store.storeGroup)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
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
    </div>
  )
}
