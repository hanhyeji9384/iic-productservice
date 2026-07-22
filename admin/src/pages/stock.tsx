import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Filter, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Pagination } from '@/components/pagination'
import { useProducts } from '@/lib/products-context'
import { getStockAdjustments } from '@/lib/prototype-storage'
import {
  buildAdjustmentPendingMap,
  createStockInventoryRows,
  formatStockNumber,
  type StockInventoryRow,
} from '@/lib/stock-inventory'
import type { Product } from '@/lib/types'

const ITEMS_PER_PAGE = 20
const PINNED_STOCK_COLUMN_WIDTH = 124

const VISIBLE_STOCK_SOURCES = [
  {
    branchCode: '1110',
    branchName: 'GM 본사',
    storeCode: '1100',
    storeName: 'GM 물류센터',
    locationCode: '1120',
    locationName: 'PS창고',
    quantityKey: 'threePlQuantity',
  },
  {
    branchCode: '1110',
    branchName: 'GM 본사',
    storeCode: 'E1008',
    storeName: 'GM_PS_국내',
    locationCode: '1110',
    locationName: '가용창고',
    quantityKey: 'psQuantity',
  },
] as const

const DEFAULT_STOCK_BRANCH_CODE = '1110'

type StockColumnKey = keyof StockInventoryRow | 'storeInfo' | 'locationInfo'

type StockColumn = {
  key: StockColumnKey
  label: string
  align?: 'right'
  mono?: boolean
  strong?: boolean
  filterType?: 'text' | 'select'
}

const STOCK_COLUMNS: StockColumn[] = [
  { key: 'storeInfo', label: '스토어 정보', filterType: 'select' },
  { key: 'locationInfo', label: '로케이션 정보', filterType: 'select' },
  { key: 'midCategory', label: '중분류', filterType: 'select' },
  { key: 'subCategory', label: '소분류', filterType: 'select' },
  { key: 'productName', label: '제품명' },
  { key: 'productCode', label: '제품코드', strong: true },
  { key: 'barcode', label: '바코드', mono: true },
  { key: 'onHandQty', label: '실재고수량', align: 'right', strong: true },
  { key: 'outboundWaitingQty', label: '출고대기', align: 'right' },
  { key: 'adjustmentWaitingQty', label: '조정대기', align: 'right' },
  { key: 'availableQty', label: '가용재고', align: 'right', strong: true },
]

const PINNED_STOCK_COLUMN_RIGHT: Partial<Record<StockColumnKey, number>> = {
  availableQty: 0,
  adjustmentWaitingQty: PINNED_STOCK_COLUMN_WIDTH,
  outboundWaitingQty: PINNED_STOCK_COLUMN_WIDTH * 2,
  onHandQty: PINNED_STOCK_COLUMN_WIDTH * 3,
}

function isPinnedStockColumn(key: StockColumnKey) {
  return PINNED_STOCK_COLUMN_RIGHT[key] !== undefined
}

function getPinnedStockColumnStyle(key: StockColumnKey) {
  if (!isPinnedStockColumn(key)) return undefined
  return {
    right: PINNED_STOCK_COLUMN_RIGHT[key],
    width: PINNED_STOCK_COLUMN_WIDTH,
    minWidth: PINNED_STOCK_COLUMN_WIDTH,
    maxWidth: PINNED_STOCK_COLUMN_WIDTH,
  }
}

function getPinnedStockColumnClass(key: StockColumnKey, area: 'head' | 'body', isFiltered = false) {
  if (!isPinnedStockColumn(key)) return ''
  const base = area === 'head'
    ? `sticky z-30 ${isFiltered ? 'bg-blue-50' : 'bg-gray-50'}`
    : 'sticky z-20 bg-white group-hover:bg-gray-50/70'
  const edge = key === 'onHandQty'
    ? 'shadow-[-10px_0_14px_-14px_rgba(15,23,42,0.65)]'
    : ''
  return `${base} ${edge}`
}

function getStoreInfo(row: StockInventoryRow) {
  return `${row.storeCode} | ${row.storeName}`
}

function getLocationInfo(row: StockInventoryRow) {
  return `${row.locationCode} | ${row.locationName}`
}

function getColumnRawValue(row: StockInventoryRow, key: StockColumnKey) {
  if (key === 'storeInfo') return getStoreInfo(row)
  if (key === 'locationInfo') return getLocationInfo(row)
  return row[key]
}

function getCellText(row: StockInventoryRow, key: StockColumnKey) {
  const value = getColumnRawValue(row, key)
  if (typeof value === 'number') {
    return formatStockNumber(value)
  }
  return value || '-'
}

function getFilterTarget(row: StockInventoryRow, key: StockColumnKey) {
  const value = getColumnRawValue(row, key)
  if (typeof value === 'number') {
    return `${value} ${formatStockNumber(value)}`
  }
  return String(value ?? '')
}

function getBranchLabel(branchCode: string) {
  const source = VISIBLE_STOCK_SOURCES.find(item => item.branchCode === branchCode)
  return source ? `${source.branchCode} ${source.branchName}` : branchCode
}

function isSelectFilterColumn(key: StockColumnKey) {
  return STOCK_COLUMNS.find(column => column.key === key)?.filterType === 'select'
}

function isVisibleStockProduct(product: Product) {
  return product.brandCategory === 'GENTLE MONSTER' && product.branchCode === '1110'
}

function resolveSourceQuantity(product: Product, source: typeof VISIBLE_STOCK_SOURCES[number]) {
  const explicitQuantity = product[source.quantityKey]
  if (typeof explicitQuantity === 'number') return explicitQuantity

  const psQuantity = product.psQuantity ?? Math.max(1, Math.round(product.quantity * 0.15))
  if (source.quantityKey === 'psQuantity') return Math.min(psQuantity, product.quantity)
  return Math.max(product.quantity - psQuantity, 0)
}

function applySourceToRow(
  row: StockInventoryRow,
  source: typeof VISIBLE_STOCK_SOURCES[number],
  onHandQty: number,
): StockInventoryRow {
  const outboundWaitingQty = Math.min(onHandQty, row.outboundWaitingQty)
  const adjustmentWaitingQty = Math.min(onHandQty, row.adjustmentWaitingQty)

  return {
    ...row,
    branchCode: source.branchCode,
    branchName: source.branchName,
    storeCode: source.storeCode,
    storeName: source.storeName,
    locationCode: source.locationCode,
    locationName: source.locationName,
    onHandQty,
    outboundWaitingQty,
    adjustmentWaitingQty,
    availableQty: Math.max(onHandQty - outboundWaitingQty - adjustmentWaitingQty, 0),
    erpQty: onHandQty,
    stockDiffQty: 0,
  }
}

function createVisibleStockRows(products: Product[], adjustmentPendingByProduct: Record<string, number>) {
  const visibleProducts = products.filter(isVisibleStockProduct)
  const baseRows = createStockInventoryRows(visibleProducts, { adjustmentPendingByProduct })

  return baseRows.flatMap((row, index) => {
    const product = visibleProducts[index]
    if (!product) return []

    return VISIBLE_STOCK_SOURCES
      .map(source => applySourceToRow(row, source, resolveSourceQuantity(product, source)))
      .filter(sourceRow => sourceRow.onHandQty > 0)
  })
}

export function StockPage() {
  const { products } = useProducts()
  const [refreshTick, setRefreshTick] = useState(0)
  const [page, setPage] = useState(1)
  const [activeBranch, setActiveBranch] = useState(DEFAULT_STOCK_BRANCH_CODE)
  const [appliedBranch, setAppliedBranch] = useState(DEFAULT_STOCK_BRANCH_CODE)
  const [sortKey, setSortKey] = useState<StockColumnKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [filterPopover, setFilterPopover] = useState<{ col: StockColumnKey; rect: DOMRect } | null>(null)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<StockColumnKey, string>>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Partial<Record<StockColumnKey, string>>>({})

  const rows = useMemo(() => {
    const adjustmentPendingByProduct = buildAdjustmentPendingMap(getStockAdjustments())
    return createVisibleStockRows(products, adjustmentPendingByProduct)
  }, [products, refreshTick])

  const branchOptions = useMemo(() => {
    const availableBranches = new Set(rows.map(row => row.branchCode).filter(Boolean))
    const seen = new Set<string>()
    const options = VISIBLE_STOCK_SOURCES.filter(source => {
      if (!availableBranches.has(source.branchCode) || seen.has(source.branchCode)) return false
      seen.add(source.branchCode)
      return true
    })
    return options.length ? options : VISIBLE_STOCK_SOURCES.filter((source, index, list) => (
      list.findIndex(item => item.branchCode === source.branchCode) === index
    ))
  }, [rows])

  const selectFilterOptions = useMemo(() => {
    const sourceRows = activeBranch ? rows.filter(row => row.branchCode === activeBranch) : rows
    const buildOptions = (key: StockColumnKey) => {
      const seen = new Set<string>()
      return sourceRows
        .map(row => getFilterTarget(row, key).trim())
        .filter(value => {
          if (!value || seen.has(value)) return false
          seen.add(value)
          return true
        })
        .sort((a, b) => a.localeCompare(b, 'ko'))
    }

    return {
      storeInfo: buildOptions('storeInfo'),
      locationInfo: buildOptions('locationInfo'),
      midCategory: buildOptions('midCategory'),
      subCategory: buildOptions('subCategory'),
    }
  }, [activeBranch, rows])

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (appliedBranch && row.branchCode !== appliedBranch) return false
      return Object.entries(appliedColumnFilters).every(([key, value]) => {
        const query = String(value ?? '').trim().toLowerCase()
        if (!query) return true
        const columnKey = key as StockColumnKey
        const target = getFilterTarget(row, columnKey).toLowerCase()
        return isSelectFilterColumn(columnKey) ? target === query : target.includes(query)
      })
    })
  }, [appliedBranch, appliedColumnFilters, rows])

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return filteredRows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredRows].sort((a, b) => {
      const av = getColumnRawValue(a, sortKey)
      const bv = getColumnRawValue(b, sortKey)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'ko') * dir
    })
  }, [filteredRows, sortDir, sortKey])

  const paginatedRows = sortedRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const hasColumnFilter = Object.values(appliedColumnFilters).some(value => String(value ?? '').trim())
  const hasDraftColumnFilter = Object.values(columnFilters).some(value => String(value ?? '').trim())
  const hasAnyFilter = appliedBranch !== DEFAULT_STOCK_BRANCH_CODE || hasColumnFilter
  const showReset = hasAnyFilter || activeBranch !== DEFAULT_STOCK_BRANCH_CODE || hasDraftColumnFilter

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [filteredRows.length, page])

  function reload() {
    setRefreshTick(value => value + 1)
    setPage(1)
  }

  function handleSort(key: StockColumnKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }
    setSortKey(null)
    setSortDir(null)
  }

  function SortIcon({ col }: { col: StockColumnKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 flex-shrink-0 text-gray-300 group-hover:text-gray-400" />
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 flex-shrink-0 text-gray-700" />
    return <ArrowDown className="h-3 w-3 flex-shrink-0 text-gray-700" />
  }

  function applyFilter(key: StockColumnKey, value?: string) {
    const normalized = value?.trim()
    const updateFilters = (prev: Partial<Record<StockColumnKey, string>>) => {
      const next = { ...prev }
      if (!normalized) delete next[key]
      else next[key] = normalized
      return next
    }
    setColumnFilters(updateFilters)
    setAppliedColumnFilters(updateFilters)
    setPage(1)
    setFilterPopover(null)
  }

  function applyCurrentFilter(key: StockColumnKey) {
    applyFilter(key, columnFilters[key])
  }

  function handleResetFilters() {
    setActiveBranch(DEFAULT_STOCK_BRANCH_CODE)
    setAppliedBranch(DEFAULT_STOCK_BRANCH_CODE)
    setColumnFilters({})
    setAppliedColumnFilters({})
    setSortKey(null)
    setSortDir(null)
    setPage(1)
    setFilterPopover(null)
  }

  function handleExport() {
    const headers = STOCK_COLUMNS.map(column => column.label)
    const exportRows = sortedRows.map(row => STOCK_COLUMNS.map(column => getCellText(row, column.key)))
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportRows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '재고 현황')
    XLSX.writeFile(workbook, `stock_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function renderFilterPopoverContent(col: StockColumnKey) {
    const label = STOCK_COLUMNS.find(column => column.key === col)?.label ?? '검색'
    if (isSelectFilterColumn(col)) {
      const options = selectFilterOptions[col as keyof typeof selectFilterOptions] ?? []
      return (
        <div className="w-64 space-y-1.5">
          <select
            value={columnFilters[col] ?? ''}
            onChange={event => setColumnFilters(prev => ({ ...prev, [col]: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none transition-colors focus:border-gray-300"
          >
            <option value="">전체</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            {columnFilters[col] && (
              <button
                type="button"
                onClick={() => applyFilter(col)}
                className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                지우기
              </button>
            )}
            <button
              type="button"
              onClick={() => applyCurrentFilter(col)}
              className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              적용
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="w-52 space-y-1.5">
        <input
          type="text"
          value={columnFilters[col] ?? ''}
          onChange={event => setColumnFilters(prev => ({ ...prev, [col]: event.target.value }))}
          onKeyDown={event => event.key === 'Enter' && applyCurrentFilter(col)}
          placeholder={`${label} 검색...`}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition-colors focus:border-gray-300"
        />
        <div className="flex gap-1.5">
          {columnFilters[col] && (
            <button
              type="button"
              onClick={() => applyFilter(col)}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              지우기
            </button>
          )}
          <button
            type="button"
            onClick={() => applyCurrentFilter(col)}
            className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
          >
            적용
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 현황</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Excel 다운로드
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
            <label className="flex items-center">
              <span className="sr-only">법인</span>
              <select
                value={activeBranch}
                onChange={event => {
                  const nextBranch = event.target.value || DEFAULT_STOCK_BRANCH_CODE
                  const clearLocationFilters = (prev: Partial<Record<StockColumnKey, string>>) => {
                    const next = { ...prev }
                    delete next.storeInfo
                    delete next.locationInfo
                    return next
                  }
                  setActiveBranch(nextBranch)
                  setAppliedBranch(nextBranch)
                  setColumnFilters(clearLocationFilters)
                  setAppliedColumnFilters(clearLocationFilters)
                  setPage(1)
                  setFilterPopover(null)
                }}
                className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-normal text-gray-700 outline-none transition-colors focus:border-gray-400"
              >
                {branchOptions.map(branch => (
                  <option key={branch.branchCode} value={branch.branchCode}>{getBranchLabel(branch.branchCode)}</option>
                ))}
              </select>
            </label>
            {showReset && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
              >
                초기화
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1680px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  {STOCK_COLUMNS.map(column => {
                    const isFiltered = !!appliedColumnFilters[column.key]
                    return (
                      <th
                        key={column.key}
                        style={getPinnedStockColumnStyle(column.key)}
                        className={`whitespace-nowrap px-4 py-3 align-top ${column.align === 'right' ? 'text-right' : 'text-left'} ${isFiltered ? 'bg-blue-50 text-blue-700' : ''} ${getPinnedStockColumnClass(column.key, 'head', isFiltered)}`}
                      >
                        <div className={`flex items-center gap-1.5 ${column.align === 'right' ? 'justify-end' : ''}`}>
                          <button
                            type="button"
                            onClick={() => handleSort(column.key)}
                            className={`group flex items-center gap-1 text-[11px] font-semibold tracking-normal transition-colors hover:text-gray-700 ${column.align === 'right' ? 'justify-end' : ''}`}
                          >
                            {column.label}
                            <SortIcon col={column.key} />
                          </button>
                          <button
                            type="button"
                            onClick={event => {
                              const rect = event.currentTarget.getBoundingClientRect()
                              setFilterPopover(current => current?.col === column.key ? null : { col: column.key, rect })
                            }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${filterPopover?.col === column.key || isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="h-3 w-3" />
                          </button>
                        </div>
                        {isFiltered && (
                          <div className={`mt-1 max-w-[140px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600 ${column.align === 'right' ? 'ml-auto' : ''}`}>
                            {appliedColumnFilters[column.key]}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={STOCK_COLUMNS.length} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : paginatedRows.map((row) => (
                  <tr key={`${row.branchCode}-${row.storeCode}-${row.locationCode}-${row.productCode}`} className="group hover:bg-gray-50/70">
                    {STOCK_COLUMNS.map(column => (
                      <td
                        key={column.key}
                        style={getPinnedStockColumnStyle(column.key)}
                        className={`whitespace-nowrap px-4 py-3 ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.mono ? 'font-mono text-[11px] text-gray-500' : ''} ${column.strong ? 'font-semibold text-gray-900' : 'text-gray-700'} ${getPinnedStockColumnClass(column.key, 'body')}`}
                      >
                        {getCellText(row, column.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredRows.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </section>
      </div>

      {filterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
          <div
            data-filter-popover
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
    </div>
  )
}
