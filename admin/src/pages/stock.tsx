import { useState, useMemo, useRef } from 'react'
import { Search, ChevronDown, X, ArrowUp, ArrowDown, ArrowUpDown, Download, Check } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { useProducts } from '@/lib/products-context'
import { BRANCHES } from '@/lib/mock-data'
import type { Product } from '@/lib/types'

type SortKey = 'productCode' | 'name' | 'brandCategory' | 'stockLocation' | 'quantity' | 'isRestorationRequest'

const ITEMS_PER_PAGE = 15

const initFilters = {
  brand: 'all', midCategory: 'all', subCategory: 'all',
  stockLocation: '',
  safetyStock: 'all',
  hasStock: 'all',
  quantityMin: '', quantityMax: '',
  restoration: 'all',
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


export function StockPage() {
  const { products, updateStockFields } = useProducts()

  const [activeBranch, setActiveBranch] = useState<string>('')

  const branchTabs = useMemo(() => {
    const codes = [...new Set(products.map(p => p.branchCode).filter(Boolean))] as string[]
    return BRANCHES.filter(b => codes.includes(b.code))
  }, [products])

  const effectiveBranch = activeBranch || branchTabs[0]?.code || ''

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState('')
  const editingRef = useRef<HTMLInputElement>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLocation, setBulkLocation] = useState('')
  const [bulkRestoration, setBulkRestoration] = useState<'unchanged' | 'true' | 'false'>('unchanged')

  const set = (key: keyof Filters) => (val: string) => setFilters(p => ({ ...p, [key]: val }))

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

  const brands  = useMemo(() => [...new Set(products.map(p => p.brandCategory))], [products])
  const midCats = useMemo(() => [...new Set(products.map(p => p.midCategory))], [products])
  const subCats = useMemo(() => {
    const base = filters.midCategory === 'all' ? products : products.filter(p => p.midCategory === filters.midCategory)
    return [...new Set(base.map(p => p.subCategory))]
  }, [filters.midCategory, products])

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(k => applied[k] !== initFilters[k] && applied[k] !== '').length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.toLowerCase()
    const qMin = applied.quantityMin !== '' ? parseInt(applied.quantityMin) : null
    const qMax = applied.quantityMax !== '' ? parseInt(applied.quantityMax) : null
    return products.filter(p => {
      if (effectiveBranch && p.branchCode !== effectiveBranch) return false
      if (q && !p.productCode.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false
      if (applied.brand !== 'all' && p.brandCategory !== applied.brand) return false
      if (applied.midCategory !== 'all' && p.midCategory !== applied.midCategory) return false
      if (applied.subCategory !== 'all' && p.subCategory !== applied.subCategory) return false
      if (applied.stockLocation && !p.stockLocation.toLowerCase().includes(applied.stockLocation.toLowerCase())) return false
      if (applied.safetyStock === 'shortage' && !(p.quantity < 5)) return false
      if (applied.safetyStock === 'ok' && !(p.quantity >= 5)) return false
      if (applied.hasStock === 'y' && !(p.quantity >= 1)) return false
      if (applied.hasStock === 'n' && !(p.quantity === 0)) return false
      if (qMin !== null && p.quantity < qMin) return false
      if (qMax !== null && p.quantity > qMax) return false
      if (applied.restoration !== 'all' && p.isRestorationRequest !== (applied.restoration === 'true')) return false
      return true
    })
  }, [appliedSearch, applied, products, effectiveBranch])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof Product]
      const bv = b[sortKey as keyof Product]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      if (typeof av === 'boolean' && typeof bv === 'boolean') return (Number(av) - Number(bv)) * dir
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const allPageSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id))
  const somePageSelected = paginated.some(p => selected.has(p.id)) && !allPageSelected

  function toggleSelectAll() {
    if (allPageSelected) setSelected(prev => { const s = new Set(prev); paginated.forEach(p => s.delete(p.id)); return s })
    else setSelected(prev => { const s = new Set(prev); paginated.forEach(p => s.add(p.id)); return s })
  }
  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function commitEdit(p: Product) {
    updateStockFields(p.id, { stockLocation: editingLocation.trim() || p.stockLocation })
    setEditingId(null)
  }

  function handleBulkApply() {
    selected.forEach(id => {
      const patch: { stockLocation?: string; isRestorationRequest?: boolean } = {}
      if (bulkLocation.trim()) patch.stockLocation = bulkLocation.trim()
      if (bulkRestoration !== 'unchanged') patch.isRestorationRequest = bulkRestoration === 'true'
      updateStockFields(id, patch)
    })
    setSelected(new Set())
    setBulkLocation('')
    setBulkRestoration('unchanged')
  }

  function handleExport() {
    const headers = ['제품코드','제품명','브랜드','중분류','소분류','재고보관위치','수량','안전재고','재고보유여부','복원가능여부']
    const rows = filtered.map(p => [
      p.productCode, p.name, p.brandCategory, p.midCategory, p.subCategory,
      p.stockLocation, p.quantity,
      p.quantity < 5 ? '부족' : '—',
      p.quantity >= 1 ? 'Y' : 'N',
      p.isRestorationRequest ? 'Y' : 'N',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSearch() { setAppliedSearch(search); setApplied(filters); setPage(1) }
  function handleReset() {
    setSearch(''); setAppliedSearch(''); setFilters(initFilters); setApplied(initFilters); setPage(1)
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[900px] space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">재고 리스트</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Excel 다운로드
          </button>
        </div>

        {/* 법인 탭 */}
        <div className="flex gap-1 border-b border-gray-200">
          {branchTabs.map(b => (
            <button
              key={b.code}
              onClick={() => { setActiveBranch(b.code); setPage(1) }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                effectiveBranch === b.code ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {b.code} {b.name}
            </button>
          ))}
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="제품코드, 제품명으로 검색..."
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
              <div className="grid grid-cols-4 gap-3">
                <SelectFilter label="브랜드" value={filters.brand} onChange={set('brand')}>
                  <option value="all">전체</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </SelectFilter>
                <SelectFilter label="중분류" value={filters.midCategory} onChange={v => { set('midCategory')(v); set('subCategory')('all') }}>
                  <option value="all">전체</option>
                  {midCats.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectFilter>
                <SelectFilter label="소분류" value={filters.subCategory} onChange={set('subCategory')}>
                  <option value="all">전체</option>
                  {subCats.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectFilter>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">재고 보관위치</p>
                  <input type="text" placeholder="예: A1-01" value={filters.stockLocation} onChange={e => set('stockLocation')(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <SelectFilter label="안전재고" value={filters.safetyStock} onChange={set('safetyStock')}>
                  <option value="all">전체</option>
                  <option value="shortage">부족 (5개 미만)</option>
                  <option value="ok">여유 (5개 이상)</option>
                </SelectFilter>
                <SelectFilter label="재고보유여부" value={filters.hasStock} onChange={set('hasStock')}>
                  <option value="all">전체</option>
                  <option value="y">Y (1개 이상)</option>
                  <option value="n">N (0개)</option>
                </SelectFilter>
                <SelectFilter label="복원가능여부" value={filters.restoration} onChange={set('restoration')}>
                  <option value="all">전체</option>
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </SelectFilter>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">수량</p>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="최소" min={0} value={filters.quantityMin} onChange={e => set('quantityMin')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                    <span className="text-gray-300 text-sm flex-shrink-0">~</span>
                    <input type="number" placeholder="최대" min={0} value={filters.quantityMax} onChange={e => set('quantityMax')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {/* 체크박스 */}
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
                    { key: 'productCode',          label: '제품코드',    sort: 'productCode' },
                    { key: 'name',                 label: '제품명',      sort: 'name' },
                    { key: 'brandCategory',        label: '브랜드',      sort: 'brandCategory' },
                    { key: 'midCategory',          label: '중분류',      sort: null },
                    { key: 'subCategory',          label: '소분류',      sort: null },
                    { key: 'stockLocation',        label: '재고보관위치', sort: 'stockLocation' },
                    { key: 'quantity',             label: '수량',        sort: 'quantity' },
                    { key: 'isSafetyStock',        label: '안전재고',    sort: null },
                    { key: 'hasStock',             label: '재고보유여부', sort: null },
                    { key: 'isRestorationRequest', label: '복원가능여부', sort: 'isRestorationRequest' },
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
                    <td colSpan={11} className="px-6 py-12 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : paginated.map(p => {
                  const isSelected = selected.has(p.id)
                  const isEditing = editingId === p.id
                  return (
                    <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                      <td className="pl-5 pr-2 py-3.5">
                        <button
                          onClick={() => toggleSelect(p.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{p.productCode}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{p.name}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.brandCategory}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{p.midCategory}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{p.subCategory}</td>

                      {/* 재고보관위치 — 인라인 편집 */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <input
                            ref={editingRef}
                            value={editingLocation}
                            onChange={e => setEditingLocation(e.target.value)}
                            onBlur={() => commitEdit(p)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdit(p)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            autoFocus
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg outline-none focus:border-gray-500"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(p.id); setEditingLocation(p.stockLocation) }}
                            className="font-mono text-gray-600 hover:text-gray-900 hover:underline underline-offset-2 transition-colors text-left"
                            title="클릭하여 편집"
                          >
                            {p.stockLocation}
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-sm tabular-nums text-right text-gray-900">{p.quantity.toLocaleString()}</td>

                      {/* 안전재고 — computed */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {p.quantity < 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600">부족</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-500">여유</span>
                        )}
                      </td>

                      {/* 재고보유여부 — computed */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          p.quantity >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.quantity >= 1 ? 'Y' : 'N'}
                        </span>
                      </td>

                      {/* 복원가능여부 */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          p.isRestorationRequest ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.isRestorationRequest ? 'Y' : 'N'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>

        {/* 일괄 편집 바 */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-gray-700">
              <span className="text-sm font-semibold whitespace-nowrap">{selected.size}개 선택</span>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">보관위치</span>
                <input
                  type="text"
                  placeholder="변경할 위치"
                  value={bulkLocation}
                  onChange={e => setBulkLocation(e.target.value)}
                  className="w-28 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">복원가능</span>
                <div className="flex gap-1">
                  {(['unchanged', 'true', 'false'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setBulkRestoration(v)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        bulkRestoration === v ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {v === 'unchanged' ? '유지' : v === 'true' ? 'Y' : 'N'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleBulkApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                적용
              </button>
              <button
                onClick={() => setSelected(new Set())}
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
