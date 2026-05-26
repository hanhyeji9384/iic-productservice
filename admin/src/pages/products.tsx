import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Plus, ChevronDown, X, ArrowUp, ArrowDown, ArrowUpDown, Download, Pencil, Trash2 } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { useProducts } from '@/lib/products-context'
import type { Product, SalesStatus } from '@/lib/types'

const SALES_STATUS_STYLES: Record<SalesStatus, string> = {
  '사용중':       'bg-emerald-50 text-emerald-700',
  '종료 예정':    'bg-amber-50 text-amber-700',
  '판매 종료 (P)': 'bg-gray-100 text-gray-500',
  '판매 종료 (C)': 'bg-gray-100 text-gray-500',
}

function fmtRetention(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m] = dateStr.split('-')
  return `${y}년 ${parseInt(m)}월`
}

type SortKey = 'productCode' | 'name' | 'brandCategory' | 'midCategory' | 'subCategory'
  | 'factory1' | 'factory2' | 'factory3' | 'releaseDate' | 'partsRetentionPeriod'
  | 'dataSource' | 'registeredBy' | 'registeredAt'

const ITEMS_PER_PAGE = 15

const initFilters = {
  brand: 'all', dataSource: 'all', salesStatus: 'all',
  midCategory: 'all', subCategory: 'all',
  factory1: 'all', factory2: 'all', factory3: 'all',
  releaseDateFrom: '', releaseDateTo: '',
  partsRetentionFrom: '', partsRetentionTo: '',
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

export function ProductsPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const { products, deleteProduct } = useProducts()

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

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

  const brands     = useMemo(() => [...new Set(products.map(p => p.brandCategory))], [products])
  const midCats    = useMemo(() => [...new Set(products.map(p => p.midCategory))], [products])
  const subCats    = useMemo(() => {
    const base = filters.midCategory === 'all' ? products : products.filter(p => p.midCategory === filters.midCategory)
    return [...new Set(base.map(p => p.subCategory))]
  }, [filters.midCategory, products])
  const factories1 = useMemo(() => [...new Set(products.map(p => p.factory1))], [products])
  const factories2 = useMemo(() => [...new Set(products.map(p => p.factory2).filter(Boolean) as string[])], [products])
  const factories3 = useMemo(() => [...new Set(products.map(p => p.factory3).filter(Boolean) as string[])], [products])

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(k => applied[k] !== initFilters[k] && applied[k] !== '').length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.toLowerCase()
    return products.filter(p => {
      if (q && !p.productCode.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q)) return false
      if (applied.brand !== 'all' && p.brandCategory !== applied.brand) return false
      if (applied.dataSource !== 'all' && p.dataSource !== applied.dataSource) return false
      if (applied.midCategory !== 'all' && p.midCategory !== applied.midCategory) return false
      if (applied.subCategory !== 'all' && p.subCategory !== applied.subCategory) return false
      if (applied.factory1 !== 'all' && p.factory1 !== applied.factory1) return false
      if (applied.factory2 !== 'all' && p.factory2 !== applied.factory2) return false
      if (applied.factory3 !== 'all' && p.factory3 !== applied.factory3) return false
      if (applied.salesStatus !== 'all' && p.salesStatus !== applied.salesStatus) return false
      if (applied.releaseDateFrom && p.releaseDate < applied.releaseDateFrom) return false
      if (applied.releaseDateTo && p.releaseDate > applied.releaseDateTo) return false
      if (applied.partsRetentionFrom && p.partsRetentionPeriod < applied.partsRetentionFrom) return false
      if (applied.partsRetentionTo && p.partsRetentionPeriod > applied.partsRetentionTo) return false
      return true
    })
  }, [appliedSearch, applied, products])

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
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleExport() {
    const headers = ['제품코드','바코드','제품명','브랜드','중분류','소분류','생산공장1','생산공장2','생산공장3','출시일','부품보유기간','데이터출처','등록자','등록일시']
    const rows = filtered.map(p => [
      p.productCode, p.barcode, p.name, p.brandCategory, p.midCategory, p.subCategory,
      p.factory1, p.factory2 ?? '', p.factory3 ?? '',
      p.releaseDate, p.partsRetentionPeriod,
      p.dataSource,
      p.registeredBy ?? '',
      p.registeredAt ?? '',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSearch() { setAppliedSearch(search); setApplied(filters); setPage(1) }
  function handleReset() {
    setSearch(''); setAppliedSearch(''); setFilters(initFilters); setApplied(initFilters); setPage(1)
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1200px] space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">제품 관리</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Excel 다운로드
            </button>
            <button
              onClick={() => navigate(`/${langCode}/products/new`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              제품 추가
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="제품코드, 제품명, 바코드로 검색..."
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
              <div className="grid grid-cols-5 gap-3">
                <SelectFilter label="브랜드" value={filters.brand} onChange={set('brand')}>
                  <option value="all">전체</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </SelectFilter>
                <SelectFilter label="데이터 출처" value={filters.dataSource} onChange={set('dataSource')}>
                  <option value="all">전체</option>
                  <option value="SAP">SAP</option>
                  <option value="PS">PS</option>
                </SelectFilter>
                <SelectFilter label="판매 상태" value={filters.salesStatus} onChange={set('salesStatus')}>
                  <option value="all">전체</option>
                  <option value="사용중">사용중</option>
                  <option value="종료 예정">종료 예정</option>
                  <option value="판매 종료 (P)">판매 종료 (P)</option>
                  <option value="판매 종료 (C)">판매 종료 (C)</option>
                </SelectFilter>
                <SelectFilter label="중분류" value={filters.midCategory} onChange={v => { set('midCategory')(v); set('subCategory')('all') }}>
                  <option value="all">전체</option>
                  {midCats.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectFilter>
                <SelectFilter label="소분류" value={filters.subCategory} onChange={set('subCategory')}>
                  <option value="all">전체</option>
                  {subCats.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectFilter>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <SelectFilter label="생산공장1" value={filters.factory1} onChange={set('factory1')}>
                  <option value="all">전체</option>
                  {factories1.map(f => <option key={f} value={f}>{f}</option>)}
                </SelectFilter>
                <SelectFilter label="생산공장2" value={filters.factory2} onChange={set('factory2')}>
                  <option value="all">전체</option>
                  {factories2.map(f => <option key={f} value={f}>{f}</option>)}
                </SelectFilter>
                <SelectFilter label="생산공장3" value={filters.factory3} onChange={set('factory3')}>
                  <option value="all">전체</option>
                  {factories3.map(f => <option key={f} value={f}>{f}</option>)}
                </SelectFilter>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">출시일</p>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.releaseDateFrom} onChange={e => set('releaseDateFrom')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                    <span className="text-gray-300 text-sm flex-shrink-0">~</span>
                    <input type="date" value={filters.releaseDateTo} onChange={e => set('releaseDateTo')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">부품보유기간 만료일</p>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.partsRetentionFrom} onChange={e => set('partsRetentionFrom')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                    <span className="text-gray-300 text-sm flex-shrink-0">~</span>
                    <input type="date" value={filters.partsRetentionTo} onChange={e => set('partsRetentionTo')(e.target.value)} className="flex-1 px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
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
                  {([
                    { key: 'productCode',          label: '제품코드',    sort: 'productCode' },
                    { key: 'barcode',              label: '바코드',      sort: null },
                    { key: 'name',                 label: '제품명',      sort: 'name' },
                    { key: 'brandCategory',        label: '브랜드',      sort: 'brandCategory' },
                    { key: 'midCategory',          label: '중분류',      sort: 'midCategory' },
                    { key: 'subCategory',          label: '소분류',      sort: 'subCategory' },
                    { key: 'factory1',             label: '생산공장1',   sort: 'factory1' },
                    { key: 'factory2',             label: '생산공장2',   sort: 'factory2' },
                    { key: 'factory3',             label: '생산공장3',   sort: 'factory3' },
                    { key: 'releaseDate',          label: '출시일',      sort: 'releaseDate' },
                    { key: 'salesStatus',          label: '판매상태',    sort: null },
                    { key: 'partsRetentionPeriod', label: '부품보유기간 만료일', sort: 'partsRetentionPeriod' },
                    { key: 'dataSource',           label: '데이터출처',  sort: 'dataSource' },
                  ] as { key: string; label: string; sort: SortKey | null }[]).map(col => (
                    <th key={col.key} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      {col.sort ? (
                        <button onClick={() => handleSort(col.sort!)} className="group flex items-center gap-1.5 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                          {col.label} <SortIcon col={col.sort} />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                  <th className="px-5 py-4 bg-gray-50/50 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : paginated.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{p.productCode}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-500">{p.barcode}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{p.name}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.brandCategory}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.midCategory}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.subCategory}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{p.factory1}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{p.factory2 ?? '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{p.factory3 ?? '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{p.releaseDate}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${SALES_STATUS_STYLES[p.salesStatus]}`}>
                        {p.salesStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{fmtRetention(p.partsRetentionPeriod)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        p.dataSource === 'SAP' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.dataSource}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {p.dataSource === 'PS' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/${langCode}/products/${p.id}/edit`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`"${p.name}" 제품을 삭제하시겠습니까?`)) deleteProduct(p.id)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
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
