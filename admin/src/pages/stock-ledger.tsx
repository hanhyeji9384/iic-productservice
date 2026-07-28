import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, RefreshCw, Search, X } from 'lucide-react'
import {
  dateValue,
  todayStr,
  type DateFilterState,
} from '@/components/date-range-filter-bar'
import { Pagination } from '@/components/pagination'
import { useTableColumnControls, type TableControlColumn } from '@/components/table-column-controls'
import { downloadCsv } from '@/lib/csv'
import { getStockLedgerEntries } from '@/lib/prototype-storage'
import { formatKstDateTime } from '@/lib/utils'
import type { StockLedgerEntry } from '@/lib/types'

type LedgerDateFilterKey = 'occurredAt'
type LedgerDateFilters = DateFilterState<LedgerDateFilterKey>
type LedgerCategory = '입고' | '출고' | '조정' | '티켓 사용'

const DATE_FILTER_LABELS: Record<LedgerDateFilterKey, string> = {
  occurredAt: '발생일',
}
const ITEMS_PER_PAGE = 20
const MAX_LEDGER_SEARCH_DAYS = 30

function addDaysStr(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysAgoStr(days: number) {
  return addDaysStr(todayStr(), -days)
}

function capToEarlierDate(a: string, b: string) {
  return a < b ? a : b
}

function constrainLedgerDateRange(
  next: LedgerDateFilters,
  changedKey: keyof LedgerDateFilters,
): LedgerDateFilters {
  if (changedKey !== 'from' && changedKey !== 'to') return next
  if (!next.from || !next.to) return next

  if (next.from > next.to) {
    return changedKey === 'from'
      ? { ...next, to: next.from }
      : { ...next, from: next.to }
  }

  const maxTo = addDaysStr(next.from, MAX_LEDGER_SEARCH_DAYS - 1)
  if (next.to <= maxTo) return next

  if (changedKey === 'from') {
    return { ...next, to: maxTo }
  }

  return { ...next, from: addDaysStr(next.to, -(MAX_LEDGER_SEARCH_DAYS - 1)) }
}

function getInitialDateFilters(): LedgerDateFilters {
  return {
    dateType: 'occurredAt',
    from: daysAgoStr(MAX_LEDGER_SEARCH_DAYS - 1),
    to: todayStr(),
  }
}

function formatNumber(value: number | null) {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${formatNumber(value)}`
  return formatNumber(value)
}

function parseCodeName(value: string) {
  const trimmed = value.trim()
  const matched = trimmed.match(/^(.*?)\(([^)]+)\)$/)
  if (!matched) return { code: '', name: trimmed }
  return {
    name: matched[1].trim(),
    code: matched[2].trim(),
  }
}

function formatCodeName(code: string, name: string) {
  if (code && name) return `${code} / ${name}`
  return name || code || '-'
}

function normalizeLedgerLocationForDisplay(value: string | null) {
  if (!value) return null
  if (
    value.includes('1120')
    || value.includes('Maersk')
    || value.includes('3PL')
    || value.includes('물류센터')
    || value === 'PS창고'
  ) {
    return 'GM 물류센터(1100) / PS창고(1120)'
  }
  if (
    value.includes('E1008')
    || value.includes('1110')
    || value.includes('GM_PS')
    || value.includes('가용창고')
    || value === 'PS Office'
  ) {
    return 'GM_PS_국내(E1008) / 가용창고(1110)'
  }
  return value
}

function parseLedgerLocation(value: string | null) {
  const normalizedValue = normalizeLedgerLocationForDisplay(value)
  if (!normalizedValue) return { store: '-', location: '-' }
  const parts = normalizedValue.split('/').map(part => part.trim()).filter(Boolean)
  const store = parseCodeName(parts[0] ?? normalizedValue)
  const location = parts[1] ? parseCodeName(parts[1]) : null

  if (location) {
    return {
      store: formatCodeName(store.code, store.name),
      location: formatCodeName(location.code, location.name),
    }
  }

  if (store.name === 'GM_PS_국내' && (store.code === '1110' || store.code === 'E1008')) {
    return {
      store: formatCodeName(store.code, store.name),
      location: '1110 / 가용창고',
    }
  }

  return {
    store: formatCodeName(store.code, store.name),
    location: '-',
  }
}

function getLedgerCategory(record: StockLedgerEntry): LedgerCategory {
  if (record.sourceType === '티켓') return '티켓 사용'
  if (record.eventType === '조정반영') return '조정'
  if (record.eventType === '입고' || record.eventType === '입고완료') return '입고'
  if (record.eventType === '출고' || record.eventType === '출고완료' || record.eventType === '출고요청') return '출고'
  return record.quantity < 0 ? '출고' : '입고'
}

function getLedgerMovement(record: StockLedgerEntry) {
  const category = getLedgerCategory(record)
  if (category === '입고') return '입고'
  if (category === '조정') return record.quantity < 0 ? '출고' : '입고'
  return '출고'
}

function getBasisLocationValue(record: StockLedgerEntry) {
  return getLedgerMovement(record) === '입고'
    ? record.toLocation ?? record.fromLocation
    : record.fromLocation ?? record.toLocation
}

function getBasisStore(record: StockLedgerEntry) {
  return parseLedgerLocation(getBasisLocationValue(record)).store
}

function getBasisLocation(record: StockLedgerEntry) {
  return parseLedgerLocation(getBasisLocationValue(record)).location
}

function getDisplayQuantity(record: StockLedgerEntry) {
  if (getLedgerCategory(record) === '조정') return record.quantity
  const quantity = Math.abs(record.quantity)
  return getLedgerMovement(record) === '출고' ? -quantity : quantity
}

function uniqueOptions<T>(items: T[], getValue: (item: T) => string, getLabel: (item: T) => string = getValue) {
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

const LEDGER_CATEGORY_OPTIONS: LedgerCategory[] = ['입고', '출고', '조정', '티켓 사용']
const HIDDEN_LEDGER_EVENT_TYPES = new Set<StockLedgerEntry['eventType']>(['재고예약', '예약해제'])

export function StockLedgerPage() {
  const [records, setRecords] = useState<StockLedgerEntry[]>(() => getStockLedgerEntries())
  const [dateFilters, setDateFilters] = useState<LedgerDateFilters>(() => getInitialDateFilters())
  const [branchCode, setBranchCode] = useState('')
  const [basisStore, setBasisStore] = useState('')
  const [basisLocation, setBasisLocation] = useState('')
  const [appliedDateFilters, setAppliedDateFilters] = useState<LedgerDateFilters | null>(null)
  const [appliedBranchCode, setAppliedBranchCode] = useState('')
  const [appliedBasisStore, setAppliedBasisStore] = useState('')
  const [appliedBasisLocation, setAppliedBasisLocation] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  function reload() {
    setRecords(getStockLedgerEntries())
    setPage(1)
  }

  const visibleRecords = useMemo(
    () => records.filter(record => !HIDDEN_LEDGER_EVENT_TYPES.has(record.eventType)),
    [records],
  )

  const branchOptions = useMemo(() => uniqueOptions(
    visibleRecords,
    record => record.branchCode,
    record => `${record.branchCode} ${record.branchName}`,
  ), [visibleRecords])

  const basisStoreOptions = useMemo(() => {
    if (!branchCode) return []
    const sourceRows = visibleRecords.filter(record => record.branchCode === branchCode)
    return uniqueOptions(sourceRows, getBasisStore)
  }, [branchCode, visibleRecords])

  const basisLocationOptions = useMemo(() => {
    if (!branchCode || !basisStore) return []
    const sourceRows = visibleRecords.filter(record => {
      if (record.branchCode !== branchCode) return false
      if (getBasisStore(record) !== basisStore) return false
      return true
    })
    return uniqueOptions(sourceRows, getBasisLocation)
  }, [basisStore, branchCode, visibleRecords])

  const filteredRecords = useMemo(() => {
    if (!hasSearched || !appliedDateFilters) return []
    return visibleRecords.filter(record => {
      const selectedDate = dateValue(record[appliedDateFilters.dateType])
      if (appliedDateFilters.from && (!selectedDate || selectedDate < appliedDateFilters.from)) return false
      if (appliedDateFilters.to && (!selectedDate || selectedDate > appliedDateFilters.to)) return false
      if (appliedBranchCode && record.branchCode !== appliedBranchCode) return false
      if (appliedBasisStore && getBasisStore(record) !== appliedBasisStore) return false
      if (appliedBasisLocation && getBasisLocation(record) !== appliedBasisLocation) return false
      return true
    })
  }, [
    appliedBasisLocation,
    appliedBasisStore,
    appliedBranchCode,
    appliedDateFilters,
    hasSearched,
    visibleRecords,
  ])

  const columns = useMemo<TableControlColumn<StockLedgerEntry, string>[]>(() => [
    { key: 'productName', label: '제품명', getValue: record => record.productName },
    { key: 'productCode', label: '제품코드', getValue: record => record.productCode },
    { key: 'barcode', label: '바코드', getValue: record => record.barcode },
    { key: 'occurredAt', label: '발생일시', filterable: false, getValue: record => record.occurredAt },
    { key: 'eventType', label: '구분', filterType: 'select', filterOptions: LEDGER_CATEGORY_OPTIONS, getValue: getLedgerCategory },
    { key: 'sourceType', label: '소스', getValue: record => record.sourceType },
    { key: 'sourceNo', label: '소스 No.', getValue: record => record.sourceNo },
    { key: 'quantity', label: '수량', align: 'right', getValue: getDisplayQuantity, filterValue: record => formatSignedNumber(getDisplayQuantity(record)) },
    { key: 'beforeQty', label: '이전', align: 'right', getValue: record => record.beforeQty ?? '', filterValue: record => formatNumber(record.beforeQty) },
    { key: 'afterQty', label: '이후', align: 'right', getValue: record => record.afterQty ?? '', filterValue: record => formatNumber(record.afterQty) },
    { key: 'handler', label: '처리자', getValue: record => record.handler },
  ], [])
  const tableControls = useTableColumnControls(filteredRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

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

  function exportCsv() {
    const headers = [
      '제품명',
      '제품코드',
      '바코드',
      '발생일시',
      '구분',
      '소스',
      '소스 No.',
      '수량',
      '이전수량',
      '이후수량',
      '처리자',
    ]
    const rows = tableControls.rows.map(record => [
      record.productName,
      record.productCode,
      record.barcode,
      formatKstDateTime(record.occurredAt),
      getLedgerCategory(record),
      record.sourceType,
      record.sourceNo,
      getDisplayQuantity(record),
      record.beforeQty,
      record.afterQty,
      record.handler,
    ])
    downloadCsv(`stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  function applyDateFilter(key: keyof LedgerDateFilters, value: string) {
    setPage(1)
    setDateFilters(prev => constrainLedgerDateRange({ ...prev, [key]: value }, key))
  }

  function handleReset() {
    setDateFilters(getInitialDateFilters())
    setBranchCode('')
    setBasisStore('')
    setBasisLocation('')
    setAppliedDateFilters(null)
    setAppliedBranchCode('')
    setAppliedBasisStore('')
    setAppliedBasisLocation('')
    setHasSearched(false)
    setToast(null)
    tableControls.resetControls()
    setPage(1)
  }

  function handleSearch() {
    if (!branchCode) {
      showToast('법인을 선택해 주세요.')
      return
    }
    if (!basisStore) {
      showToast('스토어를 선택해 주세요.')
      return
    }
    if (!basisLocation) {
      showToast('창고를 선택해 주세요.')
      return
    }
    setAppliedDateFilters(dateFilters)
    setAppliedBranchCode(branchCode)
    setAppliedBasisStore(basisStore)
    setAppliedBasisLocation(basisLocation)
    setHasSearched(true)
    setPage(1)
    setToast(null)
  }

  const defaultDateFilters = getInitialDateFilters()
  const hasActiveFilters =
    dateFilters.dateType !== defaultDateFilters.dateType ||
    dateFilters.from !== defaultDateFilters.from ||
    dateFilters.to !== defaultDateFilters.to ||
    branchCode !== '' ||
    basisStore !== '' ||
    basisLocation !== '' ||
    hasSearched ||
    tableControls.hasAnyFilter

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 Ledger</h1>
          </div>
          <div className="flex items-center gap-2">
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
              <select
                value={dateFilters.dateType}
                onChange={event => applyDateFilter('dateType', event.target.value)}
                className="h-9 w-28 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white"
              >
                {(Object.keys(DATE_FILTER_LABELS) as LedgerDateFilterKey[]).map(key => (
                  <option key={key} value={key}>{DATE_FILTER_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1.5">
              {(() => {
                const today = todayStr()
                const maxTo = (() => {
                  if (!dateFilters.from) return today
                  const date = new Date(dateFilters.from)
                  date.setDate(date.getDate() + (MAX_LEDGER_SEARCH_DAYS - 1))
                  const capped = date.toISOString().slice(0, 10)
                  return capToEarlierDate(capped, today)
                })()
                const minFrom = dateFilters.to
                  ? (() => {
                    const date = new Date(dateFilters.to)
                    date.setDate(date.getDate() - (MAX_LEDGER_SEARCH_DAYS - 1))
                    return date.toISOString().slice(0, 10)
                  })()
                  : undefined

                return (
                  <>
                    <input
                      type="date"
                      value={dateFilters.from}
                      min={minFrom}
                      max={dateFilters.to || today}
                      onChange={event => applyDateFilter('from', event.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white"
                    />
                    <span className="flex-shrink-0 text-xs text-gray-400">~</span>
                    <input
                      type="date"
                      value={dateFilters.to}
                      min={dateFilters.from || undefined}
                      max={maxTo}
                      onChange={event => applyDateFilter('to', event.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white"
                    />
                  </>
                )
              })()}
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">법인 *</span>
              <select
                value={branchCode}
                onChange={event => {
                  setBranchCode(event.target.value)
                  setBasisStore('')
                  setBasisLocation('')
                }}
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
                value={basisStore}
                onChange={event => {
                  setBasisStore(event.target.value)
                  setBasisLocation('')
                }}
                disabled={!branchCode}
                className="h-9 w-56 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <option value="" disabled>선택</option>
                {basisStoreOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">로케이션정보 *</span>
              <select
                value={basisLocation}
                onChange={event => setBasisLocation(event.target.value)}
                disabled={!branchCode || !basisStore}
                className="h-9 w-56 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <option value="" disabled>선택</option>
                {basisLocationOptions.map(option => (
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
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                  초기화
                </button>
              )}
            </div>
          </div>
          {tableControls.renderResetBar()}
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  {columns.map(column => tableControls.renderHeaderCell(column))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRows.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-3">{record.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{record.productCode}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-500">{record.barcode}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{formatKstDateTime(record.occurredAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{getLedgerCategory(record)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{record.sourceType}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-500">{record.sourceNo}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${getDisplayQuantity(record) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatSignedNumber(getDisplayQuantity(record))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-500">{formatNumber(record.beforeQty)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-500">{formatNumber(record.afterQty)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{record.handler}</td>
                  </tr>
                ))}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                      {hasSearched ? '조회된 재고 Ledger가 없습니다.' : '검색 버튼을 눌러 조회해 주세요.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
