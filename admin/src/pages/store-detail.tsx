import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Home, Mail, Phone, User } from 'lucide-react'
import { STORES } from '@/lib/mock-data'
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

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  RECEIVED: { label: '접수 완료', className: 'bg-blue-50 text-blue-700' },
  JUDGEMENT_PENDING: { label: '판정 대기', className: 'bg-amber-50 text-amber-700' },
  JUDGEMENT_DONE: { label: '판정 완료', className: 'bg-indigo-50 text-indigo-700' },
  PAYMENT_REQUESTED: { label: '결제 요청', className: 'bg-purple-50 text-purple-700' },
  PAYMENT_DONE: { label: '결제 완료', className: 'bg-emerald-50 text-emerald-700' },
  PARTNER_SENT: { label: '협력업체 발송', className: 'bg-sky-50 text-sky-700' },
  REPAIRING: { label: '수리 진행 중', className: 'bg-orange-50 text-orange-700' },
  REPAIR_DONE: { label: '수리 완료', className: 'bg-green-50 text-green-700' },
  READY_TO_SHIP: { label: '출고 대기', className: 'bg-cyan-50 text-cyan-700' },
  SHIPPING: { label: '배송 중', className: 'bg-slate-100 text-slate-700' },
  SHIPPED: { label: '배송 완료', className: 'bg-gray-100 text-gray-700' },
  CLOSED: { label: '종결', className: 'bg-gray-900 text-white' },
  CANCELED: { label: '취소', className: 'bg-red-50 text-red-700' },
  PICKUP_WAITING: { label: '픽업 대기', className: 'bg-yellow-50 text-yellow-700' },
}

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
  return store.active === 'N' ? 'No Active' : 'Active'
}

function fullAddress(store: Store) {
  return [store.address1, store.address2].filter(Boolean).join(' ')
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

function InfoItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{displayValue(value)}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status]
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
}

export function StoreDetailPage() {
  const { code, langCode } = useParams<{ code: string; langCode: string }>()
  const navigate = useNavigate()
  const pfx = `/${langCode}`
  const store = STORES.find(item => item.code === code)
  const tickets = useMemo(() => getTicketsWithExtras(), [])

  if (!store) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">존재하지 않는 매장/BP(B2B)입니다.</p>
        <button onClick={() => navigate(`${pfx}/stores`)} className="text-sm text-gray-600 underline">목록으로 돌아가기</button>
      </div>
    )
  }

  const address = fullAddress(store)
  const storeTickets = tickets
    .filter(ticket => isTicketForStore(ticket, store))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100" aria-label="뒤로가기">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-gray-700">매장/거래처 관리</span>
      </nav>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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

        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-8 p-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
              <h2 className="text-sm font-semibold text-gray-900">주소 정보</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="국가/지역" value={store.country} />
              <InfoItem label="통화" value={store.currency} />
              <InfoItem label="시" value={store.address1} />
              <InfoItem label="우편번호" value={store.zipCode} mono />
              <InfoItem label="번지" value={store.oldZipCode} />
              <div className="col-span-2">
                <dt className="text-[11px] font-medium text-gray-400">상세 주소</dt>
                {address ? (
                  <button
                    type="button"
                    onClick={() => window.open(`https://google.co.kr/maps/place/${encodeURIComponent(address)}`, '_blank')}
                    className="mt-1 inline-flex items-center gap-1 text-left text-sm font-medium text-gray-900 hover:underline"
                  >
                    {address}
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                ) : (
                  <dd className="mt-1 text-sm font-medium text-gray-900">-</dd>
                )}
              </div>
            </dl>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
              <h2 className="text-sm font-semibold text-gray-900">통신</h2>
            </div>
            <dl className="grid gap-4">
              <InfoItem label="전화번호" value={store.tel1} mono />
              <InfoItem label="대표담당자 번호" value={store.tel2} mono />
              <InfoItem label="팩스" value={store.telFx} mono />
            </dl>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
              <h2 className="text-sm font-semibold text-gray-900">운영 정보</h2>
            </div>
            <dl className="grid gap-4">
              <InfoItem label="이름" value={store.name} />
              <InfoItem label="계정 아이디" value={store.code} mono />
              <InfoItem label="접수처" value={groupLabel(store.storeGroup)} />
              <InfoItem label="상태" value={activeLabel(store)} />
            </dl>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
            <h2 className="text-sm font-semibold text-gray-900">티켓</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{storeTickets.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-left text-xs font-semibold tracking-wide text-gray-500">
                <th className="px-5 py-4">Ticket No.</th>
                <th className="px-5 py-4">상태</th>
                <th className="px-5 py-4">접수 일시</th>
                <th className="px-5 py-4">고객명</th>
                <th className="px-5 py-4">제품명</th>
                <th className="px-5 py-4">수리 내용</th>
                <th className="px-5 py-4">출고 예정일</th>
                <th className="px-5 py-4">배송 방식</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {storeTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">연결된 티켓이 없습니다.</td>
                </tr>
              ) : storeTickets.map(ticket => (
                <tr
                  key={ticket.ticketNo}
                  onClick={() => navigate(`${pfx}/tickets/${ticket.ticketNo}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-gray-900">{ticket.ticketNo}</td>
                  <td className="whitespace-nowrap px-5 py-3.5"><StatusBadge status={ticket.status} /></td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-600">{ticket.receivedAt}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-gray-900">{ticket.customerName}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">{ticket.productName}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">{ticket.repairDetail}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-600">{displayValue(ticket.expectedShipAt)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">{ticket.shippingMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
