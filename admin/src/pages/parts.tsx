import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ChevronDown, X, Package, Plus, Pencil } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import { formatDateTime } from '@/lib/utils'
import type { PartCategory } from '@/lib/types'

const CATEGORIES: PartCategory[] = ['렌즈', '힌지', '노즈패드', '나사', '템플', '기타']

const ITEMS_PER_PAGE = 15

const initFilters = {
  category: 'all',
  status: 'all',
}
type Filters = typeof initFilters

function SelectFilter({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer">
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

export function PartsPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const { parts } = useParts()
  const { products } = useProducts()

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)

  const set = (key: keyof Filters) => (val: string) => setFilters(p => ({ ...p, [key]: val }))

  const productMap = useMemo(() =>
    Object.fromEntries(products.map(p => [p.productCode, p.name])),
    [products]
  )

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(k => applied[k] !== initFilters[k]).length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.toLowerCase()
    return parts.filter(p => {
      if (q && !p.partCode.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)
        && !p.productCode.toLowerCase().includes(q)
        && !(productMap[p.productCode] ?? '').toLowerCase().includes(q)) return false
      if (applied.category !== 'all' && p.category !== applied.category) return false
      if (applied.status !== 'all' && p.status !== applied.status) return false
      return true
    })
  }, [appliedSearch, applied, parts, productMap])

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSearch() { setAppliedSearch(search); setApplied(filters); setPage(1) }
  function handleReset() {
    setSearch(''); setAppliedSearch(''); setFilters(initFilters); setApplied(initFilters); setPage(1)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">부품 관리</h1>
        <button
          onClick={() => navigate(`${pfx}/parts/new`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          부품 등록
        </button>
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-5 flex gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="부품코드, 부품명, 제품코드, 제품명으로 검색..."
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            상세검색
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-gray-700 text-white rounded-full leading-none">{activeFilterCount}</span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <X className="w-3.5 h-3.5" />초기화
            </button>
          )}
        </div>

        {showFilters && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectFilter label="분류" value={filters.category} onChange={set('category')}>
                <option value="all">전체</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectFilter>
              <SelectFilter label="상태" value={filters.status} onChange={set('status')}>
                <option value="all">전체</option>
                <option value="active">사용</option>
                <option value="inactive">미사용</option>
              </SelectFilter>
            </div>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">부품코드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">부품명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">분류</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">연결 제품</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">수량</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">비고</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">등록일시</th>
                <th className="px-4 py-3 bg-gray-50 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">등록된 부품이 없습니다.</p>
                  </td>
                </tr>
              ) : paginated.map(part => (
                <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{part.partCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{part.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 text-xs rounded-lg bg-blue-50 text-blue-700 font-medium">{part.category}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-mono text-gray-500">{part.productCode}</div>
                    <div className="text-sm text-gray-800">{productMap[part.productCode] ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                    <span className={part.quantity === 0 ? 'text-red-500' : ''}>{part.quantity.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-lg font-medium ${
                      part.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {part.status === 'active' ? '사용' : '미사용'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{part.note || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(part.registeredAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`${pfx}/parts/${part.id}/edit`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
      </div>
    </div>
  )
}
