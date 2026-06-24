import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Filter, Package, X } from 'lucide-react'
import { BRANCHES } from '@/lib/mock-data'
import { getComponentReturns, getCustomersWithOverrides, getTicketsWithExtras } from '@/lib/prototype-storage'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import { I18nText } from '@/lib/i18n-inspector'
import { ticketStatusI18nKey } from '@/lib/ticket-status-i18n'
import type { ComponentReturn, ComponentReturnStatus, TicketStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: ComponentReturnStatus; label: string; className: string }[] = [
  { value: 'WAITING', label: '출고준비', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'IN_PROGRESS', label: '송장등록', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: '반송완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

type FilterColumn =
  | 'ticketNo'
  | 'ticketStatus'
  | 'customerName'
  | 'phone'
  | 'returnStatus'
  | 'courier'
  | 'trackingNo'

const TICKET_STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
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

function statusMeta(value: ComponentReturnStatus) {
  return STATUS_OPTIONS.find(option => option.value === value) ?? STATUS_OPTIONS[0]
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function matchesText(value: string | null | undefined, query: string) {
  const trimmed = query.trim().toLowerCase()
  return !trimmed || String(value ?? '').toLowerCase().includes(trimmed)
}

function matchesDigits(value: string | null | undefined, query: string) {
  const trimmed = normalizeDigits(query)
  return !trimmed || normalizeDigits(value).includes(trimmed)
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function findMappedCustomer(record: ComponentReturn) {
  const recordEmail = record.email.trim().toLowerCase()
  const recordPhone = normalizeDigits(record.phone)
  return getCustomersWithOverrides().find(customer => {
    const sameEmail = Boolean(recordEmail && customer.email.trim().toLowerCase() === recordEmail)
    const customerPhone = normalizeDigits(customer.phone)
    const samePhone = Boolean(recordPhone && customerPhone === recordPhone)
    return sameEmail || samePhone
  })
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-gray-400 mb-1">{label}</dt>
      <dd className="break-words text-sm text-gray-800 [overflow-wrap:anywhere]">{value || '-'}</dd>
    </div>
  )
}

function TicketStatusBadge({ status }: { status?: TicketStatus }) {
  if (!status) return <span className="text-sm text-gray-400">-</span>
  const meta = TICKET_STATUS_META[status]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
      <I18nText i18nKey={ticketStatusI18nKey(status)} display="tooltip">
        {meta.label}
      </I18nText>
    </span>
  )
}

function TicketStatusField({ status }: { status?: TicketStatus }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[11px] font-medium text-gray-400">티켓 상태</dt>
      <dd>
        <TicketStatusBadge status={status} />
      </dd>
    </div>
  )
}

export function ComponentReturnsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { langCode = 'ko' } = useParams()
  const locationState = location.state as { componentReturnId?: string } | null
  const [records] = useState<ComponentReturn[]>(() => getComponentReturns())
  const [branch, setBranch] = useState('all')
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | TicketStatus>('all')
  const [returnStatusFilter, setReturnStatusFilter] = useState<'all' | ComponentReturnStatus>('all')
  const [courierFilter, setCourierFilter] = useState('all')
  const [ticketNoFilter, setTicketNoFilter] = useState('')
  const [customerNameFilter, setCustomerNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [trackingNoFilter, setTrackingNoFilter] = useState('')
  const [filterPopover, setFilterPopover] = useState<{ col: FilterColumn; rect: DOMRect } | null>(null)
  const [selectedId, setSelectedId] = useState(locationState?.componentReturnId ?? '')
  const [detailOpen, setDetailOpen] = useState(Boolean(locationState?.componentReturnId))
  const [draft, setDraft] = useState<ComponentReturn | null>(null)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const ticketByNo = useMemo(() => {
    return new Map(getTicketsWithExtras().map(ticket => [ticket.ticketNo, ticket]))
  }, [records])

  const courierOptions = useMemo(() => {
    return Array.from(new Set(records.map(record => record.courier).filter(Boolean))).sort()
  }, [records])

  const filtered = useMemo(() => {
    return records.filter(record => {
      const sourceTicket = ticketByNo.get(record.sourceTicketNo)
      if (branch !== 'all' && record.branchCode !== branch) return false
      if (ticketStatusFilter !== 'all' && sourceTicket?.status !== ticketStatusFilter) return false
      if (returnStatusFilter !== 'all' && record.status !== returnStatusFilter) return false
      if (courierFilter !== 'all' && record.courier !== courierFilter) return false
      if (!matchesText(record.sourceTicketNo, ticketNoFilter)) return false
      if (!matchesText(record.customerName, customerNameFilter)) return false
      if (!matchesDigits(record.phone, phoneFilter)) return false
      if (!matchesText(record.trackingNo, trackingNoFilter)) return false
      return true
    })
  }, [
    branch,
    courierFilter,
    customerNameFilter,
    phoneFilter,
    records,
    returnStatusFilter,
    ticketByNo,
    ticketNoFilter,
    ticketStatusFilter,
    trackingNoFilter,
  ])

  const selected = records.find(record => record.id === selectedId) ?? null
  const draftSourceTicket = draft ? ticketByNo.get(draft.sourceTicketNo) : undefined

  useEffect(() => {
    if (!locationState?.componentReturnId) return
    setSelectedId(locationState.componentReturnId)
    setDetailOpen(true)
  }, [locationState?.componentReturnId])

  useEffect(() => {
    if (!selectedId) {
      setDraft(null)
      return
    }
    setDraft(records.find(record => record.id === selectedId) ?? null)
  }, [records, selectedId])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!filterPopover) return
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('[data-component-return-filter]') &&
        !target.closest('[data-component-return-filter-trigger]')
      ) {
        setFilterPopover(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [filterPopover])

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleCustomerClick(record: ComponentReturn) {
    const customer = findMappedCustomer(record)
    if (!customer) {
      showToast('연결된 고객 정보를 찾을 수 없습니다.', false)
      return
    }
    navigate(`/${langCode}/customers/${customer.id}`)
  }

  function openDetail(record: ComponentReturn) {
    setSelectedId(record.id)
    setDraft(record)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
  }

  function handleFilterClick(col: FilterColumn, event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function clearFilter(col: FilterColumn) {
    switch (col) {
      case 'ticketNo': setTicketNoFilter(''); break
      case 'ticketStatus': setTicketStatusFilter('all'); break
      case 'customerName': setCustomerNameFilter(''); break
      case 'phone': setPhoneFilter(''); break
      case 'returnStatus': setReturnStatusFilter('all'); break
      case 'courier': setCourierFilter('all'); break
      case 'trackingNo': setTrackingNoFilter(''); break
    }
    setFilterPopover(null)
  }

  function hasActiveFilter(col: FilterColumn) {
    switch (col) {
      case 'ticketNo': return ticketNoFilter.trim() !== ''
      case 'ticketStatus': return ticketStatusFilter !== 'all'
      case 'customerName': return customerNameFilter.trim() !== ''
      case 'phone': return phoneFilter.trim() !== ''
      case 'returnStatus': return returnStatusFilter !== 'all'
      case 'courier': return courierFilter !== 'all'
      case 'trackingNo': return trackingNoFilter.trim() !== ''
    }
  }

  function filterLabel(col: FilterColumn) {
    switch (col) {
      case 'ticketNo': return ticketNoFilter
      case 'ticketStatus': return ticketStatusFilter === 'all' ? '' : TICKET_STATUS_META[ticketStatusFilter].label
      case 'customerName': return customerNameFilter
      case 'phone': return phoneFilter
      case 'returnStatus': return returnStatusFilter === 'all' ? '' : statusMeta(returnStatusFilter).label
      case 'courier': return courierFilter === 'all' ? '' : courierFilter
      case 'trackingNo': return trackingNoFilter
    }
  }

  function HeaderCell({ label, col }: { label: string; col?: FilterColumn }) {
    const active = col ? hasActiveFilter(col) : false
    return (
      <th className={`bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500 ${active ? 'bg-blue-50 text-blue-700' : ''}`}>
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {col && (
            <button
              type="button"
              data-component-return-filter-trigger
              onClick={event => handleFilterClick(col, event)}
              className={`rounded transition-colors ${
                filterPopover?.col === col || active
                  ? 'text-blue-500'
                  : 'text-gray-300 hover:text-gray-500'
              }`}
            >
              <Filter className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        {col && active && (
          <div className="mt-1 max-w-[140px] truncate text-[10px] font-medium text-blue-600 normal-case tracking-normal">
            {filterLabel(col)}
          </div>
        )}
      </th>
    )
  }

  function renderTextFilter(
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    col: FilterColumn,
  ) {
    return (
      <div className="w-44 space-y-1.5">
        <input
          type="text"
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && setFilterPopover(null)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-gray-300 focus:outline-none"
        />
        <div className="flex gap-1.5">
          {value && (
            <button
              type="button"
              onClick={() => clearFilter(col)}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              지우기
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterPopover(null)}
            className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
          >
            적용
          </button>
        </div>
      </div>
    )
  }

  function renderSelectFilter(
    current: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    col: FilterColumn,
  ) {
    return (
      <div className="max-h-72 min-w-36 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            onChange('all')
            setFilterPopover(null)
          }}
          className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs transition-colors ${
            current === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value)
              setFilterPopover(null)
            }}
            className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              current === option.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
        {current !== 'all' && (
          <button
            type="button"
            onClick={() => clearFilter(col)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-left text-xs text-gray-400 hover:text-gray-600"
          >
            지우기
          </button>
        )}
      </div>
    )
  }

  function renderFilterPopover() {
    if (!filterPopover) return null
    switch (filterPopover.col) {
      case 'ticketNo':
        return renderTextFilter(ticketNoFilter, setTicketNoFilter, '티켓번호', 'ticketNo')
      case 'ticketStatus':
        return renderSelectFilter(
          ticketStatusFilter,
          value => setTicketStatusFilter(value as 'all' | TicketStatus),
          (Object.keys(TICKET_STATUS_META) as TicketStatus[]).map(value => ({ value, label: TICKET_STATUS_META[value].label })),
          'ticketStatus',
        )
      case 'customerName':
        return renderTextFilter(customerNameFilter, setCustomerNameFilter, '고객명', 'customerName')
      case 'phone':
        return renderTextFilter(phoneFilter, setPhoneFilter, '연락처', 'phone')
      case 'returnStatus':
        return renderSelectFilter(
          returnStatusFilter,
          value => setReturnStatusFilter(value as 'all' | ComponentReturnStatus),
          STATUS_OPTIONS.map(option => ({ value: option.value, label: option.label })),
          'returnStatus',
        )
      case 'courier':
        return renderSelectFilter(
          courierFilter,
          setCourierFilter,
          courierOptions.map(value => ({ value, label: value })),
          'courier',
        )
      case 'trackingNo':
        return renderTextFilter(trackingNoFilter, setTrackingNoFilter, '운송장 번호', 'trackingNo')
    }
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">구성품 반송</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
              <select
                value={branch}
                onChange={event => setBranch(event.target.value)}
                className="w-52 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
              >
                <option value="all">전체 법인</option>
                <option value="1110">1110 GM 본사</option>
                <option value="C1002">C1002 GM_미국법인</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <HeaderCell label="Ticket No." col="ticketNo" />
                    <HeaderCell label="티켓 상태" col="ticketStatus" />
                    <HeaderCell label="고객명" col="customerName" />
                    <HeaderCell label="연락처" col="phone" />
                    <HeaderCell label="반송 상태" col="returnStatus" />
                    <HeaderCell label="택배사" col="courier" />
                    <HeaderCell label="운송장 번호" col="trackingNo" />
                    <HeaderCell label="생성일시" />
                    <HeaderCell label="알림톡" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-xs text-gray-400">구성품 반송 건이 없습니다.</td>
                    </tr>
                  ) : filtered.map(record => {
                    const meta = statusMeta(record.status)
                    const sourceTicket = ticketByNo.get(record.sourceTicketNo)
                    const active = selected?.id === record.id
                    return (
                      <tr
                        key={record.id}
                        onClick={() => openDetail(record)}
                        className={`cursor-pointer transition-colors hover:bg-gray-50/70 ${active && detailOpen ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              navigate(`/${langCode}/tickets/${record.sourceTicketNo}`)
                            }}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-900 underline-offset-4 hover:underline"
                          >
                            {record.sourceTicketNo}
                            <ExternalLink className="h-3 w-3 text-gray-300" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <TicketStatusBadge status={sourceTicket?.status} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              handleCustomerClick(record)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 underline-offset-4 hover:text-blue-600 hover:underline"
                          >
                            {maskName(record.customerName)}
                            <ExternalLink className="h-3 w-3 text-gray-300" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{maskPhone(record.phone)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{record.courier}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{record.trackingNo || '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{record.createdAt} <span className="font-sans text-gray-400">(KST)</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{record.alimtalkSentYn}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        </div>

        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 px-4 py-6">
            <button
              type="button"
              aria-label="모달 닫기"
              className="absolute inset-0 cursor-default"
              onClick={closeDetail}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="구성품 반송 관리"
              className="relative z-10 flex max-h-[calc(100vh-48px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            >
              {draft ? (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                    <div>
                      <p className="text-[11px] font-medium text-gray-400">반송 관리</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">구성품 반송</h2>
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta(draft.status).className}`}>
                          {statusMeta(draft.status).label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/${langCode}/tickets/${draft.sourceTicketNo}`)}
                        className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline"
                      >
                        {draft.sourceTicketNo}
                        <ExternalLink className="h-3 w-3 text-gray-300" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                      <section className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
                        <h3 className="mb-4 text-xs font-semibold text-gray-700">고객 정보</h3>
                        <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                          <div className="min-w-0">
                            <dt className="mb-1 text-[11px] font-medium text-gray-400">고객명</dt>
                            <dd>
                              <button
                                type="button"
                                onClick={() => handleCustomerClick(draft)}
                                className="inline-flex items-center gap-1 break-words text-sm font-semibold text-gray-900 underline-offset-4 hover:text-blue-600 hover:underline [overflow-wrap:anywhere]"
                              >
                                {draft.customerName}
                                <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-300" />
                              </button>
                            </dd>
                          </div>
                          <Field label="법인" value={branchLabel(draft.branchCode)} />
                          <TicketStatusField status={draftSourceTicket?.status} />
                          <Field label="전화번호" value={draft.phone} />
                          <div className="col-span-2 min-w-0">
                            <Field label="이메일" value={maskEmail(draft.email)} />
                          </div>
                          <div className="col-span-2">
                            <Field label="제품명" value={draft.productName} />
                          </div>
                        </dl>
                      </section>

                      <section className="rounded-xl border border-gray-100 p-4">
                        <h3 className="mb-4 text-xs font-semibold text-gray-700">반송 정보</h3>
                        <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                          <Field label="반송 상태" value={statusMeta(draft.status).label} />
                          <Field label="택배사" value={draft.courier} />
                          <Field label="운송장 번호" value={draft.trackingNo} />
                          <Field label="알림톡 발송" value={draft.alimtalkSentYn} />
                          <Field label="생성일시" value={`${draft.createdAt} (KST)`} />
                          <Field label="반송일시" value={draft.returnedAt ? `${draft.returnedAt} (KST)` : '-'} />
                        </dl>
                      </section>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      닫기
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">선택된 반송 건이 없습니다.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      {filterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
          <div
            data-component-return-filter
            className="fixed z-[50] w-max rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
            style={{
              top: filterPopover.rect.bottom + 6,
              ...(filterPopover.rect.left + 240 > window.innerWidth
                ? { right: Math.max(8, window.innerWidth - filterPopover.rect.right) }
                : { left: filterPopover.rect.left }),
            }}
          >
            {renderFilterPopover()}
          </div>
        </>
      )}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[80] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
