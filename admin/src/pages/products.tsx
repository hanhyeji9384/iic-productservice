import { useState, useMemo } from 'react'
import { Search, ChevronDown, X, ArrowUp, ArrowDown, ArrowUpDown, Download, Check, Clock, List } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { useProducts } from '@/lib/products-context'
import { BRANCHES } from '@/lib/mock-data'
import type { Product, ProductChangeLog, SalesStatus } from '@/lib/types'

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

type SortKey = 'productCode' | 'name' | 'brandCategory' | 'midCategory' | 'subCategory' | 'hasDecoration' | 'isRestorationRepair'
  | 'factory1' | 'factory2' | 'factory3' | 'releaseDate' | 'partsRetentionPeriod'
type Tab = 'list' | 'history'

const ITEMS_PER_PAGE = 15
const HISTORY_PER_PAGE = 15

const CHANGE_TYPE_STYLES: Record<ProductChangeLog['changeType'], { bg: string; label: string }> = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
}

const initFilters = {
  brand: 'all', salesStatus: 'all',
  midCategory: 'all', subCategory: 'all',
  factory1: 'all', factory2: 'all', factory3: 'all',
  releaseDateFrom: '', releaseDateTo: '',
  partsRetentionFrom: '', partsRetentionTo: '',
  decoration: 'all',
  restorationRepair: 'all',
}
type Filters = typeof initFilters

const DEFAULT_DECORATION_PRODUCT_IDS = new Set(['P01', 'P02', 'P06', 'P08', 'P10', 'P11', 'P12', 'P14', 'P20', 'P21', 'P22'])

function hasDecorationProduct(product: Product) {
  return product.hasDecoration ?? DEFAULT_DECORATION_PRODUCT_IDS.has(product.id)
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(b => b.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

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
  const { products, productChangeLogs, updateStockFields } = useProducts()

  const branchOptions = useMemo(() => {
    const codes = [...new Set(products.map(p => p.branchCode).filter(Boolean))] as string[]
    return BRANCHES.filter(branch => codes.includes(branch.code))
  }, [products])
  const [activeBranch, setActiveBranch] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const effectiveBranch = activeBranch || branchOptions[0]?.code || ''

  const branchProducts = useMemo(() =>
    products.filter(product => !effectiveBranch || product.branchCode === effectiveBranch),
    [products, effectiveBranch]
  )

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [decorationValue, setDecorationValue] = useState<'true' | 'false'>('true')
  const [restorationRepairValue, setRestorationRepairValue] = useState<'true' | 'false'>('true')
  const [historyPage, setHistoryPage] = useState(1)

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

  const brands     = useMemo(() => [...new Set(branchProducts.map(p => p.brandCategory))], [branchProducts])
  const midCats    = useMemo(() => [...new Set(branchProducts.map(p => p.midCategory))], [branchProducts])
  const subCats    = useMemo(() => {
    const base = filters.midCategory === 'all' ? branchProducts : branchProducts.filter(p => p.midCategory === filters.midCategory)
    return [...new Set(base.map(p => p.subCategory))]
  }, [filters.midCategory, branchProducts])
  const factories1 = useMemo(() => [...new Set(branchProducts.map(p => p.factory1))], [branchProducts])
  const factories2 = useMemo(() => [...new Set(branchProducts.map(p => p.factory2).filter(Boolean) as string[])], [branchProducts])
  const factories3 = useMemo(() => [...new Set(branchProducts.map(p => p.factory3).filter(Boolean) as string[])], [branchProducts])

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(k => applied[k] !== initFilters[k] && applied[k] !== '').length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.toLowerCase()
    return branchProducts.filter(p => {
      if (q && !p.productCode.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q)) return false
      if (applied.brand !== 'all' && p.brandCategory !== applied.brand) return false
      if (applied.midCategory !== 'all' && p.midCategory !== applied.midCategory) return false
      if (applied.subCategory !== 'all' && p.subCategory !== applied.subCategory) return false
      if (applied.factory1 !== 'all' && p.factory1 !== applied.factory1) return false
      if (applied.factory2 !== 'all' && p.factory2 !== applied.factory2) return false
      if (applied.factory3 !== 'all' && p.factory3 !== applied.factory3) return false
      if (applied.salesStatus !== 'all' && p.salesStatus !== applied.salesStatus) return false
      if (applied.decoration !== 'all' && hasDecorationProduct(p) !== (applied.decoration === 'true')) return false
      if (applied.restorationRepair !== 'all' && isRestorationRepairProduct(p) !== (applied.restorationRepair === 'true')) return false
      if (applied.releaseDateFrom && p.releaseDate < applied.releaseDateFrom) return false
      if (applied.releaseDateTo && p.releaseDate > applied.releaseDateTo) return false
      if (applied.partsRetentionFrom && p.partsRetentionPeriod < applied.partsRetentionFrom) return false
      if (applied.partsRetentionTo && p.partsRetentionPeriod > applied.partsRetentionTo) return false
      return true
    })
  }, [appliedSearch, applied, branchProducts])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'hasDecoration' ? hasDecorationProduct(a) : a[sortKey as keyof Product]
      const bv = sortKey === 'hasDecoration' ? hasDecorationProduct(b) : b[sortKey as keyof Product]
      const sortableA = sortKey === 'isRestorationRepair' ? isRestorationRepairProduct(a) : av
      const sortableB = sortKey === 'isRestorationRepair' ? isRestorationRepairProduct(b) : bv
      if (sortableA == null && sortableB == null) return 0
      if (sortableA == null) return 1
      if (sortableB == null) return -1
      if (typeof sortableA === 'number' && typeof sortableB === 'number') return (sortableA - sortableB) * dir
      return (String(sortableA) < String(sortableB) ? -1 : String(sortableA) > String(sortableB) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const paginatedLogs = productChangeLogs.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
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

  function handleExport() {
    const headers = ['제품코드','바코드','제품명','브랜드','중분류','소분류','장식보유여부','복원수리','생산공장1','생산공장2','생산공장3','출시일','부품보유기간']
    const rows = filtered.map(p => [
      p.productCode, p.barcode, p.name, p.brandCategory, p.midCategory, p.subCategory,
      hasDecorationProduct(p) ? 'Y' : 'N',
      isRestorationRepairProduct(p) ? 'Y' : 'N',
      p.factory1, p.factory2 ?? '', p.factory3 ?? '',
      p.releaseDate, p.partsRetentionPeriod,
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

  function handleSearch() { setAppliedSearch(search); setApplied(filters); setPage(1); setSelected(new Set()) }
  function handleReset() {
    setSearch(''); setAppliedSearch(''); setFilters(initFilters); setApplied(initFilters); setPage(1); setSelected(new Set())
  }
  function handleBranchChange(branchCode: string) {
    setActiveBranch(branchCode)
    setPage(1)
    setSelected(new Set())
  }
  function handleDecorationApply() {
    selected.forEach(id => updateStockFields(id, { hasDecoration: decorationValue === 'true' }))
    setSelected(new Set())
  }
  function handleRestorationRepairApply() {
    selected.forEach(id => updateStockFields(id, { isRestorationRepair: restorationRepairValue === 'true' }))
    setSelected(new Set())
  }

  const tabs = [
    { key: 'list' as const, label: '제품 목록', Icon: List },
    { key: 'history' as const, label: '변경 이력', Icon: Clock },
  ]

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1420px] space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">제품 관리</h1>
          {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Excel 다운로드
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

        {/* 필터 */}
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
              <div className="grid grid-cols-4 gap-3">
                <SelectFilter label="브랜드" value={filters.brand} onChange={set('brand')}>
                  <option value="all">전체</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
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
              <div className="grid grid-cols-5 gap-3">
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
                <SelectFilter label="장식보유여부" value={filters.decoration} onChange={set('decoration')}>
                  <option value="all">전체</option>
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </SelectFilter>
                <SelectFilter label="복원수리" value={filters.restorationRepair} onChange={set('restorationRepair')}>
                  <option value="all">전체</option>
                  <option value="true">Y</option>
                  <option value="false">N</option>
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
                    { key: 'barcode',              label: '바코드',      sort: null },
                    { key: 'name',                 label: '제품명',      sort: 'name' },
                    { key: 'brandCategory',        label: '브랜드',      sort: 'brandCategory' },
                    { key: 'midCategory',          label: '중분류',      sort: 'midCategory' },
                    { key: 'subCategory',          label: '소분류',      sort: 'subCategory' },
                    { key: 'hasDecoration',        label: '장식보유여부', sort: 'hasDecoration' },
                    { key: 'isRestorationRepair',  label: '복원수리',    sort: 'isRestorationRepair' },
                    { key: 'factory1',             label: '생산공장1',   sort: 'factory1' },
                    { key: 'factory2',             label: '생산공장2',   sort: 'factory2' },
                    { key: 'factory3',             label: '생산공장3',   sort: 'factory3' },
                    { key: 'releaseDate',          label: '출시일',      sort: 'releaseDate' },
                    { key: 'salesStatus',          label: '판매상태',    sort: null },
                    { key: 'partsRetentionPeriod', label: '부품보유기간 만료일', sort: 'partsRetentionPeriod' },
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
                    <td colSpan={15} className="px-6 py-12 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : paginated.map(p => {
                  const isSelected = selected.has(p.id)
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
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-500">{p.barcode}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{p.name}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.brandCategory}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.midCategory}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.subCategory}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          hasDecorationProduct(p) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {hasDecorationProduct(p) ? 'Y' : 'N'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          isRestorationRepairProduct(p) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isRestorationRepairProduct(p) ? 'Y' : 'N'}
                        </span>
                      </td>
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
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">대상 제품</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50">변경 내용</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">처리자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">변경 이력이 없습니다.</td>
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
                          <div className="text-sm font-semibold text-gray-900">{log.productName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.productCode}</div>
                        </td>
                        <td className="px-5 py-3.5"><SummaryCell summary={log.summary} changeType={log.changeType} /></td>
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
            <Pagination total={productChangeLogs.length} perPage={HISTORY_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
          </div>
        )}

        {activeTab === 'list' && selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-gray-700">
              <span className="text-sm font-semibold whitespace-nowrap">{selected.size}개 선택</span>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">장식보유여부</span>
                <select
                  value={decorationValue}
                  onChange={e => setDecorationValue(e.target.value as 'true' | 'false')}
                  className="w-20 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </div>
              <button
                onClick={handleDecorationApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                장식 적용
              </button>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">복원수리</span>
                <select
                  value={restorationRepairValue}
                  onChange={e => setRestorationRepairValue(e.target.value as 'true' | 'false')}
                  className="w-20 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </div>
              <button
                onClick={handleRestorationRepairApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                복원 적용
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
