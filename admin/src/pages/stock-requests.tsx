import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, RefreshCw } from 'lucide-react'
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
import { BRANCHES, MEMBERS } from '@/lib/mock-data'
import { downloadCsv } from '@/lib/csv'
import { useProducts } from '@/lib/products-context'
import { getStockRequests, localTimestamp, updateStockRequest } from '@/lib/prototype-storage'
import { formatKstDateTime } from '@/lib/utils'
import {
  getStockRequestReasonMeta,
  STOCK_REQUEST_REASONS,
  getStockRequestStatusActions,
  getStockRequestStatusMeta,
  STOCK_REQUEST_STATUS_OPTIONS,
} from '@/lib/stock-request'
import type { StockRequest, StockRequestStatus } from '@/lib/types'

const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const ITEMS_PER_PAGE = 20
const DEFAULT_STOCK_BRANCH_CODE = '1110'

type RequestDateFilterKey = 'requestedAt' | 'processedAt'
type RequestDateFilters = DateFilterState<RequestDateFilterKey>

const REQUEST_DATE_FILTER_OPTIONS: DateFilterOption<RequestDateFilterKey>[] = [
  { value: 'requestedAt', label: '요청일시' },
  { value: 'processedAt', label: '처리일시' },
]

const STOCK_REQUEST_REASON_LARGE_OPTIONS = Array.from(
  new Set(STOCK_REQUEST_REASONS.map(reason => getStockRequestReasonMeta(reason).large)),
)
const STOCK_REQUEST_REASON_MIDDLE_OPTIONS = Array.from(
  new Set(STOCK_REQUEST_REASONS.map(reason => getStockRequestReasonMeta(reason).middle)),
)

function getInitialDateFilters(): RequestDateFilters {
  return {
    dateType: 'requestedAt',
    from: monthsAgoStr(1),
    to: todayStr(),
  }
}

function updateWithProgressMeta(record: StockRequest, status: StockRequestStatus): StockRequest {
  const now = localTimestamp()
  return {
    ...record,
    status,
    processedAt: now,
    processor: CURRENT_ADMIN_LABEL,
    processorId: CURRENT_ADMIN_MEMBER?.id ?? null,
  }
}

function StatusBadge({ status }: { status: StockRequestStatus }) {
  const meta = getStockRequestStatusMeta(status)
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function withReasonMeta(record: StockRequest): StockRequest {
  const meta = getStockRequestReasonMeta(record.reason)
  return {
    ...record,
    reasonLargeCategory: meta.large,
    reasonMiddleCategory: meta.middle,
  }
}

function isStockRequestSelectable(status: StockRequestStatus) {
  return status === 'REQUESTED' || status === 'HOLD'
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  )
}

function getBranchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function StockRequestDetail({
  record,
  onBack,
  onSaved,
}: {
  record: StockRequest
  onBack: () => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const { langCode = 'ko' } = useParams<{ langCode: string }>()
  const { products, updateStockFields } = useProducts()
  const [draft, setDraft] = useState(() => withReasonMeta(record))

  useEffect(() => {
    setDraft(withReasonMeta(record))
  }, [record.requestNo])

  function changeStatus(status: StockRequestStatus) {
    if (!statusActions.includes(status)) return
    if (status === 'COMPLETED') {
      const product = products.find(item => item.productCode === draft.productCode)
      if (product) {
        updateStockFields(product.id, {
          quantity: Math.max(product.quantity - 1, 0),
          psQuantity: typeof product.psQuantity === 'number' ? Math.max(product.psQuantity - 1, 0) : product.psQuantity,
        })
      }
    }
    const next = withReasonMeta(updateWithProgressMeta(draft, status))
    setDraft(next)
    updateStockRequest(next)
    onSaved()
  }

  const statusActions = getStockRequestStatusActions(draft.status)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        뒤로가기
      </button>

      <div className="space-y-4">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400">재고 요청 번호</p>
              <h1 className="mt-1 text-lg font-bold text-gray-900">{record.requestNo}</h1>
            </div>
            <StatusBadge status={draft.status} />
          </div>

          <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium text-gray-400">티켓No.</p>
              {record.ticketNo && record.ticketNo !== '-' ? (
                <button
                  type="button"
                  onClick={() => navigate(`/${langCode}/tickets/${record.ticketNo}`)}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600"
                >
                  {record.ticketNo}
                  <ExternalLink className="h-3 w-3 text-gray-300" />
                </button>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-900">-</p>
              )}
            </div>
            <FieldRow label="요청일시" value={formatKstDateTime(record.requestedAt)} />
            <FieldRow label="요청담당자" value={record.requester} />
            <FieldRow label="제품코드" value={record.productCode} />
            <FieldRow label="제품명" value={record.productName} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">처리 정보</h2>
          </div>
          <div className="grid gap-x-8 gap-y-5 px-5 py-5 md:grid-cols-3">
            <FieldRow label="요청사유" value={draft.reason} />
            <FieldRow label="요청사유 대분류" value={draft.reasonLargeCategory} />
            <FieldRow label="요청사유 중분류" value={draft.reasonMiddleCategory} />
            <FieldRow label="처리일시" value={formatKstDateTime(draft.processedAt)} />
            <FieldRow label="처리자" value={draft.processor} />
          </div>
          {statusActions.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">
              {statusActions.map(status => {
                const meta = getStockRequestStatusMeta(status)
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => changeStatus(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white ${meta.className}`}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export function StockRequestsPage() {
  const { langCode = 'ko', requestNo } = useParams<{ langCode: string; requestNo?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { products, updateStockFields } = useProducts()
  const [records, setRecords] = useState<StockRequest[]>(() => getStockRequests())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [branchCode, setBranchCode] = useState(DEFAULT_STOCK_BRANCH_CODE)
  const defaultDateFilters = useMemo(() => getInitialDateFilters(), [])
  const [dateFilters, setDateFilters] = useState<RequestDateFilters>(() => getInitialDateFilters())

  useEffect(() => {
    const highlightedNo = (location.state as { stockRequestNo?: string } | null)?.stockRequestNo
    if (!highlightedNo) return
    navigate(`/${langCode}/stock/requests/${highlightedNo}`, { replace: true })
  }, [langCode, location.state, navigate])

  function reload() {
    setRecords(getStockRequests())
    setSelected(new Set())
    setPage(1)
  }

  const productByCode = useMemo(() => {
    return new Map(products.map(product => [product.productCode, product]))
  }, [products])

  const branchOptions = useMemo(() => {
    const seen = new Set<string>()
    const options = records
      .map(record => productByCode.get(record.productCode)?.branchCode ?? '')
      .filter(code => {
        if (!code || seen.has(code)) return false
        seen.add(code)
        return true
      })
      .sort((a, b) => getBranchLabel(a).localeCompare(getBranchLabel(b), 'ko'))
    return [DEFAULT_STOCK_BRANCH_CODE, ...options.filter(code => code !== DEFAULT_STOCK_BRANCH_CODE)]
  }, [productByCode, records])

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const recordBranchCode = productByCode.get(record.productCode)?.branchCode ?? ''
      if (branchCode && recordBranchCode !== branchCode) return false
      const selectedDate = dateValue(record[dateFilters.dateType])
      if (dateFilters.from && (!selectedDate || selectedDate < dateFilters.from)) return false
      if (dateFilters.to && (!selectedDate || selectedDate > dateFilters.to)) return false
      return true
    })
  }, [branchCode, dateFilters, productByCode, records])

  const columns = useMemo<TableControlColumn<StockRequest, string>[]>(() => [
    { key: 'requestNo', label: '재고 요청 No.', getValue: record => record.requestNo },
    { key: 'ticketNo', label: 'Ticket No.', getValue: record => record.ticketNo },
    {
      key: 'status',
      label: '상태',
      filterType: 'select',
      filterOptions: STOCK_REQUEST_STATUS_OPTIONS.map(option => option.label),
      getValue: record => getStockRequestStatusMeta(record.status).label,
    },
    { key: 'requestedAt', label: '요청일시', filterable: false, getValue: record => record.requestedAt },
    { key: 'requester', label: '요청담당자', getValue: record => record.requester },
    { key: 'productName', label: '제품명', getValue: record => record.productName },
    { key: 'productCode', label: '제품코드', getValue: record => record.productCode },
    {
      key: 'reasonLargeCategory',
      label: '요청사유 대분류',
      filterType: 'select',
      filterOptions: STOCK_REQUEST_REASON_LARGE_OPTIONS,
      getValue: record => getStockRequestReasonMeta(record.reason).large,
    },
    {
      key: 'reasonMiddleCategory',
      label: '요청사유 중분류',
      filterType: 'select',
      filterOptions: STOCK_REQUEST_REASON_MIDDLE_OPTIONS,
      getValue: record => getStockRequestReasonMeta(record.reason).middle,
    },
    { key: 'reason', label: '요청사유', filterType: 'select', filterOptions: STOCK_REQUEST_REASONS, getValue: record => record.reason },
    { key: 'processedAt', label: '처리일시', filterable: false, getValue: record => record.processedAt ?? '-' },
    { key: 'processor', label: '처리자', getValue: record => record.processor ?? '-' },
  ], [])
  const tableControls = useTableColumnControls(filteredRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableControls.rows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [page, tableControls.rows.length])

  const detailRecord = requestNo ? records.find(record => record.requestNo === requestNo) : undefined

  if (requestNo) {
    if (!detailRecord) {
      return (
        <div className="p-8 text-center text-sm text-gray-500">
          재고 요청을 찾을 수 없습니다.
          <button onClick={() => navigate(`/${langCode}/stock/requests`)} className="ml-2 text-blue-600 hover:underline">
            목록으로
          </button>
        </div>
      )
    }

    return (
      <StockRequestDetail
        record={detailRecord}
        onBack={() => {
          if (window.history.length > 1) navigate(-1)
          else navigate(`/${langCode}/stock/requests`)
        }}
        onSaved={reload}
      />
    )
  }

  const selectableRows = paginatedRows.filter(record => isStockRequestSelectable(record.status))
  const selectableRequestNos = new Set(selectableRows.map(record => record.requestNo))
  const allSelected = selectableRows.length > 0 && selectableRows.every(record => selected.has(record.requestNo))
  const selectedRecordsForBulk = records.filter(record => selected.has(record.requestNo) && isStockRequestSelectable(record.status))
  const availableBulkStatusOptions = STOCK_REQUEST_STATUS_OPTIONS.filter(option => {
    if (selectedRecordsForBulk.length === 0) return false
    return selectedRecordsForBulk.every(record => getStockRequestStatusActions(record.status).includes(option.value))
  })

  function toggleAll() {
    setSelected(() => {
      if (allSelected) return new Set()
      return new Set(selectableRows.map(record => record.requestNo))
    })
  }

  function toggleSelected(requestNoValue: string) {
    if (!selectableRequestNos.has(requestNoValue)) return
    setSelected(current => {
      const next = new Set(current)
      if (next.has(requestNoValue)) next.delete(requestNoValue)
      else next.add(requestNoValue)
      return next
    })
  }

  function applyBulkStatus(status: StockRequestStatus) {
    const selectedRecords = selectedRecordsForBulk.filter(record => getStockRequestStatusActions(record.status).includes(status))
    if (status === 'COMPLETED') {
      const deductionByProductCode = new Map<string, number>()
      selectedRecords.forEach(record => {
        deductionByProductCode.set(record.productCode, (deductionByProductCode.get(record.productCode) ?? 0) + 1)
      })
      deductionByProductCode.forEach((deduction, productCode) => {
        const product = products.find(item => item.productCode === productCode)
        if (!product) return
        updateStockFields(product.id, {
          quantity: Math.max(product.quantity - deduction, 0),
          psQuantity: typeof product.psQuantity === 'number' ? Math.max(product.psQuantity - deduction, 0) : product.psQuantity,
        })
      })
    }
    selectedRecords.forEach(record => {
      updateStockRequest(updateWithProgressMeta(record, status))
    })
    reload()
  }

  function exportCsv() {
    const headers = [
      '재고 요청 No.',
      'Ticket No.',
      '상태',
      '요청일시',
      '요청담당자',
      '제품명',
      '제품코드',
      '요청사유 대분류',
      '요청사유 중분류',
      '요청사유',
      '처리일시',
      '처리자',
    ]
    const rows = tableControls.rows.map(record => {
      const reasonMeta = getStockRequestReasonMeta(record.reason)
      return [
        record.requestNo,
        record.ticketNo,
        getStockRequestStatusMeta(record.status).label,
        formatKstDateTime(record.requestedAt),
        record.requester,
        record.productName,
        record.productCode,
        reasonMeta.large,
        reasonMeta.middle,
        record.reason,
        formatKstDateTime(record.processedAt),
        record.processor,
      ]
    })
    downloadCsv(`stock_requests_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  function applyDateFilter(key: keyof RequestDateFilters, value: string) {
    setPage(1)
    setDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
  }

  function resetFilters() {
    setBranchCode(DEFAULT_STOCK_BRANCH_CODE)
    setSelected(new Set())
    setDateFilters(getInitialDateFilters())
    setPage(1)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 요청</h1>
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
          <DateRangeFilterBar
            value={dateFilters}
            options={REQUEST_DATE_FILTER_OPTIONS}
            onChange={applyDateFilter}
            onReset={resetFilters}
            showReset={isDateFilterActive(dateFilters, defaultDateFilters) || branchCode !== DEFAULT_STOCK_BRANCH_CODE}
          >
            <label className="flex items-center">
              <span className="sr-only">법인</span>
              <select
                value={branchCode}
                onChange={event => {
                  setBranchCode(event.target.value || DEFAULT_STOCK_BRANCH_CODE)
                  setSelected(new Set())
                  setPage(1)
                }}
                className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              >
                {branchOptions.map(option => (
                  <option key={option} value={option}>{getBranchLabel(option)}</option>
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
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map(record => {
                  const reasonMeta = getStockRequestReasonMeta(record.reason)
                  const selectable = isStockRequestSelectable(record.status)
                  return (
                    <tr
                      key={record.requestNo}
                      onClick={() => navigate(`/${langCode}/stock/requests/${record.requestNo}`)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50/70 ${selected.has(record.requestNo) ? 'bg-gray-50' : ''}`}
                    >
                      <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(record.requestNo)}
                          disabled={!selectable}
                          onChange={() => toggleSelected(record.requestNo)}
                          className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          {record.requestNo}
                          <ExternalLink className="h-3 w-3 text-gray-300" />
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.ticketNo}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(record.requestedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.requester}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">{record.productCode}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{reasonMeta.large}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{reasonMeta.middle}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(record.processedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.processor ?? '-'}</td>
                    </tr>
                  )
                })}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-16 text-center text-sm text-gray-400">
                      조회된 재고 요청이 없습니다.
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
            <div>
              <span className="text-xs font-semibold text-white">{selected.size}개 선택됨</span>
              <span className="ml-2 text-[11px] font-medium text-gray-400">상태 일괄변경</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {availableBulkStatusOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyBulkStatus(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white ${option.className}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
