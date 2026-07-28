import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, RefreshCw, Truck } from 'lucide-react'
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
import { createThreePlStoRequest, getStockRequests, getThreePlStoRequests, localTimestamp, updateStockRequest, updateThreePlStoRequest } from '@/lib/prototype-storage'
import { formatKstDateTime } from '@/lib/utils'
import {
  getStockRequestReasonMeta,
  STOCK_REQUEST_REASONS,
  getStockRequestStatusActions,
  getStockRequestStatusMeta,
  STOCK_REQUEST_STATUS_OPTIONS,
} from '@/lib/stock-request'
import type { StockRequest, StockRequestStatus, ThreePlStoRequest } from '@/lib/types'

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
  const [pendingStatus, setPendingStatus] = useState<StockRequestStatus | null>(null)

  useEffect(() => {
    setDraft(withReasonMeta(record))
  }, [record.requestNo])

  const statusActions = getStockRequestStatusActions(draft.status)

  useEffect(() => {
    setPendingStatus(statusActions[0] ?? null)
  }, [draft.status])

  function changeStatus(status: StockRequestStatus) {
    if (!statusActions.includes(status)) return
    const label = getStockRequestStatusMeta(status).label
    if (!window.confirm(`재고 요청 상태를 "${label}"(으)로 변경하시겠습니까?`)) return
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
            <FieldRow label="처리일시" value={formatKstDateTime(draft.processedAt)} />
            <FieldRow label="처리자" value={draft.processor} />
          </div>
          {statusActions.length > 0 && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <select
                value={pendingStatus ?? statusActions[0]}
                onChange={e => setPendingStatus(e.target.value as StockRequestStatus)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:border-gray-400 focus:border-gray-400"
              >
                {statusActions.map(status => {
                  const meta = getStockRequestStatusMeta(status)
                  return <option key={status} value={status}>{meta.label}</option>
                })}
              </select>
              <button
                type="button"
                onClick={() => pendingStatus && changeStatus(pendingStatus)}
                className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                상태 변경
              </button>
            </div>
          )}
        </section>


      </div>
    </div>
  )
}

const STO_STATUS_META: Record<ThreePlStoRequest['status'], { label: string; className: string }> = {
  REQUESTED:  { label: '요청',     className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  SHIPPED:    { label: '출고완료', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  SHIP_FAILED:{ label: '출고불가', className: 'bg-red-50 text-red-600 border-red-200' },
  COMPLETED:  { label: '입고완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELED:   { label: '취소',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const STO_STATUS_ACTIONS: Record<ThreePlStoRequest['status'], ThreePlStoRequest['status'][]> = {
  REQUESTED:  [],
  SHIPPED:    ['COMPLETED'],
  SHIP_FAILED:[],
  COMPLETED:  [],
  CANCELED:   [],
}

const STO_ACTION_BUTTON_META: Record<ThreePlStoRequest['status'], { label: string; className: string }> = {
  REQUESTED:  { label: '요청',     className: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' },
  SHIPPED:    { label: '출고완료', className: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' },
  SHIP_FAILED:{ label: '출고불가', className: 'bg-red-600 text-white border-red-600 hover:bg-red-700' },
  COMPLETED:  { label: '입고완료', className: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' },
  CANCELED:   { label: '취소',     className: 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600' },
}

function ThreePlStoDetail({
  sto,
  stockRequests,
  onBack,
  onSaved,
}: {
  sto: ThreePlStoRequest
  stockRequests: StockRequest[]
  onBack: () => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const { langCode = 'ko' } = useParams<{ langCode: string }>()
  const [draft, setDraft] = useState(sto)
  const [pendingStoStatus, setPendingStoStatus] = useState<ThreePlStoRequest['status'] | null>(null)

  useEffect(() => { setDraft(sto) }, [sto.stoNo])

  const included = stockRequests.filter(r => draft.stockRequestNos.includes(r.requestNo))
  const statusMeta = STO_STATUS_META[draft.status]
  const statusActions = STO_STATUS_ACTIONS[draft.status]

  useEffect(() => { setPendingStoStatus(statusActions[0] ?? null) }, [draft.status])

  function changeStoStatus() {
    const status = pendingStoStatus ?? statusActions[0]
    if (!status) return
    const label = STO_STATUS_META[status].label
    if (!window.confirm(`STO 상태를 "${label}"(으)로 변경하시겠습니까?`)) return
    const updated = updateThreePlStoRequest(draft, status, CURRENT_ADMIN_LABEL)
    setDraft(updated)
    onSaved()
  }

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
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400">STO No.</p>
                <h1 className="mt-1 text-lg font-bold text-gray-900">{draft.stoNo}</h1>
              </div>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-3">
              <FieldRow label="요청일시" value={formatKstDateTime(draft.requestedAt)} />
              <FieldRow label="요청자" value={draft.requester} />
              <FieldRow label="재고 요청 건수" value={`${draft.stockRequestNos.length}건`} />
              {draft.processedAt && <FieldRow label="처리일시" value={formatKstDateTime(draft.processedAt)} />}
              {draft.processor && <FieldRow label="처리자" value={draft.processor} />}
            </div>
          </div>
          {statusActions.length > 0 && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <select
                value={pendingStoStatus ?? statusActions[0]}
                onChange={e => setPendingStoStatus(e.target.value as ThreePlStoRequest['status'])}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:border-gray-400 focus:border-gray-400"
              >
                {statusActions.map(status => (
                  <option key={status} value={status}>{STO_STATUS_META[status].label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={changeStoStatus}
                className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                상태 변경
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">재고 요청 No.</th>
                  <th className="px-5 py-3">Ticket No.</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">제품명</th>
                  <th className="px-5 py-3">제품코드</th>
                  <th className="px-5 py-3">요청사유</th>
                  <th className="px-5 py-3">요청일시</th>
                  <th className="px-5 py-3">요청담당자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {included.map(req => (
                  <tr
                    key={req.requestNo}
                    onClick={() => navigate(`/${langCode}/stock/requests/${req.requestNo}`)}
                    className="cursor-pointer hover:bg-gray-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        {req.requestNo}
                        <ExternalLink className="h-3 w-3 text-gray-300" />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">{req.ticketNo}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">{req.productName}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-gray-700">{req.productCode}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">{req.reason}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">{formatKstDateTime(req.requestedAt)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">{req.requester}</td>
                  </tr>
                ))}
                {included.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                      포함된 재고 요청이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
  const [tab, setTab] = useState<'requests' | 'sto'>('requests')
  const [selectedStoNo, setSelectedStoNo] = useState<string | null>(null)
  const [records, setRecords] = useState<StockRequest[]>(() => getStockRequests())
  const [stoRecords, setStoRecords] = useState<ThreePlStoRequest[]>(() => getThreePlStoRequests())
  const defaultStoDateFilters = useMemo(() => getInitialDateFilters(), [])
  const [stoDateFilters, setStoDateFilters] = useState<RequestDateFilters>(() => getInitialDateFilters())
  const [stoPage, setStoPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<StockRequestStatus>('COMPLETED')
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
    setStoRecords(getThreePlStoRequests())
    setSelected(new Set())
    setPage(1)
  }

  function createStoFromSelected() {
    const requestedNos = [...selected].filter(no => {
      const r = records.find(rec => rec.requestNo === no)
      return r?.status === 'REQUESTED' || r?.status === 'HOLD'
    })
    if (requestedNos.length === 0) return
    createThreePlStoRequest(requestedNos, { label: CURRENT_ADMIN_LABEL, id: CURRENT_ADMIN_MEMBER?.id })
    setRecords(getStockRequests())
    setStoRecords(getThreePlStoRequests())
    setSelected(new Set())
    setTab('sto')
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

  const filteredStoRecords = useMemo(() => {
    return stoRecords.filter(record => {
      const selectedDate = dateValue(record[stoDateFilters.dateType])
      if (stoDateFilters.from && (!selectedDate || selectedDate < stoDateFilters.from)) return false
      if (stoDateFilters.to && (!selectedDate || selectedDate > stoDateFilters.to)) return false
      return true
    })
  }, [stoDateFilters, stoRecords])

  const stoColumns = useMemo<TableControlColumn<ThreePlStoRequest, string>[]>(() => [
    { key: 'stoNo', label: 'STO No.', getValue: record => record.stoNo },
    { key: 'requestedAt', label: '요청일시', filterable: false, getValue: record => record.requestedAt },
    { key: 'requester', label: '요청자', getValue: record => record.requester },
    {
      key: 'status',
      label: '상태',
      filterType: 'select',
      filterOptions: Object.values(STO_STATUS_META).map(m => m.label),
      getValue: record => STO_STATUS_META[record.status].label,
    },
    { key: 'stockCount', label: '재고 요청 건수', filterable: false, getValue: record => `${record.stockRequestNos.length}건` },
    { key: 'processedAt', label: '처리일시', filterable: false, getValue: record => record.processedAt ?? '-' },
    { key: 'processor', label: '처리자', getValue: record => record.processor ?? '-' },
  ], [])
  const stoTableControls = useTableColumnControls(filteredStoRecords, stoColumns)
  const paginatedStoRows = stoTableControls.rows.slice((stoPage - 1) * ITEMS_PER_PAGE, stoPage * ITEMS_PER_PAGE)

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(stoTableControls.rows.length / ITEMS_PER_PAGE))
    if (stoPage > totalPages) setStoPage(totalPages)
  }, [stoPage, stoTableControls.rows.length])

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
    const label = getStockRequestStatusMeta(status).label
    if (!window.confirm(`선택한 ${selectedRecordsForBulk.length}건의 상태를 "${label}"(으)로 변경하시겠습니까?`)) return
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
      '요청사유',
      '처리일시',
      '처리자',
    ]
    const rows = tableControls.rows.map(record => [
      record.requestNo,
      record.ticketNo,
      getStockRequestStatusMeta(record.status).label,
      formatKstDateTime(record.requestedAt),
      record.requester,
      record.productName,
      record.productCode,
      record.reason,
      formatKstDateTime(record.processedAt),
      record.processor,
    ])
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
            <h1 className="text-xl font-bold text-gray-900">재고 요청 관리</h1>
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
            {tab === 'requests' && (
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Excel 다운로드
              </button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-gray-200">
          {([['requests', '재고 요청'], ['sto', '3PL STO 요청 리스트']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setSelected(new Set()) }}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
              {key === 'sto' && stoRecords.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
                  {stoRecords.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 3PL STO 탭 */}
        {tab === 'sto' && (
          selectedStoNo ? (
            <ThreePlStoDetail
              sto={stoRecords.find(s => s.stoNo === selectedStoNo)!}
              stockRequests={records}
              onBack={() => setSelectedStoNo(null)}
              onSaved={() => { setStoRecords(getThreePlStoRequests()); setRecords(getStockRequests()) }}
            />
          ) : (
          <>
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <DateRangeFilterBar
              value={stoDateFilters}
              options={REQUEST_DATE_FILTER_OPTIONS}
              onChange={(key, value) => {
                setStoPage(1)
                setStoDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
              }}
              onReset={() => { setStoDateFilters(getInitialDateFilters()); setStoPage(1) }}
              showReset={isDateFilterActive(stoDateFilters, defaultStoDateFilters)}
            />
            {stoTableControls.renderResetBar()}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                  <tr>
                    {stoColumns.map(col => stoTableControls.renderHeaderCell(col))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedStoRows.map(sto => (
                    <tr
                      key={sto.stoNo}
                      onClick={() => setSelectedStoNo(sto.stoNo)}
                      className="cursor-pointer hover:bg-gray-50/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          {sto.stoNo}
                          <ExternalLink className="h-3 w-3 text-gray-300" />
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(sto.requestedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{sto.requester}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STO_STATUS_META[sto.status].className}`}>
                          {STO_STATUS_META[sto.status].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{sto.stockRequestNos.length}건</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{sto.processedAt ? formatKstDateTime(sto.processedAt) : '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{sto.processor ?? '-'}</td>
                    </tr>
                  ))}
                  {stoTableControls.rows.length === 0 && (
                    <tr>
                      <td colSpan={stoColumns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                        3PL STO 요청 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={stoTableControls.rows.length} perPage={ITEMS_PER_PAGE} current={stoPage} onChange={setStoPage} />
          </section>
          {stoTableControls.renderFilterPopover()}
          </>
          )
        )}

        {/* 재고 요청 탭 */}
        {tab === 'requests' && (
        <>
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
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(record.processedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.processor ?? '-'}</td>
                    </tr>
                  )
                })}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-sm text-gray-400">
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
        </>
        )}

        {selected.size > 0 && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-xl">
            <div>
              <span className="text-xs font-semibold text-white">{selected.size}개 선택됨</span>
              <span className="ml-2 text-[11px] font-medium text-gray-400">상태 일괄변경</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={createStoFromSelected}
                disabled={![...selected].some(no => { const s = records.find(r => r.requestNo === no)?.status; return s === 'REQUESTED' || s === 'HOLD' })}
                className="flex items-center gap-1.5 rounded-full border border-indigo-400 bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Truck className="h-3.5 w-3.5" />
                3PL STO 요청
              </button>
              {availableBulkStatusOptions.length > 0 && (
                <>
                  <select
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value as StockRequestStatus)}
                    className="rounded-xl border border-gray-700 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 outline-none"
                  >
                    {availableBulkStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus(bulkStatus)}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-gray-900 transition-colors hover:bg-gray-100"
                  >
                    상태 변경
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
