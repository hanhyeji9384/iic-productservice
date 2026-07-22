import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Plus, RefreshCw } from 'lucide-react'
import {
  DateRangeFilterBar,
  constrainDateRange,
  dateValue,
  isDateFilterActive,
  monthsAgoStr,
  todayStr,
  type DateFilterOption,
  type DateFilterState,
} from '@/components/date-range-filter-bar'
import { Pagination } from '@/components/pagination'
import { useTableColumnControls, type TableControlColumn } from '@/components/table-column-controls'
import { downloadCsv } from '@/lib/csv'
import { MEMBERS } from '@/lib/mock-data'
import { useProducts } from '@/lib/products-context'
import {
  changeStockAdjustmentStatus,
  createStockAdjustment,
  getStockAdjustments,
} from '@/lib/prototype-storage'
import { formatKstDateTime } from '@/lib/utils'
import {
  getStockAdjustmentStatusMeta,
  createStockInventoryRows,
  STOCK_ADJUSTMENT_STATUS_OPTIONS,
  STOCK_ADJUSTMENT_TYPES,
  type StockInventoryRow,
} from '@/lib/stock-inventory'
import type {
  Product,
  StockAdjustment,
  StockAdjustmentStatus,
  StockAdjustmentType,
} from '@/lib/types'

const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const ITEMS_PER_PAGE = 20
const DEFAULT_ADJUSTMENT_BRANCH_CODE = '1110'

const VISIBLE_ADJUSTMENT_SOURCES = [
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

const VISIBLE_ADJUSTMENT_STORE_CODES = new Set<string>(VISIBLE_ADJUSTMENT_SOURCES.map(source => source.storeCode))

type RequestDateFilterKey = 'requestedAt' | 'appliedAt'
type RequestDateFilters = DateFilterState<RequestDateFilterKey>

const REQUEST_DATE_FILTER_OPTIONS: DateFilterOption<RequestDateFilterKey>[] = [
  { value: 'requestedAt', label: '요청일' },
  { value: 'appliedAt', label: '처리일' },
]

function getInitialDateFilters(): RequestDateFilters {
  return {
    dateType: 'requestedAt',
    from: monthsAgoStr(1),
    to: todayStr(),
  }
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR')
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${formatNumber(value)}`
  return formatNumber(value)
}

function StatusBadge({ status }: { status: StockAdjustmentStatus }) {
  const meta = getStockAdjustmentStatusMeta(status)
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function statusLabel(status: StockAdjustmentStatus) {
  return STOCK_ADJUSTMENT_STATUS_OPTIONS.find(option => option.value === status)?.label ?? status
}

function isStockAdjustmentSelectable(status: StockAdjustmentStatus) {
  return status === 'REQUESTED'
}

function uniqueInventoryOptions(
  rows: StockInventoryRow[],
  codeKey: 'branchCode' | 'storeCode' | 'locationCode',
  nameKey: 'branchName' | 'storeName' | 'locationName',
) {
  const seen = new Set<string>()
  return rows.reduce<{ code: string; name: string }[]>((options, row) => {
    const code = row[codeKey]
    if (!code || code === '-' || seen.has(code)) return options
    seen.add(code)
    options.push({ code, name: row[nameKey] })
    return options
  }, [])
}

function isVisibleAdjustmentProduct(product: Product) {
  return product.brandCategory === 'GENTLE MONSTER' && product.branchCode === DEFAULT_ADJUSTMENT_BRANCH_CODE
}

function resolveAdjustmentSourceQuantity(product: Product, source: typeof VISIBLE_ADJUSTMENT_SOURCES[number]) {
  const explicitQuantity = product[source.quantityKey]
  if (typeof explicitQuantity === 'number') return explicitQuantity

  const psQuantity = product.psQuantity ?? Math.max(1, Math.round(product.quantity * 0.15))
  if (source.quantityKey === 'psQuantity') return Math.min(psQuantity, product.quantity)
  return Math.max(product.quantity - psQuantity, 0)
}

function applyAdjustmentSourceToRow(
  row: StockInventoryRow,
  source: typeof VISIBLE_ADJUSTMENT_SOURCES[number],
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

function createVisibleAdjustmentRows(products: Product[]) {
  const visibleProducts = products.filter(isVisibleAdjustmentProduct)
  const baseRows = createStockInventoryRows(visibleProducts)

  return baseRows.flatMap((row, index) => {
    const product = visibleProducts[index]
    if (!product) return []

    return VISIBLE_ADJUSTMENT_SOURCES
      .map(source => applyAdjustmentSourceToRow(row, source, resolveAdjustmentSourceQuantity(product, source)))
      .filter(sourceRow => sourceRow.onHandQty > 0)
  })
}

function getAdjustmentBranchOptions(rows: StockInventoryRow[]) {
  const availableBranches = new Set(rows.map(row => row.branchCode).filter(Boolean))
  const seen = new Set<string>()
  const options = VISIBLE_ADJUSTMENT_SOURCES.filter(source => {
    if (seen.has(source.branchCode)) return false
    if (availableBranches.size > 0 && !availableBranches.has(source.branchCode)) return false
    seen.add(source.branchCode)
    return true
  }).map(source => source.branchCode)

  return options.length
    ? options
    : VISIBLE_ADJUSTMENT_SOURCES
      .filter((source, index, list) => list.findIndex(item => item.branchCode === source.branchCode) === index)
      .map(source => source.branchCode)
}

function getAdjustmentBranchLabel(branchCode: string) {
  const source = VISIBLE_ADJUSTMENT_SOURCES.find(item => item.branchCode === branchCode)
  return source ? `${source.branchCode} ${source.branchName}` : branchCode
}

function inventoryRowKey(row: StockInventoryRow) {
  return [row.branchCode, row.storeCode, row.locationCode, row.productCode, row.barcode].join('|')
}

function findInventoryRow(record: StockAdjustment, rows: StockInventoryRow[]) {
  return rows.find(row => (
    row.branchCode === record.branchCode &&
    row.storeCode === record.storeCode &&
    row.locationCode === record.locationCode &&
    row.productCode === record.productCode &&
    row.barcode === record.barcode
  )) ?? rows.find(row => row.productCode === record.productCode && row.barcode === record.barcode)
}

function getAdjustmentHierarchy(record: StockAdjustment, rows: StockInventoryRow[]) {
  const row = findInventoryRow(record, rows)
  return {
    branchCode: record.branchCode ?? row?.branchCode ?? '-',
    branchName: record.branchName ?? row?.branchName ?? '-',
    storeCode: record.storeCode ?? row?.storeCode ?? '-',
    storeName: record.storeName ?? row?.storeName ?? '-',
    locationCode: record.locationCode ?? row?.locationCode ?? '-',
    locationName: record.locationName ?? row?.locationName ?? record.location ?? '-',
  }
}

function getVisibleAdjustmentHierarchy(record: StockAdjustment, rows: StockInventoryRow[]) {
  const hierarchy = getAdjustmentHierarchy(record, rows)
  if (VISIBLE_ADJUSTMENT_STORE_CODES.has(hierarchy.storeCode)) return hierarchy

  const row = rows.find(item => item.productCode === record.productCode && item.barcode === record.barcode)
  if (!row) return hierarchy

  return {
    branchCode: row.branchCode,
    branchName: row.branchName,
    storeCode: row.storeCode,
    storeName: row.storeName,
    locationCode: row.locationCode,
    locationName: row.locationName,
  }
}

function getStoreInfo(record: StockAdjustment, rows: StockInventoryRow[]) {
  const hierarchy = getVisibleAdjustmentHierarchy(record, rows)
  return `${hierarchy.storeCode} | ${hierarchy.storeName}`
}

function getLocationInfo(record: StockAdjustment, rows: StockInventoryRow[]) {
  const hierarchy = getVisibleAdjustmentHierarchy(record, rows)
  return `${hierarchy.locationCode} | ${hierarchy.locationName}`
}

function uniqueColumnValues<T>(rows: T[], getValue: (row: T) => string) {
  return Array.from(new Set(rows.map(getValue).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'))
}

export function StockAdjustmentNewPage() {
  const { products } = useProducts()
  const navigate = useNavigate()
  const params = useParams()
  const langCode = params.langCode ?? 'ko'
  const [type, setType] = useState<StockAdjustmentType>('일반')
  const inventoryRows = useMemo(() => createVisibleAdjustmentRows(products), [products])
  const [branchCode, setBranchCode] = useState('')
  const [storeCode, setStoreCode] = useState('')
  const [locationCode, setLocationCode] = useState('')
  const [selectedInventoryKey, setSelectedInventoryKey] = useState('')
  const [quantityDelta, setQuantityDelta] = useState('-1')
  const [reason, setReason] = useState('')
  const [memo, setMemo] = useState('')
  const [erpSendRequired, setErpSendRequired] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const branchOptions = useMemo(() => uniqueInventoryOptions(inventoryRows, 'branchCode', 'branchName'), [inventoryRows])
  const storeOptions = useMemo(() => (
    branchCode
      ? uniqueInventoryOptions(inventoryRows.filter(row => row.branchCode === branchCode), 'storeCode', 'storeName')
      : []
  ), [branchCode, inventoryRows])
  const locationOptions = useMemo(() => (
    branchCode && storeCode
      ? uniqueInventoryOptions(inventoryRows.filter(row => row.branchCode === branchCode && row.storeCode === storeCode), 'locationCode', 'locationName')
      : []
  ), [branchCode, inventoryRows, storeCode])
  const productOptions = useMemo(() => (
    branchCode && storeCode && locationCode
      ? inventoryRows.filter(row => row.branchCode === branchCode && row.storeCode === storeCode && row.locationCode === locationCode)
      : []
  ), [branchCode, inventoryRows, locationCode, storeCode])
  const selectedInventory = useMemo(() => (
    productOptions.find(row => inventoryRowKey(row) === selectedInventoryKey) ?? null
  ), [productOptions, selectedInventoryKey])

  function selectBranch(nextBranchCode: string) {
    setBranchCode(nextBranchCode)
    setStoreCode('')
    setLocationCode('')
    setSelectedInventoryKey('')
  }

  function selectStore(nextStoreCode: string) {
    setStoreCode(nextStoreCode)
    setLocationCode('')
    setSelectedInventoryKey('')
  }

  function selectLocation(nextLocationCode: string) {
    setLocationCode(nextLocationCode)
    setSelectedInventoryKey('')
  }

  function submitAdjustment() {
    if (!branchCode || !storeCode || !locationCode || !selectedInventory) {
      setMessage('법인, 스토어, 창고, 제품을 순서대로 선택해 주세요.')
      return
    }
    const parsedQuantity = Number(quantityDelta)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      setMessage('조정수량은 0이 아닌 숫자로 입력해 주세요.')
      return
    }
    if (!reason.trim()) {
      setMessage('조정 사유를 입력해 주세요.')
      return
    }

    createStockAdjustment({
      status: 'REQUESTED',
      type,
      requester: CURRENT_ADMIN_LABEL,
      requesterId: CURRENT_ADMIN_MEMBER?.id,
      branchCode: selectedInventory.branchCode,
      branchName: selectedInventory.branchName,
      storeCode: selectedInventory.storeCode,
      storeName: selectedInventory.storeName,
      locationCode: selectedInventory.locationCode,
      locationName: selectedInventory.locationName,
      productCode: selectedInventory.productCode,
      productName: selectedInventory.productName,
      barcode: selectedInventory.barcode,
      location: selectedInventory.locationName,
      quantityDelta: parsedQuantity,
      reason: reason.trim(),
      erpSendRequired,
      memo,
    })
    navigate(`/${langCode}/stock/adjustments`)
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate(`/${langCode}/stock/adjustments`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        type="button"
        onClick={goBack}
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        뒤로가기
      </button>

      <div className="space-y-4">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="min-w-[280px] flex-1">
            <h1 className="text-base font-bold tracking-tight text-gray-900">재고 조정 요청</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                신규 요청
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <div className="min-w-[140px] px-5 py-1 first:pl-0">
              <p className="text-[11px] font-medium text-gray-400">진행상태</p>
              <div className="mt-1.5">
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                  작성중
                </span>
              </div>
            </div>
            <div className="min-w-[180px] px-5 py-1">
              <p className="text-[11px] font-medium text-gray-400">요청담당자</p>
              <p className="mt-1.5 text-sm font-semibold text-gray-900">{CURRENT_ADMIN_LABEL}</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">조정 정보</h2>
          </div>
          <div className="grid gap-3 px-5 py-5 md:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">조정유형</span>
              <select
                value={type}
                onChange={event => setType(event.target.value as StockAdjustmentType)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
              >
                {STOCK_ADJUSTMENT_TYPES.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">법인</span>
              <select
                value={branchCode}
                onChange={event => selectBranch(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
              >
                <option value="">법인 선택</option>
                {branchOptions.map(option => (
                  <option key={option.code} value={option.code}>{option.name} ({option.code})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">스토어</span>
              <select
                value={storeCode}
                onChange={event => selectStore(event.target.value)}
                disabled={!branchCode}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-300 focus:border-gray-400"
              >
                <option value="">{branchCode ? '스토어 선택' : '법인을 먼저 선택'}</option>
                {storeOptions.map(option => (
                  <option key={option.code} value={option.code}>{option.name} ({option.code})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">창고</span>
              <select
                value={locationCode}
                onChange={event => selectLocation(event.target.value)}
                disabled={!storeCode}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-300 focus:border-gray-400"
              >
                <option value="">{storeCode ? '창고 선택' : '스토어를 먼저 선택'}</option>
                {locationOptions.map(option => (
                  <option key={option.code} value={option.code}>{option.name} ({option.code})</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-gray-500">제품</span>
              <select
                value={selectedInventoryKey}
                onChange={event => setSelectedInventoryKey(event.target.value)}
                disabled={!locationCode}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-300 focus:border-gray-400"
              >
                <option value="">{locationCode ? '제품 선택' : '창고를 먼저 선택'}</option>
                {productOptions.map(row => (
                  <option key={inventoryRowKey(row)} value={inventoryRowKey(row)}>
                    {row.productName} ({row.productCode}) / {row.barcode}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">조정수량</span>
              <input
                type="number"
                value={quantityDelta}
                onChange={event => setQuantityDelta(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
              />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">요청 정보</h2>
          </div>
          <div className="grid gap-3 px-5 py-5 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">조정 사유</span>
              <input
                value={reason}
                onChange={event => setReason(event.target.value)}
                placeholder="예: 수리 중 손상"
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-gray-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">메모</span>
              <input
                value={memo}
                onChange={event => setMemo(event.target.value)}
                placeholder="-"
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-gray-400"
              />
            </label>
            <label className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={erpSendRequired}
                onChange={event => setErpSendRequired(event.target.checked)}
                className="rounded border-gray-300"
              />
              ERP 전송 대상
            </label>
          </div>
          {message && <p className="px-5 pb-4 text-xs font-medium text-red-500">{message}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap justify-end gap-2 px-5 py-5">
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submitAdjustment}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              조정 요청
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export function StockAdjustmentsPage() {
  const navigate = useNavigate()
  const params = useParams()
  const langCode = params.langCode ?? 'ko'
  const { products } = useProducts()
  const inventoryRows = useMemo(() => createVisibleAdjustmentRows(products), [products])
  const branchOptions = useMemo(() => getAdjustmentBranchOptions(inventoryRows), [inventoryRows])
  const [records, setRecords] = useState<StockAdjustment[]>(() => getStockAdjustments())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<StockAdjustmentStatus>('APPLIED')
  const [page, setPage] = useState(1)
  const [branchCode, setBranchCode] = useState(DEFAULT_ADJUSTMENT_BRANCH_CODE)
  const defaultDateFilters = useMemo(() => getInitialDateFilters(), [])
  const [dateFilters, setDateFilters] = useState<RequestDateFilters>(() => getInitialDateFilters())

  function reload() {
    setRecords(getStockAdjustments())
    setSelected(new Set())
    setPage(1)
  }

  const filteredRecords = useMemo(() => records.filter(record => {
    const hierarchy = getVisibleAdjustmentHierarchy(record, inventoryRows)
    if (branchCode && hierarchy.branchCode !== branchCode) return false
    if (!VISIBLE_ADJUSTMENT_STORE_CODES.has(hierarchy.storeCode)) return false

    const selectedDate = dateValue(record[dateFilters.dateType])
    if (dateFilters.from && (!selectedDate || selectedDate < dateFilters.from)) return false
    if (dateFilters.to && (!selectedDate || selectedDate > dateFilters.to)) return false
    return true
  }), [branchCode, dateFilters, inventoryRows, records])

  const selectFilterOptions = useMemo(() => ({
    storeInfo: uniqueColumnValues(filteredRecords, record => getStoreInfo(record, inventoryRows)),
    locationInfo: uniqueColumnValues(filteredRecords, record => getLocationInfo(record, inventoryRows)),
    status: STOCK_ADJUSTMENT_STATUS_OPTIONS.map(option => option.label),
    type: STOCK_ADJUSTMENT_TYPES,
    erpSendRequired: ['Y', 'N'],
  }), [filteredRecords, inventoryRows])

  const columns = useMemo<TableControlColumn<StockAdjustment, string>[]>(() => [
    { key: 'adjustmentNo', label: '조정 No.', getValue: record => record.adjustmentNo },
    { key: 'storeInfo', label: '스토어 정보', filterType: 'select', filterOptions: selectFilterOptions.storeInfo, getValue: record => getStoreInfo(record, inventoryRows) },
    { key: 'locationInfo', label: '로케이션 정보', filterType: 'select', filterOptions: selectFilterOptions.locationInfo, getValue: record => getLocationInfo(record, inventoryRows) },
    { key: 'status', label: '상태', filterType: 'select', filterOptions: selectFilterOptions.status, getValue: record => statusLabel(record.status) },
    { key: 'requestedAt', label: '요청일시', filterable: false, getValue: record => record.requestedAt },
    { key: 'requester', label: '요청 담당자', getValue: record => record.requester },
    { key: 'type', label: '조정유형', filterType: 'select', filterOptions: selectFilterOptions.type, getValue: record => record.type },
    { key: 'productName', label: '제품명', getValue: record => record.productName },
    { key: 'productCode', label: '제품코드', getValue: record => record.productCode },
    { key: 'barcode', label: '바코드', getValue: record => record.barcode },
    { key: 'erpSendRequired', label: 'ERP 전송', filterType: 'select', filterOptions: selectFilterOptions.erpSendRequired, getValue: record => record.erpSendRequired ? 'Y' : 'N' },
    { key: 'quantityDelta', label: '조정 수량', align: 'right', getValue: record => record.quantityDelta, filterValue: record => formatSignedNumber(record.quantityDelta) },
    { key: 'reason', label: '사유', getValue: record => record.reason },
    { key: 'appliedAt', label: '처리일시', filterable: false, getValue: record => record.appliedAt || '-' },
    { key: 'processor', label: '처리자', getValue: record => record.processor || '-' },
  ], [inventoryRows, selectFilterOptions])
  const tableControls = useTableColumnControls(filteredRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const selectableRows = paginatedRows.filter(record => isStockAdjustmentSelectable(record.status))

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableControls.rows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [page, tableControls.rows.length])
  const selectableAdjustmentNos = new Set(selectableRows.map(record => record.adjustmentNo))
  const allSelected = selectableRows.length > 0 && selectableRows.every(record => selected.has(record.adjustmentNo))

  function toggleAll() {
    setSelected(() => {
      if (allSelected) return new Set()
      return new Set(selectableRows.map(record => record.adjustmentNo))
    })
  }

  function toggleSelected(adjustmentNo: string) {
    if (!selectableAdjustmentNos.has(adjustmentNo)) return
    setSelected(current => {
      const next = new Set(current)
      if (next.has(adjustmentNo)) next.delete(adjustmentNo)
      else next.add(adjustmentNo)
      return next
    })
  }

  function applyBulkStatus() {
    records
      .filter(record => selected.has(record.adjustmentNo) && isStockAdjustmentSelectable(record.status))
      .forEach(record => changeStockAdjustmentStatus(record, bulkStatus, CURRENT_ADMIN_LABEL))
    reload()
  }

  function applyDateFilter(key: keyof RequestDateFilters, value: string) {
    setPage(1)
    setDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
  }

  function resetFilters() {
    setDateFilters(getInitialDateFilters())
    setBranchCode(DEFAULT_ADJUSTMENT_BRANCH_CODE)
    setPage(1)
  }

  function exportCsv() {
    const headers = ['조정 No.', '스토어 정보', '로케이션 정보', '상태', '요청일시', '요청 담당자', '조정유형', '제품명', '제품코드', '바코드', 'ERP 전송', '조정 수량', '사유', '처리일시', '처리자']
    const rows = tableControls.rows.map(record => {
      return [
        record.adjustmentNo,
        getStoreInfo(record, inventoryRows),
        getLocationInfo(record, inventoryRows),
        statusLabel(record.status),
        formatKstDateTime(record.requestedAt),
        record.requester,
        record.type,
        record.productName,
        record.productCode,
        record.barcode,
        record.erpSendRequired ? 'Y' : 'N',
        record.quantityDelta,
        record.reason,
        formatKstDateTime(record.appliedAt),
        record.processor,
      ]
    })
    downloadCsv(`stock_adjustments_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 조정</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/${langCode}/stock/adjustments/new`)}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              조정 요청
            </button>
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
          <DateRangeFilterBar
            value={dateFilters}
            options={REQUEST_DATE_FILTER_OPTIONS}
            onChange={applyDateFilter}
            onReset={resetFilters}
            showReset={isDateFilterActive(dateFilters, defaultDateFilters) || branchCode !== DEFAULT_ADJUSTMENT_BRANCH_CODE}
          >
            <label className="flex items-center">
              <span className="sr-only">법인</span>
              <select
                value={branchCode}
                onChange={event => {
                  setBranchCode(event.target.value || DEFAULT_ADJUSTMENT_BRANCH_CODE)
                  setSelected(new Set())
                  setPage(1)
                }}
                className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              >
                {branchOptions.map(option => (
                  <option key={option} value={option}>{getAdjustmentBranchLabel(option)}</option>
                ))}
              </select>
            </label>
          </DateRangeFilterBar>
          {tableControls.renderResetBar()}
          <div className="overflow-x-auto">
            <table className="min-w-[1780px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={selectableRows.length === 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>
                  {columns.map(column => tableControls.renderHeaderCell(column))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRows.map(record => {
                  const selectable = isStockAdjustmentSelectable(record.status)
                  return (
                    <tr key={record.adjustmentNo} className={`hover:bg-gray-50/70 ${selected.has(record.adjustmentNo) ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(record.adjustmentNo)}
                          disabled={!selectable}
                          onChange={() => toggleSelected(record.adjustmentNo)}
                          className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] font-semibold text-gray-900">{record.adjustmentNo}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getStoreInfo(record, inventoryRows)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getLocationInfo(record, inventoryRows)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3">{formatKstDateTime(record.requestedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.requester}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.type}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{record.productCode}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-500">{record.barcode}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.erpSendRequired ? 'Y' : 'N'}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${record.quantityDelta < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatSignedNumber(record.quantityDelta)}
                      </td>
                      <td className="min-w-[180px] px-4 py-3">{record.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatKstDateTime(record.appliedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.processor || '-'}</td>
                    </tr>
                  )
                })}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-sm text-gray-400">
                      조회된 재고 조정 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={tableControls.rows.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </section>
        {tableControls.renderFilterPopover()}

        {selected.size > 0 && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-xl">
            <span className="text-xs font-semibold text-white">{selected.size}개 선택됨</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={event => setBulkStatus(event.target.value as StockAdjustmentStatus)}
                className="rounded-xl border border-gray-700 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none"
              >
                {STOCK_ADJUSTMENT_STATUS_OPTIONS.filter(option => option.value !== 'REQUESTED').map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkStatus}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-900 transition-colors hover:bg-gray-100"
              >
                진행상태 일괄변경
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
