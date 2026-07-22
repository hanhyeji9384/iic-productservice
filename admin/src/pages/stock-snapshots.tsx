import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, RefreshCw, Search, X } from 'lucide-react'
import {
  dateValue,
  todayStr,
} from '@/components/date-range-filter-bar'
import { Pagination } from '@/components/pagination'
import { useTableColumnControls, type TableControlColumn } from '@/components/table-column-controls'
import { downloadCsv } from '@/lib/csv'
import { getStockSnapshots } from '@/lib/prototype-storage'
import { formatStockNumber } from '@/lib/stock-inventory'
import type { StockSnapshotRow } from '@/lib/types'

const ITEMS_PER_PAGE = 20
const DEFAULT_SNAPSHOT_DATE = todayStr()
const PINNED_SNAPSHOT_COLUMN_WIDTH = 132

type SnapshotColumnKey = keyof StockSnapshotRow & string

const PINNED_SNAPSHOT_COLUMN_RIGHT: Partial<Record<SnapshotColumnKey, number>> = {
  stockDiffQty: 0,
  erpQty: PINNED_SNAPSHOT_COLUMN_WIDTH,
  availableQty: PINNED_SNAPSHOT_COLUMN_WIDTH * 2,
  adjustmentWaitingQty: PINNED_SNAPSHOT_COLUMN_WIDTH * 3,
  outboundWaitingQty: PINNED_SNAPSHOT_COLUMN_WIDTH * 4,
  onHandQty: PINNED_SNAPSHOT_COLUMN_WIDTH * 5,
}

function formatValue(value: unknown) {
  if (typeof value === 'number') return formatStockNumber(value)
  return String(value ?? '-')
}

function uniqueOptions<T>(items: T[], getValue: (item: T) => string, getLabel: (item: T) => string) {
  const seen = new Set<string>()
  return items
    .map(item => ({ value: getValue(item), label: getLabel(item) }))
    .filter(option => {
      if (!option.value || option.value === '-' || seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'))
}

function getStoreInfo(row: StockSnapshotRow) {
  return `${row.storeCode} / ${row.storeName}`
}

function getLocationInfo(row: StockSnapshotRow) {
  return `${row.locationCode} / ${row.locationName}`
}

function isPinnedSnapshotColumn(key: SnapshotColumnKey) {
  return PINNED_SNAPSHOT_COLUMN_RIGHT[key] !== undefined
}

function getPinnedSnapshotColumnStyle(key: SnapshotColumnKey) {
  if (!isPinnedSnapshotColumn(key)) return undefined
  return {
    right: PINNED_SNAPSHOT_COLUMN_RIGHT[key],
    width: PINNED_SNAPSHOT_COLUMN_WIDTH,
    minWidth: PINNED_SNAPSHOT_COLUMN_WIDTH,
    maxWidth: PINNED_SNAPSHOT_COLUMN_WIDTH,
  }
}

function getPinnedSnapshotColumnClass(key: SnapshotColumnKey, area: 'head' | 'body') {
  if (!isPinnedSnapshotColumn(key)) return ''
  const base = area === 'head'
    ? 'sticky z-30'
    : 'sticky z-20 bg-white group-hover:bg-gray-50/70'
  const edge = key === 'onHandQty'
    ? 'shadow-[-10px_0_14px_-14px_rgba(15,23,42,0.65)]'
    : ''
  return `${base} ${edge}`
}

export function StockSnapshotsPage() {
  const [records, setRecords] = useState<StockSnapshotRow[]>(() => getStockSnapshots())
  const [page, setPage] = useState(1)
  const [saveDate, setSaveDate] = useState(DEFAULT_SNAPSHOT_DATE)
  const [branchCode, setBranchCode] = useState('')
  const [storeInfo, setStoreInfo] = useState('')
  const [locationInfo, setLocationInfo] = useState('')
  const [appliedSaveDate, setAppliedSaveDate] = useState('')
  const [appliedBranchCode, setAppliedBranchCode] = useState('')
  const [appliedStoreInfo, setAppliedStoreInfo] = useState('')
  const [appliedLocationInfo, setAppliedLocationInfo] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  function reload() {
    setRecords(getStockSnapshots())
    setPage(1)
  }

  const columns = useMemo<TableControlColumn<StockSnapshotRow, SnapshotColumnKey>[]>(() => [
    { key: 'saveDate', label: 'save date', filterable: false, getValue: row => row.saveDate },
    { key: 'midCategory', label: '중분류', getValue: row => row.midCategory },
    { key: 'subCategory', label: '소분류', getValue: row => row.subCategory },
    { key: 'productName', label: '제품명', getValue: row => row.productName },
    { key: 'productCode', label: '제품코드', getValue: row => row.productCode },
    { key: 'barcode', label: '바코드', getValue: row => row.barcode },
    { key: 'onHandQty', label: '실 재고수량', align: 'right', filterable: false, getValue: row => row.onHandQty },
    { key: 'outboundWaitingQty', label: '출고대기', align: 'right', filterable: false, getValue: row => row.outboundWaitingQty },
    { key: 'adjustmentWaitingQty', label: '조정대기', align: 'right', filterable: false, getValue: row => row.adjustmentWaitingQty },
    { key: 'availableQty', label: '가용재고', align: 'right', filterable: false, getValue: row => row.availableQty },
    { key: 'erpQty', label: 'ERP 재고 현황', align: 'right', filterable: false, getValue: row => row.erpQty },
    { key: 'stockDiffQty', label: '재고차', align: 'right', filterable: false, getValue: row => row.stockDiffQty },
  ], [])

  const branchOptions = useMemo(() => uniqueOptions(
    records,
    row => row.branchCode,
    row => `${row.branchCode} ${row.branchName}`,
  ), [records])

  const storeOptions = useMemo(() => {
    if (!branchCode) return []
    const sourceRows = records.filter(record => record.branchCode === branchCode)
    return uniqueOptions(sourceRows, getStoreInfo, getStoreInfo)
  }, [branchCode, records])

  const locationOptions = useMemo(() => {
    if (!branchCode || !storeInfo) return []
    const sourceRows = records.filter(record => (
      record.branchCode === branchCode && getStoreInfo(record) === storeInfo
    ))
    return uniqueOptions(sourceRows, getLocationInfo, getLocationInfo)
  }, [branchCode, records, storeInfo])

  const searchedRecords = useMemo(() => {
    if (!hasSearched) return []
    if (!appliedSaveDate || !appliedBranchCode || !appliedStoreInfo || !appliedLocationInfo) return []
    return records.filter(record => {
      const savedAt = dateValue(record.saveDate)
      if (savedAt !== appliedSaveDate) return false
      if (record.branchCode !== appliedBranchCode) return false
      if (getStoreInfo(record) !== appliedStoreInfo) return false
      if (getLocationInfo(record) !== appliedLocationInfo) return false
      return true
    })
  }, [appliedBranchCode, appliedLocationInfo, appliedSaveDate, appliedStoreInfo, hasSearched, records])

  const tableControls = useTableColumnControls(searchedRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const showReset = saveDate !== DEFAULT_SNAPSHOT_DATE
    || branchCode !== ''
    || storeInfo !== ''
    || locationInfo !== ''
    || hasSearched
    || tableControls.hasAnyFilter

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableControls.rows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [page, tableControls.rows.length])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleDateFilterChange(value: string) {
    setSaveDate(value)
  }

  function handleBranchChange(value: string) {
    setBranchCode(value)
    setStoreInfo('')
    setLocationInfo('')
  }

  function handleStoreChange(value: string) {
    setStoreInfo(value)
    setLocationInfo('')
  }

  function handleLocationChange(value: string) {
    setLocationInfo(value)
  }

  function handleSearch() {
    if (!saveDate) {
      showToast('save date를 선택해 주세요.')
      return
    }
    if (!branchCode) {
      showToast('법인을 선택해 주세요.')
      return
    }
    if (!storeInfo) {
      showToast('매장정보를 선택해 주세요.')
      return
    }
    if (!locationInfo) {
      showToast('로케이션정보를 선택해 주세요.')
      return
    }
    setAppliedSaveDate(saveDate)
    setAppliedBranchCode(branchCode)
    setAppliedStoreInfo(storeInfo)
    setAppliedLocationInfo(locationInfo)
    setHasSearched(true)
    setPage(1)
    setToast(null)
  }

  function resetSearch() {
    setSaveDate(DEFAULT_SNAPSHOT_DATE)
    setBranchCode('')
    setStoreInfo('')
    setLocationInfo('')
    setAppliedSaveDate('')
    setAppliedBranchCode('')
    setAppliedStoreInfo('')
    setAppliedLocationInfo('')
    setHasSearched(false)
    setToast(null)
    tableControls.resetControls()
    setPage(1)
  }

  function exportCsv() {
    const headers = columns.map(column => String(column.label))
    const rows = tableControls.rows.map(row => columns.map(column => {
      const value = column.getValue(row)
      return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '')
    }))
    downloadCsv(`stock_snapshots_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 스냅샷</h1>
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
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Excel 다운로드
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">save date *</span>
              <input
                type="date"
                value={saveDate}
                max={todayStr()}
                onChange={event => handleDateFilterChange(event.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">법인 *</span>
              <select
                value={branchCode}
                onChange={event => handleBranchChange(event.target.value)}
                className="h-9 w-48 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white"
              >
                <option value="" disabled>선택</option>
                {branchOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">매장정보 *</span>
              <select
                value={storeInfo}
                onChange={event => handleStoreChange(event.target.value)}
                disabled={!branchCode}
                className="h-9 w-56 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <option value="" disabled>선택</option>
                {storeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">로케이션정보 *</span>
              <select
                value={locationInfo}
                onChange={event => handleLocationChange(event.target.value)}
                disabled={!branchCode || !storeInfo}
                className="h-9 w-56 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <option value="" disabled>선택</option>
                {locationOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white transition-colors hover:bg-black"
              >
                <Search className="h-3.5 w-3.5" />
                검색
              </button>
              {showReset ? (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  초기화
                </button>
              ) : null}
            </div>
          </div>
          {tableControls.renderResetBar()}
          {paginatedRows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              {hasSearched ? '저장된 재고 스냅샷이 없습니다.' : '검색 버튼을 눌러 조회해 주세요.'}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  {columns.map(column => tableControls.renderHeaderCell(
                    column,
                    getPinnedSnapshotColumnClass(column.key, 'head'),
                    getPinnedSnapshotColumnStyle(column.key),
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRows.map(row => (
                  <tr key={row.id} className="group hover:bg-gray-50/70">
                    {columns.map(column => {
                      const value = column.getValue(row)
                      const isNumber = typeof value === 'number'
                      return (
                        <td
                          key={column.key}
                          style={getPinnedSnapshotColumnStyle(column.key)}
                          className={`whitespace-nowrap px-4 py-3 ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.key === 'barcode' ? 'font-mono text-[11px] text-gray-500' : ''} ${isNumber && ['onHandQty', 'availableQty'].includes(column.key) ? 'font-semibold text-gray-900' : ''} ${column.key === 'stockDiffQty' && Number(value) !== 0 ? Number(value) > 0 ? 'font-semibold text-blue-600' : 'font-semibold text-red-600' : ''} ${getPinnedSnapshotColumnClass(column.key, 'body')}`}
                        >
                          {formatValue(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <Pagination total={tableControls.rows.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </section>
        {tableControls.renderFilterPopover()}
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-[10000] rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
