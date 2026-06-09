import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ChevronDown, X, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { BRANCHES, STORES } from '@/lib/mock-data'
import type { Store } from '@/lib/types'

const ITEMS_PER_PAGE = 30

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

const initFilters = {
  city: 'all',
  status: 'all',
  storeGroup: 'all',
}
type Filters = typeof initFilters
type SortKey = 'code' | 'name' | 'city' | 'status' | 'storeGroup'

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(b => b.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

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

function SelectFilter({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
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

export function StoresPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const [activeBranch, setActiveBranch] = useState<string>('')
  const branchTabs = useMemo(() => BRANCHES.filter(b => STORES.some(s => s.branchCode === b.code)), [])
  const effectiveBranch = activeBranch || branchTabs[0]?.code || ''

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const set = (key: keyof Filters) => (val: string) => setFilters(prev => ({ ...prev, [key]: val }))

  const branchStores = useMemo(() =>
    STORES.filter(store => !effectiveBranch || store.branchCode === effectiveBranch),
    [effectiveBranch]
  )
  const cities = useMemo(() => [...new Set(branchStores.map(s => displayValue(s.address1)))].filter(city => city !== '-').sort(), [branchStores])
  const storeGroups = useMemo(() => [...new Set(branchStores.map(s => s.storeGroup))].sort((a, b) => a - b), [branchStores])

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(k => applied[k] !== initFilters[k]).length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase()
    const qDigits = normalizeDigits(q)
    return branchStores.filter(store => {
      if (q) {
        const textMatched = store.code.toLowerCase().includes(q) || store.name.toLowerCase().includes(q)
        const phoneMatched = qDigits.length > 0 && (
          normalizeDigits(store.tel1).includes(qDigits) || normalizeDigits(store.tel2).includes(qDigits)
        )
        if (!textMatched && !phoneMatched) return false
      }
      if (applied.city !== 'all' && displayValue(store.address1) !== applied.city) return false
      if (applied.status !== 'all' && (applied.status === 'active' ? statusLabel(store) !== '활성' : statusLabel(store) !== '비활성')) return false
      if (applied.storeGroup !== 'all' && String(store.storeGroup) !== applied.storeGroup) return false
      return true
    })
  }, [appliedSearch, applied, branchStores])

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

  function handleSearch() {
    setAppliedSearch(search)
    setApplied(filters)
    setPage(1)
  }

  function handleReset() {
    setSearch('')
    setAppliedSearch('')
    setFilters(initFilters)
    setApplied(initFilters)
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
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stores_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleBranchChange(branchCode: string) {
    setActiveBranch(branchCode)
    setPage(1)
    setSortKey(null)
    setSortDir(null)
  }

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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="max-w-xs">
              <SelectFilter label="법인" value={effectiveBranch} onChange={handleBranchChange}>
                {branchTabs.map(branch => <option key={branch.code} value={branch.code}>{branchLabel(branch.code)}</option>)}
              </SelectFilter>
            </div>
          </div>
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="계정 ID, 이름, 전화번호로 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              />
            </div>
            <button onClick={handleSearch} className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Search className="w-4 h-4" />검색
            </button>
            <button
              onClick={() => setShowFilters(v => !v)}
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
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <SelectFilter label="도시" value={filters.city} onChange={set('city')}>
                  <option value="all">전체</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </SelectFilter>
                <SelectFilter label="상태" value={filters.status} onChange={set('status')}>
                  <option value="all">전체</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </SelectFilter>
                <SelectFilter label="접수처 유형" value={filters.storeGroup} onChange={set('storeGroup')}>
                  <option value="all">전체</option>
                  {storeGroups.map(group => <option key={group} value={String(group)}>{groupLabel(group)}</option>)}
                </SelectFilter>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {([
                    { key: 'code', label: '계정 ID', sort: 'code' },
                    { key: 'name', label: '이름', sort: 'name' },
                    { key: 'city', label: '시', sort: 'city' },
                    { key: 'country', label: '국가 지역', sort: null },
                    { key: 'tel1', label: '전화번호', sort: null },
                    { key: 'tel2', label: '대표담당자번호', sort: null },
                    { key: 'status', label: '상태', sort: 'status' },
                    { key: 'storeGroup', label: '접수처유형', sort: 'storeGroup' },
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
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(store => (
                  <tr
                    key={store.code}
                    onClick={() => navigate(`${pfx}/stores/${store.code}`)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`${pfx}/stores/${store.code}`)
                    }}
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
    </div>
  )
}
