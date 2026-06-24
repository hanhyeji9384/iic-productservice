import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Barcode, CheckCircle2, ChevronDown, Circle, ExternalLink, History, Mail, MessageSquare, Package, RotateCcw, Search, Send } from 'lucide-react'
import { BRANCHES, MEMBERS, STORES } from '@/lib/mock-data'
import { createComponentReturnFromTicket, getComponentReturns, getCustomersWithOverrides, getTicketsWithExtras } from '@/lib/prototype-storage'
import { formatCurrency, formatRepairChargeType, getSoDocumentInfo } from '@/lib/ticket-so'
import type { PaymentCompleted, Ticket, TicketReceptionTag, TicketStatus } from '@/lib/types'
import { BarcodePrintModal } from '@/components/barcode-print-modal'
import { I18nText } from '@/lib/i18n-inspector'
import { ticketStatusI18nKey } from '@/lib/ticket-status-i18n'

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  RECEIVED:          { label: '접수',            className: 'bg-blue-50 text-blue-700 border-blue-200' },
  JUDGEMENT_PENDING: { label: '서비스 판정 대기', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  JUDGEMENT_DONE:    { label: '서비스 판정 완료', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  PAYMENT_REQUESTED: { label: '결제 요청',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
  PAYMENT_DONE:      { label: '결제 완료',        className: 'bg-green-50 text-green-700 border-green-200' },
  PARTNER_SENT:      { label: '협력업체 발송',    className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  REPAIRING:         { label: '수리 진행 중',     className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  REPAIR_DONE:       { label: '수리 완료',        className: 'bg-teal-50 text-teal-700 border-teal-200' },
  READY_TO_SHIP:     { label: '출고 준비',        className: 'bg-lime-50 text-lime-700 border-lime-200' },
  SHIPPING:          { label: '배송 중',          className: 'bg-sky-50 text-sky-700 border-sky-200' },
  SHIPPED:           { label: '출고 완료',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED:            { label: '완료',             className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELED:          { label: '취소',             className: 'bg-red-50 text-red-600 border-red-200' },
  PICKUP_WAITING:    { label: '수령 대기',        className: 'bg-violet-50 text-violet-700 border-violet-200' },
}

const PAYMENT_META: Record<PaymentCompleted, string> = { Y: '완료', N: '미완료', C: '취소' }

type TemplateKind = 'AUTO' | 'MANUAL'
type MessageChannel = 'kakao' | 'email'
type MessageTemplate = {
  id: string
  channel: MessageChannel
  kind: TemplateKind
  title: string
  stage: string
}

type MessageLog = {
  id: string
  templateTitle: string
  sentAt: string
  kind: TemplateKind
  status: string
}

const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  AUTO: '자동',
  MANUAL: '수동',
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: '024040000393', channel: 'kakao', kind: 'AUTO',   title: '[판정] 무상 수리 안내',       stage: '판정' },
  { id: '024040000395', channel: 'kakao', kind: 'AUTO',   title: '[판정] 유상 결제 안내',       stage: '판정' },
  { id: '024040000494', channel: 'kakao', kind: 'AUTO',   title: '[출고] 매장 수령 안내',       stage: '출고' },
  { id: '024040001151', channel: 'kakao', kind: 'AUTO',   title: '[출고] 택배 출고 안내',       stage: '출고' },
  { id: '025050000154', channel: 'kakao', kind: 'MANUAL', title: '[수동] 제품 교환 안내',       stage: '판정' },
  { id: '025050000157', channel: 'kakao', kind: 'MANUAL', title: '[수동] 수리 불가 안내',       stage: '판정' },
  { id: '025050000219', channel: 'kakao', kind: 'MANUAL', title: '[수동] 운송장 정보 안내',     stage: '출고' },
  { id: 'mail-judgement-free',     channel: 'email', kind: 'AUTO',   title: '[판정] 무상 수리 안내',       stage: '판정' },
  { id: 'mail-judgement-paid',     channel: 'email', kind: 'AUTO',   title: '[판정] 유상 결제 안내',       stage: '판정' },
  { id: 'mail-ship-out-delivery',  channel: 'email', kind: 'AUTO',   title: '[출고] 배송 출고 안내',       stage: '출고' },
  { id: 'mail-moving-store',       channel: 'email', kind: 'AUTO',   title: '[출고] 매장 이동 안내',       stage: '출고' },
  { id: 'mail-repair-cancel',      channel: 'email', kind: 'MANUAL', title: '[수동] 수리 취소 안내',       stage: '취소' },
  { id: 'mail-no-repair',          channel: 'email', kind: 'MANUAL', title: '[수동] 수리 불가 안내',       stage: '판정' },
  { id: 'mail-address-check',      channel: 'email', kind: 'MANUAL', title: '[수동] 주소 확인 요청',       stage: '출고' },
]

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

function getReceptionTitle(ticket: Ticket) {
  if (ticket.receptionTitle) return ticket.receptionTitle
  return /online/i.test(ticket.receptionPlace) ? 'PS 온라인 접수' : null
}

function isOnlineAutoCreatedTicket(ticket: Ticket) {
  const sourceText = `${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`
  return /online|온라인/i.test(sourceText)
}

function getReceptionChannel(ticket: Ticket) {
  const source = ticket.receptionPlace
  if (/online|온라인/i.test(`${ticket.receptionTitle ?? ''} ${source}`)) return '온라인'
  if (/법인|GM_US_|IICOMBINED/i.test(source)) return '법인'
  if (/GM_OS_|안경원|B2B|거래처|가맹/i.test(source)) return '가맹점'
  if (/GM_(FLAGSHIP|DS|MALL|FS|WS)_|store|스토어|매장/i.test(source)) return '매장'
  return '-'
}

function normalizeReceptionName(value?: string | null) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s_()（）\-[\]]/g, '')
}

function receptionTail(value?: string | null) {
  const raw = String(value ?? '')
  const parts = raw.split('_')
  return normalizeReceptionName(parts[parts.length - 1] ?? raw)
}

function findReceptionStore(ticket: Ticket) {
  const source = ticket.receptionPlace
  const normalizedSource = normalizeReceptionName(source)
  const sourceTail = receptionTail(source)
  return STORES.find(store => {
    const normalizedStore = normalizeReceptionName(store.name)
    const storeTail = receptionTail(store.name)
    return (
      store.name === source ||
      normalizedStore === normalizedSource ||
      normalizedStore.includes(normalizedSource) ||
      normalizedSource.includes(normalizedStore) ||
      (sourceTail.length >= 3 && storeTail.includes(sourceTail))
    )
  })
}

function getReceptionMethod(ticket: Ticket): 'store' | 'house' | null {
  if (ticket.receptionMethod === 'store' || ticket.receptionMethod === 'house') {
    return ticket.receptionMethod
  }
  if (/행낭|자체수령|매장수령/i.test(ticket.shippingMethod)) return 'store'
  if (/택배|DHL|FedEx|배송/i.test(ticket.shippingMethod)) return 'house'
  return null
}

function getMockReceivingAddress(ticket: Ticket) {
  const isUs = ticket.branchCode === 'C1002' || /US|FedEx/i.test(`${ticket.receptionPlace} ${ticket.shippingMethod}`)
  return isUs
    ? '10013 / United States New York 70 Wooster St'
    : '06028 / 대한민국 서울특별시 강남구 강남대로162길 24 2층'
}

function formatAddressInfo({
  country,
  zipCode,
  city,
  state,
  address1,
  address2,
}: {
  country?: string | null
  zipCode?: string | null
  city?: string | null
  state?: string | null
  address1?: string | null
  address2?: string | null
}) {
  const address = [country, city, state, address1, address2].filter(Boolean).join(' ')
  if (zipCode && address) return `${zipCode} / ${address}`
  if (zipCode) return zipCode
  return address || null
}

function formatReceivingInfo(
  ticket: Ticket,
  fallbackAddress?: {
    country?: string
    zipCode?: string
    city?: string
    address1?: string
    address2?: string
  }
) {
  const method = getReceptionMethod(ticket)
  if (method === 'store') {
    return ticket.receptionStoreName || ticket.receptionPlace || null
  }

  if (method === 'house') {
    const ticketAddress = formatAddressInfo({
      country: ticket.deliveryCountry,
      zipCode: ticket.deliveryZipCode,
      city: ticket.deliveryCity,
      state: ticket.deliveryState,
      address1: ticket.deliveryAddress1,
      address2: ticket.deliveryAddress2,
    })

    if (ticketAddress) return ticketAddress

    const formattedFallbackAddress = formatAddressInfo({
      country: fallbackAddress?.country,
      zipCode: fallbackAddress?.zipCode,
      city: fallbackAddress?.city,
      address1: fallbackAddress?.address1,
      address2: fallbackAddress?.address2,
    })

    return formattedFallbackAddress || getMockReceivingAddress(ticket)
  }

  return null
}

function getMemberLabel(id?: string, name?: string) {
  const member = id ? MEMBERS.find(item => item.id === id) : null
  const displayName = name || member?.name
  const loginId = member?.loginId || id
  if (!displayName) return null
  return `${displayName}${loginId ? `(${loginId})` : ''}`
}

type Tab = 'overview' | 'pricing' | 'kakao' | 'email'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value || '-'}</dd>
    </div>
  )
}

function ClickableField({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string | null
  onClick: () => void
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">
        {value ? (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 underline-offset-4 transition-colors hover:text-blue-600 hover:underline"
          >
            {value}
            <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-300" />
          </button>
        ) : (
          '-'
        )}
      </dd>
    </div>
  )
}

function TicketLinkField({
  label,
  ticketNo,
  onClick,
}: {
  label: string
  ticketNo?: string | null
  onClick: (ticketNo: string) => void
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">
        {ticketNo ? (
          <button
            type="button"
            onClick={() => onClick(ticketNo)}
            className="font-mono text-sm text-gray-900 underline-offset-4 hover:underline"
          >
            {ticketNo}
          </button>
        ) : (
          '-'
        )}
      </dd>
    </div>
  )
}

function ManagerMeta({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const isEmpty = value === '-'

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="text-[11px] font-medium text-gray-400">{label}</span>
      <span className={`max-w-[220px] truncate text-xs font-semibold ${isEmpty ? 'text-gray-300' : 'text-gray-800'}`}>
        {value}
      </span>
    </span>
  )
}

function SectionCard({
  title,
  children,
  editLabel = '수정',
}: {
  title: string
  children: React.ReactNode
  editLabel?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
        <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-50">
          {editLabel}
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ConditionRow({
  label,
  required,
  value,
  met,
}: {
  label: string
  required: string
  value: string
  met: boolean
}) {
  return (
    <div className="grid grid-cols-[1.1fr_0.8fr_1fr_auto] items-center gap-3 border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">{required}</span>
      <span className="text-xs text-gray-600">{value}</span>
      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        met ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {met ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
        {met ? '충족' : '대기'}
      </span>
    </div>
  )
}

function PlaceholderTab({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-gray-400">{message}</div>
  )
}

function isOverseasTicket(ticket: Ticket) {
  const channelText = `${ticket.branchCode} ${ticket.receptionPlace} ${ticket.shippingMethod}`
  return ticket.branchCode === 'C1002' || ticket.reexportCondition === 'Y' || /해외|DHL|FedEx|Global|US/i.test(channelText)
}

function getInitialMessageLogs(ticket: Ticket, channel: MessageChannel): MessageLog[] {
  if (channel === 'kakao') {
    return [
      {
        id: `${ticket.ticketNo}-kakao-1`,
        templateTitle: '[판정] 유상 결제 안내',
        sentAt: ticket.paymentDate ?? ticket.receivedAt,
        kind: 'AUTO',
        status: '성공',
      },
    ]
  }

  return [
    {
      id: `${ticket.ticketNo}-email-1`,
      templateTitle: '[접수] 수리 서비스 접수 안내',
      sentAt: ticket.receivedAt,
      kind: 'AUTO',
      status: '성공',
    },
  ]
}

function nowLocalText() {
  return new Date().toLocaleString('sv-SE', { hour12: false }).replace('T', ' ')
}

function MessageTemplatePanel({
  ticket,
  channel,
  enabled = true,
}: {
  ticket: Ticket
  channel: MessageChannel
  enabled?: boolean
}) {
  const [templateQuery, setTemplateQuery] = useState('')
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sentLogs, setSentLogs] = useState<MessageLog[]>([])
  const templateSelectRef = useRef<HTMLDivElement>(null)
  const channelLabel = channel === 'kakao' ? '알림톡' : '이메일'
  const Icon = channel === 'kakao' ? MessageSquare : Mail
  const receiver = channel === 'kakao' ? ticket.phone : ticket.email
  const templates = MESSAGE_TEMPLATES.filter(template => template.channel === channel)
  const filteredTemplates = templates.filter(template => {
    const keyword = templateQuery.trim().toLowerCase()
    if (!keyword) return true
    return (
      template.id.toLowerCase().includes(keyword) ||
      template.title.toLowerCase().includes(keyword) ||
      template.stage.toLowerCase().includes(keyword) ||
      TEMPLATE_KIND_LABEL[template.kind].includes(keyword)
    )
  })
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId)
  const logs = [...sentLogs, ...getInitialMessageLogs(ticket, channel)]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!templateSelectRef.current?.contains(event.target as Node)) setTemplateSelectOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectTemplate(template: MessageTemplate) {
    setSelectedTemplateId(template.id)
    setTemplateQuery('')
    setTemplateSelectOpen(false)
  }

  function handleSend() {
    if (!selectedTemplate) return
    setSentLogs(prev => [
      {
        id: `${ticket.ticketNo}-${channel}-${Date.now()}`,
        templateTitle: selectedTemplate.title,
        sentAt: nowLocalText(),
        kind: selectedTemplate.kind,
        status: '성공',
      },
      ...prev,
    ])
    window.alert(`${channelLabel} '${selectedTemplate.title}' 발송 처리했습니다.`)
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-10 text-center">
        <MessageSquare className="mx-auto mb-3 h-6 w-6 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">해외 접수 건은 이메일만 발송합니다.</p>
        <p className="mt-1 text-xs text-gray-400">알림톡 발송은 국내 접수 건에만 노출됩니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-white">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{channelLabel} 발송</h3>
                <p className="text-xs text-gray-400">고객 수신처: {receiver || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={templateSelectRef} className="px-5 py-5">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={() => {
                setTemplateQuery('')
                setTemplateSelectOpen(prev => !prev)
              }}
              className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm outline-none transition-colors ${
                templateSelectOpen ? 'border-gray-400' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedTemplate ? (
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-800">{selectedTemplate.title}</span>
                  <span className="block truncate text-[11px] text-gray-400">
                    {selectedTemplate.id} · {selectedTemplate.stage} · {TEMPLATE_KIND_LABEL[selectedTemplate.kind]}
                  </span>
                </span>
              ) : (
                <span className="text-gray-400">템플릿 선택</span>
              )}
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${templateSelectOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              disabled={!selectedTemplate}
              onClick={handleSend}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Send className="h-3.5 w-3.5" />전송
            </button>
          </div>

          {templateSelectOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative border-b border-gray-100 p-2">
                <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-300" />
                <input
                  autoFocus
                  value={templateQuery}
                  onChange={event => setTemplateQuery(event.target.value)}
                  placeholder="템플릿명 검색"
                  className="h-9 w-full rounded-lg bg-gray-50 pl-8 pr-3 text-sm outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-gray-300"
                />
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                        selectedTemplateId === template.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-800">{template.title}</span>
                        <span className="mt-0.5 block text-xs text-gray-400">{template.id} · {template.stage}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        {TEMPLATE_KIND_LABEL[template.kind]}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-xs font-semibold text-gray-700">{channelLabel} 발송 내역</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-medium text-gray-400">
              <tr>
                <th className="px-5 py-3">템플릿 명</th>
                <th className="px-5 py-3">고객명</th>
                <th className="px-5 py-3">수신처</th>
                <th className="px-5 py-3">발송일시</th>
                <th className="px-5 py-3">유형</th>
                <th className="px-5 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-5 py-3 text-gray-800">{log.templateTitle}</td>
                  <td className="px-5 py-3 text-gray-500">{ticket.customerName}</td>
                  <td className="px-5 py-3 text-gray-500">{receiver || '-'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{log.sentAt}</td>
                  <td className="px-5 py-3 text-gray-500">{TEMPLATE_KIND_LABEL[log.kind]}발송</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function TicketDetailPage() {
  const { langCode = 'ko', ticketNo } = useParams<{ langCode: string; ticketNo: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [autoPrintBarcode, setAutoPrintBarcode] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [componentReturnCreated, setComponentReturnCreated] = useState(false)
  const toastTimerRef = useRef<number | null>(null)
  const ticket = getTicketsWithExtras().find(t => t.ticketNo === ticketNo)
  const autoPrintRequested = (location.state as { autoPrintBarcodeOnce?: boolean } | null)?.autoPrintBarcodeOnce === true
  const onlineAutoPrintRequested = ticket ? isOnlineAutoCreatedTicket(ticket) : false
  const shouldAutoPrintBarcode = autoPrintRequested || onlineAutoPrintRequested

  useEffect(() => {
    if (!ticketNo || !shouldAutoPrintBarcode) return
    const key = `barcode_printed_${ticketNo}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setAutoPrintBarcode(true)
      setShowBarcodeModal(true)
    }
    if (autoPrintRequested) navigate(location.pathname, { replace: true, state: null })
  }, [autoPrintRequested, location.pathname, navigate, shouldAutoPrintBarcode, ticketNo])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!ticketNo) return
    setComponentReturnCreated(getComponentReturns().some(record => record.sourceTicketNo === ticketNo))
  }, [ticketNo])

  if (!ticket) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-gray-500">
          티켓을 찾을 수 없습니다.{' '}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ticketNo}</code>
        </p>
        <button onClick={() => navigate(-1)} className="text-xs text-blue-600 hover:underline">
          ← 목록으로
        </button>
      </div>
    )
  }

  const statusMeta = STATUS_META[ticket.status]
  const soInfo = getSoDocumentInfo(ticket)
  const branchLabel = BRANCHES.find(b => b.code === ticket.branchCode)?.name ?? ticket.branchCode
  const technicianLabel = getMemberLabel(ticket.technicianId, ticket.technicianName) || '-'
  const judgementManagerLabel =
    getMemberLabel(ticket.judgementManagerId, ticket.judgementManagerName) || '-'
  const receptionTitle = getReceptionTitle(ticket)
  const receptionTags = ticket.receptionTags ?? []
  const receptionChannel = getReceptionChannel(ticket)
  const shouldShowReceptionContact = receptionChannel === '매장' || receptionChannel === '가맹점'
  const receptionStore = shouldShowReceptionContact ? findReceptionStore(ticket) : undefined
  const receptionContact = receptionStore?.tel2 || null
  const receptionMethod = getReceptionMethod(ticket)
  const receptionMethodLabel = receptionMethod === 'store'
    ? '매장수령'
    : receptionMethod === 'house'
      ? '자택수령'
      : null
  const kakaoEnabled = !isOverseasTicket(ticket)
  const ticketEmail = ticket.email.trim().toLowerCase()
  const mappedCustomer = getCustomersWithOverrides().find(customer => {
    return Boolean(ticketEmail && customer.email.trim().toLowerCase() === ticketEmail)
  })
  const fallbackReceivingAddress = mappedCustomer?.addresses?.find(address => address.isDefault) ?? mappedCustomer?.addresses?.[0]
  const receivingInfo = formatReceivingInfo(ticket, fallbackReceivingAddress)

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleCustomerClick() {
    if (!mappedCustomer) {
      showToast('연결된 고객 정보를 찾을 수 없습니다.', false)
      return
    }
    navigate(`/${langCode}/customers/${mappedCustomer.id}`)
  }

  function handleCreateComponentReturn() {
    if (!ticket || componentReturnCreated) return
    const record = createComponentReturnFromTicket(ticket)
    setComponentReturnCreated(true)
    navigate(`/${langCode}/shipping/component-returns`, {
      state: { componentReturnId: record.id },
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '개요' },
    { id: 'pricing',  label: '가격결정' },
    { id: 'kakao',    label: '알림톡 발송내역' },
    { id: 'email',    label: '메일 발송내역' },
  ]

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showBarcodeModal && ticket && (
        <BarcodePrintModal
          ticketNo={ticket.ticketNo}
          productName={ticket.productName}
          customerName={ticket.customerName}
          autoPrint={autoPrintBarcode}
          presentation={autoPrintBarcode ? 'silent' : 'modal'}
          onClose={() => { setShowBarcodeModal(false); setAutoPrintBarcode(false) }}
        />
      )}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />뒤로가기
      </button>

      <div className="space-y-4">

        {/* ── 상단 헤더 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* 1행: 티켓번호 + 액션 버튼 */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[280px] flex-1">
              <p className="text-[11px] text-gray-400 mb-0.5">티켓번호</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-base font-bold text-gray-900 tracking-tight truncate">
                  {ticket.ticketNo}
                </h1>
              </div>
              {(receptionTitle || receptionTags.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
	                  {receptionTitle && (
	                    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
	                      {receptionTitle}
	                    </span>
	                  )}
                  {receptionTags.map(tag => {
                    const meta = RECEPTION_TAG_META[tag]
                    return (
                      <span
	                        key={tag}
	                        className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
	                      >
	                        {meta.label}
	                      </span>
                    )
                  })}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <ManagerMeta label="서비스 기술자" value={technicianLabel} />
                <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
                <ManagerMeta label="판정 담당자" value={judgementManagerLabel} />
              </div>
            </div>
            {/* 액션 버튼 */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  setAutoPrintBarcode(false)
                  setShowBarcodeModal(true)
                }}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Barcode className="w-3.5 h-3.5" />바코드 출력
              </button>
              <button className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Package className="w-3.5 h-3.5" />재고요청
              </button>
              <button
                onClick={handleCreateComponentReturn}
                disabled={componentReturnCreated}
                title={componentReturnCreated ? '이미 구성품 반송 건이 생성되었습니다.' : '구성품 반송 건 생성'}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <Package className="w-3.5 h-3.5" />구성품 반송
              </button>
              <button
                onClick={() => navigate(`/${langCode}/tickets/new`, {
                  state: {
                    branchCode: ticket.branchCode,
                    reRepairSourceTicketNo: ticket.ticketNo,
                  },
                })}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />재수리 접수
              </button>
            </div>
          </div>

          {/* 2행: 상태 + SO문서번호 + 법인 */}
          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <div className="pr-8">
              <p className="text-[11px] text-gray-400 mb-1.5">상태</p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusMeta.className}`}>
                  <I18nText i18nKey={ticketStatusI18nKey(ticket.status)} display="tooltip">
                    {statusMeta.label}
                  </I18nText>
                </span>
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <History className="w-3 h-3" />내역
                </button>
              </div>
            </div>
            <div className="px-8">
              <p className="text-[11px] text-gray-400 mb-1.5">SO 문서번호</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{ticket.soDocumentNo || '-'}</p>
                {soInfo.status !== 'NOT_READY' && (
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${soInfo.className}`}>
                    {soInfo.label}
                  </span>
                )}
              </div>
            </div>
            <div className="px-8">
              <p className="text-[11px] text-gray-400 mb-1.5">법인</p>
              <p className="text-sm text-gray-800">{branchLabel}</p>
            </div>
          </div>
        </div>

        {/* ── 탭 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 탭 바 */}
          <div className="flex border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-5">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                {/* ── 좌측 컬럼 ── */}
                <div className="space-y-4">

                  {/* 접수 정보 카드 */}
                  <SectionCard title="접수 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="접수일시" value={`${ticket.receivedAt} (KST)`} />
                      <Field label="접수처" value={ticket.receptionPlace} />
                      <Field label="접수 채널" value={receptionChannel} />
                      {shouldShowReceptionContact && (
                        <Field label="담당자 연락처" value={receptionContact} />
                      )}
                      <Field label="재수리 여부" value={ticket.reRepairYn} />
                      <TicketLinkField
                        label="기존 티켓번호"
                        ticketNo={ticket.originalTicketNo}
                        onClick={originalTicketNo => navigate(`/${langCode}/tickets/${originalTicketNo}`)}
                      />
                      <Field label="긴급 수리 여부" value="-" />
                      <Field label="보증서 동봉" value="-" />
                      <Field label="구매 증빙 여부" value="-" />
                      <Field label="구매일" value="-" />
                      <div className="col-span-2">
                        <Field label="구매처" value="-" />
                      </div>
                      <div className="col-span-2">
                        <Field label="고객 요청사항" value="-" />
                      </div>
                    </dl>
                    {/* 첨부파일 */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-[11px] font-medium text-gray-400 mb-2">첨부파일</p>
                      <p className="text-xs text-gray-400">첨부파일이 없습니다.</p>
                    </div>
                  </SectionCard>

                  {/* 상담 카드 */}
                  <SectionCard title="상담">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="상담 희망 여부" value="-" />
                      <Field label="Outbound 유형" value="-" />
                      <Field label="상담 담당자" value="-" />
                      <Field label="상담 상태" value="-" />
                      <Field label="상담 날짜" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 글로벌 접수 정보 카드 */}
                  <SectionCard title="글로벌 접수 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="HQ 운송장 No." value="-" />
                      <Field label="법인 출고완료일" value="-" />
                      <Field label="법인 운송장 No." value="-" />
                      <Field label="법인 Invoice No." value="-" />
                      <Field label="HQ Invoice No." value="-" />
                      <Field label="재수출 이행 조건" value={ticket.reexportCondition} />
                    </dl>
                  </SectionCard>
                </div>

                {/* ── 우측 컬럼 ── */}
                <div className="space-y-4">

                  {/* 고객 정보 카드 */}
                  <SectionCard title="고객 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <ClickableField label="이메일" value={ticket.email} onClick={handleCustomerClick} />
                      <Field label="고객명" value={ticket.customerName} />
                      <Field label="전화번호" value={ticket.phone} />
                      <Field label="국가" value="-" />
                      <Field label="마케팅 동의" value="-" />
                      <Field label="개인정보 동의" value="-" />
                      <div className="col-span-2">
                        <Field label="수령 유형" value={receptionMethodLabel} />
                      </div>
                      <div className="col-span-2">
                        <Field label="수령 정보" value={receivingInfo} />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 제품 정보 카드 */}
                  <SectionCard title="제품 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <div className="col-span-2">
                        <Field label="제품명" value={ticket.productName} />
                      </div>
                      <Field label="제품 ID (SAP 코드)" value="-" />
                      <Field label="범주" value="-" />
                      <Field label="도금수리 가능 여부" value="-" />
                      <Field label="재고 보유 여부" value="-" />
                      <Field label="출시일" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 수리 정보 카드 */}
                  <SectionCard title="수리 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="본사 입고일" value={ticket.hqReceivedAt} />
                      <Field label="출고 예정일" value={ticket.expectedShipAt} />
                      <Field label="수리 진행처" value={ticket.repairDepartment} />
                      <Field label="수리 내용" value={ticket.repairDetail} />
                      <Field label="수리비용 결정" value={formatRepairChargeType(soInfo.repairChargeType)} />
                      <Field label="수리 비용" value={formatCurrency(soInfo.repairCost)} />
                      <Field label="서비스 기술자" value={technicianLabel} />
                      <Field label="수리 진행일" value="-" />
                      <Field label="문제현상" value="-" />
                      <Field label="렌즈 유형" value="-" />
                      <Field label="협력업체 출고일" value="-" />
                      <Field label="협력업체 입고일" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 결제 정보 카드 */}
                  <SectionCard title="결제 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="결제 완료 여부" value={PAYMENT_META[ticket.paymentCompleted]} />
                      <Field label="결제 일자" value={ticket.paymentDate} />
                      <Field label="결제 수단" value="-" />
                      <Field label="결제 승인 번호" value={soInfo.paymentApprovalNo} />
                      <Field label="대체 승인 번호" value="-" />
                      <Field label="최종 결제 요청" value="-" />
                      <div className="col-span-2">
                        <Field label="결제 URL" value="-" />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* SO 문서번호 카드 */}
                  <SectionCard title="SO 문서번호">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            AS-IS 기준으로 서비스 종료 시점에 조건을 만족한 유상 결제 건을 SAP SD001로 전송합니다.
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            SAP에서 생성된 SO 문서번호는 티켓의 SAP SO 번호로 연동되어 조회/엑셀에 표시됩니다.
                          </p>
                        </div>
                        {soInfo.status !== 'NOT_READY' && (
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${soInfo.className}`}>
                            {soInfo.label}
                          </span>
                        )}
                      </div>
                      {soInfo.cancelReviewNeeded && (
                        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <p>취소 건은 결제 취소 처리와 실제 출고 여부에 따라 SO 발행 대상 제외 여부를 확인해야 합니다.</p>
                        </div>
                      )}
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <Field label="SAP SO 문서번호" value={ticket.soDocumentNo} />
                        <Field label="SAP 전송 여부" value={soInfo.sapSendFlag} />
                      </dl>
                      <div className="rounded-xl border border-gray-100">
                        <div className="grid grid-cols-[1.1fr_0.8fr_1fr_auto] gap-3 border-b border-gray-100 bg-gray-50/60 px-3 py-2 text-[11px] font-medium text-gray-400">
                          <span>조건</span>
                          <span>필수값</span>
                          <span>현재값</span>
                          <span>상태</span>
                        </div>
                        <div className="px-3">
                          {soInfo.conditions.map(condition => (
                            <ConditionRow
                              key={condition.key}
                              label={condition.label}
                              required={condition.required}
                              value={condition.value}
                              met={condition.met}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* 환불 계좌 카드 */}
                  <SectionCard title="환불 계좌">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="은행" value="-" />
                      <Field label="계좌번호" value="-" />
                      <Field label="예금주" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 출고 정보 카드 */}
                  <SectionCard title="출고 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="출고완료" value={ticket.shippedAt ? 'Y' : 'N'} />
                      <Field label="출고완료일" value={ticket.shippedAt} />
                      <Field label="출고방식" value={ticket.shippingMethod} />
                      <Field label="배송 완료" value="-" />
                      <Field label="배송일자" value="-" />
                      <Field label="등기번호" value={ticket.trackingNo} />
                      <Field label="매장 수령 상태" value="-" />
                      <Field label="수령 일자" value="-" />
                    </dl>
                  </SectionCard>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <PlaceholderTab message="가격결정 — SAP 연동 수리비 산출 테이블" />
            )}
            {activeTab === 'kakao' && (
              <MessageTemplatePanel ticket={ticket} channel="kakao" enabled={kakaoEnabled} />
            )}
            {activeTab === 'email' && (
              <MessageTemplatePanel ticket={ticket} channel="email" />
            )}
          </div>
        </div>
      </div>
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
