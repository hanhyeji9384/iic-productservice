import { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react'
import { X, ArrowUp, ArrowDown, ArrowUpDown, Download, Check, Clock, List, Filter, FileDown, Upload } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { downloadCsv } from '@/lib/csv'
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
type BulkYnValue = 'keep' | 'true' | 'false'

const ITEMS_PER_PAGE = 15
const HISTORY_PER_PAGE = 15

const CHANGE_TYPE_STYLES: Record<ProductChangeLog['changeType'], { bg: string; label: string }> = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
}

const DEFAULT_DECORATION_PRODUCT_IDS = new Set(['P01', 'P02', 'P06', 'P08', 'P10', 'P11', 'P12', 'P14', 'P20', 'P21', 'P22'])

function hasDecorationProduct(product: Product) {
  return product.hasDecoration ?? DEFAULT_DECORATION_PRODUCT_IDS.has(product.id)
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
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

function parseYn(value: string) {
  const normalized = value.trim().toLowerCase()
  if (['y', 'yes', 'true', '1', '예'].includes(normalized)) return true
  if (['n', 'no', 'false', '0', '아니오'].includes(normalized)) return false
  return undefined
}

function parseProductManagementUpdates(text: string) {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter(line => line.trim())

  const [headerLine, ...bodyLines] = lines
  if (!headerLine) return { rows: [], invalidCount: 0 }

  const headers = parseCsvLine(headerLine).map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(header => aliases.includes(header))
  const productCodeIdx = idx(['제품코드', 'productcode'])
  const decorationIdx = idx(['변경장식보유여부', '장식보유여부', 'hasdecoration', 'decoration'])
  const restorationIdx = idx(['변경복원수리', '복원수리', 'isrestorationrepair', 'restorationrepair'])

  if (productCodeIdx < 0 || (decorationIdx < 0 && restorationIdx < 0)) return { rows: [], invalidCount: 0 }

  let invalidCount = 0
  const rows: Array<{ productCode: string; hasDecoration?: boolean; isRestorationRepair?: boolean }> = []

  bodyLines.forEach(line => {
    const cells = parseCsvLine(line)
    const productCode = cells[productCodeIdx]?.trim() ?? ''
    const hasDecoration = decorationIdx >= 0 ? parseYn(cells[decorationIdx] ?? '') : undefined
    const isRestorationRepair = restorationIdx >= 0 ? parseYn(cells[restorationIdx] ?? '') : undefined

    if (!productCode) {
      invalidCount += 1
      return
    }
    if (hasDecoration === undefined && isRestorationRepair === undefined) return
    rows.push({ productCode, hasDecoration, isRestorationRepair })
  })

  return { rows, invalidCount }
}

export function ProductsPage() {
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const { products, productChangeLogs, updateProductManagementFields } = useProducts()

  const branchOptions = useMemo(() => {
    const codes = [...new Set(products.map(p => p.branchCode).filter(Boolean))] as string[]
    return BRANCHES.filter(branch => codes.includes(branch.code))
  }, [products])
  const defaultBranchCode = branchOptions.find(branch => branch.code === '1110')?.code ?? branchOptions[0]?.code ?? ''
  const defaultBranchFilter = useMemo<Record<string, string>>(
    () => {
      const filter: Record<string, string> = {}
      if (defaultBranchCode) filter.branch = defaultBranchCode
      return filter
    },
    [defaultBranchCode]
  )
  const [activeTab, setActiveTab] = useState<Tab>('list')

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => ({ ...defaultBranchFilter }))
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>(() => ({ ...defaultBranchFilter }))
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [decorationValue, setDecorationValue] = useState<BulkYnValue>('keep')
  const [restorationRepairValue, setRestorationRepairValue] = useState<BulkYnValue>('keep')
  const [historyPage, setHistoryPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadResult, setUploadResult] = useState('')

  useEffect(() => {
    if (!defaultBranchCode) return
    if (appliedColumnFilters.branch) return
    setColumnFilters(prev => ({ ...prev, branch: defaultBranchCode }))
    setAppliedColumnFilters(prev => ({ ...prev, branch: defaultBranchCode }))
  }, [appliedColumnFilters.branch, defaultBranchCode])

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
    const midCatFilter = columnFilters.midCategory
    const base = midCatFilter ? products.filter(p => p.midCategory === midCatFilter) : products
    return [...new Set(base.map(p => p.subCategory))]
  }, [columnFilters.midCategory, products])
  const factories1 = useMemo(() => [...new Set(products.map(p => p.factory1))], [products])
  const factories2 = useMemo(() => [...new Set(products.map(p => p.factory2).filter(Boolean) as string[])], [products])
  const factories3 = useMemo(() => [...new Set(products.map(p => p.factory3).filter(Boolean) as string[])], [products])
  const partsRetentionOptions = useMemo(() =>
    [...new Set(products.map(p => p.partsRetentionPeriod).filter(Boolean) as string[])].sort(),
    [products]
  )

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (appliedColumnFilters.branch && p.branchCode !== appliedColumnFilters.branch) return false
      if (appliedColumnFilters.productCode && !p.productCode.toLowerCase().includes(appliedColumnFilters.productCode.toLowerCase())) return false
      if (appliedColumnFilters.name && !p.name.toLowerCase().includes(appliedColumnFilters.name.toLowerCase())) return false
      if (appliedColumnFilters.barcode && !p.barcode.toLowerCase().includes(appliedColumnFilters.barcode.toLowerCase())) return false
      if (appliedColumnFilters.salesStatus && p.salesStatus !== appliedColumnFilters.salesStatus) return false
      if (appliedColumnFilters.brand && p.brandCategory !== appliedColumnFilters.brand) return false
      if (appliedColumnFilters.midCategory && p.midCategory !== appliedColumnFilters.midCategory) return false
      if (appliedColumnFilters.subCategory && p.subCategory !== appliedColumnFilters.subCategory) return false
      if (appliedColumnFilters.factory1 && p.factory1 !== appliedColumnFilters.factory1) return false
      if (appliedColumnFilters.factory2 && p.factory2 !== appliedColumnFilters.factory2) return false
      if (appliedColumnFilters.factory3 && p.factory3 !== appliedColumnFilters.factory3) return false
      if (appliedColumnFilters.decoration && hasDecorationProduct(p) !== (appliedColumnFilters.decoration === 'true')) return false
      if (appliedColumnFilters.restorationRepair && isRestorationRepairProduct(p) !== (appliedColumnFilters.restorationRepair === 'true')) return false
      if (appliedColumnFilters.releaseDateFrom && p.releaseDate < appliedColumnFilters.releaseDateFrom) return false
      if (appliedColumnFilters.releaseDateTo && p.releaseDate > appliedColumnFilters.releaseDateTo) return false
      if (appliedColumnFilters.partsRetention && p.partsRetentionPeriod !== appliedColumnFilters.partsRetention) return false
      return true
    })
  }, [appliedColumnFilters, products])

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
    downloadCsv(
      `products_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드','바코드','제품명','브랜드','중분류','소분류','장식보유여부','복원수리','생산공장1','생산공장2','생산공장3','출시일','부품보유기간'],
      sorted.map(p => [
        p.productCode, p.barcode, p.name, p.brandCategory, p.midCategory, p.subCategory,
        hasDecorationProduct(p) ? 'Y' : 'N',
        isRestorationRepairProduct(p) ? 'Y' : 'N',
        p.factory1, p.factory2 ?? '', p.factory3 ?? '',
        p.releaseDate, p.partsRetentionPeriod,
      ])
    )
  }

  function handleUploadTemplateDownload() {
    downloadCsv(
      `products_bulk_update_template_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품코드', '제품명', '현재 장식보유여부', '변경 장식보유여부', '현재 복원수리', '변경 복원수리'],
      sorted.map(product => [
        product.productCode,
        product.name,
        hasDecorationProduct(product) ? 'Y' : 'N',
        '',
        isRestorationRepairProduct(product) ? 'Y' : 'N',
        '',
      ])
    )
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, invalidCount } = parseProductManagementUpdates(await file.text())
    event.target.value = ''

    if (rows.length === 0) {
      setUploadResult(invalidCount > 0 ? `오류 ${invalidCount}건 — 제품코드가 비어있습니다.` : '업로드 항목을 찾지 못했습니다.')
      return
    }

    const changedCount = updateProductManagementFields(rows)
    setUploadOpen(false)
    setSelected(new Set())
    setUploadResult(
      invalidCount > 0
        ? `${changedCount}건 변경 완료, ${invalidCount}건 오류(제품코드 누락)`
        : `${changedCount}건 변경 완료`
    )
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
    setColumnFilters({ ...defaultBranchFilter })
    setAppliedColumnFilters({ ...defaultBranchFilter })
    setPage(1)
    setSelected(new Set())
    setUploadOpen(false)
    setDecorationValue('keep')
    setRestorationRepairValue('keep')
  }

  function handleBulkManagementApply() {
    if (decorationValue === 'keep' && restorationRepairValue === 'keep') {
      setUploadResult('변경할 값을 선택해 주세요.')
      return
    }

    const updates = products
      .filter(product => selected.has(product.id))
      .map(product => ({
        productCode: product.productCode,
        hasDecoration: decorationValue === 'keep' ? undefined : decorationValue === 'true',
        isRestorationRepair: restorationRepairValue === 'keep' ? undefined : restorationRepairValue === 'true',
      }))

    const changedCount = updateProductManagementFields(updates)
    setUploadResult(`${changedCount}건 변경 완료`)
    setSelected(new Set())
    setDecorationValue('keep')
    setRestorationRepairValue('keep')
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function getAppliedFilterDisplay(col: string): string {
    switch (col) {
      case 'decoration':
      case 'restorationRepair':
        return appliedColumnFilters[col] === 'true' ? 'Y' : 'N'
      case 'releaseDate': {
        const from = appliedColumnFilters.releaseDateFrom
        const to = appliedColumnFilters.releaseDateTo
        if (from && to) return `${from} ~ ${to}`
        if (from) return `${from} ~`
        if (to) return `~ ${to}`
        return ''
      }
      case 'partsRetention':
        return fmtRetention(appliedColumnFilters.partsRetention ?? '')
      default:
        return appliedColumnFilters[col] ?? ''
    }
  }

  function isColFiltered(col: string): boolean {
    switch (col) {
      case 'releaseDate':
        return !!(appliedColumnFilters.releaseDateFrom || appliedColumnFilters.releaseDateTo)
      case 'partsRetention':
        return !!appliedColumnFilters.partsRetention
      default:
        return !!appliedColumnFilters[col]
    }
  }

  function renderFilterPopoverContent(col: string) {
    switch (col) {
      case 'brand':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ brand: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.brand ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {brands.map(b => (
              <button key={b} onClick={() => applyFilter({ brand: b })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.brand === b ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{b}</button>
            ))}
          </div>
        )
      case 'midCategory':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ midCategory: undefined, subCategory: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.midCategory ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {midCats.map(c => (
              <button key={c} onClick={() => applyFilter({ midCategory: c, subCategory: undefined })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.midCategory === c ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{c}</button>
            ))}
          </div>
        )
      case 'subCategory':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ subCategory: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.subCategory ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {subCats.map(c => (
              <button key={c} onClick={() => applyFilter({ subCategory: c })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.subCategory === c ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{c}</button>
            ))}
          </div>
        )
      case 'factory1':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ factory1: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.factory1 ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {factories1.map(f => (
              <button key={f} onClick={() => applyFilter({ factory1: f })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.factory1 === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{f}</button>
            ))}
          </div>
        )
      case 'factory2':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ factory2: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.factory2 ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {factories2.map(f => (
              <button key={f} onClick={() => applyFilter({ factory2: f })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.factory2 === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{f}</button>
            ))}
          </div>
        )
      case 'factory3':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ factory3: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.factory3 ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {factories3.map(f => (
              <button key={f} onClick={() => applyFilter({ factory3: f })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.factory3 === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{f}</button>
            ))}
          </div>
        )
      case 'decoration':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ decoration: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.decoration ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            <button onClick={() => applyFilter({ decoration: 'true' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.decoration === 'true' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >Y</button>
            <button onClick={() => applyFilter({ decoration: 'false' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.decoration === 'false' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >N</button>
          </div>
        )
      case 'restorationRepair':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ restorationRepair: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.restorationRepair ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            <button onClick={() => applyFilter({ restorationRepair: 'true' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.restorationRepair === 'true' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >Y</button>
            <button onClick={() => applyFilter({ restorationRepair: 'false' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.restorationRepair === 'false' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >N</button>
          </div>
        )
      case 'releaseDate':
        return (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">출시일 범위</p>
            <div className="space-y-1.5">
              <input type="date" value={columnFilters.releaseDateFrom ?? ''}
                onChange={e => setColumnFilters(prev => ({ ...prev, releaseDateFrom: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400"
                placeholder="시작" />
              <span className="block text-center text-gray-300 text-xs">~</span>
              <input type="date" value={columnFilters.releaseDateTo ?? ''}
                onChange={e => setColumnFilters(prev => ({ ...prev, releaseDateTo: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400"
                placeholder="종료" />
            </div>
            <div className="flex gap-1.5 pt-1">
              {(columnFilters.releaseDateFrom || columnFilters.releaseDateTo) && (
                <button onClick={() => applyFilter({ releaseDateFrom: undefined, releaseDateTo: undefined })}
                  className="flex-1 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1.5 border border-gray-200 rounded-lg"
                >초기화</button>
              )}
              <button onClick={applyCurrentFilters}
                className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >적용</button>
            </div>
          </div>
        )
      case 'partsRetention':
        return (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button onClick={() => applyFilter({ partsRetention: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.partsRetention ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {partsRetentionOptions.map(v => (
              <button key={v} onClick={() => applyFilter({ partsRetention: v })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.partsRetention === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{fmtRetention(v)}</button>
            ))}
          </div>
        )
      case 'productCode':
      case 'name':
      case 'barcode': {
        const placeholder = col === 'productCode' ? '제품코드 검색...' : col === 'name' ? '제품명 검색...' : '바코드 검색...'
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
      case 'salesStatus':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ salesStatus: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.salesStatus ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >전체</button>
            {(['사용중', '종료 예정', '판매 종료 (P)', '판매 종료 (C)'] as const).map(s => (
              <button key={s} onClick={() => applyFilter({ salesStatus: s })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.salesStatus === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{s}</button>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  const FILTERABLE_COLS = new Set([
    'productCode', 'barcode', 'name', 'salesStatus',
    'brandCategory', 'midCategory', 'subCategory', 'hasDecoration', 'isRestorationRepair',
    'factory1', 'factory2', 'factory3', 'releaseDate', 'partsRetentionPeriod',
  ])

  const COL_FILTER_KEY: Record<string, string> = {
    productCode: 'productCode',
    barcode: 'barcode',
    name: 'name',
    salesStatus: 'salesStatus',
    brandCategory: 'brand',
    midCategory: 'midCategory',
    subCategory: 'subCategory',
    hasDecoration: 'decoration',
    isRestorationRepair: 'restorationRepair',
    factory1: 'factory1',
    factory2: 'factory2',
    factory3: 'factory3',
    releaseDate: 'releaseDate',
    partsRetentionPeriod: 'partsRetention',
  }

  const tableColumns: { key: string; label: string; sort: SortKey | null }[] = [
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
  ]

  const tabs = [
    { key: 'list' as const, label: '제품 목록', Icon: List },
    { key: 'history' as const, label: '변경 이력', Icon: Clock },
  ]

  const hasAnyFilter = Object.entries(appliedColumnFilters).some(([key, value]) => key !== 'branch' && Boolean(value))

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
            <input ref={uploadInputRef} type="file" accept=".csv,text/csv" onChange={handleUpload} className="hidden" />
            <div className="relative">
              <button
                onClick={() => setUploadOpen(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  uploadOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                일괄 변경
              </button>
              {uploadOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">제품 변경사항 일괄 변경</p>
                      <p className="mt-0.5 text-xs text-gray-400">장식보유여부, 복원수리 Y/N 수정</p>
                    </div>
                    <button onClick={() => setUploadOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <button
                      onClick={handleUploadTemplateDownload}
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
                      onClick={() => uploadInputRef.current?.click()}
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
                setUploadOpen(false)
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
        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <select
              value={columnFilters.branch ?? defaultBranchCode}
              onChange={e => {
                const val = e.target.value
                setColumnFilters(prev => ({ ...prev, branch: val }))
                setAppliedColumnFilters(prev => ({ ...prev, branch: val }))
                setPage(1)
                setSelected(new Set())
              }}
              className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {branchOptions.map(b => (
                <option key={b.code} value={b.code}>{b.code} {b.name}</option>
              ))}
            </select>
            {hasAnyFilter && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3 h-3" />초기화
              </button>
            )}
          </div>
          {uploadResult && (
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3 text-sm text-gray-600">
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
                  {tableColumns.map(col => {
                    const filterKey = COL_FILTER_KEY[col.key]
                    const isFilterable = FILTERABLE_COLS.has(col.key)
                    const isFiltered = isFilterable ? isColFiltered(filterKey) : false
                    return (
                      <th
                        key={col.key}
                        className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap align-top ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.sort ? (
                            <button
                              onClick={() => handleSort(col.sort!)}
                              className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide"
                            >
                              {col.label} <SortIcon col={col.sort} />
                            </button>
                          ) : (
                            <span>{col.label}</span>
                          )}
                          {isFilterable && (
                            <button
                              onClick={e => handleFilterIconClick(filterKey, e)}
                              className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                                filterPopover?.col === filterKey || isFiltered
                                  ? 'text-blue-500'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                            >
                              <Filter className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {getAppliedFilterDisplay(filterKey)}
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
                  onChange={e => setDecorationValue(e.target.value as BulkYnValue)}
                  className="w-24 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="keep">유지</option>
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </div>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">복원수리</span>
                <select
                  value={restorationRepairValue}
                  onChange={e => setRestorationRepairValue(e.target.value as BulkYnValue)}
                  className="w-24 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="keep">유지</option>
                  <option value="true">Y</option>
                  <option value="false">N</option>
                </select>
              </div>
              <button
                onClick={handleBulkManagementApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                적용
              </button>
              <button
                onClick={() => {
                  setSelected(new Set())
                  setDecorationValue('keep')
                  setRestorationRepairValue('keep')
                }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
