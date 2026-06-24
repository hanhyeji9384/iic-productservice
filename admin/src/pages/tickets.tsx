import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ExternalLink, FileDown, Filter, Lock, Plus, ScanLine, Trash2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useNavigate, useParams } from 'react-router-dom'
import { Pagination } from '@/components/pagination'
import { BRANCHES, MEMBERS } from '@/lib/mock-data'
import { addDownloadLog } from '@/lib/download-logs'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import { getCustomersWithOverrides, getTicketsWithExtras } from '@/lib/prototype-storage'
import { getSoDocumentInfo } from '@/lib/ticket-so'
import type { PaymentCompleted, Ticket, TicketReceptionTag, TicketStatus } from '@/lib/types'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'
import { ticketStatusI18nKey } from '@/lib/ticket-status-i18n'

const ITEMS_PER_PAGE = 20

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function monthsAgoStr(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}

const initDateFilters = {
  dateType: 'receivedAt' as DateFilterKey,
  from: monthsAgoStr(6),
  to: todayStr(),
}

function constrainDateRange(next: DateFilters, changedKey: keyof DateFilters): DateFilters {
  if (changedKey !== 'from' && changedKey !== 'to') return next
  if (!next.from || !next.to) return next
  const from = new Date(next.from)
  const to = new Date(next.to)
  const maxMs = 3 * 365.25 * 24 * 60 * 60 * 1000
  if (to.getTime() - from.getTime() > maxMs) {
    if (changedKey === 'from') {
      const capped = new Date(from)
      capped.setFullYear(capped.getFullYear() + 3)
      return { ...next, to: capped.toISOString().slice(0, 10) }
    } else {
      const capped = new Date(to)
      capped.setFullYear(capped.getFullYear() - 3)
      return { ...next, from: capped.toISOString().slice(0, 10) }
    }
  }
  return next
}

const initColumnFilters = {
  ticketNo: '',
  status: 'all',
  receptionPlace: '',
  customerName: '',
  phone: '',
  email: '',
  productName: '',
  repairDepartment: 'all',
  repairDetail: 'all',
  trackingNo: '',
  paymentCompleted: 'all',
  paymentDate: '',
  paymentExpiresAt: '',
  reexportCondition: 'all',
  shippingMethod: 'all',
  shippedAt: '',
  soDocumentNo: '',
}

const REPAIR_TYPES = [
  { value: '젠틀케어', label: '젠틀케어' },
  { value: '부품 교체', label: '부품 교체' },
  { value: '도금수리', label: '도금수리' },
  { value: '용접수리', label: '용접수리' },
  { value: '수리불가', label: '수리불가' },
  { value: '수리취소', label: '수리취소' },
  { value: '보상_제품 교환권', label: '보상_제품 교환권' },
  { value: '무상 수리 쿠폰', label: '무상 수리 쿠폰' },
  { value: '긴급 수리 쿠폰', label: '긴급 수리 쿠폰' },
  { value: '환불', label: '환불' },
  { value: '제품교환', label: '제품교환' },
  { value: '타제품교환', label: '타제품교환' },
  { value: '심플케어', label: '심플케어' },
]

const REPAIR_DEPARTMENTS = [
  { code: '1', label: '본사' },
  { code: '3', label: '공장' },
  { code: '4', label: '협력업체' },
  { code: '5', label: 'US Office' },
  { code: '6', label: 'JP Office' },
  { code: '7', label: '3PL' },
]

const SHIPPING_METHODS = [
  { code: 'p', label: '택배(HQ)' },
  { code: 'd', label: '해외택배(DHL)' },
  { code: 'b', label: '행낭(HQ)' },
  { code: 'h', label: '택배(3PL)' },
  { code: 'g', label: '해외택배 3PL' },
  { code: 's', label: '자체수령' },
  { code: 'q', label: '퀵' },
  { code: 't', label: '임시출고' },
]

const FILTERABLE_COLS = new Set([
  'ticketNo', 'status', 'receptionPlace', 'customerName', 'phone', 'email',
  'productName', 'repairDepartment', 'repairDetail', 'trackingNo',
  'paymentCompleted', 'paymentDate', 'paymentExpiresAt', 'reexportCondition', 'shippingMethod',
  'shippedAt', 'soDocumentNo',
])

type DateFilterKey = 'receivedAt' | 'hqReceivedAt' | 'expectedShipAt'
type DateFilters = typeof initDateFilters
type ColumnFilters = typeof initColumnFilters
type ColumnFilterKey = keyof ColumnFilters
type SortKey =
  | 'ticketNo'
  | 'receivedAt'
  | 'status'
  | 'hqReceivedAt'
  | 'expectedShipAt'
  | 'receptionPlace'
  | 'customerName'
  | 'productName'
  | 'repairDepartment'
  | 'paymentCompleted'
  | 'paymentDate'
  | 'paymentExpiresAt'
  | 'reexportCondition'
  | 'shippingMethod'
  | 'shippedAt'
  | 'soDocumentNo'

const DATE_FILTER_LABELS: Record<DateFilterKey, string> = {
  receivedAt: '접수일',
  hqReceivedAt: '본사입고일',
  expectedShipAt: '출고예정일',
}

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  RECEIVED: { label: '접수', className: 'bg-sky-50 text-sky-700' },
  JUDGEMENT_PENDING: { label: '서비스 판정 대기', className: 'bg-amber-50 text-amber-700' },
  JUDGEMENT_DONE: { label: '서비스 판정 완료', className: 'bg-blue-50 text-blue-700' },
  PAYMENT_REQUESTED: { label: '결제 요청', className: 'bg-violet-50 text-violet-700' },
  PAYMENT_DONE: { label: '결제 완료', className: 'bg-emerald-50 text-emerald-700' },
  PARTNER_SENT: { label: '협력업체 발송', className: 'bg-indigo-50 text-indigo-700' },
  REPAIRING: { label: '수리 진행 중', className: 'bg-blue-50 text-blue-700' },
  REPAIR_DONE: { label: '수리 완료', className: 'bg-emerald-50 text-emerald-700' },
  READY_TO_SHIP: { label: '출고 준비 완료', className: 'bg-cyan-50 text-cyan-700' },
  SHIPPING: { label: '배송 시작', className: 'bg-slate-100 text-slate-700' },
  SHIPPED: { label: '배송 완료', className: 'bg-gray-100 text-gray-600' },
  CLOSED: { label: '종료', className: 'bg-gray-100 text-gray-500' },
  CANCELED: { label: '취소', className: 'bg-red-50 text-red-700' },
  PICKUP_WAITING: { label: '회수 대기중', className: 'bg-orange-50 text-orange-700' },
}

const PAYMENT_META: Record<PaymentCompleted, { label: string; className: string }> = {
  Y: { label: 'Y', className: 'bg-emerald-50 text-emerald-700' },
  N: { label: 'N', className: 'bg-gray-100 text-gray-500' },
  C: { label: '취소', className: 'bg-red-50 text-red-700' },
}

const RECEPTION_TAG_META: Record<TicketReceptionTag, { label: string; className: string }> = {
  RETURN_COMPONENTS: {
    label: '구성품 반송',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  MODIFIED: {
    label: '수정',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  PRE_RECEPTION: {
    label: '구매증빙 필요',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function displayValue(value?: string | null) {
  return value && value.trim() ? value : '-'
}

function dateTimeWithTimezone(value?: string | null) {
  if (!value || !value.trim()) return <span>-</span>
  return (
    <>
      {value} <span className="font-sans text-gray-400">(KST)</span>
    </>
  )
}

function dateValue(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function normalizeText(value?: string | null) {
  return (value ?? '').toLowerCase()
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function findMappedCustomer(ticket: Ticket) {
  const ticketEmail = ticket.email.trim().toLowerCase()
  return getCustomersWithOverrides().find(customer => {
    return Boolean(ticketEmail && customer.email.trim().toLowerCase() === ticketEmail)
  })
}

function matchesText(value: string | null | undefined, query: string) {
  const trimmed = query.trim().toLowerCase()
  return !trimmed || normalizeText(value).includes(trimmed)
}

function getSortValue(ticket: Ticket, key: SortKey) {
  if (key === 'status') return STATUS_META[ticket.status].label
  if (key === 'paymentCompleted') return PAYMENT_META[ticket.paymentCompleted].label
  if (key === 'paymentExpiresAt') return getPaymentExpiresAt(ticket) ?? ''
  return ticket[key] ?? ''
}

function addDaysFromDateTime(value: string, days: number) {
  const base = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(base.getTime())) return null
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

function getPaymentExpiresAt(ticket: Ticket) {
  if (ticket.paymentExpiresAt) return ticket.paymentExpiresAt
  if (ticket.paymentCompleted !== 'N' || ticket.status !== 'PAYMENT_REQUESTED') return null
  return addDaysFromDateTime(ticket.receivedAt, 7)
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${meta.className}`}>
      <I18nText i18nKey={ticketStatusI18nKey(status)} display="tooltip">
        {meta.label}
      </I18nText>
    </span>
  )
}

function YnBadge({ value }: { value: 'Y' | 'N' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
      value === 'Y' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {value}
    </span>
  )
}

function PaymentBadge({ value }: { value: PaymentCompleted }) {
  const meta = PAYMENT_META[value]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function ReceptionTags({ tags }: { tags?: TicketReceptionTag[] }) {
  if (!tags?.length) return <span className="text-xs text-gray-300">-</span>
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map(tag => {
        const meta = RECEPTION_TAG_META[tag]
        return (
          <span
            key={tag}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
          >
            {meta.label}
          </span>
        )
      })}
    </div>
  )
}

function SoStatusBadge({ ticket }: { ticket: Ticket }) {
  const info = getSoDocumentInfo(ticket)
  if (info.status === 'NOT_READY') return <span className="text-gray-300">-</span>

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${info.className}`}>
      {info.label}
    </span>
  )
}

export function TicketsPage() {
  const [activeBranch, setActiveBranch] = useState('')
  const branchOptions = useMemo(() => {
    return BRANCHES.filter(branch => branch.code === '1110' || branch.code === 'C1002')
  }, [])
  const effectiveBranch = activeBranch

  const [dateFilters, setDateFilters] = useState<DateFilters>(initDateFilters)
  const [appliedDateFilters, setAppliedDateFilters] = useState<DateFilters>(initDateFilters)
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(initColumnFilters)
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<ColumnFilters>(initColumnFilters)
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>('receivedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc')
  const [scanValue, setScanValue] = useState('')
  const [scanError, setScanError] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<TicketStatus | ''>('')
  const [bulkTechnician, setBulkTechnician] = useState('')
  const [modalScanValue, setModalScanValue] = useState('')
  const [modalScanError, setModalScanError] = useState(false)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [originalDownloadOpen, setOriginalDownloadOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportReason, setExportReason] = useState('')
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [tickets] = useState(() => getTicketsWithExtras())
  const scanInputRef = useRef<HTMLInputElement>(null)
  const modalScanRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<number | null>(null)
  const navigate = useNavigate()
  const { langCode } = useParams<{ langCode: string }>()
  const i18nLabel = useI18nLabel()

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!exportMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [exportMenuOpen])

  useEffect(() => {
    if (!originalDownloadOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOriginalDownloadModal()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [originalDownloadOpen])

  const setColumn = (key: ColumnFilterKey) => (value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }))
  }

  const branchTickets = useMemo(
    () => tickets.filter(ticket =>
      !deletedIds.has(ticket.ticketNo) &&
      (!effectiveBranch || ticket.branchCode === effectiveBranch)
    ),
    [effectiveBranch, deletedIds, tickets]
  )

  function buildExportRows(masked: boolean) {
    return sorted.map(t => ({
      '태그': (t.receptionTags ?? []).map(tag => RECEPTION_TAG_META[tag].label).join(', '),
      '티켓번호': t.ticketNo,
      '접수일': t.receivedAt,
      '상태': STATUS_META[t.status].label,
      '접수처': t.receptionPlace,
      '고객명': masked ? maskName(t.customerName) : t.customerName,
      '전화번호': masked ? maskPhone(t.phone) : t.phone,
      '이메일': masked ? maskEmail(t.email) : t.email,
      '제품명': t.productName,
      '수리부서': t.repairDepartment,
      '수리내역': t.repairDetail,
      '운송장번호': t.trackingNo ?? '',
      '결제완료': t.paymentCompleted,
      '결제일': t.paymentDate ?? '',
      '결제 만료기한': getPaymentExpiresAt(t) ?? '',
      '재수출이행조건': t.reexportCondition,
      '배송방법': t.shippingMethod,
      '출고일': t.shippedAt ?? '',
      'SO문서번호': t.soDocumentNo ?? '',
      'SO상태': getSoDocumentInfo(t).label,
      '본사입고일': t.hqReceivedAt ?? '',
      '출고예정일': t.expectedShipAt ?? '',
    }))
  }

  function downloadExcel(masked: boolean, reason?: string) {
    const rows = buildExportRows(masked)
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '티켓목록')
    XLSX.writeFile(wb, `tickets_${masked ? 'masked' : 'original'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    if (!masked) {
      addDownloadLog({
        adminName: '한혜지',
        adminId: 'monster563',
        target: '티켓',
        downloadType: '원본',
        count: sorted.length,
        ip: '10.0.1.42',
        reason: reason?.trim() || '-',
      })
    }
  }

  function handleMaskedDownload() {
    downloadExcel(true)
    setExportMenuOpen(false)
  }

  function openOriginalDownloadModal() {
    setExportMenuOpen(false)
    setOriginalDownloadOpen(true)
  }

  function closeOriginalDownloadModal() {
    setOriginalDownloadOpen(false)
    setExportPassword('')
    setExportReason('')
  }

  function handleOriginalDownload() {
    if (!exportPassword || !exportReason.trim()) return
    downloadExcel(false, exportReason)
    closeOriginalDownloadModal()
  }

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleCustomerClick(ticket: Ticket) {
    const customer = findMappedCustomer(ticket)
    if (!customer) {
      showToast('연결된 고객 정보를 찾을 수 없습니다.', false)
      return
    }
    navigate(`/${langCode}/customers/${customer.id}`)
  }

  function handleDeleteConfirm() {
    setDeletedIds(prev => new Set([...prev, ...selectedIds]))
    setSelectedIds(new Set())
    setDeleteConfirmOpen(false)
  }

  const activeFilterCount = useMemo(() => {
    const defaultFrom = monthsAgoStr(6)
    const defaultTo = todayStr()
    const dateCount =
      appliedDateFilters.dateType !== initDateFilters.dateType ||
      appliedDateFilters.from !== defaultFrom ||
      appliedDateFilters.to !== defaultTo
        ? 1 : 0
    const columnCount = (Object.keys(initColumnFilters) as ColumnFilterKey[])
      .filter(key => appliedColumnFilters[key] !== initColumnFilters[key]).length
    return dateCount + columnCount
  }, [appliedDateFilters, appliedColumnFilters])

  const filtered = useMemo(() => {
    return branchTickets.filter(ticket => {
      const selectedDate = dateValue(ticket[appliedDateFilters.dateType])
      if (appliedDateFilters.from && (!selectedDate || selectedDate < appliedDateFilters.from)) return false
      if (appliedDateFilters.to && (!selectedDate || selectedDate > appliedDateFilters.to)) return false

      if (!matchesText(ticket.ticketNo, appliedColumnFilters.ticketNo)) return false
      if (appliedColumnFilters.status !== 'all' && ticket.status !== appliedColumnFilters.status) return false
      if (!matchesText(ticket.receptionPlace, appliedColumnFilters.receptionPlace)) return false
      if (!matchesText(ticket.customerName, appliedColumnFilters.customerName)) return false
      if (appliedColumnFilters.phone.trim()) {
        const phoneQuery = normalizeDigits(appliedColumnFilters.phone)
        if (!phoneQuery || !normalizeDigits(ticket.phone).includes(phoneQuery)) return false
      }
      if (!matchesText(ticket.email, appliedColumnFilters.email)) return false
      if (!matchesText(ticket.productName, appliedColumnFilters.productName)) return false
      if (appliedColumnFilters.repairDepartment !== 'all' && ticket.repairDepartment !== appliedColumnFilters.repairDepartment) return false
      if (appliedColumnFilters.repairDetail !== 'all' && ticket.repairDetail !== appliedColumnFilters.repairDetail) return false
      if (!matchesText(ticket.trackingNo, appliedColumnFilters.trackingNo)) return false
      if (appliedColumnFilters.paymentCompleted !== 'all' && ticket.paymentCompleted !== appliedColumnFilters.paymentCompleted) return false
      if (!matchesText(ticket.paymentDate, appliedColumnFilters.paymentDate)) return false
      if (!matchesText(getPaymentExpiresAt(ticket), appliedColumnFilters.paymentExpiresAt)) return false
      if (appliedColumnFilters.reexportCondition !== 'all' && ticket.reexportCondition !== appliedColumnFilters.reexportCondition) return false
      if (appliedColumnFilters.shippingMethod !== 'all' && ticket.shippingMethod !== appliedColumnFilters.shippingMethod) return false
      if (!matchesText(ticket.shippedAt, appliedColumnFilters.shippedAt)) return false
      if (!matchesText(ticket.soDocumentNo, appliedColumnFilters.soDocumentNo)) return false
      return true
    })
  }, [appliedDateFilters, branchTickets, appliedColumnFilters])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const direction = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * direction
    })
  }, [filtered, sortDir, sortKey])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  function applyColumnFilter(key: ColumnFilterKey, value: string) {
    setColumnFilters(prev => ({ ...prev, [key]: value }))
    setAppliedColumnFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
    setFilterPopover(null)
  }

  function applyCurrentColumnFilters() {
    setAppliedColumnFilters({ ...columnFilters })
    setPage(1)
    setFilterPopover(null)
  }

  function applyDateFilter(key: keyof DateFilters, value: string) {
    setDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
    setAppliedDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
    setPage(1)
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const value = scanValue.trim()
    if (!value) return
    const ticket = tickets.find(t => t.ticketNo === value)
    if (ticket) {
      setScanValue('')
      setScanError(false)
      navigate(`/${langCode}/tickets/${ticket.ticketNo}`)
    } else {
      setScanError(true)
    }
  }

  function handleModalScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const value = modalScanValue.trim()
    if (!value) return
    const ticket = tickets.find(t => t.ticketNo === value)
    if (ticket) {
      setModalScanValue('')
      setModalScanError(false)
      setSelectedIds(prev => new Set([...prev, ticket.ticketNo]))
    } else {
      setModalScanError(true)
    }
  }

  function handleReset() {
    const freshDates = { ...initDateFilters, from: monthsAgoStr(6), to: todayStr() }
    setActiveBranch('')
    setDateFilters(freshDates)
    setAppliedDateFilters(freshDates)
    setColumnFilters(initColumnFilters)
    setAppliedColumnFilters(initColumnFilters)
    setPage(1)
    setSortKey('receivedAt')
    setSortDir('desc')
    setFilterPopover(null)
  }

  function handleBranchChange(branchCode: string) {
    setActiveBranch(branchCode)
    setPage(1)
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function hasActiveAppliedFilter(key: string): boolean {
    const k = key as ColumnFilterKey
    return k in initColumnFilters && appliedColumnFilters[k] !== initColumnFilters[k]
  }

  function getAppliedFilterDisplay(key: string): string {
    const k = key as ColumnFilterKey
    const val = appliedColumnFilters[k]
    switch (k) {
      case 'status': {
        const status = val as TicketStatus
        return STATUS_META[status] ? i18nLabel(ticketStatusI18nKey(status), STATUS_META[status].label) : val
      }
      case 'paymentCompleted': return PAYMENT_META[val as PaymentCompleted]?.label ?? val
      default: return val
    }
  }

  const tableColumns: { key: string; label: string; sort: SortKey | null }[] = [
    { key: 'receptionTags', label: '태그', sort: null },
    { key: 'ticketNo', label: 'Ticket No.', sort: 'ticketNo' },
    { key: 'receivedAt', label: '접수일시', sort: 'receivedAt' },
    { key: 'status', label: '상태', sort: 'status' },
    { key: 'hqReceivedAt', label: '본사입고일', sort: 'hqReceivedAt' },
    { key: 'expectedShipAt', label: '출고예정일', sort: 'expectedShipAt' },
    { key: 'receptionPlace', label: '접수처', sort: 'receptionPlace' },
    { key: 'email', label: '이메일', sort: null },
    { key: 'customerName', label: '고객명', sort: 'customerName' },
    { key: 'phone', label: '전화번호', sort: null },
    { key: 'productName', label: '제품명', sort: 'productName' },
    { key: 'repairDepartment', label: '수리진행처', sort: 'repairDepartment' },
    { key: 'repairDetail', label: '수리내용', sort: null },
    { key: 'trackingNo', label: '등기번호', sort: null },
    { key: 'paymentCompleted', label: '결제 완료 여부', sort: 'paymentCompleted' },
    { key: 'paymentDate', label: '결제일자', sort: 'paymentDate' },
    { key: 'paymentExpiresAt', label: '결제 만료기한', sort: 'paymentExpiresAt' },
    { key: 'reexportCondition', label: '재수출 이행 조건 여부', sort: 'reexportCondition' },
    { key: 'shippingMethod', label: '출고방식', sort: 'shippingMethod' },
    { key: 'shippedAt', label: '출고완료일', sort: 'shippedAt' },
    { key: 'soDocumentNo', label: 'SO문서번호', sort: 'soDocumentNo' },
    { key: 'soStatus', label: 'SO상태', sort: null },
  ]

  function renderTextFilter(key: ColumnFilterKey, placeholder: string) {
    const val = columnFilters[key]
    return (
      <div className="w-44 space-y-1.5">
        <input type="text" value={val} placeholder={placeholder}
          onChange={e => setColumn(key)(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyCurrentColumnFilters()}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
        <div className="flex gap-1.5">
          {val && (
            <button onClick={() => applyColumnFilter(key, '')}
              className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
          )}
          <button onClick={applyCurrentColumnFilters}
            className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
        </div>
      </div>
    )
  }

  function renderDateFilter(key: ColumnFilterKey) {
    const val = columnFilters[key]
    return (
      <div className="w-44 space-y-1.5">
        <input type="date" value={val}
          onChange={e => setColumn(key)(e.target.value)}
          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
        <div className="flex gap-1.5">
          {val && (
            <button onClick={() => applyColumnFilter(key, '')}
              className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
          )}
          <button onClick={applyCurrentColumnFilters}
            className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
        </div>
      </div>
    )
  }

  function renderSelectFilter(key: ColumnFilterKey, options: { value: string; label: string }[]) {
    const current = columnFilters[key]
    return (
      <div className="max-h-72 overflow-y-auto" style={{width: 'max-content', minWidth: '8rem'}}>
        <button onClick={() => applyColumnFilter(key, 'all')}
          className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${current === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>전체</button>
        {options.map(opt => (
          <button key={opt.value} onClick={() => applyColumnFilter(key, opt.value)}
            className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap ${current === opt.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  function renderFilterPopoverContent(key: string) {
    switch (key) {
      case 'ticketNo':       return renderTextFilter('ticketNo', '티켓번호')
      case 'receptionPlace': return renderTextFilter('receptionPlace', '접수처')
      case 'customerName':   return renderTextFilter('customerName', '고객명')
      case 'phone':          return renderTextFilter('phone', '전화번호')
      case 'email':          return renderTextFilter('email', '이메일')
      case 'productName':    return renderTextFilter('productName', '제품명')
      case 'repairDetail':   return renderSelectFilter('repairDetail', REPAIR_TYPES)
      case 'trackingNo':     return renderTextFilter('trackingNo', '등기번호')
      case 'soDocumentNo':   return renderTextFilter('soDocumentNo', 'SO문서번호')
      case 'paymentDate':    return renderDateFilter('paymentDate')
      case 'paymentExpiresAt': return renderDateFilter('paymentExpiresAt')
      case 'shippedAt':      return renderDateFilter('shippedAt')
      case 'status':
        return renderSelectFilter('status',
          (Object.keys(STATUS_META) as TicketStatus[]).map(s => ({
            value: s,
            label: i18nLabel(ticketStatusI18nKey(s), STATUS_META[s].label),
          }))
        )
      case 'repairDepartment':
        return renderSelectFilter('repairDepartment',
          REPAIR_DEPARTMENTS.map(d => ({ value: d.label, label: d.label }))
        )
      case 'paymentCompleted':
        return renderSelectFilter('paymentCompleted', [
          { value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }, { value: 'C', label: '취소' },
        ])
      case 'reexportCondition':
        return renderSelectFilter('reexportCondition', [
          { value: 'Y', label: 'Y' }, { value: 'N', label: 'N' },
        ])
      case 'shippingMethod':
        return renderSelectFilter('shippingMethod',
          SHIPPING_METHODS.map(m => ({ value: m.label, label: m.label }))
        )
      default:
        return null
    }
  }

  const currentPageTicketNos = paginated.map(t => t.ticketNo)
  const allCurrentSelected = currentPageTicketNos.length > 0 && currentPageTicketNos.every(id => selectedIds.has(id))

  function toggleSelectAll() {
    if (allCurrentSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        currentPageTicketNos.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...currentPageTicketNos]))
    }
  }

  function toggleSelect(ticketNo: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(ticketNo)) next.delete(ticketNo)
      else next.add(ticketNo)
      return next
    })
  }

  function handleBulkApply() {
    setSelectedIds(new Set())
    setBulkStatus('')
    setBulkTechnician('')
    setBulkEditModalOpen(false)
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">티켓</h1>
          </div>
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <FileDown className="w-4 h-4" />
              Excel 다운로드
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-black/[0.08]">
                <button
                  type="button"
                  onClick={handleMaskedDownload}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    <span className="block font-medium">마스킹 버전</span>
                    <span className="mt-0.5 block text-xs text-gray-400">개인정보 가림 처리</span>
                  </span>
                </button>
                <div className="mx-3 h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={openOriginalDownloadModal}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    <span className="block font-medium">마스킹 없는 버전</span>
                    <span className="mt-0.5 block text-xs text-gray-400">사유 입력 후 로그 기록</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <select
              value={effectiveBranch}
              onChange={e => handleBranchChange(e.target.value)}
              className="w-52 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="">전체</option>
              {branchOptions.map(branch => (
                <option key={branch.code} value={branch.code}>{branchLabel(branch.code)}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
            <select
              value={dateFilters.dateType}
              onChange={e => applyDateFilter('dateType', e.target.value)}
              className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {(Object.keys(DATE_FILTER_LABELS) as DateFilterKey[]).map(key => (
                <option key={key} value={key}>{DATE_FILTER_LABELS[key]}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              {(() => {
                const today = todayStr()
                const maxTo = (() => {
                  if (!dateFilters.from) return today
                  const d = new Date(dateFilters.from)
                  d.setFullYear(d.getFullYear() + 3)
                  const s = d.toISOString().slice(0, 10)
                  return s < today ? s : today
                })()
                const minFrom = dateFilters.to
                  ? (() => { const d = new Date(dateFilters.to); d.setFullYear(d.getFullYear() - 3); return d.toISOString().slice(0, 10) })()
                  : undefined
                return (
                  <>
                    <input type="date" value={dateFilters.from}
                      min={minFrom}
                      max={dateFilters.to || today}
                      onChange={e => applyDateFilter('from', e.target.value)}
                      className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400" />
                    <span className="text-gray-400 text-xs flex-shrink-0">~</span>
                    <input type="date" value={dateFilters.to}
                      min={dateFilters.from || undefined}
                      max={maxTo}
                      onChange={e => applyDateFilter('to', e.target.value)}
                      className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400" />
                  </>
                )
              })()}
            </div>
            {(activeBranch !== '' || activeFilterCount > 0) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3 h-3" />초기화
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => navigate(`/${langCode}/tickets/new`, { state: { branchCode: effectiveBranch } })}
                className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />티켓 생성
              </button>
              <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
              <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-colors ${
                scanError
                  ? 'border-red-300 bg-red-50 focus-within:border-red-400'
                  : 'border-gray-200 bg-gray-50 focus-within:border-gray-400 focus-within:bg-white'
              }`}>
                <ScanLine className={`w-3.5 h-3.5 flex-shrink-0 ${scanError ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanValue}
                  placeholder="바코드 스캔"
                  autoFocus
                  onChange={e => { setScanValue(e.target.value); setScanError(false) }}
                  onKeyDown={handleScan}
                  className="w-36 bg-transparent text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none"
                />
                {scanValue && (
                  <button onClick={() => { setScanValue(''); setScanError(false) }} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {scanError && <span className="text-xs text-red-500 whitespace-nowrap">티켓을 찾을 수 없습니다</span>}
            </div>
          </div>
          {/* ── 선택 표시줄 ── */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-2.5 border-b border-blue-100 bg-blue-50 flex items-center gap-3">
              <span className="text-xs font-semibold text-blue-700">{selectedIds.size}개 선택됨</span>
              <button
                onClick={() => setBulkEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >편집</button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
              ><Trash2 className="w-3 h-3" />삭제</button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-blue-400 hover:text-blue-600 transition-colors"
              >선택 해제</button>
            </div>
          )}
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-[3020px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 bg-gray-50/50 w-10 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  {tableColumns.map(column => {
                    const isFiltered = hasActiveAppliedFilter(column.key)
                    return (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap transition-colors ${
                          isFiltered ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {column.sort ? (
                            <button
                              onClick={() => handleSort(column.sort!)}
                              className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity text-xs font-semibold tracking-wide"
                            >
                              {column.label} <SortIcon col={column.sort} />
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                          {FILTERABLE_COLS.has(column.key) && (
                            <button
                              onClick={e => handleFilterIconClick(column.key, e)}
                              className={`p-0.5 rounded transition-colors ${
                                filterPopover?.col === column.key || isFiltered
                                  ? 'text-blue-500'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                            >
                              <Filter className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[140px] truncate text-[10px] font-medium text-blue-600 normal-case tracking-normal">
                            {getAppliedFilterDisplay(column.key)}
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
                    <td colSpan={tableColumns.length + 1} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ticket.ticketNo)}
                          onChange={() => toggleSelect(ticket.ticketNo)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <ReceptionTags tags={ticket.receptionTags} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/${langCode}/tickets/${ticket.ticketNo}`)}
                        className="text-xs font-mono font-semibold text-gray-900 hover:underline underline-offset-2 decoration-gray-400"
                      >
                        {ticket.ticketNo}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{dateTimeWithTimezone(ticket.receivedAt)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{displayValue(ticket.hqReceivedAt)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{displayValue(ticket.expectedShipAt)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700 max-w-[260px] truncate">{ticket.receptionPlace}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCustomerClick(ticket)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 underline-offset-4 transition-colors hover:text-blue-600 hover:underline"
                      >
                        {maskEmail(ticket.email)}
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-300" />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{maskName(ticket.customerName)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{maskPhone(ticket.phone)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-gray-900">{ticket.productName}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-700">{ticket.repairDepartment}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 max-w-[200px] truncate">{ticket.repairDetail}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{displayValue(ticket.trackingNo)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><PaymentBadge value={ticket.paymentCompleted} /></td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{dateTimeWithTimezone(ticket.paymentDate)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{displayValue(getPaymentExpiresAt(ticket))}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><YnBadge value={ticket.reexportCondition} /></td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-700">{ticket.shippingMethod}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{displayValue(ticket.shippedAt)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{displayValue(ticket.soDocumentNo)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><SoStatusBadge ticket={ticket} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
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

      {/* ── 원본 엑셀 다운로드 모달 ── */}
      {originalDownloadOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeOriginalDownloadModal}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Lock className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">마스킹 없는 버전 다운로드</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      개인정보가 포함된 파일입니다. 다운로드 이력이 기록됩니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOriginalDownloadModal}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">파일 비밀번호 설정</label>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={e => setExportPassword(e.target.value)}
                  placeholder="다운로드할 파일에 설정할 비밀번호"
                  className="w-full rounded-xl border border-gray-100 bg-[#f8f9fb] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-300 focus:border-gray-300 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  다운로드 사유 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={exportReason}
                  onChange={e => setExportReason(e.target.value)}
                  rows={3}
                  placeholder="원본 다운로드 사유를 입력하세요"
                  className="w-full resize-none rounded-xl border border-gray-100 bg-[#f8f9fb] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-300 focus:border-gray-300 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeOriginalDownloadModal}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleOriginalDownload}
                disabled={!exportPassword || !exportReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileDown className="h-4 w-4" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 벌크 편집 모달 ── */}
      {bulkEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => { setBulkEditModalOpen(false); setModalScanValue(''); setModalScanError(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[700px] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">벌크 편집</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{selectedIds.size}개 티켓 선택됨</p>
              </div>
              <button onClick={() => { setBulkEditModalOpen(false); setModalScanValue(''); setModalScanError(false) }} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 바코드 스캔으로 추가 */}
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-[11px] font-medium text-gray-400 mb-1.5">바코드 스캔으로 추가</p>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${modalScanError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-gray-400 focus-within:bg-white'}`}>
                <ScanLine className={`w-4 h-4 flex-shrink-0 ${modalScanError ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  ref={modalScanRef}
                  autoFocus
                  type="text"
                  value={modalScanValue}
                  placeholder="바코드를 스캔하세요 (Enter)"
                  onChange={e => { setModalScanValue(e.target.value); setModalScanError(false) }}
                  onKeyDown={handleModalScan}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                />
                {modalScanValue && (
                  <button onClick={() => { setModalScanValue(''); setModalScanError(false) }} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {modalScanError && <p className="text-xs text-red-500 mt-1.5">티켓을 찾을 수 없습니다</p>}
            </div>

            {/* 선택된 티켓 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {selectedIds.size === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">선택된 티켓이 없습니다</p>
              ) : (
                <div className="space-y-1.5">
                  {[...selectedIds].map(id => {
                    const t = tickets.find(tk => tk.ticketNo === id)
                    if (!t) return null
                    const meta = STATUS_META[t.status]
                    return (
                      <div key={id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-mono font-semibold text-gray-800">{t.ticketNo}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.className}`}>{meta.label}</span>
                            <span className="ml-1.5">{t.customerName}</span>
                          </p>
                        </div>
                        <button onClick={() => toggleSelect(id)} className="text-gray-300 hover:text-red-400 transition-colors ml-4 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 편집 필드 */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-3 flex-shrink-0">
              <div>
                <p className="text-[11px] font-medium text-gray-400 mb-1.5">상태 변경</p>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as TicketStatus | '')}
                  className="w-full appearance-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">-</option>
                  {(Object.keys(STATUS_META) as TicketStatus[]).map(s => (
                    <option key={s} value={s}>{i18nLabel(ticketStatusI18nKey(s), STATUS_META[s].label)}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 mb-1.5">서비스 기술자</p>
                <select
                  value={bulkTechnician}
                  onChange={e => setBulkTechnician(e.target.value)}
                  className="w-full appearance-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">-</option>
                  {MEMBERS.filter(m =>
                    m.isTechnician &&
                    m.status === 'active' &&
                    (m.managedBranches.includes('*') || m.managedBranches.includes(effectiveBranch))
                  ).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <button onClick={() => { setBulkEditModalOpen(false); setModalScanValue(''); setModalScanError(false) }} className="px-4 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-100 transition-colors">취소</button>
              <button
                onClick={handleBulkApply}
                disabled={!bulkStatus && !bulkTechnician}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >적용</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-gray-900 mb-1">티켓 삭제</h3>
              <p className="text-sm text-gray-500">
                선택한 <span className="font-semibold text-gray-900">{selectedIds.size}개</span> 티켓을 삭제하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">취소</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium">삭제</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
