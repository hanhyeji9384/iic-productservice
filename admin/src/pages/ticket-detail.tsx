import { Pagination } from '@/components/pagination'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Barcode, ChevronDown, ExternalLink, History, Mail, MessageSquare, Package, Pencil, RotateCcw, Search, Send, X } from 'lucide-react'
import { BRANCHES, MEMBERS, PRODUCTS as PRODUCT_SNAPSHOTS, STORES } from '@/lib/mock-data'
import { appendTicketChangeLog, createComponentReturnFromTicket, createStockRequestFromTicket, getComponentReturns, getCustomersWithOverrides, getStockRequests, getTicketChangeLogs, getTicketsWithExtras, updatePrototypeTicket } from '@/lib/prototype-storage'
import { addPrivacyLog } from '@/lib/download-logs'
import { COMPONENT_TYPE_OPTIONS } from '@/lib/component-return'
import { STOCK_REQUEST_REASONS } from '@/lib/stock-request'
import { getSoDocumentInfo } from '@/lib/ticket-so'
import { useParts } from '@/lib/parts-context'
import { useMembers } from '@/lib/members-context'
import { PRODUCT_FACTORY_SELECT_OPTIONS, normalizeProductFactory } from '@/lib/product-factories'
import type { ComponentType, Member, PaymentCompleted, Product, StockRequestReason, Store, Ticket, TicketAttachment, TicketChangeLog, TicketChangeType, TicketPartRequestItem, TicketPricingItem, TicketReceptionTag, TicketStatus } from '@/lib/types'
import { BarcodePrintModal } from '@/components/barcode-print-modal'
import { I18nText } from '@/lib/i18n-inspector'
import { ticketStatusI18nKey } from '@/lib/ticket-status-i18n'
import { MESSAGE_TEMPLATES, TEMPLATE_KIND_LABEL, type MessageChannel, type MessageTemplate, type TemplateKind } from '@/lib/message-templates'

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  RECEIVED:          { label: '접수',            className: 'bg-blue-50 text-blue-700 border-blue-200' },
  JUDGEMENT_PENDING: { label: '서비스 판정 대기', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  JUDGEMENT_DONE:    { label: '서비스 판정 완료', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  SERVICE_UNAVAILABLE: { label: '서비스 불가',   className: 'bg-rose-50 text-rose-700 border-rose-200' },
  PAYMENT_REQUESTED: { label: '결제 대기',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
  PAYMENT_DONE:      { label: '결제 완료',        className: 'bg-green-50 text-green-700 border-green-200' },
  PARTNER_SENT:      { label: '협력업체 발송',    className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PARTNER_RECEIVED:  { label: '협력업체 입고 후 검수 중', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  REPAIRING:         { label: '수리 진행 중',     className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  REPAIR_DONE:       { label: '수리 완료',        className: 'bg-teal-50 text-teal-700 border-teal-200' },
  READY_TO_SHIP:     { label: '출고 준비',        className: 'bg-lime-50 text-lime-700 border-lime-200' },
  SHIPPING:          { label: '배송 시작',        className: 'bg-sky-50 text-sky-700 border-sky-200' },
  SHIPPED:           { label: '배송 완료',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SERVICE_DONE:      { label: '서비스 완료',      className: 'bg-gray-100 text-gray-700 border-gray-200' },
  CLOSED:            { label: '서비스 완료',      className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELED:          { label: '취소',             className: 'bg-red-50 text-red-600 border-red-200' },
  PICKUP_WAITING:    { label: '접수',              className: 'bg-blue-50 text-blue-700 border-blue-200' },
  STORE_ARRIVED:     { label: '매장 도착(Drop-off)', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PICKUP_COMPLETED:  { label: '픽업 완료',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PRODUCT_MOVING:    { label: '제품 이동 중',      className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  PICKUP_DONE:        { label: '회수 완료',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTS_READY:       { label: '부속품 준비 완료',  className: 'bg-pink-50 text-pink-700 border-pink-200' },
}

const PAYMENT_META: Record<PaymentCompleted, string> = { Y: '완료', N: '미완료', C: '취소' }

type MessageLog = {
  id: string
  templateTitle: string
  sentAt: string
  kind: TemplateKind
  status: string
}

type PurchaseProofValue = NonNullable<Ticket['purchaseProofType']>
type EditableFieldOption = { value: string; label: string }

const DIRECT_CHANGEABLE_STATUS_ORDER: TicketStatus[] = [
  'STORE_ARRIVED',
  'SERVICE_UNAVAILABLE',
  'PARTNER_SENT',
  'REPAIRING',
  'REPAIR_DONE',
  'READY_TO_SHIP',
  'SERVICE_DONE',
  'CANCELED',
  'PARTS_READY',
  'PICKUP_COMPLETED',
  'PARTNER_RECEIVED',
]
const DIRECT_CHANGEABLE_STATUS_SET = new Set<TicketStatus>(DIRECT_CHANGEABLE_STATUS_ORDER)
const TICKET_STATUS_OPTIONS: EditableFieldOption[] = DIRECT_CHANGEABLE_STATUS_ORDER.map(value => ({
  value,
  label: STATUS_META[value].label,
}))

const PURCHASE_PROOF_OPTIONS: Array<{ value: PurchaseProofValue; label: string }> = [
  { value: '-', label: '-' },
  { value: 'MEMBERSHIP', label: '멤버십' },
  { value: 'WARRANTY_CARD', label: '보증카드' },
  { value: 'RECEIPT', label: '구매 영수증' },
  { value: 'OTHER', label: '기타' },
]
const YN_OPTIONS: EditableFieldOption[] = [
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
]

const PICKUP_CARRIER_OPTIONS: EditableFieldOption[] = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '성화기업', label: '성화기업' },
  { value: 'DHL', label: 'DHL' },
  { value: 'UPS', label: 'UPS' },
  { value: 'EMS', label: 'EMS' },
]
const PICKUP_METHOD_OPTIONS: EditableFieldOption[] = [
  { value: 'house', label: '자택 픽업' },
  { value: 'store', label: '매장 Drop-Off' },
]
const OUTBOUND_TYPE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '보증 확인', label: '보증 확인' },
  { value: '타 제품 교환', label: '타 제품 교환' },
  { value: '수리 불가', label: '수리 불가' },
  { value: '일반 상담', label: '일반 상담' },
  { value: '물품 진위여부 확인', label: '물품 진위여부 확인' },
  { value: '수리 중 내용 변경', label: '수리 중 내용 변경' },
  { value: '수리 중 파손', label: '수리 중 파손' },
  { value: '다중접수', label: '다중접수' },
  { value: '컴플레인', label: '컴플레인' },
]
const CONSULTATION_STATUS_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '상담대기', label: '상담 대기' },
  { value: '부재중', label: '부재중' },
  { value: '회신대기', label: '회신 대기' },
  { value: '콜백필요', label: '콜백 필요' },
  { value: '상담완료', label: '상담 완료' },
]
const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const REPAIR_DEPARTMENT_OPTIONS: EditableFieldOption[] = [
  { value: '본사', label: '본사' },
  { value: '3PL', label: '3PL' },
  { value: '협력업체', label: '협력업체' },
]
const SHIPPING_METHOD_OPTIONS: EditableFieldOption[] = [
  { value: '택배(HQ)', label: '택배(HQ)' },
  { value: '행낭(HQ)', label: '행낭(HQ)' },
  { value: '해외 택배(HQ)', label: '해외 택배(HQ)' },
  { value: '택배(3PL)', label: '택배(3PL)' },
  { value: '해외 택배(3PL)', label: '해외 택배(3PL)' },
  { value: '자체 수령', label: '자체 수령' },
  { value: '퀵', label: '퀵' },
]
const MANUAL_SHIPPING_METHOD_OPTIONS: EditableFieldOption[] = [
  { value: '자체 수령', label: '자체 수령' },
  { value: '퀵', label: '퀵' },
]
const REPAIR_DETAIL_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '부품교체', label: '부품교체' },
  { value: '토탈케어', label: '토탈케어' },
  { value: '장식수리', label: '장식수리' },
  { value: '심플리페어', label: '심플리페어' },
  { value: '도금수리', label: '도금수리' },
  { value: '용접수리', label: '용접수리' },
  { value: '제품교환', label: '제품교환' },
  { value: '타제품교환', label: '타제품교환' },
  { value: '부품제공', label: '부품제공' },
  { value: '미입금반송', label: '미입금반송' },
  { value: '수리불가', label: '수리불가' },
  { value: '수리취소', label: '수리취소' },
  { value: '환불', label: '환불' },
]
const REPAIR_CHARGE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: 'PAID', label: '유상' },
  { value: 'FREE', label: '무상' },
]
const INT_FREE_REPAIR_UNAVAILABLE_MESSAGE = 'INT 티켓은 무상 판정을 선택할 수 없습니다.'
const REPAIR_TYPE_OPTIONS = ['교체', '긴급', '도금', '용접', '일반렌즈가공', '복원', '기타', '서비스 청구']
const KR_REPAIR_TYPE_FIXED_PRICE: Partial<Record<string, number>> = {
  긴급: 10000,
  도금: 30000,
  용접: 30000,
  일반렌즈가공: 30000,
  복원: 30000,
}
const INT_REPAIR_TYPE_FIXED_PRICE: Partial<Record<string, number>> = {
  긴급: 50,
  도금: 30,
  용접: 30,
  일반렌즈가공: 30,
  복원: 30,
}
const DEFAULT_PRODUCT_RETAIL_PRICE = 249000
const NO_REPAIR_REASON_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: 'FAKE', label: '가품' },
  { value: 'PURCHASE_PROOF_UNAVAILABLE', label: '구매증빙불가' },
  { value: 'PRODUCT_CONDITION', label: '제품상태 문제' },
  { value: 'OTHER', label: '기타' },
]
const LENS_TYPE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '미삽입', label: '미삽입' },
  { value: '제품의 기존 렌즈', label: '제품의 기존 렌즈' },
  { value: '별도로 제작한 렌즈', label: '별도로 제작한 렌즈' },
]
const TOTAL_CARE_FITTING_OPTIONS: EditableFieldOption[] = [
  { value: '기본 피팅', label: '기본 피팅' },
  { value: '기존 피팅 유지', label: '기존 피팅 유지' },
]
const RE_REPAIR_REASON_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '요청사항 누락', label: '요청사항 누락' },
  { value: '렌즈 손상', label: '렌즈 손상' },
  { value: '렌즈 분실', label: '렌즈 분실' },
  { value: '렌즈 오삽입', label: '렌즈 오삽입' },
  { value: '제품 결함', label: '제품 결함' },
  { value: '검수 미흡', label: '검수 미흡' },
  { value: '고객 요청', label: '고객 요청' },
  { value: '안경원 재수리', label: '안경원 재수리' },
  { value: '매장 재수리', label: '매장 재수리' },
  { value: '3PL 재수리', label: '3PL 재수리' },
]
const REPAIR_PART_OPTIONS = ['프론트', '브릿지', '렌즈(R)', '렌즈(L)', '템플(R)', '템플(L)']
const REPAIR_SYMPTOM_OPTIONS = [
  '토탈 케어 요청',
  '제품 파손·변형',
  '장식 문제',
  '부속품 교체',
  '부속품 요청',
  '제품 결함·이상 확인요청',
  '그 외 문제',
  '부품 분실',
  '매장/SIS 파손',
  '가품',
]
const REPAIR_ISSUE_AREA_OPTIONS = [
  '경첩', '나사', '렌즈', '리벳', '림 고리', '솔텍스', '와이어', '코기둥', '코바가지',
  '코받침', '템플', '팁', '프론트', '템플심', '프론트 용접부', '템플 용접부', '프론트 접합부',
  '템플 접합부', '프론트 장식', '템플 장식', '템플팁 장식',
]
const REPAIR_ISSUE_TYPE_OPTIONS = [
  '박리', '변형', '부식', '유격', '탈락', '파손', '마모', '변색', '이염',
  '수축', '백화', '돌출', '균열', 'UP 불량', '오염', '손상',
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

const TICKET_CHANGE_SECTION_META: Record<TicketChangeType, { label: string; className: string }> = {
  CUSTOMER: {
    label: '고객 정보',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  PRODUCT: {
    label: '제품 정보',
    className: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  RECEPTION: {
    label: '접수 정보',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  STATUS: {
    label: '상태',
    className: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  REPAIR: {
    label: '수리 정보',
    className: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  PAYMENT: {
    label: '결제 정보',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  CONSULTATION: {
    label: '상담',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SHIPPING: {
    label: '출고 정보',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  ASSIGNEE: {
    label: '담당자',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  SYSTEM: {
    label: '시스템',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
}

type TicketChangeValueFormatter = (value: unknown, ticket: Ticket, members: Member[]) => string
type TicketChangeFieldMeta = {
  label: string
  changeType: TicketChangeType
  format?: TicketChangeValueFormatter
}

function optionLabel(options: EditableFieldOption[] | Array<{ value: string; label: string }>, value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const normalizedValue = String(value ?? '')
  return options.find(option => option.value === normalizedValue)?.label ?? normalizedValue
}

function normalizeOutboundTypeValue(value: unknown) {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return '-'
  const legacyValueMap: Record<string, string> = {
    보증확인: '보증 확인',
    타제품교환: '타 제품 교환',
    수리불가: '수리 불가',
    일반상담: '일반 상담',
    캠페인: '컴플레인',
  }
  return legacyValueMap[rawValue] ?? rawValue
}

function normalizeConsultationStatusValue(value: unknown) {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return '-'
  const spacedValueMap: Record<string, string> = {
    '상담 대기': '상담대기',
    '회신 대기': '회신대기',
    '콜백 필요': '콜백필요',
    '상담 완료': '상담완료',
  }
  return spacedValueMap[rawValue] ?? rawValue
}

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-'
  return String(value)
}

function getAttachmentName(attachment: TicketAttachment) {
  return typeof attachment === 'string' ? attachment : attachment.name
}

function getAttachmentUrl(attachment: TicketAttachment) {
  if (typeof attachment !== 'string') return attachment.url
  const title = attachment.replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char] ?? char))
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <html>
      <head><title>${title}</title></head>
      <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#52525b;">
        <div style="text-align:center;">
          <p style="margin:0 0 8px;font-size:18px;color:#111827;">${title}</p>
          <p style="margin:0;font-size:13px;">기존 접수 이미지입니다.</p>
        </div>
      </body>
    </html>
  `)}`
}

function isReadonlyAttachment(attachment: TicketAttachment) {
  return typeof attachment !== 'string' && attachment.readOnly === true
}

function isPurchaseProofAttachment(attachment: TicketAttachment) {
  if (typeof attachment !== 'string') return attachment.purpose === 'PURCHASE_PROOF'
  return /구매\s*증빙|영수증|보증카드|receipt|warranty/i.test(attachment)
}

function createPurchaseProofImageUrl(ticket: Ticket) {
  const proofValue = getPurchaseProofValue(ticket)
  const proofLabel = proofValue === '-'
    ? '구매증빙'
    : PURCHASE_PROOF_OPTIONS.find(option => option.value === proofValue)?.label ?? '구매증빙'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="620" viewBox="0 0 960 620">
      <rect width="960" height="620" fill="#f4f4f5"/>
      <rect x="210" y="70" width="540" height="480" rx="22" fill="#fff" stroke="#d4d4d8" stroke-width="2"/>
      <text x="260" y="150" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="34" font-weight="700" fill="#18181b">Purchase Proof</text>
      <text x="260" y="205" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="22" fill="#71717a">${proofLabel}</text>
      <line x1="260" y1="260" x2="700" y2="260" stroke="#e4e4e7" stroke-width="2"/>
      <text x="260" y="320" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="24" fill="#27272a">${ticket.productName}</text>
      <text x="260" y="370" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" fill="#71717a">${ticket.purchaseDate || '-'}</text>
      <text x="260" y="420" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" fill="#71717a">${ticket.purchasePlace || '-'}</text>
      <rect x="260" y="470" width="270" height="34" rx="17" fill="#f4f4f5"/>
      <text x="282" y="493" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="16" fill="#71717a">registered at reception</text>
    </svg>
  `
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function getReadonlyPurchaseProofAttachment(ticket: Ticket, storedAttachments: TicketAttachment[]): TicketAttachment | null {
  if (isAdminReceptionTicket(ticket)) return null
  if (isOrderHistoryPurchaseInfo(ticket)) return null
  const proofValue = getPurchaseProofValue(ticket)
  if (!proofValue || proofValue === 'MEMBERSHIP') return null
  if (storedAttachments.some(isPurchaseProofAttachment)) return null

  const proofLabel = proofValue === '-'
    ? '구매증빙'
    : PURCHASE_PROOF_OPTIONS.find(option => option.value === proofValue)?.label ?? '구매증빙'
  return {
    id: `${ticket.ticketNo}-purchase-proof`,
    name: `${proofLabel} 이미지.png`,
    url: createPurchaseProofImageUrl(ticket),
    uploadedAt: ticket.receivedAt,
    purpose: 'PURCHASE_PROOF',
    readOnly: true,
  }
}

function formatAttachmentChangeValue(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.map(item => getAttachmentName(item as TicketAttachment)).join(', ')
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatMoneyChangeValue(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '0'
  return amount.toLocaleString('ko-KR')
}

function formatStatusChangeValue(value: unknown) {
  const status = value as TicketStatus
  return STATUS_META[status]?.label ?? formatChangeValue(value)
}

function formatMemberChangeValue(value: unknown, fallbackName: string | undefined, members: Member[]) {
  const id = String(value ?? '')
  if (!id) return '-'
  return getMemberLabel(id, undefined, members)
    ?? getMemberLabel(id, fallbackName, members)
    ?? id
}

const TICKET_CHANGE_FIELD_META: Partial<Record<keyof Ticket, TicketChangeFieldMeta>> = {
  status: {
    label: '티켓 상태',
    changeType: 'STATUS',
    format: formatStatusChangeValue,
  },
  productCode: {
    label: '제품 코드',
    changeType: 'PRODUCT',
  },
  productName: {
    label: '제품명',
    changeType: 'PRODUCT',
  },
  productSerialNumber: {
    label: '시리얼 번호',
    changeType: 'PRODUCT',
  },
  productMidCategory: {
    label: '중분류',
    changeType: 'PRODUCT',
  },
  productSubCategory: {
    label: '소분류',
    changeType: 'PRODUCT',
  },
  productStockAvailableYn: {
    label: '재고보유여부',
    changeType: 'PRODUCT',
  },
  productRestorationRepairYn: {
    label: '복원수리 가능여부',
    changeType: 'PRODUCT',
  },
  productDecorationYn: {
    label: '장식 보유 여부',
    changeType: 'PRODUCT',
  },
  productLaunchDate: {
    label: '런칭일',
    changeType: 'PRODUCT',
  },
  expectedShipAt: {
    label: '출고 예정일',
    changeType: 'REPAIR',
  },
  productFactory1: {
    label: '생산공장1',
    changeType: 'PRODUCT',
  },
  productFactory2: {
    label: '생산공장2',
    changeType: 'PRODUCT',
  },
  productFactory3: {
    label: '생산공장3',
    changeType: 'PRODUCT',
  },
  reRepairYn: {
    label: '재수리 여부',
    changeType: 'RECEPTION',
  },
  originalTicketNo: {
    label: '기존 티켓번호',
    changeType: 'RECEPTION',
  },
  receptionPlace: {
    label: '접수처',
    changeType: 'RECEPTION',
  },
  b2cYn: {
    label: 'B2C 여부(법인용)',
    changeType: 'RECEPTION',
  },
  urgentRepairYn: {
    label: '긴급수리 여부',
    changeType: 'RECEPTION',
  },
  serviceCoupon: {
    label: '보상 서비스 쿠폰',
    changeType: 'REPAIR',
  },
  pickupTrackingNo: {
    label: '회수 운송장 No.',
    changeType: 'RECEPTION',
  },
  receptionMethod: {
    label: '회수 방식',
    changeType: 'RECEPTION',
    format: value => optionLabel(PICKUP_METHOD_OPTIONS, value),
  },
  hqReceivedAt: {
    label: 'PS Office 입고일',
    changeType: 'RECEPTION',
  },
  purchaseProofType: {
    label: '구매증빙 유형',
    changeType: 'RECEPTION',
    format: value => optionLabel(PURCHASE_PROOF_OPTIONS, value),
  },
  purchaseInfoSource: {
    label: '구매정보 출처',
    changeType: 'RECEPTION',
  },
  purchaseDate: {
    label: '구매일',
    changeType: 'RECEPTION',
  },
  purchasePlace: {
    label: '구매처',
    changeType: 'RECEPTION',
  },
  customerRequest: {
    label: '고객 요청사항',
    changeType: 'RECEPTION',
  },
  attachments: {
    label: '첨부파일',
    changeType: 'RECEPTION',
    format: formatAttachmentChangeValue,
  },
  symptom: {
    label: '현상 유형',
    changeType: 'REPAIR',
  },
  repairPartTags: {
    label: '현상 부위',
    changeType: 'REPAIR',
  },
  repairIssueTypeTags: {
    label: '문제 유형',
    changeType: 'REPAIR',
  },
  repairIssueAreaTags: {
    label: '문제 부위',
    changeType: 'REPAIR',
  },
  careRequest: {
    label: '케어요청사항',
    changeType: 'REPAIR',
  },
  lensType: {
    label: '렌즈 유형',
    changeType: 'REPAIR',
    format: value => optionLabel(LENS_TYPE_OPTIONS, value),
  },
  repairDepartment: {
    label: '수리 진행처',
    changeType: 'REPAIR',
  },
  repairDetail: {
    label: '수리 내용',
    changeType: 'REPAIR',
    format: value => normalizeRepairDetail(formatChangeValue(value)),
  },
  replacementProductCode: {
    label: '교체 제품 코드',
    changeType: 'REPAIR',
  },
  replacementProductName: {
    label: '교체 제품',
    changeType: 'REPAIR',
  },
  replacementProductRetailPrice: {
    label: '교체 제품 소비자가',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  noRepairReason: {
    label: '수리불가 판정 결과',
    changeType: 'REPAIR',
    format: value => optionLabel(NO_REPAIR_REASON_OPTIONS, value),
  },
  repairChargeType: {
    label: '수리비용 결정',
    changeType: 'REPAIR',
    format: value => optionLabel(REPAIR_CHARGE_OPTIONS, value),
  },
  repairCost: {
    label: '수리 비용',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  productRetailPrice: {
    label: '소비자가',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  repairTypeTags: {
    label: '수리 유형',
    changeType: 'REPAIR',
  },
  repairPricingCurrency: {
    label: '수리비용 통화',
    changeType: 'REPAIR',
  },
  serviceChargeAmount: {
    label: '서비스 청구 금액',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  repairOtherAmount: {
    label: '기타 수리 금액',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  customsDutyAmount: {
    label: '관부가세',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  pickupFreightAmount: {
    label: '픽업 발생 운송비',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  externalPricingYn: {
    label: '가격 산정 방식',
    changeType: 'REPAIR',
    format: value => String(value) === 'Y' ? '외부 견적' : '내부 기준',
  },
  externalPricingVendor: {
    label: '외부 업체',
    changeType: 'REPAIR',
  },
  externalPricingCost: {
    label: '외부 견적 금액',
    changeType: 'REPAIR',
    format: formatMoneyChangeValue,
  },
  externalPricingCheckedAt: {
    label: '견적 확인일',
    changeType: 'REPAIR',
  },
  externalPricingMemo: {
    label: '외부 견적 메모',
    changeType: 'REPAIR',
  },
  pricingItems: {
    label: '품목 가격결정',
    changeType: 'REPAIR',
    format: value => {
      if (!Array.isArray(value) || value.length === 0) return '-'
      const total = value.reduce((sum, item) => {
        const price = typeof item?.price === 'number' ? item.price : Number(item?.price ?? 0)
        return sum + (Number.isFinite(price) ? price : 0)
      }, 0)
      return `${value.length}개 품목 / ${formatMoneyChangeValue(total)}`
    },
  },
  repairBeginDate: {
    label: '수리 진행일',
    changeType: 'REPAIR',
  },
  repairCompletedAt: {
    label: '수리 완료일',
    changeType: 'REPAIR',
  },
  factoryForwardingDate: {
    label: '협력업체 출고일',
    changeType: 'REPAIR',
  },
  factoryReceivingDate: {
    label: '협력업체 입고일',
    changeType: 'REPAIR',
  },
  repairAgainReason: {
    label: '재수리 사유',
    changeType: 'REPAIR',
  },
  productProblemYn: {
    label: '제품 문제 여부',
    changeType: 'REPAIR',
  },
  repairReference: {
    label: '수리 참고사항',
    changeType: 'REPAIR',
  },
  repairSpecialNote: {
    label: '수리 특이사항',
    changeType: 'REPAIR',
  },
  customerNotice: {
    label: '고객 전달 사항',
    changeType: 'REPAIR',
  },
  customerNoticeImages: {
    label: '고객 전달 이미지',
    changeType: 'REPAIR',
    format: formatAttachmentChangeValue,
  },
  technicianId: {
    label: '서비스 기술자',
    changeType: 'ASSIGNEE',
    format: (value, ticket, members) => formatMemberChangeValue(value, ticket.technicianName, members),
  },
  judgementManagerId: {
    label: '판정 담당자',
    changeType: 'ASSIGNEE',
    format: (value, ticket, members) => formatMemberChangeValue(value, ticket.judgementManagerName, members),
  },
  consultationRequestedYn: {
    label: '상담 희망 여부',
    changeType: 'CONSULTATION',
  },
  outboundType: {
    label: 'Outbound 유형',
    changeType: 'CONSULTATION',
    format: value => optionLabel(OUTBOUND_TYPE_OPTIONS, normalizeOutboundTypeValue(value)),
  },
  consultationManager: {
    label: '상담 담당자',
    changeType: 'CONSULTATION',
  },
  consultationStatus: {
    label: '상담 상태',
    changeType: 'CONSULTATION',
    format: value => optionLabel(CONSULTATION_STATUS_OPTIONS, normalizeConsultationStatusValue(value)),
  },
  consultationTicketNo: {
    label: '상담 티켓',
    changeType: 'CONSULTATION',
  },
  consultationCompletedAt: {
    label: '상담일',
    changeType: 'CONSULTATION',
  },
  consultationExceptionCategory: {
    label: '예외 처리 분류',
    changeType: 'CONSULTATION',
  },
  consultationRepairMemo: {
    label: '수리 전달 사항',
    changeType: 'CONSULTATION',
  },
  judgementCompletedAt: {
    label: '판정 완료일',
    changeType: 'SYSTEM',
  },
  paymentCompleted: {
    label: '결제 완료 여부',
    changeType: 'PAYMENT',
    format: value => PAYMENT_META[value as PaymentCompleted] ?? formatChangeValue(value),
  },
  paymentDate: {
    label: '결제 일시',
    changeType: 'PAYMENT',
  },
  paymentExpiresAt: {
    label: '결제 만료기한',
    changeType: 'PAYMENT',
  },
  paymentApprovalNo: {
    label: '결제 승인 번호',
    changeType: 'PAYMENT',
  },
  shippingMethod: {
    label: '출고방식',
    changeType: 'SHIPPING',
    format: value => optionLabel(SHIPPING_METHOD_OPTIONS, value),
  },
  trackingNo: {
    label: '등기 번호',
    changeType: 'SHIPPING',
  },
  outboundCarrier: {
    label: '운송사',
    changeType: 'SHIPPING',
  },
  shipmentCompletedYn: {
    label: '출고 완료 여부',
    changeType: 'SHIPPING',
  },
  shipmentCompletedAt: {
    label: '출고 완료일',
    changeType: 'SHIPPING',
  },
  deliveryCompletedYn: {
    label: '배송 완료 여부',
    changeType: 'SHIPPING',
  },
  deliveredAt: {
    label: '배송일자',
    changeType: 'SHIPPING',
  },
  storePickupCompletedYn: {
    label: '고객 픽업 여부',
    changeType: 'SHIPPING',
  },
  storePickupCompletedAt: {
    label: '고객 픽업 일자',
    changeType: 'SHIPPING',
  },
  hqTrackingNo: {
    label: 'HQ 운송장 No.',
    changeType: 'SHIPPING',
  },
  hqInvoiceNo: {
    label: 'HQ Invoice No.',
    changeType: 'SHIPPING',
  },
  corporateShippedAt: {
    label: '법인 출고 완료일',
    changeType: 'SHIPPING',
  },
  corporateTrackingNo: {
    label: '법인 운송장 No.',
    changeType: 'SHIPPING',
  },
  corporateInvoiceNo: {
    label: '법인 Invoice No.',
    changeType: 'SHIPPING',
  },
  reexportCondition: {
    label: '재수출 이행 조건',
    changeType: 'SHIPPING',
  },
}

const TICKET_CHANGE_IGNORED_FIELDS = new Set<keyof Ticket>([
  'productFactory',
  'serialNumber',
  'technicianName',
  'judgementManagerName',
])

function getReceptionTitle(ticket: Ticket) {
  if (!ticket.receptionTitle || ticket.receptionTitle === 'PS 온라인 접수') return null
  return ticket.receptionTitle
}

function isCustomerReceptionTicket(ticket: Ticket) {
  if (ticket.purchaseInfoSource === 'ORDER_HISTORY') return true
  if (ticket.purchaseInfoSource === 'ADMIN') return false

  const sourceText = `${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`
  return /PS\s*온라인\s*접수|공식\s*홈페이지|GM_ONLINE|GM_US_Online|online/i.test(sourceText)
}

function isAdminReceptionTicket(ticket: Ticket) {
  if (ticket.purchaseInfoSource === 'ADMIN') return true
  if (ticket.receptionTitle === '재수리 접수') return true
  if (/GM_PS_/i.test(ticket.receptionPlace)) return true
  return !isCustomerReceptionTicket(ticket)
}

function isReRepairButtonCreatedTicket(ticket: Ticket) {
  return ticket.reRepairYn === 'Y'
    && Boolean(ticket.originalTicketNo)
    && ticket.receptionTitle === '재수리 접수'
}

function isOnlineAutoCreatedTicket(ticket: Ticket) {
  const sourceText = `${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`
  return /online|온라인/i.test(sourceText)
}

function getReceptionChannel(ticket: Ticket) {
  const source = ticket.receptionPlace
  if (/GM_PS_/i.test(source)) return 'PS'
  if (/online|온라인/i.test(`${ticket.receptionTitle ?? ''} ${source}`)) return '온라인'
  if (/법인|GM_US_|IICOMBINED/i.test(source)) return '법인'
  if (/SIS|GM_OS_|안경원|B2B|거래처|가맹/i.test(source)) return '가맹점'
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
  if (ticket.receptionMethod === 'store') return 'store'
  if (getReceptionChannel(ticket) === '매장') return 'store'
  if (getReceptionChannel(ticket) === '가맹점') return 'store'
  if (ticket.receptionMethod === 'house') return 'house'
  if (/행낭|자체수령|매장수령|매장\s*Drop-?Off/i.test(ticket.shippingMethod)) return 'store'
  if (/택배|DHL|배송/i.test(ticket.shippingMethod)) return 'house'
  return null
}

function hasShipmentReadyStatus(ticket: Ticket) {
  return ['READY_TO_SHIP', 'SHIPPING', 'SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(ticket.status)
}

function hasDeliveryCompletedStatus(ticket: Ticket) {
  return ['SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(ticket.status)
}

function normalizeCountry(value?: string | null) {
  return String(value ?? '').trim().toUpperCase()
}

function isKoreaCountry(value?: string | null) {
  const country = normalizeCountry(value)
  return ['KR', 'KOR', 'KOREA', 'SOUTH KOREA', 'REPUBLIC OF KOREA', '대한민국', '한국'].includes(country)
}

function getBranchCountry(ticket: Ticket) {
  return BRANCHES.find(branch => branch.code === ticket.branchCode)?.country ?? null
}

function hasDomesticReceptionMarker(ticket: Ticket) {
  return /국내|KOREA/i.test(`${ticket.receptionPlace} ${ticket.receptionTitle ?? ''}`)
}

function isDomesticReceptionTicket(ticket: Ticket) {
  const deliveryCountry = normalizeCountry(ticket.deliveryCountry)
  if (deliveryCountry) return isKoreaCountry(deliveryCountry)
  const branchCountry = getBranchCountry(ticket)
  if (branchCountry) return isKoreaCountry(branchCountry)
  return hasDomesticReceptionMarker(ticket)
}

function isOverseasDestination(ticket: Ticket) {
  const country = normalizeCountry(ticket.deliveryCountry)
  if (country) return !isKoreaCountry(country)
  const branchCountry = getBranchCountry(ticket)
  if (branchCountry && !isKoreaCountry(branchCountry)) return true
  if (isDomesticReceptionTicket(ticket)) return false
  return isGlobalTicket(ticket)
}

function isStoreDropOff(ticket: Ticket) {
  return getReceptionMethod(ticket) === 'store'
}

function isOverseasStoreDropOff(ticket: Ticket) {
  return isStoreDropOff(ticket) && isOverseasDestination(ticket)
}

function hasAccessoryIssue(ticket: Ticket) {
  return /부속품|코받침|나사|소모성|부품/.test([
    ticket.symptom,
    ticket.repairDetail,
    ...(ticket.repairPartTags ?? []),
    ...(ticket.repairIssueTypeTags ?? []),
  ].filter(Boolean).join(' '))
}

function isSimplyRepairStoreTicket(ticket: Ticket) {
  return isStoreDropOff(ticket) && /심플리페어|simply\s*repair/i.test([
    ticket.receptionPlace,
    ticket.receptionStoreName,
    normalizeRepairDetail(ticket.repairDetail),
  ].filter(Boolean).join(' '))
}

function shouldSkipTmsPickup(ticket: Ticket) {
  return isSimplyRepairStoreTicket(ticket) && hasAccessoryIssue(ticket)
}

function getNormalizedShippingMethod(ticket: Ticket, receptionMethod: ReturnType<typeof getReceptionMethod>) {
  const raw = String(ticket.shippingMethod ?? '').trim()
  const overseas = isOverseasDestination(ticket)

  if (!overseas && /해외|DHL/i.test(raw)) return /3PL/i.test(`${ticket.repairDepartment} ${raw}`) ? '택배(3PL)' : '택배(HQ)'

  const known = SHIPPING_METHOD_OPTIONS.find(option => option.value === raw)
  if (known) return known.value
  if (/퀵/.test(raw)) return '퀵'
  if (/자체/.test(raw)) return '자체 수령'

  return getAutoShippingMethod(ticket, receptionMethod)
}

function isManualShippingMethod(value?: string | null) {
  return /퀵|자체\s*수령/.test(String(value ?? ''))
}

function isNoRepairReturnFlowTicket(ticket: Ticket) {
  return ticket.status === 'SERVICE_UNAVAILABLE' || isNoRepairDetail(ticket.repairDetail)
}

function isStoreReceivingDestination(ticket: Ticket, receptionMethod: ReturnType<typeof getReceptionMethod>) {
  const sourceText = `${ticket.shippingMethod} ${ticket.receptionStoreName ?? ''} ${ticket.receptionPlace}`
  if (/행낭|매장\s*수령|스토어\s*수령|PICK\s*UP\s*AT\s*STORE|store\s*pickup/i.test(sourceText)) return true
  if (/자택|택배|배송|DHL|CJ|SHIP\s*TO\s*ADDRESS/i.test(sourceText)) return false
  return receptionMethod === 'store'
}

function getAutoShippingMethod(ticket: Ticket, receptionMethod = getReceptionMethod(ticket)) {
  const raw = String(ticket.shippingMethod ?? '').trim()
  if (isManualShippingMethod(raw)) return raw.includes('퀵') ? '퀵' : '자체 수령'

  const is3pl = /3PL/i.test(`${ticket.repairDepartment} ${raw}`)
  const overseas = isOverseasDestination(ticket)
  const storeDestination = isStoreReceivingDestination(ticket, receptionMethod)

  if (is3pl) return overseas ? '해외 택배(3PL)' : '택배(3PL)'
  if (overseas) return '해외 택배(HQ)'
  if (storeDestination) return '행낭(HQ)'
  return '택배(HQ)'
}

function getOutboundCarrier(ticket: Ticket, normalizedShippingMethod: string) {
  if (ticket.outboundCarrier) return ticket.outboundCarrier
  if (normalizedShippingMethod.includes('행낭')) return '성화기업'
  if (normalizedShippingMethod.includes('해외')) return 'DHL'
  if (normalizedShippingMethod.includes('택배')) return 'CJ대한통운'
  return '-'
}

function isHomeDeliveryShipment(ticket: Ticket, normalizedShippingMethod: string) {
  if (isNoRepairReturnFlowTicket(ticket) && getReceptionMethod(ticket) === 'store') return false
  const sourceText = `${ticket.shippingMethod} ${normalizedShippingMethod}`
  if (/행낭|매장|스토어|자체\s*수령|store/i.test(sourceText)) return false
  return /자택|택배|배송|DHL|CJ/i.test(sourceText)
}

function canMoveToStoreArrived(ticket: Ticket) {
  if (getReceptionMethod(ticket) !== 'store') return false
  if (ticket.status === 'RECEIVED') return true
  return false
}

function isReturnReadyTicket(ticket: Ticket) {
  const repairDetail = normalizeRepairDetail(ticket.repairDetail)
  return (
    isNoRepairReturnFlowTicket(ticket) ||
    ticket.status === 'CANCELED' ||
    repairDetail === '수리취소' ||
    repairDetail === '미입금반송'
  )
}

function isBeforeRepairingStatus(status: TicketStatus) {
  return ![
    'REPAIRING',
    'REPAIR_DONE',
    'READY_TO_SHIP',
    'SHIPPING',
    'SHIPPED',
    'PICKUP_COMPLETED',
    'SERVICE_DONE',
    'CLOSED',
  ].includes(status)
}

function canMoveToPartnerSent(ticket: Ticket) {
  if (!/협력업체/.test(ticket.repairDepartment)) return false
  if (ticket.repairChargeType === 'PAID') return ticket.status === 'PAYMENT_DONE'
  if (ticket.repairChargeType === 'FREE') return ticket.status === 'JUDGEMENT_DONE'
  return ['JUDGEMENT_DONE', 'PAYMENT_DONE'].includes(ticket.status)
}

function canMoveToRepairing(ticket: Ticket) {
  if (ticket.status === 'PARTNER_RECEIVED') return true
  // 수리 진행처가 3PL 또는 본사일 때만 가능 (명세: 협력업체는 협력업체 발송 흐름으로 처리)
  if (/협력업체/.test(ticket.repairDepartment ?? '')) return false
  if (ticket.repairChargeType === 'PAID') return ticket.status === 'PAYMENT_DONE'
  if (ticket.repairChargeType === 'FREE') return ticket.status === 'JUDGEMENT_DONE'
  return ['JUDGEMENT_DONE', 'PAYMENT_DONE'].includes(ticket.status)
}

function canMoveToReadyToShip(ticket: Ticket) {
  return ticket.status === 'REPAIR_DONE' || isReturnReadyTicket(ticket)
}

function canMoveToPickupCompleted(ticket: Ticket) {
  return ticket.status === 'STORE_ARRIVED' && (
    ticket.deliveryCompletedYn === 'Y' ||
    Boolean(ticket.deliveredAt)
  )
}

function canApplyManualStatus(ticket: Ticket, nextStatus: TicketStatus) {
  if (!DIRECT_CHANGEABLE_STATUS_SET.has(nextStatus)) return false

  switch (nextStatus) {
    case 'STORE_ARRIVED':
      return canMoveToStoreArrived(ticket)
    case 'SERVICE_UNAVAILABLE':
      return isBeforeRepairingStatus(ticket.status)
    case 'PARTNER_SENT':
      return canMoveToPartnerSent(ticket)
    case 'PARTNER_RECEIVED':
      return ticket.status === 'PARTNER_SENT'
    case 'REPAIRING':
      return canMoveToRepairing(ticket)
    case 'REPAIR_DONE':
      return ticket.status === 'REPAIRING'
    case 'READY_TO_SHIP':
      return canMoveToReadyToShip(ticket)
    case 'SERVICE_DONE':
      return ticket.status === 'SHIPPED' || ticket.status === 'PICKUP_COMPLETED'
    case 'CANCELED':
      return isBeforeRepairingStatus(ticket.status)
    case 'PARTS_READY':
      return isPartsRequestTicket(ticket)
    case 'PICKUP_COMPLETED':
      return canMoveToPickupCompleted(ticket)
    default:
      return false
  }
}

function getManualStatusBlockedMessage(nextStatus: TicketStatus) {
  switch (nextStatus) {
    case 'STORE_ARRIVED':
      return '매장 도착(Drop-off)은 매장 Drop-off 접수 건이 접수 상태일 때만 변경할 수 있습니다.'
    case 'SERVICE_UNAVAILABLE':
      return '서비스 불가는 수리 진행 중 이전의 수리불가 판정 건에서만 변경할 수 있습니다.'
    case 'PARTNER_SENT':
      return '협력업체 발송은 수리 진행처가 협력업체이고 판정/결제 조건을 충족한 경우에만 변경할 수 있습니다.'
    case 'PARTNER_RECEIVED':
      return '협력업체 입고 후 검수 중은 협력업체 발송 상태에서만 변경할 수 있습니다.'
    case 'REPAIRING':
      return '수리 진행 중은 무상 서비스 판정 완료 이후 또는 유상 결제 완료 이후에만 변경할 수 있습니다.'
    case 'REPAIR_DONE':
      return '수리 완료는 수리 진행 중 상태에서만 변경할 수 있습니다.'
    case 'READY_TO_SHIP':
      return '출고 준비는 수리 완료 또는 반송 준비가 가능한 상태에서만 변경할 수 있습니다.'
    case 'SERVICE_DONE':
      return '서비스 완료는 배송 완료 또는 픽업 완료 이후에만 변경할 수 있습니다.'
    case 'CANCELED':
      return '취소는 수리 진행 중 이전까지만 가능합니다.'
    case 'PARTS_READY':
      return '부속품 준비 완료는 부속품 요청 건에서만 변경할 수 있습니다.'
    case 'PICKUP_COMPLETED':
      return '픽업 완료는 매장 도착(Pick-up) 상태에서만 변경할 수 있습니다.'
    default:
      return '해당 상태는 메뉴에서 직접 변경할 수 없습니다.'
  }
}

function isOutboundShipmentLocked(ticket: Ticket) {
  return Boolean(
    ticket.trackingNo ||
    ticket.shippedAt ||
    ticket.shipmentCompletedYn === 'Y' ||
    ticket.shipmentCompletedAt ||
    ticket.deliveryCompletedYn === 'Y' ||
    ticket.deliveredAt ||
    ['SHIPPING', 'SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(ticket.status),
  )
}

function getShipmentCompletedYn(ticket: Ticket) {
  if (ticket.shipmentCompletedYn) return ticket.shipmentCompletedYn
  return hasShipmentReadyStatus(ticket) ? 'Y' : 'N'
}

function getShipmentCompletedAt(ticket: Ticket) {
  if (ticket.shipmentCompletedAt) return ticket.shipmentCompletedAt
  if (!hasShipmentReadyStatus(ticket)) return null
  return ticket.shippedAt ?? ticket.expectedShipAt ?? null
}

function getDeliveryCompletedYn(ticket: Ticket) {
  if (ticket.deliveryCompletedYn) return ticket.deliveryCompletedYn
  return hasDeliveryCompletedStatus(ticket) ? 'Y' : 'N'
}

function getDeliveredAt(ticket: Ticket) {
  if (ticket.deliveredAt) return ticket.deliveredAt
  if (!hasDeliveryCompletedStatus(ticket)) return null
  return ticket.shippedAt
}

function getStorePickupCompletedYn(ticket: Ticket, receptionMethod: ReturnType<typeof getReceptionMethod>) {
  if (ticket.storePickupCompletedYn) return ticket.storePickupCompletedYn
  return receptionMethod === 'store' && hasDeliveryCompletedStatus(ticket) ? 'Y' : 'N'
}

function getStorePickupCompletedAt(ticket: Ticket, receptionMethod: ReturnType<typeof getReceptionMethod>) {
  if (ticket.storePickupCompletedAt) return ticket.storePickupCompletedAt
  if (getStorePickupCompletedYn(ticket, receptionMethod) !== 'Y') return null
  return ticket.shippedAt
}

function addBusinessDays(dateText: string, days: number) {
  const base = new Date(`${dateText.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(base.getTime())) return null
  let added = 0
  while (added < days) {
    base.setDate(base.getDate() + 1)
    const day = base.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return base.toISOString().slice(0, 10)
}

function isTotalCareTicketForSchedule(ticket: Ticket) {
  return normalizeRepairDetail(ticket.repairDetail) === '토탈케어'
    || splitTagText(ticket.symptom).includes('토탈 케어 요청')
    || TOTAL_CARE_FITTING_OPTIONS.some(option => option.value === ticket.careRequest)
}

function getUrgentTotalCareExpectedShipAt(ticket: Ticket, hqReceivedAt?: string | null) {
  if (getUrgentRepairYn(ticket) !== 'Y') return null
  if (!isTotalCareTicketForSchedule(ticket)) return null
  if (!hqReceivedAt) return null
  return addBusinessDays(hqReceivedAt, 5)
}

function getAutoOutboundTrackingNo(ticket: Ticket, normalizedShippingMethod: string) {
  const numericSeed = ticket.ticketNo.replace(/\D/g, '').slice(-12).padStart(12, '0')
  if (normalizedShippingMethod.includes('3PL')) return `WMS${numericSeed}`
  if (normalizedShippingMethod.includes('해외')) return `JD${numericSeed.padStart(14, '0')}`
  return numericSeed
}

function applyServiceUnavailableReturnPatch(ticket: Ticket, patch: Partial<Ticket>) {
  const nextRepairDetail = patch.repairDetail ?? ticket.repairDetail
  const projectedTicket = {
    ...ticket,
    ...patch,
    status: 'SERVICE_UNAVAILABLE' as TicketStatus,
    repairDetail: nextRepairDetail || '수리불가',
  }
  const receptionMethod = getReceptionMethod(projectedTicket)
  const shippingMethod = getAutoShippingMethod(projectedTicket, receptionMethod)
  const projectedWithShipping = { ...projectedTicket, shippingMethod }
  const normalizedShippingMethod = getNormalizedShippingMethod(projectedWithShipping, receptionMethod)
  const outboundCarrier = getOutboundCarrier(projectedWithShipping, normalizedShippingMethod)

  patch.status = 'SERVICE_UNAVAILABLE'
  patch.repairDetail = '수리불가'
  patch.repairChargeType = 'FREE'
  patch.repairCost = 0
  if (!ticket.judgementCompletedAt && !patch.judgementCompletedAt) {
    patch.judgementCompletedAt = nowLocalText()
  }
  patch.shippingMethod = normalizedShippingMethod
  if (outboundCarrier !== '-') patch.outboundCarrier = outboundCarrier
  if (!ticket.shipmentCompletedYn && !patch.shipmentCompletedYn) patch.shipmentCompletedYn = 'N'
  if (!ticket.deliveryCompletedYn && !patch.deliveryCompletedYn) patch.deliveryCompletedYn = 'N'
}

function applyOutboundStatusPatch(ticket: Ticket, nextStatus: TicketStatus, patch: Partial<Ticket>) {
  const today = nowLocalText().slice(0, 10)
  const baseProjectedTicket = { ...ticket, ...patch }
  const autoShippingMethod = getAutoShippingMethod(baseProjectedTicket)
  const projectedShippingMethod = !ticket.shippingMethod || !isManualShippingMethod(ticket.shippingMethod)
    ? patch.shippingMethod ?? autoShippingMethod
    : baseProjectedTicket.shippingMethod
  const projectedTicket = { ...baseProjectedTicket, shippingMethod: projectedShippingMethod }
  const projectedMethod = getNormalizedShippingMethod(projectedTicket, getReceptionMethod(projectedTicket))
  const shouldMarkShipmentReady = ['READY_TO_SHIP', 'SHIPPING', 'SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(nextStatus)
  const shouldMarkShipping = ['SHIPPING', 'SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(nextStatus)
  const shouldMarkDelivered = ['SHIPPED', 'SERVICE_DONE', 'CLOSED'].includes(nextStatus)

  if (!shouldMarkShipmentReady) return

  if (!ticket.shippingMethod || !isManualShippingMethod(ticket.shippingMethod)) {
    patch.shippingMethod = projectedMethod
  }
  patch.shipmentCompletedYn = 'Y'
  if (!ticket.shipmentCompletedAt && !patch.shipmentCompletedAt) {
    patch.shipmentCompletedAt = today
  }

  if (shouldMarkShipping) {
    const carrier = getOutboundCarrier(projectedTicket, projectedMethod)
    if (carrier !== '-' && !ticket.outboundCarrier && !patch.outboundCarrier) {
      patch.outboundCarrier = carrier
    }
    if (!ticket.trackingNo && !patch.trackingNo && !isManualShippingMethod(projectedMethod)) {
      patch.trackingNo = getAutoOutboundTrackingNo(projectedTicket, projectedMethod)
    }
  }

  if (shouldMarkDelivered) {
    patch.deliveryCompletedYn = 'Y'
    if (!ticket.deliveredAt && !patch.deliveredAt) {
      patch.deliveredAt = today
    }
  }

  if ((nextStatus === 'SERVICE_DONE' || nextStatus === 'CLOSED') && !isHomeDeliveryShipment(projectedTicket, projectedMethod)) {
    patch.storePickupCompletedYn = 'Y'
    if (!ticket.storePickupCompletedAt && !patch.storePickupCompletedAt) {
      patch.storePickupCompletedAt = today
    }
  }

  if (nextStatus === 'SHIPPING' && isOverseasStoreDropOff(projectedTicket) && !ticket.corporateShippedAt) {
    patch.corporateShippedAt = today
  }
}

function isGlobalTicket(ticket: Ticket) {
  if (isDomesticReceptionTicket(ticket)) return false
  return /Global|DHL|해외/i.test(`${ticket.receptionPlace} ${ticket.shippingMethod}`)
}

function getDefaultPickupCarrier(ticket: Ticket) {
  if (isStoreDropOff(ticket)) return isOverseasStoreDropOff(ticket) || shouldSkipTmsPickup(ticket) ? '-' : '성화기업'
  return isOverseasDestination(ticket) ? 'DHL' : 'CJ대한통운'
}

function parsePickupTrackingNo(ticket: Ticket, value?: string | null) {
  const raw = String(value ?? '').trim()
  const defaultCarrier = getDefaultPickupCarrier(ticket)
  if (!raw) return { carrier: defaultCarrier, trackingNo: '' }

  const carrierMatch = raw.match(/^(DHL|UPS|EMS|CJ대한통운|CJ|성화기업)\s*/i)
  if (!carrierMatch) return { carrier: defaultCarrier, trackingNo: raw }

  const matchedCarrier = carrierMatch[1].toLowerCase()
  const carrier = matchedCarrier.startsWith('dhl')
      ? 'DHL'
      : matchedCarrier.startsWith('ups')
        ? 'UPS'
        : matchedCarrier.startsWith('ems')
          ? 'EMS'
          : matchedCarrier.startsWith('cj')
            ? 'CJ대한통운'
            : '성화기업'
  return {
    carrier,
    trackingNo: raw.slice(carrierMatch[0].length).trim(),
  }
}

function shouldHavePickup(ticket: Ticket) {
  if (isPartsRequestTicket(ticket)) return false
  const receptionMethod = getReceptionMethod(ticket)
  return (
    ticket.reRepairYn === 'Y' ||
    receptionMethod === 'house' ||
    receptionMethod === 'store' ||
    ticket.status === 'PICKUP_WAITING' ||
    ticket.status === 'PRODUCT_MOVING' ||
    ticket.status === 'PICKUP_DONE'
  )
}

function getAutoPickupTrackingNo(ticket: Ticket, carrier = getDefaultPickupCarrier(ticket)) {
  if (carrier === '-') return ''
  const numericSeed = ticket.ticketNo.replace(/\D/g, '')
  if (carrier === 'DHL') {
    return `DHL JD${numericSeed.slice(-14).padStart(14, '0')}`
  }
  if (carrier === 'UPS') {
    return `UPS ${numericSeed.slice(-12).padStart(12, '0')}`
  }
  if (carrier === 'EMS') {
    return `EMS ${numericSeed.slice(-12).padStart(12, '0')}`
  }
  if (carrier === '성화기업') {
    return `성화기업 ${numericSeed.slice(-12).padStart(12, '0')}`
  }
  return `CJ대한통운 ${numericSeed.slice(-12).padStart(12, '0')}`
}

function getPickupTrackingInfo(ticket: Ticket) {
  if (!shouldHavePickup(ticket)) return null
  if ((isOverseasStoreDropOff(ticket) || shouldSkipTmsPickup(ticket)) && !ticket.pickupTrackingNo) {
    return { carrier: '-', trackingNo: '' }
  }
  if (ticket.pickupTrackingNo) return parsePickupTrackingNo(ticket, ticket.pickupTrackingNo)
  if (ticket.trackingNo) {
    return parsePickupTrackingNo(ticket, `${getDefaultPickupCarrier(ticket)} ${ticket.trackingNo}`)
  }
  return parsePickupTrackingNo(ticket, getAutoPickupTrackingNo(ticket))
}

function getPickupDeliveryStatus(ticket: Ticket, pickupTrackingNo?: string | null) {
  if (shouldSkipTmsPickup(ticket)) return 'TMS 제외'
  if (ticket.status === 'PICKUP_COMPLETED') return '픽업 완료'
  if (ticket.status === 'PICKUP_DONE' || ticket.hqReceivedAt) return '회수 완료'
  if (ticket.status === 'PICKUP_WAITING' || ticket.status === 'STORE_ARRIVED') return '픽업 요청'
  if (ticket.status === 'PRODUCT_MOVING') return '회수 중'
  if (pickupTrackingNo) return '픽업 완료'
  return '운송장 발급 전'
}

function getUrgentRepairYn(ticket: Ticket) {
  if (ticket.urgentRepairYn) return ticket.urgentRepairYn
  return ticket.reRepairYn === 'Y' || ticket.repairDetail.includes('제품교환') ? 'Y' : 'N'
}

function getPurchaseProofValue(ticket: Ticket): NonNullable<Ticket['purchaseProofType']> {
  if (ticket.purchaseProofType) return ticket.purchaseProofType
  return ticket.purchaseInfoSource === 'ORDER_HISTORY' ? 'MEMBERSHIP' : '-'
}

function isOrderHistoryPurchaseInfo(ticket: Ticket) {
  if (ticket.purchaseInfoSource) return ticket.purchaseInfoSource === 'ORDER_HISTORY'
  return ticket.purchaseProofType === 'MEMBERSHIP'
    && /온라인|online|my account/i.test(`${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`)
}

function getMockReceivingAddress(ticket: Ticket) {
  void ticket
  return '06028 / 대한민국 서울특별시 강남구 강남대로162길 24 2층'
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

function getOutboundDeliveryTypeLabel(ticket: Ticket, normalizedShippingMethod: string) {
  return isHomeDeliveryShipment(ticket, normalizedShippingMethod) ? '자택 수령' : '매장 픽업'
}

function formatOutboundDeliveryInfo(
  ticket: Ticket,
  normalizedShippingMethod: string,
  fallbackAddress?: {
    country?: string
    zipCode?: string
    city?: string
    address1?: string
    address2?: string
  }
) {
  if (!isHomeDeliveryShipment(ticket, normalizedShippingMethod)) {
    return ticket.receptionStoreName || findReceptionStore(ticket)?.name || ticket.receptionPlace || null
  }

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

function getMemberLabel(id?: string, name?: string, members: Member[] = MEMBERS) {
  const member = id ? members.find(item => item.id === id) : null
  const displayName = name || member?.name
  const loginId = member?.loginId || id
  if (!displayName) return null
  return `${displayName}${loginId ? `(${loginId})` : ''}`
}

function normalizeProductText(value?: string | null) {
  return String(value ?? '').replace(/\s/g, '').toLowerCase()
}

function getTicketProductSerialNumber(ticket: Ticket) {
  return ticket.productSerialNumber?.trim() || ticket.serialNumber?.trim() || ''
}

function findProductForTicket(ticket: Ticket, products: Product[]) {
  const ticketProductCode = ticket.productCode?.trim()
  if (ticketProductCode) {
    const productByCode = products.find(product => product.productCode === ticketProductCode)
    if (productByCode) return productByCode
  }

  const ticketSerialNumber = getTicketProductSerialNumber(ticket)
  if (ticketSerialNumber) {
    const productBySerial = products.find(product => (
      product.productCode === ticketSerialNumber || product.barcode === ticketSerialNumber
    ))
    if (productBySerial) return productBySerial
  }

  const ticketProductName = normalizeProductText(ticket.productName)
  return products.find(product => normalizeProductText(product.name) === ticketProductName)
    ?? products.find(product => ticketProductName.includes(normalizeProductText(product.name)))
    ?? products.find(product => normalizeProductText(product.name).includes(ticketProductName))
}

function getPsOfficeQuantity(product: Product) {
  return product.psQuantity ?? product.quantity
}

function getThreePlQuantity(product: Product) {
  return product.threePlQuantity ?? 0
}

function hasAvailableStock(product: Product) {
  return getPsOfficeQuantity(product) + getThreePlQuantity(product) >= 1
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
}

function ynLabel(value?: boolean) {
  return value ? 'Y' : 'N'
}

function normalizeRepairDetail(value?: string | null) {
  if (!value) return '-'
  if (value === '부품 교체') return '부품교체'
  if (value === '융접수리') return '용접수리'
  if (value === '토탈케어') return '토탈케어'
  if (value === '심플케어') return '심플리페어'
  if (value === '타제품 교환') return '타제품교환'
  if (value === '미입금발송') return '미입금반송'
  return value
}

function isNoRepairDetail(value?: string | null) {
  return normalizeRepairDetail(value) === '수리불가'
}

function isReplacementExchangeDetail(value?: string | null) {
  return normalizeRepairDetail(value) === '타제품교환'
}

function inferNoRepairReason(ticket: Ticket): Ticket['noRepairReason'] | null {
  if (ticket.noRepairReason) return ticket.noRepairReason

  const sourceText = [
    ticket.symptom,
    ticket.repairIssueTypeTags?.join(' '),
    ticket.repairReference,
    ticket.repairSpecialNote,
    ticket.consultationExceptionCategory,
    ticket.outboundType,
  ].filter(Boolean).join(' ')

  if (/가품|정품\s*아님|fake|counterfeit/i.test(sourceText)) return 'FAKE'
  if (/구매\s*증빙\s*불가|구매증빙불가|증빙\s*불가|구매\s*증빙\s*없|구매증빙없/i.test(sourceText)) {
    return 'PURCHASE_PROOF_UNAVAILABLE'
  }
  if (/제품\s*상태|제품상태|상태\s*문제|부품교체불가|복원불가|토탈케어불가/i.test(sourceText)) {
    return 'PRODUCT_CONDITION'
  }

  return null
}

function isFakeNoRepairTicket(ticket: Ticket) {
  return isNoRepairDetail(ticket.repairDetail) && inferNoRepairReason(ticket) === 'FAKE'
}

function isPartsRequestTicket(ticket: Ticket) {
  const sourceText = [
    ticket.symptom,
    ticket.repairDetail,
    normalizeRepairDetail(ticket.repairDetail),
    ticket.customerRequest,
    ticket.repairReference,
    ticket.repairSpecialNote,
  ].filter(Boolean).join(' ')

  return /부속품\s*요청|부품\s*요청|부속품\s*제공|부품\s*제공|부속품제공|부품제공/i.test(sourceText)
}

function getPartRequestItems(ticket: Ticket) {
  if (ticket.partRequestItems?.length) return ticket.partRequestItems

  const sourceText = ticket.customerRequest ?? ''
  const itemPatterns = [
    { name: '코패드 및 코패드 나사', pattern: /코패드(?:\s*및\s*코패드\s*나사)?\s*(\d+)?\s*쌍?/ },
    { name: '경첩 나사', pattern: /경첩\s*나사\s*(\d+)?\s*쌍?/ },
    { name: '고리 나사', pattern: /고리\s*나사\s*(\d+)?\s*쌍?/ },
  ]

  const items: TicketPartRequestItem[] = []

  itemPatterns.forEach(({ name, pattern }) => {
    const match = sourceText.match(pattern)
    if (!match) return

    const quantity = Number(match[1] ?? 1)
    items.push({
      id: `request-${name}`,
      partName: name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: '쌍',
    })
  })

  return items
}

function normalizeSymptom(value?: string | null) {
  if (!value) return null
  if (value === '토탈케어') return '토탈 케어 요청'
  if (value === '제품 파손 · 변형') return '제품 파손·변형'
  if (value === '제품 결함/이상') return '제품 결함·이상 확인요청'
  if (value === '제품 결함 이상 문의') return '제품 결함·이상 확인요청'
  if (value === '부품 교체') return '부속품 교체'
  if (value === '부품 문제') return '부속품 교체'
  return value
}

function splitTagText(value?: string | null) {
  if (!value) return []
  const normalizedValue = normalizeSymptom(value)
  if (normalizedValue && REPAIR_SYMPTOM_OPTIONS.includes(normalizedValue)) return [normalizedValue]
  return (normalizedValue ?? '')
    .split(',')
    .map(item => normalizeSymptom(item.trim()))
    .filter((item): item is string => Boolean(item))
}

function defaultRepairParts(ticket: Ticket) {
  const source = `${ticket.symptom ?? ''} ${ticket.productName}`
  const parts: string[] = []
  if (/렌즈|lens/i.test(source)) parts.push('렌즈(R)')
  if (/브릿지|충전|단자|bridge/i.test(source)) parts.push('브릿지')
  if (/템플|temple/i.test(source)) parts.push('템플(R)')
  if (/프론트|front/i.test(source) || parts.length === 0) parts.push('프론트')
  return parts
}

function defaultIssueTypes(ticket: Ticket) {
  const source = `${ticket.symptom ?? ''} ${ticket.repairDetail}`
  if (/스크래치|오염|케어/i.test(source)) return ['오염']
  if (/파손|변형|부품|교체/i.test(source)) return ['파손', '변형']
  if (/도금|변색/i.test(source)) return ['변색']
  if (/융접|용접|균열/i.test(source)) return ['균열']
  return []
}

function getLensType(ticket: Ticket) {
  if (ticket.lensType) return ticket.lensType
  if (/OPT|렌즈/i.test(ticket.productName)) return '별도로 제작한 렌즈'
  return '제품의 기존 렌즈'
}

function estimateRepairCost(detail: string, fallbackCost?: number | null) {
  const normalizedDetail = normalizeRepairDetail(detail)
  if (normalizedDetail === '도금수리' || normalizedDetail === '용접수리') return 30000
  if (normalizedDetail === '부품교체') return fallbackCost && fallbackCost > 0 ? fallbackCost : 45000
  return fallbackCost ?? 0
}

type PricingDecisionGuide = {
  method: string
  estimateLabel: string
  amount: number
  note?: string
}

function getPricingDecisionGuide({
  ticket,
  repairDetail,
  issueTypes,
  fallbackCost,
  isTotalCareTicket,
}: {
  ticket: Ticket
  repairDetail: string
  issueTypes: string[]
  fallbackCost?: number | null
  isTotalCareTicket: boolean
}): PricingDecisionGuide {
  const normalizedDetail = normalizeRepairDetail(repairDetail)
  const source = [
    ticket.symptom,
    normalizedDetail,
    ...issueTypes,
  ].filter(Boolean).join(' ')
  const currency = getDefaultRepairPricingCurrency(ticket)
  const urgentAmount = getRepairTypeFixedPrice('긴급', currency) ?? 0
  const urgentSuffix = ticket.urgentRepairYn === 'Y'
    ? ` + 긴급 서비스 ${formatRepairPricingMoney(urgentAmount, currency)}`
    : ''

  if (isTotalCareTicket || normalizedDetail === '토탈케어') {
    return {
      method: '클리닝·폴리싱·피팅',
      estimateLabel: `무상${urgentSuffix}`,
      amount: 0,
      note: ticket.urgentRepairYn === 'Y' ? '긴급 서비스 비용은 별도 합산됩니다.' : undefined,
    }
  }

  if (/제품\s*결함|결함|이상/.test(source)) {
    return {
      method: '판정 후 안내',
      estimateLabel: '점검 결과에 따라 안내드립니다',
      amount: fallbackCost ?? 0,
    }
  }

  if (normalizedDetail === '도금수리' || normalizedDetail === '용접수리') {
    const restorationAmount = getRepairTypeFixedPrice('도금', currency) ?? 0
    return {
      method: '복원 수리',
      estimateLabel: formatRepairPricingMoney(restorationAmount, currency),
      amount: restorationAmount,
    }
  }

  if (normalizedDetail === '장식수리' || /장식/.test(source)) {
    return {
      method: '장식 수리',
      estimateLabel: '무상',
      amount: 0,
    }
  }

  if (normalizedDetail === '부품제공' || /부품\s*요청|부품요청|부속품|코패드|나사/.test(source)) {
    return {
      method: '부품 교체',
      estimateLabel: '무상',
      amount: 0,
    }
  }

  if (normalizedDetail === '부품교체' || /파손|변형/.test(source)) {
    return {
      method: '부품 교체',
      estimateLabel: '소비자가의 20%',
      amount: estimateRepairCost(normalizedDetail, fallbackCost),
    }
  }

  const fallbackAmount = fallbackCost ?? 0
  return {
    method: normalizedDetail || '판정 후 안내',
    estimateLabel: fallbackAmount > 0 ? formatRepairPricingMoney(fallbackAmount, currency) : '점검 결과에 따라 안내드립니다',
    amount: fallbackAmount,
  }
}

const NO_REPAIR_RETURN_FLOW_LOCKED_STATUSES = new Set<TicketStatus>([
  'SERVICE_UNAVAILABLE',
  'READY_TO_SHIP',
  'SHIPPING',
  'SHIPPED',
  'PICKUP_COMPLETED',
  'SERVICE_DONE',
  'CLOSED',
  'CANCELED',
])

function shouldMoveNoRepairToJudgementDone(
  ticket: Ticket,
  nextRepairDetail: string,
  nextRepairChargeType?: Ticket['repairChargeType'],
  nextConsultationStatus?: string | null,
) {
  if (!isNoRepairDetail(nextRepairDetail)) return false
  if (!nextRepairChargeType) return false
  if (NO_REPAIR_RETURN_FLOW_LOCKED_STATUSES.has(ticket.status)) return false
  if (ticket.status === 'JUDGEMENT_PENDING' && nextConsultationStatus !== '상담완료') return false
  return true
}

type Tab = 'overview' | 'pricing' | 'kakao' | 'email' | 'history'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value || '-'}</dd>
    </div>
  )
}

function storeAddressText(store: Store) {
  return [store.address1, store.address2].filter(Boolean).join(' ') || store.country
}

function purchasePlaceSearchText(option: { value: string; label: string; meta?: string; code?: string }) {
  return [option.value, option.label, option.meta, option.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function PurchasePlaceSearchField({
  label,
  value,
  stores,
  onSave,
}: {
  label: string
  value?: string | null
  stores: Store[]
  onSave: (value: string) => void
}) {
  const normalizedValue = value ?? ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const options = [
    {
      value: 'GENTLE MONSTER 공식 온라인 스토어',
      label: 'GENTLE MONSTER 공식 온라인 스토어',
      meta: '온라인',
      code: 'ONLINE',
    },
    ...stores.map(store => ({
      value: store.name,
      label: store.name,
      meta: storeAddressText(store),
      code: store.code,
    })),
  ]
  const selectedOption = options.find(option => option.value === normalizedValue)
  const displayValue = selectedOption?.label ?? normalizedValue
  const filtered = searchedQuery.trim()
    ? options.filter(option => purchasePlaceSearchText(option).includes(searchedQuery.toLowerCase()))
    : []

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function handleScroll(event: Event) {
      if (dropdownRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(nextValue: string) {
    setOpen(false)
    setQuery('')
    setSearchedQuery('')
    if (nextValue !== normalizedValue) onSave(nextValue)
  }

  return (
    <div className="-m-1 rounded-lg p-1 transition-colors hover:bg-gray-50">
      <dt className="mb-0.5 text-[11px] font-medium text-gray-400">{label}</dt>
      <dd>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="group flex min-h-5 w-full items-center justify-between gap-2 text-left text-sm text-gray-800 underline-offset-4 decoration-dotted hover:text-gray-950 hover:underline"
          title="클릭하여 구매처 선택"
        >
          <span className="truncate">{displayValue || '-'}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform ${open ? 'rotate-180' : 'group-hover:text-gray-500'}`} />
        </button>
      </dd>
      {open && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]"
          style={{ top: dropdownRect.bottom + 6, left: dropdownRect.left, width: Math.max(dropdownRect.width, 420) }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') setSearchedQuery(query)
                    if (event.key === 'Escape') setOpen(false)
                  }}
                  placeholder="매장명, 거래처명, 코드, 주소 입력"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSearchedQuery('') }} className="text-gray-300 hover:text-gray-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchedQuery(query)}
                className="flex-shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                검색
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {!searchedQuery.trim() ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">구매처를 검색해 주세요.</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">조회 결과가 없습니다.</li>
            ) : (
              filtered.map(option => (
                <li key={`${option.code}-${option.value}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      option.value === normalizedValue ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{option.label}</span>
                      <span className="font-mono text-[11px] text-gray-400">{option.code}</span>
                    </div>
                    {option.meta ? <div className="mt-0.5 truncate text-xs text-gray-400">{option.meta}</div> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function productSearchText(product: Product) {
  return [product.name, product.productCode, product.barcode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function ProductSearchReceptionField({
  label,
  value,
  products,
  fallbackLabel,
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
  onSelect,
}: {
  label: string
  value?: string | null
  products: Product[]
  fallbackLabel?: string | null
  disabled?: boolean
  disabledReason?: string
  onSelect: (product: Product | null) => void
}) {
  const normalizedValue = value ?? ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedProduct = products.find(product => product.productCode === normalizedValue)
  const selectedLabel = selectedProduct
    ? `${selectedProduct.name} (${selectedProduct.productCode})`
    : fallbackLabel?.trim() ?? ''
  const filtered = searchedQuery.trim()
    ? products.filter(product => productSearchText(product).includes(searchedQuery.toLowerCase()))
    : []

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function handleScroll(event: Event) {
      if (dropdownRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (disabled) return
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClear(event: React.MouseEvent) {
    event.stopPropagation()
    if (disabled) return
    onSelect(null)
  }

  function handleSelect(product: Product) {
    if (disabled) return
    onSelect(product)
    setOpen(false)
    setQuery('')
    setSearchedQuery('')
  }

  return (
    <div className={`-m-1 rounded-lg p-1 transition-colors ${disabled ? '' : 'hover:bg-gray-50'}`}>
      <dt className="mb-0.5 text-[11px] font-medium text-gray-400">{label}</dt>
      <dd>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`group flex min-h-5 w-full items-center justify-between gap-2 text-left text-sm underline-offset-4 decoration-dotted ${
            disabled
              ? 'cursor-default text-gray-800'
              : 'text-gray-800 hover:text-gray-950 hover:underline'
          }`}
          title={disabled ? disabledReason : '클릭하여 제품 검색'}
        >
          <span className={`truncate ${selectedLabel ? 'text-gray-800' : 'text-gray-400'}`}>
            {selectedLabel || '제품 검색'}
          </span>
          <span className="flex flex-shrink-0 items-center gap-1">
            {selectedProduct && !disabled && (
              <span onClick={handleClear} className="rounded p-0.5 text-gray-300 transition-colors hover:text-gray-500">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            {!disabled && (
              <ChevronDown className={`h-3.5 w-3.5 text-gray-300 transition-transform ${open ? 'rotate-180' : 'group-hover:text-gray-500'}`} />
            )}
          </span>
        </button>
      </dd>
      {open && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]"
          style={{ top: dropdownRect.bottom + 6, left: dropdownRect.left, width: Math.max(dropdownRect.width, 420) }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') setSearchedQuery(query)
                    if (event.key === 'Escape') setOpen(false)
                  }}
                  placeholder="제품명, 코드, 바코드 입력"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSearchedQuery('') }} className="text-gray-300 hover:text-gray-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchedQuery(query)}
                className="flex-shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                검색
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {!searchedQuery.trim() ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">제품명 또는 코드를 입력 후 검색해 주세요.</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">조회 결과가 없습니다.</li>
            ) : (
              filtered.map(product => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      product.productCode === normalizedValue ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{product.name}</span>
                      <span className="font-mono text-[11px] text-gray-400">{product.productCode}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-gray-300">{product.barcode}</div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function StorePickerField({
  label,
  value,
  stores,
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
  onSave,
}: {
  label: string
  value?: string | null
  stores: Store[]
  disabled?: boolean
  disabledReason?: string
  onSave: (store: Store | null) => void
}) {
  const normalizedValue = value ?? ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedStore = stores.find(s => s.name === normalizedValue || s.code === normalizedValue)
  const displayValue = selectedStore?.name ?? normalizedValue
  const filtered = searchedQuery.trim()
    ? stores.filter(s =>
        purchasePlaceSearchText({ value: s.name, label: s.name, meta: storeAddressText(s), code: s.code })
          .includes(searchedQuery.toLowerCase())
      )
    : []

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    function handleScroll(event: Event) {
      if (dropdownRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (disabled) return
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClear(event: React.MouseEvent) {
    event.stopPropagation()
    if (disabled) return
    onSave(null)
  }

  function handleSelect(store: Store) {
    if (disabled) return
    onSave(store)
    setOpen(false)
    setQuery('')
    setSearchedQuery('')
  }

  return (
    <div className={`-m-1 rounded-lg p-1 transition-colors ${disabled ? '' : 'hover:bg-gray-50'}`}>
      <dt className="mb-0.5 text-[11px] font-medium text-gray-400">{label}</dt>
      <dd>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`group flex min-h-5 w-full items-center justify-between gap-2 text-left text-sm underline-offset-4 decoration-dotted ${
            disabled ? 'cursor-default text-gray-800' : 'text-gray-800 hover:text-gray-950 hover:underline'
          }`}
          title={disabled ? disabledReason : '클릭하여 매장 선택'}
        >
          <span className={`truncate ${displayValue ? 'text-gray-800' : 'text-gray-400'}`}>
            {displayValue || '매장 검색'}
          </span>
          <span className="flex flex-shrink-0 items-center gap-1">
            {selectedStore && !disabled && (
              <span onClick={handleClear} className="rounded p-0.5 text-gray-300 transition-colors hover:text-gray-500">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            {!disabled && (
              <ChevronDown className={`h-3.5 w-3.5 text-gray-300 transition-transform ${open ? 'rotate-180' : 'group-hover:text-gray-500'}`} />
            )}
          </span>
        </button>
      </dd>
      {open && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]"
          style={{ top: dropdownRect.bottom + 6, left: dropdownRect.left, width: Math.max(dropdownRect.width, 420) }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && query.trim().length >= 2) setSearchedQuery(query)
                    if (event.key === 'Escape') setOpen(false)
                  }}
                  placeholder="매장명, 코드, 주소 입력"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSearchedQuery('') }} className="text-gray-300 hover:text-gray-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { if (query.trim().length >= 2) setSearchedQuery(query) }}
                className="flex-shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                검색
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {!searchedQuery.trim() ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">2자 이상 입력 후 검색해 주세요.</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">조회 결과가 없습니다.</li>
            ) : (
              filtered.map(store => (
                <li key={store.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(store)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      store.name === normalizedValue || store.code === normalizedValue ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{store.name}</span>
                      <span className="font-mono text-[11px] text-gray-400">{store.code}</span>
                    </div>
                    {storeAddressText(store) ? (
                      <div className="mt-0.5 truncate text-xs text-gray-400">{storeAddressText(store)}</div>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function PartRequestItemsField({ ticket }: { ticket: Ticket }) {
  const items = getPartRequestItems(ticket)

  return (
    <div className="col-span-2">
      <dt className="mb-2 text-[11px] font-medium text-gray-400">신청 부품</dt>
      <dd>
        {items.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-3.5 py-3 text-sm ${index === 0 ? '' : 'border-t border-gray-100'}`}
              >
                <span className="font-medium text-gray-800">{item.partName}</span>
                <span className="shrink-0 text-gray-500">{item.quantity}{item.unit ?? '개'}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </dd>
    </div>
  )
}

function EditableReceptionField({
  label,
  value,
  type = 'text',
  options = [],
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
  onSave,
}: {
  label: string
  value?: string | null
  type?: 'text' | 'textarea' | 'date' | 'select'
  options?: EditableFieldOption[]
  disabled?: boolean
  disabledReason?: string
  onSave: (value: string) => void
}) {
  const normalizedValue = value ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(normalizedValue)
  const displayValue = type === 'select'
    ? options.find(option => option.value === normalizedValue)?.label ?? normalizedValue
    : normalizedValue

  useEffect(() => {
    if (!editing) setDraft(normalizedValue)
  }, [editing, normalizedValue])

  function startEditing() {
    if (disabled) return
    setDraft(normalizedValue)
    setEditing(true)
  }

  function cancelEditing() {
    setDraft(normalizedValue)
    setEditing(false)
  }

  function commitEditing(nextValue = draft) {
    const next = type === 'textarea' || type === 'text' ? nextValue.trim() : nextValue
    setEditing(false)
    if (next !== normalizedValue) onSave(next)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
      return
    }

    if (event.key === 'Enter' && type !== 'textarea') {
      event.preventDefault()
      commitEditing()
      return
    }

    if (event.key === 'Enter' && type === 'textarea' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commitEditing()
    }
  }

  return (
    <div className={`-m-1 rounded-lg p-1 transition-colors ${disabled ? '' : 'hover:bg-gray-50'}`}>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      {editing ? (
        type === 'textarea' ? (
          <textarea
            autoFocus
            value={draft}
            rows={3}
            onChange={event => setDraft(event.target.value)}
            onBlur={() => commitEditing()}
            onKeyDown={handleKeyDown}
            className="w-full resize-none rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-gray-500"
          />
        ) : type === 'select' ? (
          <select
            autoFocus
            value={draft}
            onChange={event => {
              setDraft(event.target.value)
              commitEditing(event.target.value)
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={handleKeyDown}
            className="h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 outline-none focus:border-gray-500"
          >
            {normalizedValue && !options.some(option => option.value === normalizedValue) && (
              <option value={normalizedValue} disabled hidden>{displayValue}</option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onBlur={() => commitEditing()}
            onKeyDown={handleKeyDown}
            className="h-8 w-full rounded-lg border border-gray-300 px-2 text-sm text-gray-800 outline-none focus:border-gray-500"
          />
        )
      ) : (
        <dd
          onDoubleClick={startEditing}
          title={disabled ? disabledReason : '더블클릭하여 수정'}
          className={`group inline-flex items-center gap-1 min-h-5 whitespace-pre-wrap text-sm text-gray-800 underline-offset-4 decoration-dotted ${
            disabled ? 'cursor-default' : 'cursor-text hover:text-gray-950 hover:underline'
          }`}
        >
          {displayValue || '-'}
          {!disabled && <Pencil className="w-3 h-3 text-gray-300 flex-shrink-0 opacity-100" />}
        </dd>
      )}
    </div>
  )
}

function EditableTagField({
  label,
  values,
  options,
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
  onChange,
}: {
  label: string
  values: string[]
  options: string[]
  disabled?: boolean
  disabledReason?: string
  onChange: (values: string[]) => void
}) {
  const [selectOpen, setSelectOpen] = useState(false)
  const availableOptions = options.filter(option => !values.includes(option))

  function removeTag(value: string) {
    if (disabled) return
    onChange(values.filter(item => item !== value))
  }

  function addTag(value: string) {
    if (disabled) return
    if (!value) return
    onChange([...values, value])
    setSelectOpen(false)
  }

  return (
    <div className={`-m-1 rounded-lg p-1 transition-colors ${disabled ? '' : 'hover:bg-gray-50'}`}>
      <dt className="text-[11px] font-medium text-gray-400 mb-1">{label}</dt>
      <dd
        className="min-h-7"
        onDoubleClick={() => {
          if (!disabled) setSelectOpen(true)
        }}
        title={disabled ? disabledReason : '더블클릭하여 추가'}
      >
        <div className="flex flex-wrap gap-1.5">
          {values.length > 0 ? values.map(value => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => removeTag(value)}
              className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 transition-colors ${
                disabled ? 'cursor-default' : 'hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              }`}
              title={disabled ? disabledReason : '클릭하여 제거'}
            >
              {value}
            </button>
          )) : (
            <span className="text-sm text-gray-400">-</span>
          )}
          {!disabled && !selectOpen && (
            <button
              type="button"
              onClick={() => setSelectOpen(true)}
              className="inline-flex h-6 items-center rounded-full border border-dashed border-gray-300 px-2 text-[11px] font-medium text-gray-400 hover:border-gray-500 hover:text-gray-700"
            >
              + 추가
            </button>
          )}
        </div>
        {selectOpen && (
          <select
            autoFocus
            defaultValue=""
            onChange={event => addTag(event.target.value)}
            onBlur={() => setSelectOpen(false)}
            className="mt-2 h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 outline-none focus:border-gray-500"
          >
            <option value="">선택</option>
            {availableOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </dd>
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  disabledReason?: string
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-1.5">{label}</dt>
      <dd>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onClick={() => onChange(!checked)}
          className={`inline-flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
            checked ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-gray-100'
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow-sm transition-transform ${
              checked ? 'translate-x-5 text-gray-900' : 'translate-x-0 text-gray-400'
            }`}
          >
            {checked ? 'Y' : 'N'}
          </span>
        </button>
      </dd>
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

function EditableMetaSelect({
  label,
  value,
  displayValue,
  options,
  onSave,
  valueClassName,
}: {
  label?: string
  value?: string | null
  displayValue: React.ReactNode
  options: EditableFieldOption[]
  onSave: (value: string) => void
  valueClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const normalizedValue = value ?? '-'
  const hasCurrentOption = options.some(option => option.value === normalizedValue)
  const selectValue = hasCurrentOption ? normalizedValue : ''

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {label && <span className="text-[11px] font-medium text-gray-400">{label}</span>}
      {editing ? (
        <select
          autoFocus
          value={selectValue}
          onChange={event => {
            setEditing(false)
            onSave(event.target.value)
          }}
          onBlur={() => setEditing(false)}
          className="h-7 min-w-[160px] rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 outline-none transition-colors focus:border-gray-500"
        >
          {!hasCurrentOption && (
            <option value="" disabled>변경할 상태 선택</option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <span
          role="button"
          tabIndex={0}
          title="더블클릭하여 변경"
          onDoubleClick={() => setEditing(true)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              setEditing(true)
            }
          }}
          className={`group inline-flex items-center gap-1 ${valueClassName ?? 'max-w-[220px] truncate text-xs font-semibold text-gray-800'} cursor-pointer outline-none`}
        >
          {displayValue}
          <Pencil className="w-3 h-3 text-gray-300 flex-shrink-0 opacity-100" />
        </span>
      )}
    </span>
  )
}

function SectionCard({
  title,
  children,
  editLabel = '수정',
  editable = false,
  onEdit,
}: {
  title: string
  children: React.ReactNode
  editLabel?: string
  editable?: boolean
  onEdit?: () => void
}) {
  return (
    <div className="break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:mb-4">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-50"
          >
            {editLabel}
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function parseMoneyText(value: string) {
  return Number(value.replace(/[^\d]/g, '')) || 0
}

function formatMoneyInputText(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('ko-KR')
}

function makePricingItemId() {
  return `pricing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function numberFromUnknown(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseMoneyText(value)
    return parsed > 0 ? parsed : null
  }
  return null
}

function getProductRetailPrice(ticket: Ticket, product?: Product | null) {
  const ticketSource = ticket as Ticket & Record<string, unknown>
  const productSource = product as (Product & Record<string, unknown>) | null | undefined
  const candidates = [
    ticket.productRetailPrice,
    ticketSource.consumerPrice,
    ticketSource.retailPrice,
    ticketSource.productPrice,
    productSource?.retailPrice,
    productSource?.consumerPrice,
    productSource?.price,
  ]

  for (const candidate of candidates) {
    const amount = numberFromUnknown(candidate)
    if (amount && amount > 0) return amount
  }

  return DEFAULT_PRODUCT_RETAIL_PRICE
}

function getProductOnlyRetailPrice(product?: Product | null) {
  const productSource = product as (Product & Record<string, unknown>) | null | undefined
  const candidates = [
    productSource?.retailPrice,
    productSource?.consumerPrice,
    productSource?.price,
  ]

  for (const candidate of candidates) {
    const amount = numberFromUnknown(candidate)
    if (amount && amount > 0) return amount
  }

  return DEFAULT_PRODUCT_RETAIL_PRICE
}

function getDefaultRepairPricingCurrency(ticket: Ticket) {
  const branch = BRANCHES.find(item => item.code === ticket.branchCode)
  if (ticket.repairPricingCurrency) return ticket.repairPricingCurrency
  if (branch?.currency) return branch.currency
  if (branch?.country === 'US') return 'USD'
  if (branch?.country === 'JP') return 'JPY'
  return 'KRW'
}

function formatRepairPricingMoney(amount: number, currency: string) {
  const normalizedCurrency = currency || 'KRW'
  const safeAmount = Number.isFinite(amount) ? amount : 0
  if (normalizedCurrency === 'KRW') return `${Math.round(safeAmount).toLocaleString('ko-KR')}원`
  return `${normalizedCurrency} ${safeAmount.toLocaleString('ko-KR')}`
}

function getRepairTypeFixedPrice(type: string, currency: string) {
  const normalizedCurrency = currency || 'KRW'
  return normalizedCurrency === 'KRW'
    ? KR_REPAIR_TYPE_FIXED_PRICE[type]
    : INT_REPAIR_TYPE_FIXED_PRICE[type]
}

const REPAIR_DECISION_LOCKED_FIELDS = new Set<keyof Ticket>([
  'repairDepartment',
  'repairDetail',
  'repairAgainReason',
  'replacementProductCode',
  'replacementProductName',
  'replacementProductRetailPrice',
])

const REPAIR_PAYMENT_LOCKED_FIELDS = new Set<keyof Ticket>([
  'repairTypeTags',
  'productRetailPrice',
  'repairPricingCurrency',
  'serviceChargeAmount',
  'repairOtherAmount',
  'pickupFreightAmount',
  'customsDutyAmount',
  'repairChargeType',
  'repairCost',
  'pricingItems',
  'externalPricingYn',
  'externalPricingVendor',
  'externalPricingCost',
  'externalPricingCheckedAt',
  'externalPricingMemo',
])

function isRepairPricingLocked(ticket: Ticket) {
  return Boolean(ticket.pricingItems?.length || ticket.repairChargeType)
}

function canSelectFreeRepairDecision(ticket: Ticket) {
  return !isOverseasTicket(ticket)
}

function getRepairChargeOptions(ticket: Ticket) {
  return REPAIR_CHARGE_OPTIONS.filter(option => option.value !== 'FREE' || canSelectFreeRepairDecision(ticket))
}

function inferRepairTypes(ticket: Ticket) {
  if (ticket.repairTypeTags?.length) return ticket.repairTypeTags

  const normalizedDetail = normalizeRepairDetail(ticket.repairDetail)
  const inferred: string[] = []
  if (normalizedDetail === '부품교체') inferred.push('교체')
  if (normalizedDetail === '도금수리') inferred.push('도금')
  if (normalizedDetail === '용접수리') inferred.push('용접')
  if (/복원/.test(normalizedDetail)) inferred.push('복원')
  if (ticket.urgentRepairYn === 'Y') inferred.push('긴급')

  return inferred
}

function shouldShowPickupFreightCharge(ticket: Ticket) {
  return getReceptionMethod(ticket) === 'house'
    && isOverseasDestination(ticket)
    && getDefaultPickupCarrier(ticket) === 'DHL'
}

function shouldShowCustomsDutyCharge(ticket: Ticket) {
  return isOverseasDestination(ticket)
}

type RepairPricingLine = {
  id: string
  label: string
  amount: number
  note?: string
  repairType?: string
  editable?: 'serviceCharge' | 'other' | 'pickupFreight' | 'customsDuty'
}

function buildDefaultPricingItems(ticket: Ticket, guide: PricingDecisionGuide): TicketPricingItem[] {
  if (ticket.pricingItems?.length) return ticket.pricingItems
  if (isPartsRequestTicket(ticket)) return []

  const currentChargeType = ticket.repairChargeType
  const defaultPrice = currentChargeType === 'FREE' ? 0 : (ticket.repairCost ?? guide.amount)
  const repairDetail = normalizeRepairDetail(ticket.repairDetail) || guide.method

  return [{
    id: makePricingItemId(),
    itemName: ticket.productName || '제품',
    repairDetail,
    price: Math.max(defaultPrice ?? 0, 0),
    note: null,
  }]
}

function PricingDecisionPanel({
  ticket,
  guide,
  currentChargeType,
  currentCost,
  disabled = false,
  disabledReason = '가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다.',
  onDecision,
}: {
  ticket: Ticket
  guide: PricingDecisionGuide
  currentChargeType?: Ticket['repairChargeType']
  currentCost: number
  disabled?: boolean
  disabledReason?: string
  onDecision: (
    chargeType: NonNullable<Ticket['repairChargeType']>,
    amount: number,
    items: TicketPricingItem[],
    externalPricingYn: 'Y' | 'N',
    externalQuote: Pick<Ticket, 'externalPricingVendor' | 'externalPricingCost' | 'externalPricingCheckedAt' | 'externalPricingMemo'>,
  ) => void
}) {
  const suggestedAmount = currentCost > 0 ? currentCost : guide.amount
  const currency = getDefaultRepairPricingCurrency(ticket)
  const [chargeType, setChargeType] = useState<NonNullable<Ticket['repairChargeType']> | ''>(currentChargeType ?? '')
  const [externalPricingYn, setExternalPricingYn] = useState<'Y' | 'N'>(
    ticket.externalPricingYn ?? (ticket.repairDepartment === '협력업체' ? 'Y' : 'N'),
  )
  const [externalPricingVendor, setExternalPricingVendor] = useState(ticket.externalPricingVendor ?? '')
  const [externalPricingCost, setExternalPricingCost] = useState(
    ticket.externalPricingCost ? ticket.externalPricingCost.toLocaleString('ko-KR') : '',
  )
  const [externalPricingCheckedAt, setExternalPricingCheckedAt] = useState(ticket.externalPricingCheckedAt ?? '')
  const [externalPricingMemo, setExternalPricingMemo] = useState(ticket.externalPricingMemo ?? '')
  const [items, setItems] = useState<TicketPricingItem[]>(() => buildDefaultPricingItems(ticket, guide))
  const repairChargeOptions = getRepairChargeOptions(ticket)
  const freeDecisionUnavailable = !canSelectFreeRepairDecision(ticket)
  const totalAmount = chargeType === 'FREE'
    ? 0
    : items.reduce((sum, item) => sum + Math.max(Number(item.price) || 0, 0), 0)

  useEffect(() => {
    setChargeType(currentChargeType ?? '')
    setExternalPricingYn(ticket.externalPricingYn ?? (ticket.repairDepartment === '협력업체' ? 'Y' : 'N'))
    setExternalPricingVendor(ticket.externalPricingVendor ?? '')
    setExternalPricingCost(ticket.externalPricingCost ? ticket.externalPricingCost.toLocaleString('ko-KR') : '')
    setExternalPricingCheckedAt(ticket.externalPricingCheckedAt ?? '')
    setExternalPricingMemo(ticket.externalPricingMemo ?? '')
    setItems(buildDefaultPricingItems(ticket, guide))
  }, [
    currentChargeType,
    ticket.ticketNo,
    ticket.externalPricingYn,
    ticket.externalPricingVendor,
    ticket.externalPricingCost,
    ticket.externalPricingCheckedAt,
    ticket.externalPricingMemo,
    ticket.repairDepartment,
    ticket.pricingItems,
    guide.method,
    guide.amount,
    suggestedAmount,
  ])

  function addPricingItem() {
    if (disabled) return
    setItems(currentItems => [
      ...currentItems,
      {
        id: makePricingItemId(),
        itemName: ticket.productName || '제품',
        repairDetail: normalizeRepairDetail(ticket.repairDetail) || guide.method,
        price: chargeType === 'FREE' ? 0 : suggestedAmount,
        note: null,
      },
    ])
  }

  function updatePricingItem(id: string, patch: Partial<TicketPricingItem>) {
    if (disabled) return
    setItems(currentItems => currentItems.map(item => (
      item.id === id ? { ...item, ...patch } : item
    )))
  }

  function removePricingItem(id: string) {
    if (disabled) return
    setItems(currentItems => currentItems.filter(item => item.id !== id))
  }

  function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    if (!chargeType) return
    const normalizedItems = items.map(item => ({
      id: item.id,
      itemName: item.itemName,
      repairDetail: item.repairDetail,
      price: chargeType === 'FREE' ? 0 : Math.max(Number(item.price) || 0, 0),
      note: item.note ?? null,
    }))
    onDecision(chargeType, totalAmount, normalizedItems, externalPricingYn, {
      externalPricingVendor: externalPricingYn === 'Y' ? externalPricingVendor.trim() || null : null,
      externalPricingCost: externalPricingYn === 'Y' ? parseMoneyText(externalPricingCost) : null,
      externalPricingCheckedAt: externalPricingYn === 'Y' ? externalPricingCheckedAt || null : null,
      externalPricingMemo: externalPricingYn === 'Y' ? externalPricingMemo.trim() || null : null,
    })
  }

  return (
    <div className="space-y-4">
      <SectionCard title="가격결정">
        <div className="space-y-5">
          <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <Field label="예상 수리 방식" value={guide.method} />
            <Field label="예상 비용" value={guide.estimateLabel} />
          </dl>

          <form onSubmit={submitDecision} className="space-y-4">
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900">가격 산정 방식</h4>
                  <p className="mt-1 text-[11px] leading-5 text-gray-400">내부 기준 또는 외부 견적 중 어떤 기준으로 금액을 산정했는지 선택합니다.</p>
                </div>
                <select
                  value={externalPricingYn}
                  disabled={disabled}
                  onChange={event => setExternalPricingYn(event.target.value === 'Y' ? 'Y' : 'N')}
                  className="h-9 min-w-[132px] rounded-xl border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="N">내부 기준</option>
                  <option value="Y">외부 견적</option>
                </select>
              </div>
              {externalPricingYn === 'Y' && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-gray-400">외부 업체</span>
                    <input
                      value={externalPricingVendor}
                      disabled={disabled}
                      onChange={event => setExternalPricingVendor(event.target.value)}
                      placeholder="협력업체명"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-gray-400">외부 견적 금액</span>
                    <input
                      value={externalPricingCost}
                      disabled={disabled}
                      onChange={event => setExternalPricingCost(event.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-right text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-gray-400">견적 확인일</span>
                    <input
                      type="date"
                      value={externalPricingCheckedAt}
                      disabled={disabled}
                      onChange={event => setExternalPricingCheckedAt(event.target.value)}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-gray-400">외부 견적 메모</span>
                    <input
                      value={externalPricingMemo}
                      disabled={disabled}
                      onChange={event => setExternalPricingMemo(event.target.value)}
                      placeholder="견적 기준 또는 확인 내용을 입력해 주세요."
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900">품목 가격결정</h4>
                  <p className="mt-1 text-[11px] leading-5 text-gray-400">수리 항목별 품목과 금액을 추가해서 합계 금액을 산정합니다.</p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={addPricingItem}
                  className="h-9 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                  title={disabled ? disabledReason : undefined}
                >
                  추가
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="grid grid-cols-[1.15fr_1.45fr_160px_72px] gap-0 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
                  <span>품목</span>
                  <span>수리 내용</span>
                  <span>품목 가격</span>
                  <span className="text-right">관리</span>
                </div>
                {items.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div key={item.id} className="grid grid-cols-[1.15fr_1.45fr_160px_72px] items-center gap-2 px-3 py-2">
                        <input
                          value={item.itemName}
                          disabled={disabled}
                          onChange={event => updatePricingItem(item.id, { itemName: event.target.value })}
                          placeholder="품목명"
                          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <input
                          value={item.repairDetail}
                          disabled={disabled}
                          onChange={event => updatePricingItem(item.id, { repairDetail: event.target.value })}
                          placeholder="수리 내용"
                          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <input
                          value={chargeType === 'FREE' ? '0' : (item.price > 0 ? item.price.toLocaleString('ko-KR') : '')}
                          onChange={event => updatePricingItem(item.id, { price: parseMoneyText(event.target.value) })}
                          disabled={disabled || chargeType === 'FREE'}
                          placeholder="0"
                          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-right text-xs text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removePricingItem(item.id)}
                          className="h-9 rounded-lg text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={disabled ? disabledReason : undefined}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">등록된 가격결정 품목이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-[minmax(0,1fr)_220px_180px] md:items-end">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-gray-400">수리비용 결정</span>
                <select
                  value={chargeType}
                  disabled={disabled}
                  onChange={event => {
                    const nextType = event.target.value as NonNullable<Ticket['repairChargeType']> | ''
                    setChargeType(nextType)
                    if (nextType === 'FREE') {
                      setItems(currentItems => currentItems.map(item => ({ ...item, price: 0 })))
                    }
                    if (nextType === 'PAID' && items.length === 0) {
                      addPricingItem()
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">선택</option>
                  {repairChargeOptions.filter(option => option.value !== '-').map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-medium text-gray-400">합계 수리 비용</span>
                <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900">
                  {formatRepairPricingMoney(totalAmount, currency)}
                </div>
              </div>
              <input
                type="submit"
                value={disabled ? '결정 완료' : '가격결정 완료'}
                disabled={disabled || !chargeType}
                title={disabled ? disabledReason : undefined}
                className="h-11 cursor-pointer rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              />
            </div>

            <p className="border-t border-gray-100 pt-4 text-sm leading-6 text-gray-500">
              실물 확인 후 최종 진행 내용이 결정되며, 비용과 소요 기간은 달라질 수 있습니다.
              {guide.note ? <span className="block">{guide.note}</span> : null}
              {freeDecisionUnavailable ? <span className="block">{INT_FREE_REPAIR_UNAVAILABLE_MESSAGE}</span> : null}
            </p>
          </form>
        </div>
      </SectionCard>
    </div>
  )
}

function RepairPricingInlinePanel({
  ticket,
  retailPrice,
  defaultCurrency,
  pricingProductName,
  showPickupFreight,
  showCustomsDuty,
  disabled = false,
  disabledReason = '수정할 수 없습니다.',
  onDecision,
  onInvalid,
}: {
  ticket: Ticket
  retailPrice: number
  defaultCurrency: string
  pricingProductName?: string
  showPickupFreight: boolean
  showCustomsDuty: boolean
  disabled?: boolean
  disabledReason?: string
  onDecision: (patch: Partial<Ticket>) => void
  onInvalid: (message: string) => void
}) {
  const initialRetailPrice = retailPrice
  const [repairTypes, setRepairTypes] = useState<string[]>(() => inferRepairTypes(ticket))
  const [retailPriceText, setRetailPriceText] = useState(initialRetailPrice.toLocaleString('ko-KR'))
  const [currency, setCurrency] = useState(ticket.repairPricingCurrency ?? defaultCurrency)
  const [chargeType, setChargeType] = useState<NonNullable<Ticket['repairChargeType']> | ''>(ticket.repairChargeType ?? '')
  const [serviceChargeText, setServiceChargeText] = useState(
    ticket.serviceChargeAmount ? ticket.serviceChargeAmount.toLocaleString('ko-KR') : '',
  )
  const [otherAmountText, setOtherAmountText] = useState(
    ticket.repairOtherAmount ? ticket.repairOtherAmount.toLocaleString('ko-KR') : '',
  )
  const [pickupFreightText, setPickupFreightText] = useState(
    ticket.pickupFreightAmount ? ticket.pickupFreightAmount.toLocaleString('ko-KR') : '',
  )
  const [customsDutyText, setCustomsDutyText] = useState(
    (ticket.customsDutyAmount ?? Math.round(initialRetailPrice * 0.1)).toLocaleString('ko-KR'),
  )
  const [lineAmountTexts, setLineAmountTexts] = useState<Record<string, string>>({})
  const [customsDutyEdited, setCustomsDutyEdited] = useState(Boolean(ticket.customsDutyAmount))

  useEffect(() => {
    const nextRetailPrice = retailPrice
    setRepairTypes(inferRepairTypes(ticket))
    setRetailPriceText(nextRetailPrice.toLocaleString('ko-KR'))
    setCurrency(ticket.repairPricingCurrency ?? defaultCurrency)
    setChargeType(ticket.repairChargeType ?? '')
    setServiceChargeText(ticket.serviceChargeAmount ? ticket.serviceChargeAmount.toLocaleString('ko-KR') : '')
    setOtherAmountText(ticket.repairOtherAmount ? ticket.repairOtherAmount.toLocaleString('ko-KR') : '')
    setPickupFreightText(ticket.pickupFreightAmount ? ticket.pickupFreightAmount.toLocaleString('ko-KR') : '')
    setCustomsDutyText((ticket.customsDutyAmount ?? Math.round(nextRetailPrice * 0.1)).toLocaleString('ko-KR'))
    setLineAmountTexts({})
    setCustomsDutyEdited(Boolean(ticket.customsDutyAmount))
  }, [
    ticket.ticketNo,
    ticket.repairTypeTags,
    ticket.productRetailPrice,
    ticket.repairPricingCurrency,
    ticket.repairChargeType,
    ticket.serviceChargeAmount,
    ticket.repairOtherAmount,
    ticket.pickupFreightAmount,
    ticket.customsDutyAmount,
    retailPrice,
    defaultCurrency,
  ])

  const parsedRetailPrice = parseMoneyText(retailPriceText)
  const defaultCustomsDutyAmount = Math.round(parsedRetailPrice * 0.1)
  const serviceChargeAmount = getLineAmount('repair-type-서비스 청구', parseMoneyText(serviceChargeText), '서비스 청구')
  const otherAmount = getLineAmount('repair-type-기타', parseMoneyText(otherAmountText), '기타')
  const pickupFreightAmount = getLineAmount('pickup-freight', parseMoneyText(pickupFreightText), '픽업회수')
  const customsDutyAmount = getLineAmount('customs-duty', parseMoneyText(customsDutyText), '관부가세')
  const repairChargeOptions = getRepairChargeOptions(ticket)
  const freeDecisionUnavailable = !canSelectFreeRepairDecision(ticket)
  const lines: RepairPricingLine[] = []

  useEffect(() => {
    if (!showCustomsDuty || customsDutyEdited) return
    setCustomsDutyText(defaultCustomsDutyAmount.toLocaleString('ko-KR'))
  }, [customsDutyEdited, defaultCustomsDutyAmount, showCustomsDuty])

  repairTypes.forEach(type => {
    const id = `repair-type-${type}`
    if (type === '교체') {
      const defaultAmount = Math.round(parsedRetailPrice * 0.2)
      lines.push({
        id,
        label: type,
        amount: getLineAmount(id, defaultAmount, type),
        note: '소비자가의 20%',
        repairType: type,
      })
      return
    }

    if (type === '서비스 청구') {
      lines.push({
        id,
        label: type,
        amount: serviceChargeAmount,
        note: '직접 입력',
        repairType: type,
        editable: 'serviceCharge',
      })
      return
    }

    if (type === '기타') {
      lines.push({
        id,
        label: type,
        amount: otherAmount,
        note: '직접 입력',
        repairType: type,
        editable: 'other',
      })
      return
    }

    const fixedPrice = getRepairTypeFixedPrice(type, currency)
    lines.push({
      id,
      label: type,
      amount: getLineAmount(id, fixedPrice ?? 0, type),
      note: fixedPrice ? (currency === 'KRW' ? '기본 금액' : 'INT 기본 금액') : undefined,
      repairType: type,
    })
  })

  if (showPickupFreight) {
    lines.push({
      id: 'pickup-freight',
      label: '픽업 발생 운송비',
      amount: pickupFreightAmount,
      note: 'TMS 자동 수신 예정',
      editable: 'pickupFreight',
    })
  }

  if (showCustomsDuty) {
    lines.push({
      id: 'customs-duty',
      label: '관부가세',
      amount: customsDutyAmount,
      note: '제품가격 기준 10%, 수정 가능',
      editable: 'customsDuty',
    })
  }

  const pricedLines = chargeType === 'FREE'
    ? lines.map(line => ({ ...line, amount: 0, editable: undefined }))
    : lines
  const totalAmount = chargeType === 'FREE'
    ? 0
    : pricedLines.reduce((sum, line) => sum + Math.max(line.amount, 0), 0)

  function removeRepairType(type: string) {
    if (disabled) return
    setRepairTypes(current => current.filter(item => item !== type))
    setLineAmountTexts(current => {
      const next = { ...current }
      delete next[`repair-type-${type}`]
      return next
    })
  }

  function getSavedLineAmount(lineId: string, label: string) {
    const savedItem = ticket.pricingItems?.find(item => item.id === lineId || item.repairDetail === label)
    return typeof savedItem?.price === 'number' ? savedItem.price : null
  }

  function getLineAmount(lineId: string, fallbackAmount: number, label: string) {
    if (Object.prototype.hasOwnProperty.call(lineAmountTexts, lineId)) {
      return parseMoneyText(lineAmountTexts[lineId])
    }
    const savedAmount = getSavedLineAmount(lineId, label)
    if (savedAmount !== null) return savedAmount
    return fallbackAmount
  }

  function getLineAmountText(line: RepairPricingLine) {
    if (Object.prototype.hasOwnProperty.call(lineAmountTexts, line.id)) {
      return lineAmountTexts[line.id]
    }
    return line.amount > 0 ? line.amount.toLocaleString('ko-KR') : ''
  }

  function updateLineAmount(line: RepairPricingLine, nextValue: string) {
    if (line.id === 'customs-duty') setCustomsDutyEdited(true)
    setLineAmountTexts(current => ({
      ...current,
      [line.id]: formatMoneyInputText(nextValue),
    }))
  }

  function renderAmountInput(line: RepairPricingLine) {
    if (disabled || chargeType === 'FREE') {
      return (
        <span className="text-xs font-semibold text-gray-900">
          {formatRepairPricingMoney(line.amount, currency)}
        </span>
      )
    }

    return (
      <input
        value={getLineAmountText(line)}
        onChange={event => updateLineAmount(line, event.target.value)}
        inputMode="numeric"
        placeholder="0"
        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2.5 text-right text-xs font-semibold text-gray-900 outline-none transition-colors focus:border-gray-500"
      />
    )
  }

  function handleChargeTypeSelect(nextType: NonNullable<Ticket['repairChargeType']>) {
    if (disabled) {
      onInvalid(disabledReason)
      return
    }
    if (nextType === 'FREE' && freeDecisionUnavailable) {
      onInvalid(INT_FREE_REPAIR_UNAVAILABLE_MESSAGE)
      return
    }
    setChargeType(nextType)
  }

  function submitDecision() {
    if (disabled) {
      onInvalid(disabledReason)
      return
    }
    if (!chargeType) {
      onInvalid('유/무상 판정을 선택해 주세요.')
      return
    }
    if (chargeType === 'FREE' && freeDecisionUnavailable) {
      onInvalid(INT_FREE_REPAIR_UNAVAILABLE_MESSAGE)
      return
    }
    if (chargeType === 'PAID' && repairTypes.length === 0) {
      onInvalid('수리유형을 추가해 주세요.')
      return
    }
    if (chargeType === 'PAID' && totalAmount <= 0) {
      onInvalid('수리 항목별 가격을 확인해 주세요.')
      return
    }

    const pricingItems: TicketPricingItem[] = chargeType === 'FREE' ? [] : pricedLines.map(line => ({
      id: line.id,
      itemName: pricingProductName || ticket.productName || '제품',
      repairDetail: line.label,
      price: Math.max(line.amount, 0),
      externalPricingYn: 'N',
      note: line.note ?? null,
    }))

    onDecision({
      repairTypeTags: repairTypes,
      productRetailPrice: parsedRetailPrice,
      repairPricingCurrency: currency,
      serviceChargeAmount: chargeType === 'PAID' && repairTypes.includes('서비스 청구') ? serviceChargeAmount : null,
      repairOtherAmount: chargeType === 'PAID' && repairTypes.includes('기타') ? otherAmount : null,
      pickupFreightAmount: chargeType === 'PAID' && showPickupFreight ? pickupFreightAmount : null,
      customsDutyAmount: chargeType === 'PAID' && showCustomsDuty ? customsDutyAmount : null,
      repairChargeType: chargeType,
      repairCost: totalAmount,
      pricingItems,
      externalPricingYn: 'N',
      externalPricingVendor: null,
      externalPricingCost: null,
      externalPricingCheckedAt: null,
      externalPricingMemo: null,
    })
  }

  return (
    <div className="col-span-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
        <div>
          <p className="text-[10px] font-medium text-gray-400">수리비용 결정</p>
          <p className="mt-0.5 text-xs font-semibold text-gray-900">
            {chargeType === 'PAID' ? '유상' : chargeType === 'FREE' ? '무상' : '선택'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {repairChargeOptions.filter(option => option.value !== '-').map(option => {
            const selected = chargeType === option.value
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => handleChargeTypeSelect(option.value as NonNullable<Ticket['repairChargeType']>)}
                className={`h-7 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                  selected
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      {freeDecisionUnavailable ? (
        <p className="mb-3 text-[11px] leading-5 text-gray-400">{INT_FREE_REPAIR_UNAVAILABLE_MESSAGE}</p>
      ) : null}

      {chargeType === 'PAID' ? (
        <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <EditableTagField
              label="수리유형"
              values={repairTypes}
              options={REPAIR_TYPE_OPTIONS}
              disabled={disabled}
              disabledReason={disabledReason}
              onChange={setRepairTypes}
            />
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">소비자가</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-900">
                      {formatRepairPricingMoney(parsedRetailPrice, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">통화</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-900">{currency}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100 bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_132px_28px] border-b border-gray-100 bg-gray-50/70 px-3 py-1.5 text-[10px] font-semibold text-gray-500">
              <span>수리 항목</span>
              <span className="text-right">가격</span>
              <span />
            </div>
            {lines.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pricedLines.map(line => (
                  <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_132px_28px] items-center gap-3 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{line.label}</p>
                    </div>
                    <div className="text-right">
                      {renderAmountInput(line)}
                    </div>
                    <div className="flex justify-end">
                      {line.repairType ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeRepairType(line.repairType!)}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold text-gray-300 transition-colors ${
                            disabled ? 'cursor-default opacity-40' : 'hover:bg-red-50 hover:text-red-500'
                          }`}
                          title={disabled ? disabledReason : '수리항목 제외'}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-center text-[11px] text-gray-400">수리유형을 추가하면 항목별 가격이 표시됩니다.</p>
            )}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-3 py-2">
              <span className="text-[11px] font-semibold text-gray-500">총합</span>
              <span className="text-sm font-semibold text-gray-950">{formatRepairPricingMoney(totalAmount, currency)}</span>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={submitDecision}
              className="h-8 rounded-lg bg-gray-950 px-4 text-[11px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              title={disabled ? disabledReason : undefined}
            >
              {disabled ? '결정 완료' : '결정'}
            </button>
          </div>
        </>
      ) : chargeType === 'FREE' ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-900">무상</p>
              <p className="mt-1 text-[11px] text-gray-400">수리 비용 0원으로 판정합니다.</p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={submitDecision}
              className="h-8 rounded-lg bg-gray-950 px-4 text-[11px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              title={disabled ? disabledReason : undefined}
            >
              {disabled ? '결정 완료' : '결정'}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-[11px] text-gray-400">
          유상을 선택하면 가격결정 항목이 표시됩니다.
        </p>
      )}
    </div>
  )
}

function formatKstTimestamp(value: string) {
  if (!value) return '-'
  const normalized = value
    .replace('T', ' ')
    .replace(/\.\d+Z?$/, '')
    .replace(/Z$/, '')

  return /\(KST\)$/i.test(normalized) ? normalized : `${normalized} (KST)`
}

const CHANGE_LOG_PAGE_SIZE = 20

function ChangeHistoryPanel({ logs }: { logs: TicketChangeLog[] }) {
  const [page, setPage] = useState(1)
  const paginated = logs.slice((page - 1) * CHANGE_LOG_PAGE_SIZE, page * CHANGE_LOG_PAGE_SIZE)

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
        <History className="mx-auto mb-3 h-6 w-6 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">변경 이력이 없습니다.</p>
        <p className="mt-1 text-xs text-gray-400">상세 화면에서 값을 변경하면 이곳에 기록됩니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <h3 className="text-xs font-semibold text-gray-700">변경이력</h3>
        <span className="text-[11px] font-medium text-gray-400">{logs.length.toLocaleString('ko-KR')}건</span>
      </div>
      <div className="divide-y divide-gray-100">
        {paginated.map(log => {
          const meta = TICKET_CHANGE_SECTION_META[log.changeType ?? 'SYSTEM']
          return (
            <div key={log.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[160px_minmax(0,1fr)_190px]">
              <div className="min-w-0">
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                  {meta.label}
                </span>
                <p className="mt-2 font-mono text-[11px] text-gray-400">{formatKstTimestamp(log.changedAt)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900">{log.fieldLabel}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] md:items-start">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-medium text-gray-400">변경 전</p>
                    <p className="min-w-0 whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs leading-5 text-gray-500">
                      {log.beforeValue || '-'}
                    </p>
                  </div>
                  <span className="hidden pt-6 text-center text-gray-300 md:block">→</span>
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-medium text-blue-500">변경 후</p>
                    <p className="min-w-0 whitespace-pre-wrap break-words rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs font-semibold leading-5 text-gray-800">
                      {log.afterValue || '-'}
                    </p>
                  </div>
                </div>
                {(log.memo || log.channel) && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    {[log.channel, log.memo].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400 xl:text-right">
                <p className="font-medium text-gray-600">{log.changedByName}</p>
                <p className="mt-1">{log.changedByLoginId}</p>
              </div>
            </div>
          )
        })}
      </div>
      <Pagination total={logs.length} perPage={CHANGE_LOG_PAGE_SIZE} current={page} onChange={setPage} />
    </div>
  )
}

function isOverseasTicket(ticket: Ticket) {
  if (ticket.reexportCondition === 'Y') return true
  if (isDomesticReceptionTicket(ticket)) return false
  const channelText = `${ticket.branchCode} ${ticket.receptionPlace} ${ticket.shippingMethod}`
  return /해외|DHL|Global/i.test(channelText)
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

function dateInputValue(value?: string | null) {
  return String(value ?? '').slice(0, 10)
}

function mergeDateWithExistingTime(nextDate: string, currentValue?: string | null) {
  if (!nextDate) return null
  const currentTime = String(currentValue ?? '').match(/\d{2}:\d{2}(?::\d{2})?/)?.[0]
  return `${nextDate} ${currentTime ?? '00:00:00'}`
}

function getTemplateCode(template: MessageTemplate) {
  return template.title.match(/^([A-Z]+_\d+)/)?.[1] ?? ''
}

function getTemplateMetaText(template: MessageTemplate, includeKind = false) {
  return [
    getTemplateCode(template),
    template.source,
    template.locale,
    template.stage,
    includeKind ? TEMPLATE_KIND_LABEL[template.kind] : '',
  ].filter(Boolean).join(' · ')
}

function getEmailTemplateSource(ticket: Ticket) {
  const branch = BRANCHES.find(item => item.code === ticket.branchCode)
  const sourceText = [
    ticket.branchCode,
    branch?.name,
    branch?.country,
    ticket.receptionPlace,
    ticket.receptionTitle,
    ticket.deliveryCountry,
  ].filter(Boolean).join(' ')
  const normalized = sourceText.toUpperCase()

  if (/\bJP\b|JAPAN|일본/.test(normalized)) return 'JP'
  if (isOverseasTicket(ticket)) return 'HQ INT'
  return 'HQ KR'
}

function getTemplateSearchText(template: MessageTemplate) {
  return [
    template.title,
    template.stage,
    template.source,
    template.locale,
    template.body,
    template.conditions,
    template.note,
  ].filter(Boolean).join(' ')
}

function scoreNoRepairTemplate(ticket: Ticket, template: MessageTemplate) {
  if (!isNoRepairDetail(ticket.repairDetail)) return 0
  if (template.stage !== '판정') return 0

  const text = getTemplateSearchText(template)
  if (!/수리\s*불가|수리불가/i.test(text)) return 0

  const mentionsFake = /가품|fake|counterfeit/i.test(text)
  const mentionsPurchaseProof = /구매\s*증빙|구매증빙/i.test(text)
  const mentionsProductCondition = /제품\s*상태|제품상태/i.test(text)
  const isGenericNoRepair = /수리불가_안내|수리\s*불가\s*안내/i.test(text)

  if (isFakeNoRepairTicket(ticket)) {
    return mentionsFake ? 500 : 50
  }

  if (mentionsFake) return -50
  if (isGenericNoRepair) return 500
  if (mentionsPurchaseProof || mentionsProductCondition) return 80
  return 120
}

function sortTemplatesForTicket(ticket: Ticket, templates: MessageTemplate[]) {
  return [...templates].sort((a, b) => {
    const scoreDiff = scoreNoRepairTemplate(ticket, b) - scoreNoRepairTemplate(ticket, a)
    if (scoreDiff !== 0) return scoreDiff
    return a.title.localeCompare(b.title)
  })
}

function getRecommendedTemplateId(ticket: Ticket, templates: MessageTemplate[]) {
  const recommended = templates
    .map(template => ({ template, score: scoreNoRepairTemplate(ticket, template) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]

  return recommended?.template.id ?? ''
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
  const emailTemplateSource = channel === 'email' ? getEmailTemplateSource(ticket) : null
  const templates = sortTemplatesForTicket(ticket, MESSAGE_TEMPLATES.filter(template => (
    template.channel === channel &&
    (!emailTemplateSource || template.source === emailTemplateSource)
  )))
  const filteredTemplates = templates.filter(template => {
    const keyword = templateQuery.trim().toLowerCase()
    if (!keyword) return true
    return (
      template.id.toLowerCase().includes(keyword) ||
      template.title.toLowerCase().includes(keyword) ||
      template.stage.toLowerCase().includes(keyword) ||
      template.source.toLowerCase().includes(keyword) ||
      template.locale.toLowerCase().includes(keyword) ||
      TEMPLATE_KIND_LABEL[template.kind].includes(keyword) ||
      template.body.toLowerCase().includes(keyword) ||
      template.variables?.toLowerCase().includes(keyword) ||
      template.buttons?.toLowerCase().includes(keyword) ||
      template.buttonLink?.toLowerCase().includes(keyword) ||
      template.sendAt?.toLowerCase().includes(keyword) ||
      template.conditions?.toLowerCase().includes(keyword) ||
      template.note?.toLowerCase().includes(keyword)
    )
  })
  const effectiveSelectedTemplateId = selectedTemplateId || getRecommendedTemplateId(ticket, templates)
  const selectedTemplate = templates.find(template => template.id === effectiveSelectedTemplateId)
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
                    {getTemplateMetaText(selectedTemplate, true)}
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
                        effectiveSelectedTemplateId === template.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-800">{template.title}</span>
                        <span className="mt-0.5 block text-xs text-gray-400">
                          {getTemplateMetaText(template)}
                        </span>
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
  const [stockRequestModalOpen, setStockRequestModalOpen] = useState(false)
  const [selectedStockRequestReason, setSelectedStockRequestReason] = useState<StockRequestReason>('긴급 건')
  const [stockRequestCreated, setStockRequestCreated] = useState(false)
  const [componentReturnModalOpen, setComponentReturnModalOpen] = useState(false)
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType>('NONE')
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [componentReturnCreated, setComponentReturnCreated] = useState(false)
  const [, setTicketRevision] = useState(0)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const purchaseProofInputRef = useRef<HTMLInputElement>(null)
  const customerNoticeImageInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<number | null>(null)
  const { parts } = useParts()
  const { members } = useMembers()
  const ticket = getTicketsWithExtras().find(t => t.ticketNo === ticketNo)
  const autoPrintRequested = (location.state as { autoPrintBarcodeOnce?: boolean } | null)?.autoPrintBarcodeOnce === true
  const suppressAutoPrintBarcode = ticket ? isPartsRequestTicket(ticket) : false
  const onlineAutoPrintRequested = ticket ? isOnlineAutoCreatedTicket(ticket) && !suppressAutoPrintBarcode : false
  const shouldAutoPrintBarcode = !suppressAutoPrintBarcode && (autoPrintRequested || onlineAutoPrintRequested)

  useEffect(() => {
    if (!autoPrintRequested || !suppressAutoPrintBarcode) return
    navigate(location.pathname, { replace: true, state: null })
  }, [autoPrintRequested, location.pathname, navigate, suppressAutoPrintBarcode])

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
    addPrivacyLog({ adminName: '한혜지', adminId: 'monster563', subjectType: '티켓', subjectNo: ticketNo, actionType: '조회', processedFields: ['티켓 전체정보'], ip: '10.0.1.42', reason: '티켓 정보 조회', status: '완료' })
  }, [ticketNo])

  useEffect(() => {
    if (!ticketNo) return
    setComponentReturnCreated(getComponentReturns().some(record => record.sourceTicketNo === ticketNo))
    setStockRequestCreated(getStockRequests().some(record => record.ticketNo === ticketNo && record.status !== 'CANCELED'))
  }, [ticketNo])

  useEffect(() => {
    if (!ticket) return
    const hasConsultationRequest = ticket.consultationRequestedYn === 'Y' || normalizeOutboundTypeValue(ticket.outboundType) !== '-'
    const consultationCompleted = normalizeConsultationStatusValue(ticket.consultationStatus) === '상담완료'
    const terminalStatus = NO_REPAIR_RETURN_FLOW_LOCKED_STATUSES.has(ticket.status)
    const noRepairJudgementDone = isNoRepairDetail(ticket.repairDetail) && ticket.status === 'JUDGEMENT_DONE'
    if (hasConsultationRequest && !consultationCompleted && ticket.status !== 'JUDGEMENT_PENDING' && !terminalStatus && !noRepairJudgementDone) {
      updatePrototypeTicket(ticket.ticketNo, { status: 'JUDGEMENT_PENDING' })
      appendTicketChangeLog({
        ticketNo: ticket.ticketNo,
        changeType: 'SYSTEM',
        fieldKey: 'status',
        fieldLabel: '티켓 상태',
        beforeValue: STATUS_META[ticket.status].label,
        afterValue: STATUS_META.JUDGEMENT_PENDING.label,
        channel: '관리자 화면',
        memo: '상담 요청 상태 자동 동기화',
        changedById: CURRENT_ADMIN_MEMBER?.id,
        changedByName: CURRENT_ADMIN_MEMBER?.name ?? '한혜지',
        changedByLoginId: CURRENT_ADMIN_MEMBER?.loginId ?? 'monster563',
        changedByRoleId: CURRENT_ADMIN_MEMBER?.roleId,
      })
      setTicketRevision(revision => revision + 1)
    }
  }, [ticket?.consultationRequestedYn, ticket?.consultationStatus, ticket?.outboundType, ticket?.repairDetail, ticket?.status, ticket?.ticketNo])

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

  const currentTicket = ticket
  const statusMeta = STATUS_META[ticket.status]
  const isPartsRequest = isPartsRequestTicket(ticket)
  const ticketStatusOptions = TICKET_STATUS_OPTIONS
  const soInfo = getSoDocumentInfo(ticket)
  const branchLabel = BRANCHES.find(b => b.code === ticket.branchCode)?.name ?? ticket.branchCode
  const technicianOptionMembers = [
    ...members.filter(member => member.isTechnician && member.status === 'active'),
    ...[ticket.technicianId, ticket.judgementManagerId]
      .map(memberId => members.find(member => member.id === memberId))
      .filter((member): member is Member => Boolean(member)),
  ].filter((member, index, list) => list.findIndex(item => item.id === member.id) === index)
  const technicianMemberOptions: EditableFieldOption[] = [
    { value: '-', label: '-' },
    ...technicianOptionMembers.map(member => ({
      value: member.id,
      label: getMemberLabel(member.id, member.name, members) ?? member.name,
    })),
  ]
  const consultationManagerOptions: EditableFieldOption[] = [
    { value: '', label: '-' },
    ...technicianOptionMembers.map(member => {
      const label = `${member.name}(${member.loginId})`
      return { value: label, label }
    }),
  ]
  const technicianLabel = getMemberLabel(ticket.technicianId, ticket.technicianName, members) || '-'
  const judgementManagerLabel =
    getMemberLabel(ticket.judgementManagerId, ticket.judgementManagerName, members) || '-'
  const changeLogs = getTicketChangeLogs(ticket.ticketNo)
  const receptionTitle = getReceptionTitle(ticket)
  const receptionTags = ticket.receptionTags ?? []
  const receptionChannel = getReceptionChannel(ticket)
  const adminReception = isAdminReceptionTicket(ticket)
  const reRepairButtonCreated = isReRepairButtonCreatedTicket(ticket)
  const canEditReceptionPlace = adminReception
  const canEditReRepairYn = !reRepairButtonCreated
  const canEditOriginalTicketNo = (ticket.reRepairYn ?? 'N') === 'Y' && !reRepairButtonCreated
  const canEditPurchaseProofAttachments = adminReception
  const shouldShowReceptionContact = receptionChannel === '매장' || receptionChannel === '가맹점'
  const receptionStore = shouldShowReceptionContact ? findReceptionStore(ticket) : undefined
  const receptionContact = receptionStore?.tel2 || null
  const receptionMethod = getReceptionMethod(ticket)
  const receptionMethodLabel = receptionMethod === 'store'
    ? receptionChannel === '가맹점' ? '안경원 Drop-Off' : '매장 Drop-Off'
    : receptionMethod === 'house'
      ? '자택 픽업'
      : null
  const kakaoEnabled = !isOverseasTicket(ticket)
  const ticketEmail = ticket.email.trim().toLowerCase()
  const mappedCustomer = getCustomersWithOverrides().find(customer => {
    return Boolean(ticketEmail && customer.email.trim().toLowerCase() === ticketEmail)
  })
  const customerCountry = (mappedCustomer?.country || 'KR').slice(0, 2).toUpperCase()
  const customerMarketingAgree = mappedCustomer?.marketingAgree ?? '-'
  const customerPrivacyAgree = mappedCustomer ? 'Y' : '-'
  const fallbackReceivingAddress = mappedCustomer?.addresses?.find(address => address.isDefault) ?? mappedCustomer?.addresses?.[0]
  const receivingInfo = formatReceivingInfo(ticket, fallbackReceivingAddress)
  const normalizedShippingMethod = getNormalizedShippingMethod(ticket, receptionMethod)
  const outboundDeliveryTypeLabel = getOutboundDeliveryTypeLabel(ticket, normalizedShippingMethod)
  const outboundDeliveryInfo = formatOutboundDeliveryInfo(ticket, normalizedShippingMethod, fallbackReceivingAddress)
  const shipmentCompletedYn = getShipmentCompletedYn(ticket)
  const shipmentCompletedAt = getShipmentCompletedAt(ticket)
  const deliveryCompletedYn = getDeliveryCompletedYn(ticket)
  const deliveredAt = getDeliveredAt(ticket)
  const storePickupCompletedYn = getStorePickupCompletedYn(ticket, receptionMethod)
  const storePickupCompletedAt = getStorePickupCompletedAt(ticket, receptionMethod)
  const outboundCarrier = getOutboundCarrier(ticket, normalizedShippingMethod)
  const isHomeDeliveryOutbound = isHomeDeliveryShipment(ticket, normalizedShippingMethod)
  const outboundShipmentLocked = isOutboundShipmentLocked(ticket)
  const outboundShipmentLockedReason = '자동 출고 처리 이후에는 출고 정보를 수정할 수 없습니다.'
  const outboundShipmentEditProps = {
    disabled: outboundShipmentLocked,
    disabledReason: outboundShipmentLockedReason,
  }
  const shouldShowStorePickupFields = !isHomeDeliveryOutbound
  const shouldShowOverseasStoreInvoiceFields = isOverseasStoreDropOff(ticket)
  const pickupTrackingInfo = getPickupTrackingInfo(ticket)
  const defaultPickupCarrier = getDefaultPickupCarrier(ticket)
  const pickupCarrier = defaultPickupCarrier === '-'
    ? '-'
    : receptionMethod === 'store'
    ? defaultPickupCarrier
    : !isOverseasDestination(ticket) && /DHL/i.test(pickupTrackingInfo?.carrier ?? '')
      ? defaultPickupCarrier
      : pickupTrackingInfo?.carrier ?? defaultPickupCarrier
  const pickupTrackingNo = pickupTrackingInfo?.trackingNo ?? ''
  const pickupDeliveryStatus = getPickupDeliveryStatus(ticket, pickupTrackingNo)
  const pickupCarrierOptions = PICKUP_CARRIER_OPTIONS
  const shouldShowPickupInfo = shouldHavePickup(ticket) && !isPartsRequest
  const pickupMethodValue = receptionMethod === 'store' || receptionMethod === 'house' ? receptionMethod : ''
  const pickupMethodLabel = optionLabel(PICKUP_METHOD_OPTIONS, pickupMethodValue)
  const canEditPickupMethod = adminReception
  const canEditPickupTrackingNo = isOverseasStoreDropOff(ticket)
  const pickupTrackingNoLabel = pickupTrackingNo || (canEditPickupTrackingNo || pickupCarrier === '-' ? '-' : '운송장 발급 전')
  const urgentRepairYn = getUrgentRepairYn(ticket)
  const purchaseProofValue = getPurchaseProofValue(ticket)
  const purchaseProofLabel = PURCHASE_PROOF_OPTIONS.find(option => option.value === purchaseProofValue)?.label ?? purchaseProofValue
  const canEditPurchaseInfo = !isOrderHistoryPurchaseInfo(ticket)
  const customerRequest = ticket.customerRequest ?? ''
  const storedAttachments: TicketAttachment[] = ticket.attachments ?? ['고객 첨부 이미지 1']
  const customerNoticeImages: TicketAttachment[] = ticket.customerNoticeImages ?? []
  const readonlyPurchaseProofAttachment = getReadonlyPurchaseProofAttachment(ticket, storedAttachments)
  const attachmentRows = [
    ...storedAttachments.map((attachment, storedIndex) => ({ attachment, storedIndex })),
  ].filter(({ attachment }) => !isPurchaseProofAttachment(attachment))
  const purchaseProofAttachmentRows = [
    ...(readonlyPurchaseProofAttachment ? [{ attachment: readonlyPurchaseProofAttachment, storedIndex: null }] : []),
    ...storedAttachments
      .map((attachment, storedIndex) => ({ attachment, storedIndex }))
      .filter(({ attachment }) => isPurchaseProofAttachment(attachment)),
  ]
  const outboundType = normalizeOutboundTypeValue(ticket.outboundType)
  const consultationRequestedYn = ticket.consultationRequestedYn ?? (outboundType !== '-' ? 'Y' : 'N')
  const consultationStatus = normalizeConsultationStatusValue(ticket.consultationStatus || (consultationRequestedYn === 'Y' ? '상담대기' : '-'))
  const consultationCompleted = consultationStatus === '상담완료'
  const consultationLockedReason = '상담 완료 이후에는 수정할 수 없습니다.'
  const matchedProduct = findProductForTicket(ticket, PRODUCT_SNAPSHOTS)
  const productRetailPrice = getProductRetailPrice(ticket, matchedProduct)
  const repairPricingCurrency = getDefaultRepairPricingCurrency(ticket)
  const showPickupFreightCharge = shouldShowPickupFreightCharge(ticket)
  const showCustomsDutyCharge = shouldShowCustomsDutyCharge(ticket)
  const matchedProductParts = matchedProduct ? parts.filter(part => part.productCode === matchedProduct.productCode) : []
  const productMidCategory = ticket.productMidCategory ?? matchedProduct?.midCategory ?? null
  const productSubCategory = ticket.productSubCategory ?? matchedProduct?.subCategory ?? null
  const productStockAvailableYn = ticket.productStockAvailableYn ?? (matchedProduct ? ynLabel(hasAvailableStock(matchedProduct)) : null)
  const productRestorationRepairYn = ticket.productRestorationRepairYn ?? (matchedProduct ? ynLabel(isRestorationRepairProduct(matchedProduct)) : null)
  const productDecorationYn = ticket.productDecorationYn ?? (matchedProduct ? ynLabel(Boolean(matchedProduct.hasDecoration)) : null)
  const productLaunchDate = ticket.productLaunchDate ?? matchedProduct?.releaseDate ?? null
  const productSerialNumber = getTicketProductSerialNumber(ticket) || null
  const productFactory1 = normalizeProductFactory(ticket.productFactory1 ?? ticket.productFactory ?? matchedProduct?.factory1)
  const productFactory2 = normalizeProductFactory(ticket.productFactory2 ?? matchedProduct?.factory2)
  const productFactory3 = normalizeProductFactory(ticket.productFactory3 ?? matchedProduct?.factory3)
  const repairPricingLocked = isRepairPricingLocked(ticket)
  const productInfoEditLocked = !canEditPurchaseInfo
  const productInfoEditLockedReason = '구매내역을 통한 접수는 제품 정보를 수정할 수 없습니다.'
  const productNameEditLocked = productInfoEditLocked || repairPricingLocked
  const productNameEditLockedReason = productInfoEditLocked
    ? productInfoEditLockedReason
    : '유/무상 결정 후에는 제품명을 수정할 수 없습니다.'
  const productInfoCode = matchedProduct?.productCode ?? ticket.productCode ?? null
  const productInfoName = matchedProduct?.name ?? ticket.productName
  const repairDetailValue = normalizeRepairDetail(ticket.repairDetail)
  const isNoRepairTicket = ticket.status === 'SERVICE_UNAVAILABLE' || isNoRepairDetail(repairDetailValue)
  const noRepairReason = isNoRepairTicket ? inferNoRepairReason(ticket) : null
  const repairSymptomTags = splitTagText(ticket.symptom)
  const repairPartTags = ticket.repairPartTags ?? defaultRepairParts(ticket)
  const repairIssueAreaTags = ticket.repairIssueAreaTags ?? repairPartTags.map(part => part.replace(/\((R|L)\)/, ''))
  const repairIssueTypeTags = ticket.repairIssueTypeTags ?? defaultIssueTypes(ticket)
  const productProblemYn = ticket.productProblemYn ?? (repairIssueTypeTags.length > 0 ? 'Y' : 'N')
  const lensType = getLensType(ticket)
  const isReplacementExchangeTicket = isReplacementExchangeDetail(repairDetailValue)
  const selectedReplacementProduct = PRODUCT_SNAPSHOTS.find(product => (
    product.productCode === ticket.replacementProductCode
      || normalizeProductText(product.name) === normalizeProductText(ticket.replacementProductName)
  )) ?? null
  const replacementProductRetailPrice = selectedReplacementProduct
    ? (ticket.replacementProductRetailPrice ?? getProductOnlyRetailPrice(selectedReplacementProduct))
    : null
  const repairPricingRetailPrice = isReplacementExchangeTicket
    ? (replacementProductRetailPrice ?? productRetailPrice)
    : productRetailPrice
  const isTotalCareTicket = repairDetailValue === '토탈케어'
    || repairSymptomTags.includes('토탈 케어 요청')
    || TOTAL_CARE_FITTING_OPTIONS.some(option => option.value === ticket.careRequest)
  const careRequest = ticket.careRequest || null
  const pricingGuide = getPricingDecisionGuide({
    ticket,
    repairDetail: repairDetailValue,
    issueTypes: repairIssueTypeTags,
    fallbackCost: ticket.repairCost ?? soInfo.repairCost,
    isTotalCareTicket,
  })
  const pricingCost = typeof ticket.repairCost === 'number' ? ticket.repairCost : soInfo.repairCost
  const totalCareFittingOptions = careRequest && !TOTAL_CARE_FITTING_OPTIONS.some(option => option.value === careRequest)
    ? [{ value: careRequest, label: careRequest }, ...TOTAL_CARE_FITTING_OPTIONS]
    : TOTAL_CARE_FITTING_OPTIONS
  const repairAgainReason = ticket.repairAgainReason || '-'

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function getProductFactoryChangeValue(fieldKey: keyof Ticket, sourceTicket: Ticket) {
    if (fieldKey === 'productFactory1') {
      return normalizeProductFactory(sourceTicket.productFactory1 ?? sourceTicket.productFactory ?? matchedProduct?.factory1)
    }
    if (fieldKey === 'productFactory2') {
      return normalizeProductFactory(sourceTicket.productFactory2 ?? matchedProduct?.factory2)
    }
    if (fieldKey === 'productFactory3') {
      return normalizeProductFactory(sourceTicket.productFactory3 ?? matchedProduct?.factory3)
    }
    return null
  }

  function saveProductSelection(product: Product | null) {
    if (productNameEditLocked) {
      showToast(productNameEditLockedReason, false)
      return
    }

    if (!product) {
      saveReceptionPatch({ productCode: null })
      return
    }

    saveReceptionPatch({
      productCode: product.productCode,
      productName: product.name,
      productMidCategory: product.midCategory,
      productSubCategory: product.subCategory,
      productStockAvailableYn: ynLabel(hasAvailableStock(product)),
      productRestorationRepairYn: ynLabel(isRestorationRepairProduct(product)),
      productDecorationYn: ynLabel(Boolean(product.hasDecoration)),
      productLaunchDate: product.releaseDate,
      productFactory1: product.factory1,
      productFactory: product.factory1,
      productFactory2: product.factory2,
      productFactory3: product.factory3,
    })
  }

  function formatTicketChangeFieldValue(fieldKey: keyof Ticket, value: unknown, sourceTicket: Ticket) {
    const productFactoryValue = getProductFactoryChangeValue(fieldKey, sourceTicket)
    if (productFactoryValue !== null) return productFactoryValue

    const meta = TICKET_CHANGE_FIELD_META[fieldKey]
    const formatter = meta?.format ?? formatChangeValue
    return formatter(value, sourceTicket, members)
  }

  function recordTicketChange({
    changeType,
    fieldKey,
    fieldLabel,
    beforeValue,
    afterValue,
    memo,
  }: {
    changeType: TicketChangeType
    fieldKey?: keyof Ticket
    fieldLabel: string
    beforeValue: string
    afterValue: string
    memo?: string
  }) {
    if (beforeValue === afterValue) return
    appendTicketChangeLog({
      ticketNo: currentTicket.ticketNo,
      changeType,
      fieldKey: fieldKey ? String(fieldKey) : undefined,
      fieldLabel,
      beforeValue: beforeValue || '-',
      afterValue: afterValue || '-',
      channel: '관리자 화면',
      memo,
      changedById: CURRENT_ADMIN_MEMBER?.id,
      changedByName: CURRENT_ADMIN_MEMBER?.name ?? '한혜지',
      changedByLoginId: CURRENT_ADMIN_MEMBER?.loginId ?? 'monster563',
      changedByRoleId: CURRENT_ADMIN_MEMBER?.roleId,
    })
  }

  function recordTicketFieldChanges(patch: Partial<Ticket>, memo?: string) {
    const nextTicket = { ...currentTicket, ...patch }
    ;(Object.keys(patch) as Array<keyof Ticket>).forEach(fieldKey => {
      if (TICKET_CHANGE_IGNORED_FIELDS.has(fieldKey)) return

      const meta = TICKET_CHANGE_FIELD_META[fieldKey]
      if (!meta) return

      const beforeValue = formatTicketChangeFieldValue(fieldKey, currentTicket[fieldKey], currentTicket)
      const afterValue = formatTicketChangeFieldValue(fieldKey, nextTicket[fieldKey], nextTicket)
      recordTicketChange({
        changeType: meta.changeType,
        fieldKey,
        fieldLabel: meta.label,
        beforeValue,
        afterValue,
        memo,
      })
    })
  }

  function saveTicketStatus(nextStatusValue: string) {
    if (!Object.prototype.hasOwnProperty.call(STATUS_META, nextStatusValue)) return
    const nextStatus = nextStatusValue as TicketStatus
    if (nextStatus === currentTicket.status) return
    if (!window.confirm(`상태를 "${STATUS_META[nextStatus].label}"(으)로 변경하시겠습니까?`)) return
    if (!canApplyManualStatus(currentTicket, nextStatus)) {
      showToast(getManualStatusBlockedMessage(nextStatus), false)
      return
    }

    const patch: Partial<Ticket> = { status: nextStatus }
    const isPickupFlowStatus = nextStatus === 'PRODUCT_MOVING' || nextStatus === 'PICKUP_DONE'
    const skipTmsPickup = shouldSkipTmsPickup(currentTicket)
    const overseasStoreDropOff = isOverseasStoreDropOff(currentTicket)
    const noRepairReturnFlow = isNoRepairReturnFlowTicket(currentTicket) || nextStatus === 'SERVICE_UNAVAILABLE'
    if (
      nextStatus === 'STORE_ARRIVED' &&
      getReceptionMethod(currentTicket) === 'store' &&
      isDomesticReceptionTicket(currentTicket) &&
      !noRepairReturnFlow &&
      !skipTmsPickup &&
      !currentTicket.pickupTrackingNo
    ) {
      patch.pickupTrackingNo = getAutoPickupTrackingNo(currentTicket, '성화기업')
    }
    if (isPickupFlowStatus && !currentTicket.pickupTrackingNo && !skipTmsPickup && !overseasStoreDropOff) {
      patch.pickupTrackingNo = getAutoPickupTrackingNo(currentTicket)
    }
    if (nextStatus === 'PICKUP_DONE' && !currentTicket.hqReceivedAt) {
      patch.hqReceivedAt = nowLocalText().slice(0, 10)
    }
    if (nextStatus === 'PARTNER_RECEIVED' && !currentTicket.factoryReceivingDate) {
      patch.factoryReceivingDate = nowLocalText().slice(0, 10)
    }
    if (nextStatus === 'PICKUP_COMPLETED') {
      patch.storePickupCompletedYn = 'Y'
      if (!currentTicket.storePickupCompletedAt) {
        patch.storePickupCompletedAt = nowLocalText().slice(0, 10)
      }
    }
    if ((nextStatus === 'REPAIRING' || nextStatus === 'REPAIR_DONE') && !currentTicket.repairBeginDate) {
      patch.repairBeginDate = nowLocalText().slice(0, 10)
    }
    if (nextStatus === 'REPAIR_DONE' && !currentTicket.repairCompletedAt) {
      patch.repairCompletedAt = nowLocalText().slice(0, 10)
    }
    if (nextStatus === 'PARTNER_SENT' && !currentTicket.factoryForwardingDate) {
      patch.factoryForwardingDate = nowLocalText().slice(0, 10)
    }
    if (
      nextStatus === 'REPAIRING' &&
      currentTicket.status === 'PARTNER_SENT' &&
      !currentTicket.factoryReceivingDate
    ) {
      patch.factoryReceivingDate = nowLocalText().slice(0, 10)
    }
    const projectedForSchedule = { ...currentTicket, ...patch }
    const urgentExpectedShipAt = getUrgentTotalCareExpectedShipAt(projectedForSchedule, projectedForSchedule.hqReceivedAt)
    if ((patch.hqReceivedAt || !projectedForSchedule.expectedShipAt) && urgentExpectedShipAt) {
      patch.expectedShipAt = urgentExpectedShipAt
    }
    if (nextStatus === 'PARTS_READY') {
      const isOverseasPartsDelivery = isOverseasDestination(currentTicket)
      patch.shippingMethod = isOverseasPartsDelivery ? '해외 택배(HQ)' : '택배(HQ)'
      patch.outboundCarrier = isOverseasPartsDelivery ? 'DHL' : 'CJ대한통운'
    }
    if (nextStatus === 'CANCELED') {
      patch.repairDetail = '수리취소'
      if (currentTicket.paymentCompleted === 'Y') {
        patch.paymentCompleted = 'C'
      }
    }
    if (nextStatus === 'SERVICE_UNAVAILABLE') {
      applyServiceUnavailableReturnPatch(currentTicket, patch)
    }
    applyOutboundStatusPatch(currentTicket, nextStatus, patch)

    let memo = '티켓 상태 직접 변경'
    let toastMessage = '티켓 상태가 변경되었습니다.'
    if (nextStatus === 'SERVICE_UNAVAILABLE') {
      memo = '서비스 불가 판정 및 TMS 반송 요청'
      toastMessage = '서비스 불가 상태로 변경하고 반송 요청 정보를 생성했습니다.'
    } else if (nextStatus === 'STORE_ARRIVED' && patch.pickupTrackingNo) {
      memo = '매장 도착(Drop-off) 처리 및 TMS 픽업 지시'
      toastMessage = '매장 도착(Drop-off) 처리 후 TMS 픽업 지시가 생성되었습니다.'
    } else if (nextStatus === 'PRODUCT_MOVING' && patch.pickupTrackingNo) {
      memo = '제품 이동 중 처리 및 회수 운송장 생성'
      toastMessage = '제품 이동 중 상태로 변경하고 회수 운송장을 생성했습니다.'
    } else if (nextStatus === 'PICKUP_DONE') {
      memo = '회수 완료 처리 및 PS Office 입고일 입력'
      toastMessage = '회수 완료 상태로 변경하고 PS Office 입고일을 입력했습니다.'
    } else if (nextStatus === 'PARTNER_SENT') {
      memo = '협력업체 발송 처리 및 협력업체 출고일 입력'
      toastMessage = '협력업체 발송 상태로 변경하고 협력업체 출고일을 입력했습니다.'
    } else if (nextStatus === 'PARTNER_RECEIVED') {
      memo = '협력업체 입고 처리 및 검수 시작'
      toastMessage = '협력업체 입고 후 검수 중 상태로 변경했습니다.'
    } else if (nextStatus === 'REPAIRING' && patch.factoryReceivingDate) {
      memo = '협력업체 입고 처리 및 협력업체 입고일 입력'
      toastMessage = '수리 진행 중 상태로 변경하고 협력업체 입고일을 입력했습니다.'
    } else if (nextStatus === 'REPAIR_DONE') {
      memo = '수리 완료 처리 및 수리 완료일 입력'
      toastMessage = '수리 완료 상태로 변경하고 수리 완료일을 입력했습니다.'
    } else if (nextStatus === 'PARTS_READY') {
      memo = '부속품 준비 완료 처리 및 부품 발송 출고 생성'
      toastMessage = '부속품 준비 완료 상태로 변경하고 출고 관리에 부품 발송 건을 생성했습니다.'
    } else if (nextStatus === 'CANCELED') {
      memo = '서비스 취소 처리 및 PRC_05 알림 대상'
      toastMessage = '취소 상태로 변경했습니다. PRC_05 알림 대상입니다.'
    } else if (nextStatus === 'READY_TO_SHIP') {
      memo = '출고 준비 완료 처리 및 출고 정보 자동 입력'
      toastMessage = '출고 준비 완료 상태로 변경하고 출고 정보를 자동 입력했습니다.'
    } else if (nextStatus === 'SHIPPING') {
      memo = '배송 시작 처리 및 등기 번호 자동 입력'
      toastMessage = '배송 시작 상태로 변경하고 등기 번호를 자동 입력했습니다.'
    } else if (nextStatus === 'SHIPPED') {
      memo = '배송 완료 처리 및 배송 일자 자동 입력'
      toastMessage = '배송 완료 상태로 변경하고 배송 일자를 자동 입력했습니다.'
    } else if (nextStatus === 'SERVICE_DONE' && patch.storePickupCompletedYn === 'Y') {
      memo = '고객 픽업 완료 처리 및 서비스 완료'
      toastMessage = '고객 픽업 완료 후 서비스 완료 상태로 변경했습니다.'
    } else if (nextStatus === 'SERVICE_DONE') {
      memo = '서비스 완료 처리'
      toastMessage = '서비스 완료 상태로 변경했습니다.'
    } else if (nextStatus === 'PICKUP_COMPLETED') {
      memo = '고객 픽업 완료 처리'
      toastMessage = '픽업 완료 상태로 변경했습니다.'
    } else if (nextStatus === 'CLOSED' && patch.storePickupCompletedYn === 'Y') {
      memo = '고객 픽업 완료 처리 및 픽업 일자 자동 입력'
      toastMessage = '고객 픽업 완료로 처리하고 픽업 일자를 자동 입력했습니다.'
    } else if (nextStatus === 'CLOSED') {
      memo = '서비스 완료 처리'
      toastMessage = '서비스 완료 상태로 변경했습니다.'
    }
    updatePrototypeTicket(currentTicket.ticketNo, patch)
    recordTicketFieldChanges(patch, memo)

    // 자동 재고 요청: 본사 + 부품교체/제품교환 → 수리 진행 중 전환 시
    if (nextStatus === 'REPAIRING') {
      const normalizedDetail = normalizeRepairDetail(currentTicket.repairDetail)
      const isHQ = currentTicket.repairDepartment === '본사'
      const needsStock = isHQ && (normalizedDetail === '부품교체' || /제품교환|타제품교환/.test(currentTicket.repairDetail))
      const alreadyExists = getStockRequests().some(r => r.ticketNo === currentTicket.ticketNo && r.status !== 'CANCELED')
      if (needsStock && !alreadyExists) {
        createStockRequestFromTicket({ ...currentTicket, ...patch } as Ticket, '일반 건')
        toastMessage += ' 부품교체/제품교환 건으로 재고 요청이 자동 생성되었습니다.'
        setStockRequestCreated(true)
      }
    }

    setTicketRevision(revision => revision + 1)
    showToast(toastMessage)
  }

  function saveTicketAssignee(kind: 'technician' | 'judgementManager', memberId: string) {
    const nextMember = memberId === '-' ? null : technicianOptionMembers.find(member => member.id === memberId)
    if (memberId !== '-' && !nextMember) return

    const patch: Partial<Ticket> = kind === 'technician'
      ? {
          technicianId: nextMember?.id,
          technicianName: nextMember?.name,
        }
      : {
          judgementManagerId: nextMember?.id,
          judgementManagerName: nextMember?.name,
        }

    updatePrototypeTicket(currentTicket.ticketNo, patch)
    recordTicketFieldChanges(patch, kind === 'technician' ? '서비스 기술자 변경' : '판정 담당자 변경')
    setTicketRevision(revision => revision + 1)
    showToast(kind === 'technician' ? '서비스 기술자가 변경되었습니다.' : '판정 담당자가 변경되었습니다.')
  }

  function handleCustomerClick() {
    if (!mappedCustomer) {
      showToast('연결된 고객 정보를 찾을 수 없습니다.', false)
      return
    }
    navigate(`/${langCode}/customers/${mappedCustomer.id}`)
  }

  function handleCreateStockRequest() {
    if (!ticket) return
    const record = createStockRequestFromTicket(ticket, selectedStockRequestReason, {
      id: CURRENT_ADMIN_MEMBER?.id,
      label: CURRENT_ADMIN_LABEL,
    })
    setStockRequestModalOpen(false)
    navigate(`/${langCode}/stock/requests/${record.requestNo}`)
  }

  function handleCreateComponentReturn() {
    if (!ticket || componentReturnCreated) return
    const record = createComponentReturnFromTicket(ticket, selectedComponentType)
    setComponentReturnCreated(true)
    setComponentReturnModalOpen(false)
    navigate(`/${langCode}/shipping/component-returns`, {
      state: { componentReturnId: record.id },
    })
  }

  function saveReceptionPatch(patch: Partial<Ticket>) {
    const nextPatch: Partial<Ticket> = { ...patch }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    recordTicketFieldChanges(nextPatch, '접수 정보 저장')
    setTicketRevision(revision => revision + 1)
    showToast('접수 정보가 저장되었습니다.')
  }

  function saveAttachmentPatch(nextAttachments: TicketAttachment[], toastMessage: string) {
    const patch: Partial<Ticket> = { attachments: nextAttachments }
    updatePrototypeTicket(currentTicket.ticketNo, patch)
    recordTicketFieldChanges(patch, '첨부파일 변경')
    setTicketRevision(revision => revision + 1)
    showToast(toastMessage)
  }

  async function handleAttachmentRegister(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast('이미지 파일만 등록할 수 있습니다.', false)
      return
    }

    try {
      const uploadedAt = nowLocalText()
      const nextAttachments = await Promise.all(imageFiles.map(async file => ({
        id: `attachment-${currentTicket.ticketNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url: await readFileAsDataUrl(file),
        uploadedAt,
        purpose: 'CUSTOMER_IMAGE',
        readOnly: false,
      } satisfies Exclude<TicketAttachment, string>)))
      saveAttachmentPatch([...storedAttachments, ...nextAttachments], `${nextAttachments.length}개 이미지가 등록되었습니다.`)
    } catch {
      showToast('이미지 등록 중 오류가 발생했습니다.', false)
    }
  }

  async function handlePurchaseProofAttachmentRegister(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    if (!canEditPurchaseProofAttachments) {
      showToast('고객 접수 구매증빙 이미지는 수정할 수 없습니다.', false)
      return
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast('이미지 파일만 등록할 수 있습니다.', false)
      return
    }

    try {
      const uploadedAt = nowLocalText()
      const nextAttachments = await Promise.all(imageFiles.map(async file => ({
        id: `purchase-proof-${currentTicket.ticketNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url: await readFileAsDataUrl(file),
        uploadedAt,
        purpose: 'PURCHASE_PROOF',
        readOnly: false,
      } satisfies Exclude<TicketAttachment, string>)))
      saveAttachmentPatch([...storedAttachments, ...nextAttachments], `${nextAttachments.length}개 구매증빙 이미지가 등록되었습니다.`)
    } catch {
      showToast('구매증빙 이미지 등록 중 오류가 발생했습니다.', false)
    }
  }

  async function handleCustomerNoticeImageRegister(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast('이미지 파일만 등록할 수 있습니다.', false)
      return
    }

    try {
      const uploadedAt = nowLocalText()
      const nextImages = await Promise.all(imageFiles.map(async file => ({
        id: `customer-notice-${currentTicket.ticketNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url: await readFileAsDataUrl(file),
        uploadedAt,
        purpose: 'CUSTOMER_NOTICE',
        readOnly: false,
      } satisfies Exclude<TicketAttachment, string>)))
      saveRepairPatch({
        customerNoticeImages: [...customerNoticeImages, ...nextImages],
      })
      showToast(`${nextImages.length}개 고객 전달 이미지가 등록되었습니다.`)
    } catch {
      showToast('고객 전달 이미지 등록 중 오류가 발생했습니다.', false)
    }
  }

  function handleCustomerNoticeImageDelete(imageIndex: number) {
    const nextImages = customerNoticeImages.filter((_, index) => index !== imageIndex)
    saveRepairPatch({ customerNoticeImages: nextImages })
    showToast('고객 전달 이미지가 삭제되었습니다.')
  }

  function handleAttachmentDelete(storedIndex: number | null) {
    if (storedIndex === null) {
      showToast('접수 시 등록된 구매증빙 이미지는 수정할 수 없습니다.', false)
      return
    }

    const targetAttachment = storedAttachments[storedIndex]
    if (targetAttachment && isPurchaseProofAttachment(targetAttachment) && !canEditPurchaseProofAttachments) {
      showToast('고객 접수 구매증빙 이미지는 수정할 수 없습니다.', false)
      return
    }

    if (targetAttachment && isReadonlyAttachment(targetAttachment)) {
      showToast('접수 시 등록된 구매증빙 이미지는 수정할 수 없습니다.', false)
      return
    }

    const nextAttachments = storedAttachments.filter((_, attachmentIndex) => attachmentIndex !== storedIndex)
    saveAttachmentPatch(nextAttachments, '첨부파일이 삭제되었습니다.')
  }

  function handleAttachmentOpen(attachment: TicketAttachment) {
    const url = getAttachmentUrl(attachment)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function saveConsultationPatch(patch: Partial<Ticket>) {
    const hasPatchField = (fieldKey: keyof Ticket) => Object.prototype.hasOwnProperty.call(patch, fieldKey)
    const currentOutboundType = normalizeOutboundTypeValue(currentTicket.outboundType)
    const currentConsultationRequestedYn = currentTicket.consultationRequestedYn ?? (currentOutboundType !== '-' ? 'Y' : 'N')
    const currentConsultationStatus = normalizeConsultationStatusValue(currentTicket.consultationStatus)
    const currentConsultationCompleted = currentConsultationStatus === '상담완료'
    const nextOutboundType = hasPatchField('outboundType')
      ? normalizeOutboundTypeValue(patch.outboundType)
      : currentOutboundType
    const nextConsultationRequestedYn = patch.consultationRequestedYn ?? currentTicket.consultationRequestedYn ?? (nextOutboundType !== '-' ? 'Y' : 'N')
    const nextConsultationStatus = hasPatchField('consultationStatus')
      ? normalizeConsultationStatusValue(patch.consultationStatus)
      : currentConsultationStatus
    const hasCompletedLockedFieldChange = currentConsultationCompleted && (
      (hasPatchField('consultationRequestedYn') && patch.consultationRequestedYn !== currentConsultationRequestedYn) ||
      (hasPatchField('outboundType') && nextOutboundType !== currentOutboundType) ||
      (hasPatchField('consultationManager') && (patch.consultationManager ?? '') !== (currentTicket.consultationManager ?? '')) ||
      (hasPatchField('consultationStatus') && nextConsultationStatus !== currentConsultationStatus)
    )

    if (hasCompletedLockedFieldChange) {
      showToast('상담 완료 이후에는 수정할 수 없습니다.', false)
      return
    }

    const nextPatch: Partial<Ticket> = {
      ...patch,
      outboundType: nextOutboundType === '-' ? null : nextOutboundType,
      consultationRequestedYn: nextConsultationRequestedYn,
    }
    if (hasPatchField('consultationStatus')) {
      nextPatch.consultationStatus = nextConsultationStatus === '-' ? null : nextConsultationStatus
    }
    const shouldRequestConsultation = nextPatch.consultationRequestedYn === 'Y' || nextOutboundType !== '-'
    const consultationWasTriggered = currentConsultationRequestedYn !== 'Y' && shouldRequestConsultation
    const outboundWasSelected = hasPatchField('outboundType') && nextOutboundType !== '-'

    if (shouldRequestConsultation) {
      nextPatch.consultationRequestedYn = 'Y'
      nextPatch.status = 'JUDGEMENT_PENDING'
      if (!nextConsultationStatus || nextConsultationStatus === '-') {
        nextPatch.consultationStatus = '상담대기'
      }
      if ((consultationWasTriggered || outboundWasSelected) && !nextPatch.consultationManager) {
        nextPatch.consultationManager = CURRENT_ADMIN_LABEL
      }
    } else if (patch.consultationRequestedYn === 'N') {
      nextPatch.consultationStatus = null
    }

    if (hasPatchField('consultationStatus') && nextConsultationStatus === '상담완료') {
      const repairChargeType = currentTicket.repairChargeType
      if (!repairChargeType) {
        showToast('유/무상 판정을 먼저 진행해 주세요.', false)
        return
      }

      nextPatch.consultationRequestedYn = 'Y'
      if (!currentTicket.consultationManager && !nextPatch.consultationManager) {
        nextPatch.consultationManager = CURRENT_ADMIN_LABEL
      }
      if (currentConsultationStatus !== '상담완료' || !currentTicket.consultationCompletedAt) {
        nextPatch.consultationCompletedAt = nowLocalText()
      }
      if (!currentTicket.judgementCompletedAt) {
        nextPatch.judgementCompletedAt = nowLocalText()
      }
      if (repairChargeType === 'FREE') {
        if (isNoRepairDetail(currentTicket.repairDetail)) {
          applyServiceUnavailableReturnPatch(currentTicket, nextPatch)
        } else {
          nextPatch.status = 'JUDGEMENT_DONE'
        }
      } else {
        nextPatch.status = 'PAYMENT_REQUESTED'
      }
    }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    recordTicketFieldChanges(nextPatch, '상담 정보 저장')
    setTicketRevision(revision => revision + 1)
    showToast('상담 정보가 저장되었습니다.')
  }

  function saveRepairPatch(patch: Partial<Ticket>) {
    const patchKeys = Object.keys(patch) as Array<keyof Ticket>
    const hasDecisionLockedField = patchKeys.some(fieldKey => REPAIR_DECISION_LOCKED_FIELDS.has(fieldKey))
    if (isRepairPricingLocked(currentTicket) && hasDecisionLockedField) {
      showToast('유/무상 결정 후에는 해당 수리 정보를 수정할 수 없습니다.', false)
      return
    }

    const hasPricingLockedField = patchKeys.some(fieldKey => REPAIR_PAYMENT_LOCKED_FIELDS.has(fieldKey))
    if (isRepairPricingLocked(currentTicket) && hasPricingLockedField) {
      showToast('가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다.', false)
      return
    }

    if (patch.repairChargeType === 'FREE' && !canSelectFreeRepairDecision(currentTicket)) {
      showToast(INT_FREE_REPAIR_UNAVAILABLE_MESSAGE, false)
      return
    }

    const nextPatch: Partial<Ticket> = { ...patch }
    const nextRepairDetail = normalizeRepairDetail(patch.repairDetail ?? currentTicket.repairDetail)
    let nextRepairChargeType = patch.repairChargeType ?? currentTicket.repairChargeType ?? soInfo.repairChargeType
    const nextConsultationStatus = patch.consultationStatus ?? currentTicket.consultationStatus
    const nextIsNoRepair = isNoRepairDetail(nextRepairDetail)
    const markJudgementComplete = (status: TicketStatus) => {
      nextPatch.status = status
      if (!currentTicket.judgementCompletedAt && !nextPatch.judgementCompletedAt) {
        nextPatch.judgementCompletedAt = nowLocalText()
      }
    }

    if (nextIsNoRepair) {
      nextRepairChargeType = 'FREE'
      nextPatch.repairChargeType = 'FREE'
      nextPatch.repairCost = 0
      if (shouldMoveNoRepairToJudgementDone(currentTicket, nextRepairDetail, nextRepairChargeType, nextConsultationStatus)) {
        markJudgementComplete('SERVICE_UNAVAILABLE')
        applyServiceUnavailableReturnPatch(currentTicket, nextPatch)
      }
    }

    if (patch.repairDetail && !nextIsNoRepair) {
      nextPatch.noRepairReason = null
    }

    if (patch.repairDetail && !isReplacementExchangeDetail(nextRepairDetail)) {
      nextPatch.replacementProductCode = null
      nextPatch.replacementProductName = null
      nextPatch.replacementProductRetailPrice = null
      if (isReplacementExchangeDetail(currentTicket.repairDetail)) {
        nextPatch.productRetailPrice = null
      }
    }

    if (!nextIsNoRepair && patch.repairChargeType === 'FREE') {
      nextRepairChargeType = 'FREE'
      nextPatch.repairCost = 0
      markJudgementComplete('JUDGEMENT_DONE')
    }

    if (!nextIsNoRepair && patch.repairChargeType === 'PAID') {
      nextRepairChargeType = 'PAID'
      if (typeof patch.repairCost !== 'number') {
        nextPatch.repairCost = estimateRepairCost(nextRepairDetail, currentTicket.repairCost ?? soInfo.repairCost)
      }
      markJudgementComplete('PAYMENT_REQUESTED')
    }

    if (!nextIsNoRepair && patch.repairDetail && nextRepairChargeType === 'PAID' && typeof patch.repairCost !== 'number') {
      nextPatch.repairCost = estimateRepairCost(nextRepairDetail, currentTicket.repairCost ?? soInfo.repairCost)
    }

    if (patch.repairAgainReason && patch.repairAgainReason !== '-') {
      nextPatch.reRepairYn = 'Y'
    }

    if (patch.repairIssueTypeTags) {
      nextPatch.productProblemYn = patch.repairIssueTypeTags.length > 0 ? 'Y' : 'N'
    }

    if (!currentTicket.technicianId && !nextPatch.technicianId && patchKeys.length > 0) {
      nextPatch.technicianId = CURRENT_ADMIN_MEMBER?.id
      nextPatch.technicianName = CURRENT_ADMIN_MEMBER?.name
    }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    recordTicketFieldChanges(nextPatch, nextIsNoRepair ? '수리불가 판정 저장' : '수리 정보 저장')
    setTicketRevision(revision => revision + 1)
    if (patch.repairChargeType === 'FREE') {
      showToast('무상 판정으로 서비스 판정 완료 상태가 되었습니다.')
    } else if (!nextIsNoRepair && patch.repairChargeType === 'PAID') {
      showToast('가격결정이 완료되어 결제 대기 상태가 되었습니다.')
    } else {
      showToast('수리 정보가 저장되었습니다.')
    }
  }

  function saveShippingPatch(patch: Partial<Ticket>) {
    if (isOutboundShipmentLocked(currentTicket)) {
      showToast('픽업 요청 성공 후에는 출고 정보를 수정할 수 없습니다.', false)
      return
    }

    updatePrototypeTicket(currentTicket.ticketNo, patch)
    recordTicketFieldChanges(patch, '출고 정보 저장')
    setTicketRevision(revision => revision + 1)
    showToast('출고 정보가 저장되었습니다.')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '개요' },
    { id: 'kakao',    label: '알림톡 발송내역' },
    { id: 'email',    label: '메일 발송내역' },
    { id: 'history',  label: '변경이력' },
  ]

  return (
    <div className="min-w-0 w-full max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      {stockRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 px-4 py-6">
          <button
            type="button"
            aria-label="모달 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => setStockRequestModalOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="재고 요청 생성"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-[11px] font-medium text-gray-400">재고 요청</p>
              <h2 className="mt-1 text-base font-bold text-gray-900">요청사유 선택</h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label htmlFor="ticket-stock-request-reason" className="block text-xs font-semibold text-gray-700">
                요청사유
              </label>
              <select
                id="ticket-stock-request-reason"
                value={selectedStockRequestReason}
                onChange={event => setSelectedStockRequestReason(event.target.value as StockRequestReason)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400"
              >
                {STOCK_REQUEST_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setStockRequestModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateStockRequest}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
              >
                요청
              </button>
            </div>
          </section>
        </div>
      )}
      {componentReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 px-4 py-6">
          <button
            type="button"
            aria-label="모달 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => setComponentReturnModalOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="구성품 반송 생성"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-[11px] font-medium text-gray-400">구성품 반송</p>
              <h2 className="mt-1 text-base font-bold text-gray-900">구성품 유형 선택</h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label htmlFor="ticket-component-return-type" className="block text-xs font-semibold text-gray-700">
                구성품 유형
              </label>
              <select
                id="ticket-component-return-type"
                value={selectedComponentType}
                onChange={event => setSelectedComponentType(event.target.value as ComponentType)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400"
              >
                {COMPONENT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setComponentReturnModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateComponentReturn}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
              >
                생성
              </button>
            </div>
          </section>
        </div>
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
                <EditableMetaSelect
                  label="서비스 기술자"
                  value={ticket.technicianId ?? '-'}
                  displayValue={technicianLabel}
                  options={technicianMemberOptions}
                  onSave={value => saveTicketAssignee('technician', value)}
                />
                <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
                <EditableMetaSelect
                  label="판정 담당자"
                  value={ticket.judgementManagerId ?? '-'}
                  displayValue={judgementManagerLabel}
                  options={technicianMemberOptions}
                  onSave={value => saveTicketAssignee('judgementManager', value)}
                />
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
              {['REPAIRING', 'REPAIR_DONE', 'READY_TO_SHIP', 'SHIPPING', 'SHIPPED', 'PICKUP_COMPLETED', 'SERVICE_DONE', 'CLOSED'].includes(ticket.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStockRequestReason('긴급 건')
                    setStockRequestModalOpen(true)
                  }}
                  disabled={!['REPAIRING', 'REPAIR_DONE'].includes(ticket.status) || stockRequestCreated}
                  title={stockRequestCreated ? '이미 재고 요청이 생성되었습니다.' : !['REPAIRING', 'REPAIR_DONE'].includes(ticket.status) ? '출고 준비 이후에는 재고 요청을 생성할 수 없습니다.' : '재고 요청 생성'}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  <Package className="w-3.5 h-3.5" />재고 요청
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedComponentType('NONE')
                  setComponentReturnModalOpen(true)
                }}
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
                <RotateCcw className="w-3.5 h-3.5" />티켓 복제
              </button>
            </div>
          </div>

          {/* 2행: 상태 + SO문서번호 + 법인 */}
          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <div className="pr-8">
              <p className="text-[11px] text-gray-400 mb-1.5">상태</p>
              <div className="flex items-center gap-2">
                <EditableMetaSelect
                  value={ticket.status}
                  displayValue={(
                    <I18nText i18nKey={ticketStatusI18nKey(ticket.status)} display="tooltip">
                      {statusMeta.label}
                    </I18nText>
                  )}
                  options={ticketStatusOptions}
                  onSave={saveTicketStatus}
                  valueClassName={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusMeta.className}`}
                />
              </div>
            </div>
            <div className="px-8">
              <p className="text-[11px] text-gray-400 mb-1.5">SO 문서번호</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{ticket.soDocumentNo || '-'}</p>
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
              <div className="space-y-4 xl:block xl:columns-2 xl:gap-4 xl:space-y-0">

                  {/* 고객 정보 카드 */}
                  <SectionCard title="고객 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <ClickableField label="이메일" value={ticket.email} onClick={handleCustomerClick} />
                      <Field label="고객명" value={ticket.customerName} />
                      <Field label="전화번호" value={ticket.phone} />
                      <Field label="국가" value={customerCountry} />
                      <Field label="마케팅 동의" value={customerMarketingAgree} />
                      <Field label="개인정보 동의" value={customerPrivacyAgree} />
                    </dl>
                  </SectionCard>

                  {/* 제품 정보 카드 */}
                  <SectionCard title="제품 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <ProductSearchReceptionField
                        label="제품명"
                        value={productInfoCode}
                        products={PRODUCT_SNAPSHOTS}
                        fallbackLabel={productInfoName}
                        disabled={productNameEditLocked}
                        disabledReason={productNameEditLockedReason}
                        onSelect={saveProductSelection}
                      />
                      <Field label="제품 코드" value={productInfoCode} />
                      <Field label="중분류" value={productMidCategory} />
                      <Field label="소분류" value={productSubCategory} />
                      <EditableReceptionField
                        label="시리얼 번호"
                        value={productSerialNumber}
                        disabled={productInfoEditLocked}
                        disabledReason={productInfoEditLockedReason}
                        onSave={value => saveReceptionPatch({
                          productSerialNumber: value || null,
                          serialNumber: value || null,
                        })}
                      />
                      <Field label="재고보유여부" value={productStockAvailableYn} />
                      <Field label="복원수리 가능여부" value={productRestorationRepairYn} />
                      <Field label="장식 보유 여부" value={productDecorationYn} />
                      <Field label="런칭일" value={productLaunchDate} />
                      <EditableReceptionField
                        label="생산공장1"
                        value={productFactory1}
                        type="select"
                        options={PRODUCT_FACTORY_SELECT_OPTIONS}
                        onSave={value => saveReceptionPatch({
                          productFactory1: value || null,
                          productFactory: value || null,
                        })}
                      />
                      <EditableReceptionField
                        label="생산공장2"
                        value={productFactory2}
                        type="select"
                        options={PRODUCT_FACTORY_SELECT_OPTIONS}
                        onSave={value => saveReceptionPatch({ productFactory2: value || null })}
                      />
                      <EditableReceptionField
                        label="생산공장3"
                        value={productFactory3}
                        type="select"
                        options={PRODUCT_FACTORY_SELECT_OPTIONS}
                        onSave={value => saveReceptionPatch({ productFactory3: value || null })}
                      />
                      <div className="col-span-2 pt-2">
                        <dt className="mb-2 text-[11px] font-semibold text-gray-500">부품</dt>
                        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
                          <table className="w-full table-fixed text-left text-xs">
                            <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-400">
                              <tr>
                                <th className="px-3 py-2.5">부품명</th>
                                <th className="w-24 px-3 py-2.5 text-center">부품수량</th>
                                <th className="w-40 px-3 py-2.5">부품 보관위치</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                              {matchedProductParts.length > 0 ? (
                                matchedProductParts.map(part => (
                                  <tr key={part.id}>
                                    <td className="truncate px-3 py-2.5 font-medium text-gray-800">{part.name}</td>
                                    <td className="px-3 py-2.5 text-center text-gray-600">1</td>
                                    <td className="truncate px-3 py-2.5 font-mono text-[11px] text-gray-600">{part.storageLocation || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="px-3 py-5 text-center text-gray-400">
                                    등록된 부품 정보가 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 접수 정보 카드 */}
                  <SectionCard title="접수 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="접수일시" value={`${ticket.receivedAt} (KST)`} />
                      <Field label="접수처 유형" value={receptionChannel} />
                      {canEditReceptionPlace && receptionChannel === '매장' && receptionMethod === 'store' ? (
                        <StorePickerField
                          label="접수처"
                          value={ticket.receptionPlace}
                          stores={STORES}
                          onSave={store => saveReceptionPatch({ receptionPlace: store?.name ?? '-' })}
                        />
                      ) : canEditReceptionPlace ? (
                        <EditableReceptionField
                          label="접수처"
                          value={ticket.receptionPlace}
                          onSave={value => saveReceptionPatch({ receptionPlace: value || '-' })}
                        />
                      ) : (
                        <Field label="접수처" value={ticket.receptionPlace} />
                      )}
                      {shouldShowReceptionContact && (
                        <Field label="담당자 연락처" value={receptionContact} />
                      )}
                      <div className="col-span-2">
                        <Field label="수령 유형" value={receptionMethodLabel} />
                      </div>
                      <div className="col-span-2">
                        <Field label="수령 정보" value={receivingInfo} />
                      </div>
                      <ToggleField
                        label="B2C 여부(법인용)"
                        checked={soInfo.b2cYn === 'Y'}
                        onChange={checked => saveReceptionPatch({ b2cYn: checked ? 'Y' : 'N' })}
                      />
                      <ToggleField
                        label="재수리 여부"
                        checked={(ticket.reRepairYn ?? 'N') === 'Y'}
                        disabled={!canEditReRepairYn}
                        disabledReason="재수리 접수 버튼으로 생성된 티켓은 수정할 수 없습니다."
                        onChange={checked => saveReceptionPatch({ reRepairYn: checked ? 'Y' : 'N' })}
                      />
                      <ToggleField
                        label="긴급수리 여부"
                        checked={urgentRepairYn === 'Y'}
                        onChange={checked => saveReceptionPatch({ urgentRepairYn: checked ? 'Y' : 'N' })}
                      />
                      {canEditOriginalTicketNo ? (
                        <EditableReceptionField
                          label="기존 티켓번호"
                          value={ticket.originalTicketNo ?? ''}
                          onSave={value => saveReceptionPatch({ originalTicketNo: value || undefined })}
                        />
                      ) : (
                        <TicketLinkField
                          label="기존 티켓번호"
                          ticketNo={ticket.originalTicketNo}
                          onClick={originalTicketNo => navigate(`/${langCode}/tickets/${originalTicketNo}`)}
                        />
                      )}
                      {canEditPurchaseInfo ? (
                        <EditableReceptionField
                          label="구매증빙 유형"
                          value={purchaseProofValue}
                          type="select"
                          options={PURCHASE_PROOF_OPTIONS}
                          onSave={value => saveReceptionPatch({
                            purchaseProofType: value as PurchaseProofValue,
                            purchaseInfoSource: 'ADMIN',
                          })}
                        />
                      ) : (
                        <Field label="구매증빙 유형" value={purchaseProofLabel} />
                      )}
                      {canEditPurchaseInfo ? (
                        <EditableReceptionField
                          label="구매일"
                          value={ticket.purchaseDate ?? ''}
                          type="date"
                          onSave={value => saveReceptionPatch({
                            purchaseDate: value || null,
                            purchaseInfoSource: 'ADMIN',
                          })}
                        />
                      ) : (
                        <Field label="구매일" value={ticket.purchaseDate} />
                      )}
                      <div className="col-span-2">
                        {canEditPurchaseInfo ? (
                          <PurchasePlaceSearchField
                            label="구매처"
                            value={ticket.purchasePlace ?? ''}
                            stores={STORES}
                            onSave={value => saveReceptionPatch({
                              purchasePlace: value || null,
                              purchaseInfoSource: 'ADMIN',
                            })}
                          />
                        ) : (
                          <Field label="구매처" value={ticket.purchasePlace} />
                        )}
                      </div>
                      <div className="col-span-2">
                        <EditableReceptionField
                          label="고객 요청사항"
                          value={customerRequest}
                          type="textarea"
                          onSave={value => saveReceptionPatch({ customerRequest: value || null })}
                        />
                      </div>
                    </dl>
                    {/* 첨부파일 */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-gray-400">첨부파일</p>
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
                        >
                          이미지 등록
                        </button>
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleAttachmentRegister}
                        />
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        {attachmentRows.length === 0 ? (
                          <div className="px-3 py-4 text-center text-[11px] text-gray-400">
                            등록된 첨부파일이 없습니다.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {attachmentRows.map(({ attachment, storedIndex }) => {
                              const attachmentName = getAttachmentName(attachment)
                              const uploadedAt = typeof attachment === 'string' ? null : attachment.uploadedAt
                              const readOnly = isReadonlyAttachment(attachment)
                              return (
                                <li
                                  key={`${attachmentName}-${storedIndex}`}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAttachmentOpen(attachment)}
                                      className="min-w-0 truncate text-left text-xs font-medium text-gray-700 underline-offset-2 hover:text-gray-950 hover:underline"
                                    >
                                      {attachmentName}
                                    </button>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {uploadedAt && <span className="text-[10px] text-gray-300">{uploadedAt}</span>}
                                    {readOnly ? (
                                      <span className="rounded-md border border-gray-100 px-2 py-1 text-[11px] text-gray-300">
                                        수정 불가
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleAttachmentDelete(storedIndex)}
                                        className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                      >
                                        삭제
                                      </button>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                      {(purchaseProofAttachmentRows.length > 0 || canEditPurchaseProofAttachments) && (
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-gray-400">구매증빙 첨부파일</p>
                            {canEditPurchaseProofAttachments && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => purchaseProofInputRef.current?.click()}
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
                                >
                                  이미지 등록
                                </button>
                                <input
                                  ref={purchaseProofInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={handlePurchaseProofAttachmentRegister}
                                />
                              </>
                            )}
                          </div>
                          <div className="overflow-hidden rounded-xl border border-gray-100">
                            {purchaseProofAttachmentRows.length === 0 ? (
                              <div className="px-3 py-4 text-center text-[11px] text-gray-400">
                                등록된 구매증빙 첨부파일이 없습니다.
                              </div>
                            ) : (
                              <ul className="divide-y divide-gray-100">
                                {purchaseProofAttachmentRows.map(({ attachment, storedIndex }) => {
                                  const attachmentName = getAttachmentName(attachment)
                                  const canDelete = canEditPurchaseProofAttachments && storedIndex !== null && !isReadonlyAttachment(attachment)
                                  return (
                                    <li
                                      key={`purchase-proof-${attachmentName}-${storedIndex ?? 'readonly'}`}
                                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleAttachmentOpen(attachment)}
                                        className="min-w-0 truncate text-left text-xs font-medium text-gray-700 underline-offset-2 hover:text-gray-950 hover:underline"
                                      >
                                        {attachmentName}
                                      </button>
                                      <div className="flex shrink-0 items-center gap-2">
                                        {canDelete ? (
                                          <button
                                            type="button"
                                            onClick={() => handleAttachmentDelete(storedIndex)}
                                            className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                          >
                                            삭제
                                          </button>
                                        ) : (
                                          <span className="rounded-md border border-gray-100 px-2 py-1 text-[11px] text-gray-300">
                                            수정 불가
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {shouldShowPickupInfo && (
                    <SectionCard title="회수 정보" editable={false}>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                        {canEditPickupMethod ? (
                          <EditableReceptionField
                            label="회수 방식"
                            value={pickupMethodValue}
                            type="select"
                            options={PICKUP_METHOD_OPTIONS}
                            onSave={value => saveReceptionPatch({
                              receptionMethod: value === 'store' ? 'store' : 'house',
                              pickupTrackingNo: null,
                            })}
                          />
                        ) : (
                          <Field label="회수 방식" value={pickupMethodLabel} />
                        )}
                        <Field label="회수 배송 상태" value={pickupDeliveryStatus} />
                        <Field
                          label="회수 운송사"
                          value={pickupCarrierOptions.find(option => option.value === pickupCarrier)?.label ?? pickupCarrier}
                        />
                        {canEditPickupTrackingNo ? (
                          <EditableReceptionField
                            label="회수 운송장 No."
                            value={ticket.pickupTrackingNo ?? ''}
                            onSave={value => saveReceptionPatch({ pickupTrackingNo: value || null })}
                          />
                        ) : (
                          <Field label="회수 운송장 No." value={pickupTrackingNoLabel} />
                        )}
                        <Field label="PS Office 입고일" value={ticket.hqReceivedAt} />
                      </dl>
                    </SectionCard>
                  )}


                  <SectionCard title="수리 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="본사 입고일" value={ticket.hqReceivedAt} />
                      <EditableReceptionField
                        label="출고 예정일"
                        value={ticket.expectedShipAt}
                        type="date"
                        onSave={value => saveRepairPatch({ expectedShipAt: value || null })}
                      />
                      {isPartsRequest ? (
                        <PartRequestItemsField ticket={ticket} />
                      ) : (
                        <>
                          <EditableTagField
                            label="현상 유형"
                            values={repairSymptomTags}
                            options={REPAIR_SYMPTOM_OPTIONS}
                            onChange={values => saveRepairPatch({ symptom: values.join(', ') || null })}
                          />
                          <EditableTagField
                            label="현상 부위"
                            values={repairPartTags}
                            options={REPAIR_PART_OPTIONS}
                            onChange={values => saveRepairPatch({ repairPartTags: values })}
                          />
                          <EditableTagField
                            label="문제 유형"
                            values={repairIssueTypeTags}
                            options={REPAIR_ISSUE_TYPE_OPTIONS}
                            onChange={values => saveRepairPatch({ repairIssueTypeTags: values })}
                          />
                          <EditableTagField
                            label="문제 부위"
                            values={repairIssueAreaTags}
                            options={REPAIR_ISSUE_AREA_OPTIONS}
                            onChange={values => saveRepairPatch({ repairIssueAreaTags: values })}
                          />
                          {isTotalCareTicket && (
                            <EditableReceptionField
                              label="케어요청사항"
                              value={careRequest}
                              type="select"
                              options={totalCareFittingOptions}
                              onSave={value => saveRepairPatch({ careRequest: value || null })}
                            />
                          )}
                        </>
                      )}
                      <EditableReceptionField
                        label="렌즈 유형"
                        value={lensType}
                        type="select"
                        options={LENS_TYPE_OPTIONS}
                        onSave={value => saveRepairPatch({ lensType: value === '-' ? null : value })}
                      />
                      <EditableReceptionField
                        label="수리 진행처"
                        value={ticket.repairDepartment}
                        type="select"
                        options={REPAIR_DEPARTMENT_OPTIONS}
                        disabled={repairPricingLocked}
                        disabledReason="가격 결정 후에는 수정할 수 없습니다."
                        onSave={value => saveRepairPatch({ repairDepartment: value })}
                      />
                      <EditableReceptionField
                        label="수리 내용"
                        value={repairDetailValue}
                        type="select"
                        options={REPAIR_DETAIL_OPTIONS}
                        disabled={repairPricingLocked}
                        disabledReason="가격결정 완료 후에는 수정할 수 없습니다."
                        onSave={value => saveRepairPatch({ repairDetail: value === '-' ? '' : value })}
                      />
                      {isReplacementExchangeTicket && (
                        <ProductSearchReceptionField
                          label="교체 제품"
                          value={ticket.replacementProductCode}
                          products={PRODUCT_SNAPSHOTS}
                          disabled={repairPricingLocked}
                          disabledReason="가격결정 완료 후에는 수정할 수 없습니다."
                          onSelect={product => {
                            if (!product) {
                              saveRepairPatch({
                                replacementProductCode: null,
                                replacementProductName: null,
                                replacementProductRetailPrice: null,
                              })
                              return
                            }
                            saveRepairPatch({
                              replacementProductCode: product.productCode,
                              replacementProductName: product.name,
                              replacementProductRetailPrice: getProductOnlyRetailPrice(product),
                            })
                          }}
                        />
                      )}
                      {isNoRepairTicket && (
                        <EditableReceptionField
                          label="수리불가 판정 결과"
                          value={noRepairReason ?? '-'}
                          type="select"
                          options={NO_REPAIR_REASON_OPTIONS}
                          onSave={value => saveRepairPatch({
                            noRepairReason: value === '-' ? null : value as Ticket['noRepairReason'],
                          })}
                        />
                      )}
                      {!isPartsRequest
                        && !isNoRepairDetail(repairDetailValue)
                        && (!isReplacementExchangeTicket || selectedReplacementProduct) && (
                        <RepairPricingInlinePanel
                          ticket={ticket}
                          retailPrice={repairPricingRetailPrice}
                          defaultCurrency={repairPricingCurrency}
                          pricingProductName={isReplacementExchangeTicket ? selectedReplacementProduct?.name : undefined}
                          showPickupFreight={showPickupFreightCharge}
                          showCustomsDuty={showCustomsDutyCharge}
                          disabled={repairPricingLocked}
                          disabledReason="가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다."
                          onDecision={patch => {
                            if (isReplacementExchangeTicket && !selectedReplacementProduct) {
                              showToast('교체 제품을 선택해 주세요.', false)
                              return
                            }
                            saveRepairPatch(patch)
                          }}
                          onInvalid={message => showToast(message, false)}
                        />
                      )}
                      {!isPartsRequest && isReplacementExchangeTicket && !selectedReplacementProduct && (
                        <div className="col-span-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                          교체 제품을 선택하면 해당 제품 소비자가를 기준으로 수리유형을 결정할 수 있습니다.
                        </div>
                      )}
                      {isNoRepairTicket && (
                        <>
                          <EditableReceptionField
                            label="수리비용 결정"
                            value={ticket.repairChargeType ?? '-'}
                            type="select"
                            options={getRepairChargeOptions(ticket)}
                            disabled={repairPricingLocked}
                            disabledReason="가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다."
                            onSave={value => {
                              if (value === '-') return
                              saveRepairPatch({ repairChargeType: value as Ticket['repairChargeType'] })
                            }}
                          />
                          <EditableReceptionField
                            label="수리 비용"
                            value={String(soInfo.repairCost)}
                            type="text"
                            disabled={repairPricingLocked}
                            disabledReason="가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다."
                            onSave={value => saveRepairPatch({ repairCost: Number(value.replace(/[^\d]/g, '')) || 0 })}
                          />
                        </>
                      )}
                      <EditableReceptionField
                        label="서비스 기술자"
                        value={ticket.technicianId ?? '-'}
                        type="select"
                        options={technicianMemberOptions}
                        onSave={value => saveTicketAssignee('technician', value)}
                      />
                      <EditableReceptionField
                        label="수리 진행일"
                        value={ticket.repairBeginDate}
                        type="date"
                        onSave={value => saveRepairPatch({ repairBeginDate: value || null })}
                      />
                      <Field label="수리 완료일" value={ticket.repairCompletedAt} />
                      <EditableReceptionField
                        label="협력업체 출고일"
                        value={ticket.factoryForwardingDate}
                        type="date"
                        onSave={value => saveRepairPatch({ factoryForwardingDate: value || null })}
                      />
                      <EditableReceptionField
                        label="협력업체 입고일"
                        value={ticket.factoryReceivingDate}
                        type="date"
                        onSave={value => saveRepairPatch({ factoryReceivingDate: value || null })}
                      />
                      <EditableReceptionField
                        label="재수리 사유"
                        value={repairAgainReason}
                        type="select"
                        options={RE_REPAIR_REASON_OPTIONS}
                        disabled={repairPricingLocked}
                        disabledReason="유/무상 결정 후에는 수정할 수 없습니다."
                        onSave={value => saveRepairPatch({
                          repairAgainReason: value === '-' ? null : value,
                          ...(value === '-' ? {} : { reRepairYn: 'Y' as const }),
                        })}
                      />
                      <ToggleField
                        label="제품 문제 여부"
                        checked={productProblemYn === 'Y'}
                        onChange={checked => saveRepairPatch({ productProblemYn: checked ? 'Y' : 'N' })}
                      />
                      <div className="col-span-2">
                        <EditableReceptionField
                          label="수리 참고사항"
                          value={ticket.repairReference}
                          type="textarea"
                          onSave={value => saveRepairPatch({ repairReference: value || null })}
                        />
                      </div>
                      <div className="col-span-2">
                        <EditableReceptionField
                          label="수리 특이사항"
                          value={ticket.repairSpecialNote}
                          type="textarea"
                          onSave={value => saveRepairPatch({ repairSpecialNote: value || null })}
                        />
                      </div>
                      <div className="col-span-2">
                        <EditableReceptionField
                          label="고객 전달 사항"
                          value={ticket.customerNotice ?? ''}
                          type="textarea"
                          onSave={value => saveRepairPatch({ customerNotice: value || null })}
                        />
                      </div>
                    </dl>
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-gray-400">고객 전달 이미지</p>
                        <button
                          type="button"
                          onClick={() => customerNoticeImageInputRef.current?.click()}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
                        >
                          이미지 등록
                        </button>
                        <input
                          ref={customerNoticeImageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleCustomerNoticeImageRegister}
                        />
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        {customerNoticeImages.length === 0 ? (
                          <div className="px-3 py-4 text-center text-[11px] text-gray-400">
                            등록된 고객 전달 이미지가 없습니다.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {customerNoticeImages.map((image, imageIndex) => {
                              const imageName = getAttachmentName(image)
                              const uploadedAt = typeof image === 'string' ? null : image.uploadedAt
                              return (
                                <li
                                  key={`customer-notice-${imageName}-${imageIndex}`}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAttachmentOpen(image)}
                                    className="min-w-0 truncate text-left text-xs font-medium text-gray-700 underline-offset-2 hover:text-gray-950 hover:underline"
                                  >
                                    {imageName}
                                  </button>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {uploadedAt && <span className="text-[10px] text-gray-300">{uploadedAt}</span>}
                                    <button
                                      type="button"
                                      onClick={() => handleCustomerNoticeImageDelete(imageIndex)}
                                      className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  {/* 결제 정보 카드 */}
                  <SectionCard title="결제 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="결제 완료 여부" value={PAYMENT_META[ticket.paymentCompleted]} />
                      <Field label="결제 일시" value={ticket.paymentDate ? `${ticket.paymentDate} (KST)` : undefined} />
                      <Field label="결제 수단" value="-" />
                      <Field label="결제 승인 번호" value={soInfo.paymentApprovalNo} />
                      <Field label="결제 만료기한" value={ticket.paymentExpiresAt} />
                      <Field label="결제 취소 상태" value={ticket.paymentCompleted === 'C' ? '취소' : '-'} />
                    </dl>
                  </SectionCard>

                  {/* 상담 카드 */}
                  <SectionCard title="상담" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <EditableReceptionField
                        label="상담 티켓"
                        value={ticket.consultationTicketNo ?? ''}
                        onSave={value => saveConsultationPatch({ consultationTicketNo: value || null })}
                      />
                      <ToggleField
                        label="상담 희망 여부"
                        checked={consultationRequestedYn === 'Y'}
                        disabled={consultationCompleted}
                        disabledReason={consultationLockedReason}
                        onChange={checked => saveConsultationPatch({ consultationRequestedYn: checked ? 'Y' : 'N' })}
                      />
                      <EditableReceptionField
                        label="Outbound 유형"
                        value={outboundType}
                        type="select"
                        options={OUTBOUND_TYPE_OPTIONS}
                        disabled={consultationCompleted}
                        disabledReason={consultationLockedReason}
                        onSave={value => saveConsultationPatch({ outboundType: value })}
                      />
                      <EditableReceptionField
                        label="상담 담당자"
                        value={ticket.consultationManager ?? ''}
                        type="select"
                        options={consultationManagerOptions}
                        disabled={consultationCompleted}
                        disabledReason={consultationLockedReason}
                        onSave={value => saveConsultationPatch({ consultationManager: value || null })}
                      />
                      <EditableReceptionField
                        label="상담 상태"
                        value={consultationStatus}
                        type="select"
                        options={CONSULTATION_STATUS_OPTIONS}
                        disabled={consultationCompleted}
                        disabledReason={consultationLockedReason}
                        onSave={value => saveConsultationPatch({ consultationStatus: value === '-' ? null : value })}
                      />
                      <EditableReceptionField
                        label="상담일"
                        value={dateInputValue(ticket.consultationCompletedAt)}
                        type="date"
                        onSave={value => saveConsultationPatch({
                          consultationCompletedAt: mergeDateWithExistingTime(value, ticket.consultationCompletedAt),
                        })}
                      />
                      <div className="col-span-2">
                        <EditableReceptionField
                          label="수리 전달 사항"
                          value={ticket.consultationRepairMemo ?? ''}
                          type="textarea"
                          onSave={value => saveConsultationPatch({ consultationRepairMemo: value || null })}
                        />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 출고 정보 카드 */}
                  <SectionCard title="출고 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="출고 유형" value={outboundDeliveryTypeLabel} />
                      <EditableReceptionField
                        label="출고방식"
                        value={normalizedShippingMethod}
                        type="select"
                        options={MANUAL_SHIPPING_METHOD_OPTIONS}
                        {...outboundShipmentEditProps}
                        onSave={value => saveShippingPatch({ shippingMethod: value })}
                      />
                      <div className="col-span-2">
                        {!isHomeDeliveryOutbound && !outboundShipmentLocked ? (
                          <StorePickerField
                            label="출고 매장"
                            value={ticket.receptionStoreName || findReceptionStore(ticket)?.name || ticket.receptionPlace}
                            stores={STORES}
                            onSave={store => saveShippingPatch({ receptionStoreName: store?.name ?? null, receptionStoreCode: store?.code ?? null })}
                          />
                        ) : (
                          <Field label={!isHomeDeliveryOutbound ? '출고 매장' : '출고 정보'} value={outboundDeliveryInfo} />
                        )}
                      </div>
                      <Field label="출고 완료 여부" value={shipmentCompletedYn} />
                      <Field label="출고 완료일" value={shipmentCompletedAt} />
                      <Field label="운송사" value={outboundCarrier} />
                      <Field label="배송 완료 여부" value={deliveryCompletedYn} />
                      <Field label="배송 일자" value={deliveredAt} />
                      <Field label="등기 번호" value={ticket.trackingNo} />
                      {shouldShowStorePickupFields && (
                        <>
                          <Field label="고객 픽업 여부" value={storePickupCompletedYn} />
                          <Field label="고객 픽업 일자" value={storePickupCompletedAt} />
                        </>
                      )}
                      {shouldShowOverseasStoreInvoiceFields && (
                        <>
                          <Field label="HQ Invoice No." value={ticket.hqInvoiceNo} />
                          <Field label="법인 Invoice No." value={ticket.corporateInvoiceNo} />
                          <Field label="법인 출고 완료일" value={ticket.corporateShippedAt} />
                        </>
                      )}
                      <EditableReceptionField
                        label="재수출 이행 조건"
                        value={ticket.reexportCondition}
                        type="select"
                        options={YN_OPTIONS}
                        onSave={value => saveShippingPatch({ reexportCondition: value === 'Y' ? 'Y' : 'N' })}
                      />
                    </dl>
                  </SectionCard>
              </div>
            )}

            {activeTab === 'pricing' && (
              <PricingDecisionPanel
                ticket={ticket}
                guide={pricingGuide}
                currentChargeType={ticket.repairChargeType}
                currentCost={pricingCost}
                disabled={repairPricingLocked}
                disabledReason="가격결정 완료 후에는 수리 비용 결정을 수정할 수 없습니다."
                onDecision={(chargeType, amount, items, externalPricingYn, externalQuote) => {
                  if (chargeType === 'PAID' && amount <= 0) {
                    showToast('유상 가격을 입력해 주세요.', false)
                    return
                  }
                  saveRepairPatch({
                    repairChargeType: chargeType,
                    repairCost: chargeType === 'FREE' ? 0 : amount,
                    pricingItems: items,
                    externalPricingYn,
                    ...externalQuote,
                  })
                }}
              />
            )}
            {activeTab === 'kakao' && (
              <MessageTemplatePanel ticket={ticket} channel="kakao" enabled={kakaoEnabled} />
            )}
            {activeTab === 'email' && (
              <MessageTemplatePanel ticket={ticket} channel="email" />
            )}
            {activeTab === 'history' && (
              <ChangeHistoryPanel logs={changeLogs} />
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
