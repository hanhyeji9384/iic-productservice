import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Filter, Mail, X } from 'lucide-react'
import { MEMBERS, PRODUCTS, STORES } from '@/lib/mock-data'
import { getTicketsWithExtras } from '@/lib/prototype-storage'
import type { Store, Ticket, TicketStatus } from '@/lib/types'

const STORE_GROUP_LABELS: Record<number, string> = {
  100: 'Flagship',
  110: '백화점',
  120: 'Mall',
  130: '면세점',
  140: '안경원',
  150: '편집샵',
  180: '해외법인(자회사)',
  200: 'Distributor',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  RECEIVED: '접수',
  JUDGEMENT_PENDING: '심사중',
  JUDGEMENT_DONE: '심사완료',
  PAYMENT_REQUESTED: '결제요청',
  PAYMENT_DONE: '결제완료',
  PARTNER_SENT: '협력사발송',
  REPAIRING: '수리중',
  REPAIR_DONE: '수리완료',
  READY_TO_SHIP: '발송준비',
  SHIPPING: '발송중',
  SHIPPED: '발송완료',
  CLOSED: '완료',
  CANCELED: '취소',
  PICKUP_WAITING: '회수 대기 중',
  PARTS_READY: '부품 준비 완료',
}

const STATUS_COLOR: Record<TicketStatus, string> = {
  RECEIVED:           'bg-blue-50 text-blue-700',
  JUDGEMENT_PENDING:  'bg-yellow-50 text-yellow-700',
  JUDGEMENT_DONE:     'bg-orange-50 text-orange-700',
  PAYMENT_REQUESTED:  'bg-purple-50 text-purple-700',
  PAYMENT_DONE:       'bg-indigo-50 text-indigo-700',
  PARTNER_SENT:       'bg-cyan-50 text-cyan-700',
  REPAIRING:          'bg-blue-50 text-blue-700',
  REPAIR_DONE:        'bg-teal-50 text-teal-700',
  READY_TO_SHIP:      'bg-green-50 text-green-700',
  SHIPPING:           'bg-emerald-50 text-emerald-700',
  SHIPPED:            'bg-emerald-50 text-emerald-700',
  CLOSED:             'bg-gray-100 text-gray-600',
  CANCELED:           'bg-red-50 text-red-600',
  PICKUP_WAITING:     'bg-violet-50 text-violet-700',
  PARTS_READY:        'bg-pink-50 text-pink-700',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function monthsAgoStr(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().slice(0, 10)
}

type StoreTicketFilterKey =
  | 'ticketNo'
  | 'status'
  | 'productCode'
  | 'productName'
  | 'purchaseDate'
  | 'purchasePlace'
  | 'receivedAt'
  | 'symptom'
  | 'repairDetail'
  | 'technician'

type StoreTicketFilters = Record<StoreTicketFilterKey, string>
type StoreTicketSortKey = StoreTicketFilterKey

const INIT_TICKET_FILTERS: StoreTicketFilters = {
  ticketNo: '',
  status: 'all',
  productCode: '',
  productName: '',
  purchaseDate: '',
  purchasePlace: '',
  receivedAt: '',
  symptom: 'all',
  repairDetail: 'all',
  technician: 'all',
}

const TICKET_COLUMNS: { key: StoreTicketFilterKey; label: string; sort: StoreTicketSortKey }[] = [
  { key: 'ticketNo',      label: 'Ticket No.', sort: 'ticketNo' },
  { key: 'status',        label: '상태',        sort: 'status' },
  { key: 'productCode',   label: '제품코드',    sort: 'productCode' },
  { key: 'productName',   label: '제품명',      sort: 'productName' },
  { key: 'purchaseDate',  label: '구매일',      sort: 'purchaseDate' },
  { key: 'purchasePlace', label: '구매처',      sort: 'purchasePlace' },
  { key: 'receivedAt',    label: '접수일시',    sort: 'receivedAt' },
  { key: 'symptom',       label: '현상',        sort: 'symptom' },
  { key: 'repairDetail',  label: '수리내용',    sort: 'repairDetail' },
  { key: 'technician',    label: '서비스기술자', sort: 'technician' },
]

function groupLabel(storeGroup: number) {
  return STORE_GROUP_LABELS[storeGroup] ?? '기타'
}

function textValue(value?: string | null) {
  return value ?? ''
}

function displayValue(value?: string | null) {
  const normalized = textValue(value).trim()
  return normalized || '-'
}

function activeLabel(store: Store) {
  return store.active === 'N' ? '비활성' : '활성'
}

function normalizeMatchText(value?: string | null) {
  return textValue(value)
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[()[\]{}]/g, '')
}

function isTicketForStore(ticket: Ticket, store: Store) {
  if (ticket.receptionStoreCode && ticket.receptionStoreCode === store.code) return true
  const storeName = normalizeMatchText(store.name)
  const place = normalizeMatchText(ticket.receptionStoreName ?? ticket.receptionPlace)
  return Boolean(storeName && place && (storeName === place || storeName.includes(place) || place.includes(storeName)))
}

function getProductCode(ticket: Ticket) {
  return PRODUCTS.find(product => product.name === ticket.productName)?.productCode ?? ticket.productName
}

function getPurchaseDate(ticket: Ticket) {
  return ticket.purchaseDate ?? ''
}

function getPurchasePlace(ticket: Ticket) {
  return ticket.purchasePlace ?? ''
}

function getSymptom(ticket: Ticket) {
  return ticket.symptom ?? ''
}

function getTechnicianLabel(ticket: Ticket) {
  const technician = ticket.technicianId ? MEMBERS.find(member => member.id === ticket.technicianId) : null
  if (ticket.technicianName) return ticket.technicianName
  if (technician) return `${technician.name} (${technician.loginId})`
  return ''
}

function includesQuery(value: string | null | undefined, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (value ?? '').toLowerCase().includes(q)
}

function makeTextOptions(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = []
  values.forEach(value => {
    const text = (value ?? '').trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    options.push({ value: text, label: text })
  })
  return options.sort((a, b) => a.label.localeCompare(b.label, 'ko'))
}

function getTicketSortValue(ticket: Ticket, key: StoreTicketSortKey) {
  switch (key) {
    case 'status':
      return STATUS_LABELS[ticket.status]
    case 'productCode':
      return getProductCode(ticket)
    case 'productName':
      return ticket.productName
    case 'purchaseDate':
      return getPurchaseDate(ticket)
    case 'purchasePlace':
      return getPurchasePlace(ticket)
    case 'receivedAt':
      return ticket.receivedAt
    case 'symptom':
      return getSymptom(ticket)
    case 'repairDetail':
      return ticket.repairDetail
    case 'technician':
      return getTechnicianLabel(ticket)
    default:
      return ticket.ticketNo
  }
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function isWithinDateRange(value: string | null | undefined, from: string, to: string) {
  const date = dateOnly(value)
  if (!date) return false
  return date >= from && date <= to
}

function dateTimeWithTimezone(value?: string | null) {
  if (!value || !value.trim()) return <span>-</span>
  return (
    <>
      {value} <span className="font-sans text-gray-400">(KST)</span>
    </>
  )
}

function InfoItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{displayValue(value)}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function StoreDetailPage() {
  const { code, langCode } = useParams<{ code: string; langCode: string }>()
  const navigate = useNavigate()
  const pfx = `/${langCode}`
  const store = STORES.find(item => item.code === code)
  const tickets = useMemo(() => getTicketsWithExtras(), [])
  const [dateRange, setDateRange] = useState({ from: monthsAgoStr(6), to: todayStr() })
  const [ticketFilters, setTicketFilters] = useState<StoreTicketFilters>(INIT_TICKET_FILTERS)
  const [appliedTicketFilters, setAppliedTicketFilters] = useState<StoreTicketFilters>(INIT_TICKET_FILTERS)
  const [ticketFilterPopover, setTicketFilterPopover] = useState<{ col: StoreTicketFilterKey; rect: DOMRect } | null>(null)
  const [ticketSortKey, setTicketSortKey] = useState<StoreTicketSortKey>('receivedAt')
  const [ticketSortDir, setTicketSortDir] = useState<'asc' | 'desc'>('desc')

  if (!store) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">존재하지 않는 매장/BP(B2B)입니다.</p>
        <button onClick={() => navigate(`${pfx}/stores`)} className="text-sm text-gray-600 underline">목록으로 돌아가기</button>
      </div>
    )
  }

  const baseStoreTickets = tickets
    .filter(ticket => isTicketForStore(ticket, store))
    .filter(ticket => isWithinDateRange(ticket.receivedAt, dateRange.from, dateRange.to))

  const symptomOptions = makeTextOptions(baseStoreTickets.map(ticket => getSymptom(ticket)))
  const repairDetailOptions = makeTextOptions(baseStoreTickets.map(ticket => ticket.repairDetail))
  const technicianOptions = MEMBERS
    .filter(member => baseStoreTickets.some(ticket => ticket.technicianId === member.id || ticket.technicianName === member.name))
    .map(member => ({ value: member.id, label: `${member.name} (${member.loginId})` }))

  const filteredTickets = baseStoreTickets.filter(ticket => {
    if (!includesQuery(ticket.ticketNo, appliedTicketFilters.ticketNo)) return false
    if (appliedTicketFilters.status !== 'all' && ticket.status !== appliedTicketFilters.status) return false
    if (!includesQuery(getProductCode(ticket), appliedTicketFilters.productCode)) return false
    if (!includesQuery(ticket.productName, appliedTicketFilters.productName)) return false
    if (!includesQuery(getPurchaseDate(ticket), appliedTicketFilters.purchaseDate)) return false
    if (!includesQuery(getPurchasePlace(ticket), appliedTicketFilters.purchasePlace)) return false
    if (!includesQuery(ticket.receivedAt, appliedTicketFilters.receivedAt)) return false
    if (appliedTicketFilters.symptom !== 'all' && getSymptom(ticket) !== appliedTicketFilters.symptom) return false
    if (appliedTicketFilters.repairDetail !== 'all' && ticket.repairDetail !== appliedTicketFilters.repairDetail) return false
    if (appliedTicketFilters.technician !== 'all') {
      const selectedTechnician = MEMBERS.find(member => member.id === appliedTicketFilters.technician)
      if (selectedTechnician) {
        if (ticket.technicianId !== selectedTechnician.id) return false
      } else if (!includesQuery(getTechnicianLabel(ticket), appliedTicketFilters.technician)) {
        return false
      }
    }
    return true
  })

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const av = getTicketSortValue(a, ticketSortKey)
    const bv = getTicketSortValue(b, ticketSortKey)
    const result = String(av).localeCompare(String(bv), 'ko')
    return ticketSortDir === 'asc' ? result : -result
  })

  const hasTicketFilters =
    Object.entries(appliedTicketFilters).some(([key, value]) => {
      const initial = INIT_TICKET_FILTERS[key as StoreTicketFilterKey]
      return value !== initial
    }) ||
    dateRange.from !== monthsAgoStr(6) ||
    dateRange.to !== todayStr() ||
    ticketSortKey !== 'receivedAt' ||
    ticketSortDir !== 'desc'

  function handleTicketSort(key: StoreTicketSortKey) {
    if (ticketSortKey !== key) {
      setTicketSortKey(key)
      setTicketSortDir('asc')
      return
    }
    setTicketSortDir(ticketSortDir === 'asc' ? 'desc' : 'asc')
  }

  function resetTicketFilters() {
    setDateRange({ from: monthsAgoStr(6), to: todayStr() })
    setTicketFilters(INIT_TICKET_FILTERS)
    setAppliedTicketFilters(INIT_TICKET_FILTERS)
    setTicketSortKey('receivedAt')
    setTicketSortDir('desc')
    setTicketFilterPopover(null)
  }

  function applyTicketFilters() {
    setAppliedTicketFilters({ ...ticketFilters })
    setTicketFilterPopover(null)
  }

  function applyTicketFilter(key: StoreTicketFilterKey, value: string) {
    const next = { ...ticketFilters, [key]: value }
    setTicketFilters(next)
    setAppliedTicketFilters(next)
    setTicketFilterPopover(null)
  }

  function SortIcon({ col }: { col: StoreTicketSortKey }) {
    if (ticketSortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    return ticketSortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-gray-700" />
      : <ArrowDown className="h-3 w-3 text-gray-700" />
  }

  function filterSummary(key: StoreTicketFilterKey) {
    const value = appliedTicketFilters[key]
    if (!value || value === 'all') return null
    if (key === 'status') return STATUS_LABELS[value as TicketStatus]
    if (key === 'technician') return technicianOptions.find(option => option.value === value)?.label ?? value
    return value
  }

  function renderTextFilter(key: StoreTicketFilterKey, placeholder: string) {
    return (
      <div className="w-48 space-y-1.5">
        <input
          type="text"
          value={ticketFilters[key]}
          onChange={event => setTicketFilters(prev => ({ ...prev, [key]: event.target.value }))}
          onKeyDown={event => event.key === 'Enter' && applyTicketFilters()}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition-colors focus:border-gray-300"
        />
        <div className="flex gap-1.5">
          {ticketFilters[key] && (
            <button
              type="button"
              onClick={() => applyTicketFilter(key, INIT_TICKET_FILTERS[key])}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              지우기
            </button>
          )}
          <button
            type="button"
            onClick={applyTicketFilters}
            className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
          >
            적용
          </button>
        </div>
      </div>
    )
  }

  function renderSelectFilter(
    key: StoreTicketFilterKey,
    options: Array<{ value: string; label: string }>,
    allLabel = '전체'
  ) {
    return (
      <div className="max-h-64 w-52 space-y-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => applyTicketFilter(key, INIT_TICKET_FILTERS[key])}
          className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
            ticketFilters[key] === INIT_TICKET_FILTERS[key] ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {allLabel}
        </button>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => applyTicketFilter(key, option.value)}
            className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              ticketFilters[key] === option.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  function renderTicketFilterContent(key: StoreTicketFilterKey) {
    switch (key) {
      case 'ticketNo':
        return renderTextFilter('ticketNo', '티켓번호 검색')
      case 'productCode':
        return renderTextFilter('productCode', '제품코드 검색')
      case 'productName':
        return renderTextFilter('productName', '제품명 검색')
      case 'purchaseDate':
        return renderTextFilter('purchaseDate', '구매일 검색')
      case 'purchasePlace':
        return renderTextFilter('purchasePlace', '구매처 검색')
      case 'receivedAt':
        return renderTextFilter('receivedAt', '접수일시 검색')
      case 'status':
        return renderSelectFilter(
          'status',
          Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))
        )
      case 'symptom':
        return renderSelectFilter('symptom', symptomOptions)
      case 'repairDetail':
        return renderSelectFilter('repairDetail', repairDetailOptions)
      case 'technician':
        return renderSelectFilter('technician', technicianOptions)
      default:
        return null
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100" aria-label="뒤로가기">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-gray-700">매장/거래처 관리</span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{store.name}</h1>
              <p className="mt-2 font-mono text-sm text-gray-500">{store.code}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="inline-flex rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">{groupLabel(store.storeGroup)}</span>
              <span className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${store.active === 'N' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {activeLabel(store)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">주소 정보</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="국가 지역" value={store.country} />
              <InfoItem label="통화" value={store.currency} />
              <InfoItem label="시" value={store.address1} />
              <InfoItem label="우편번호" value={store.zipCode} mono />
              <div className="col-span-2">
                <InfoItem label="상세 주소" value={store.address2} />
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">통신</h2>
            <dl className="grid gap-4">
              <InfoItem label="전화번호" value={store.tel1} mono />
              <InfoItem label="대표담당자번호" value={store.tel2} mono />
              <InfoItem label="팩스" value={store.telFx} mono />
            </dl>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">운영 정보</h2>
            <dl className="grid gap-4">
              <InfoItem label="이름" value={store.name} />
              <InfoItem label="계정 ID" value={store.code} mono />
              <InfoItem label="접수처유형" value={groupLabel(store.storeGroup)} />
              <InfoItem label="상태" value={activeLabel(store)} />
            </dl>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
            <h2 className="text-sm font-semibold text-gray-900">티켓</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasTicketFilters && (
              <button
                type="button"
                onClick={resetTicketFilters}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
              >
                <X className="h-3 w-3" />
                필터 초기화
              </button>
            )}
            <input
              type="date"
              value={dateRange.from}
              onChange={event => setDateRange(prev => ({ ...prev, from: event.target.value }))}
              className="h-9 rounded-lg border border-gray-200 px-3 text-xs text-gray-700 outline-none focus:border-gray-400"
            />
            <span className="text-xs text-gray-300">~</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={event => setDateRange(prev => ({ ...prev, to: event.target.value }))}
              className="h-9 rounded-lg border border-gray-200 px-3 text-xs text-gray-700 outline-none focus:border-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-left text-xs font-semibold tracking-wide text-gray-500">
                {TICKET_COLUMNS.map(column => {
                  const summary = filterSummary(column.key)
                  return (
                    <th key={column.key} className={`px-4 py-3 align-top whitespace-nowrap ${summary ? 'bg-blue-50 text-blue-700' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTicketSort(column.sort)}
                          className="group flex items-center gap-1 text-xs font-semibold tracking-wide transition-colors hover:text-gray-700"
                        >
                          {column.label}
                          <SortIcon col={column.sort} />
                        </button>
                        <button
                          type="button"
                          onClick={event => {
                            const rect = event.currentTarget.getBoundingClientRect()
                            setTicketFilterPopover(prev => prev?.col === column.key ? null : { col: column.key, rect })
                          }}
                          className={`rounded p-0.5 transition-colors ${ticketFilterPopover?.col === column.key || summary ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          <Filter className="h-3 w-3" />
                        </button>
                      </div>
                      {summary && <div className="mt-1 max-w-[140px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">{summary}</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={TICKET_COLUMNS.length} className="px-6 py-12 text-center text-sm text-gray-400">연결된 티켓이 없습니다.</td>
                </tr>
              ) : sortedTickets.map(ticket => (
                <tr
                  key={ticket.ticketNo}
                  onClick={() => navigate(`${pfx}/tickets/${ticket.ticketNo}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-900">{ticket.ticketNo}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">{getProductCode(ticket)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-gray-800">{ticket.productName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">{displayValue(getPurchaseDate(ticket))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{displayValue(getPurchasePlace(ticket))}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">{dateTimeWithTimezone(ticket.receivedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{displayValue(getSymptom(ticket))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{ticket.repairDetail}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{displayValue(getTechnicianLabel(ticket))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {ticketFilterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setTicketFilterPopover(null)} />
          <div
            className="fixed z-[50] w-max rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
            style={{
              top: ticketFilterPopover.rect.bottom + 6,
              ...(ticketFilterPopover.rect.left + 260 > window.innerWidth
                ? { right: Math.max(8, window.innerWidth - ticketFilterPopover.rect.right) }
                : { left: ticketFilterPopover.rect.left }),
            }}
          >
            {renderTicketFilterContent(ticketFilterPopover.col)}
          </div>
        </>
      )}
    </div>
  )
}
