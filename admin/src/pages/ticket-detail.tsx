import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Barcode, ChevronDown, ExternalLink, History, Mail, MessageSquare, Package, RotateCcw, ScanLine, Search, Send, X } from 'lucide-react'
import { BRANCHES, MEMBERS, PRODUCTS as PRODUCT_SNAPSHOTS, STORES } from '@/lib/mock-data'
import { createComponentReturnFromTicket, getComponentReturns, getCustomersWithOverrides, getTicketsWithExtras, updatePrototypeTicket } from '@/lib/prototype-storage'
import { COMPONENT_TYPE_OPTIONS } from '@/lib/component-return'
import { getSoDocumentInfo } from '@/lib/ticket-so'
import { useParts } from '@/lib/parts-context'
import { PRODUCT_FACTORY_SELECT_OPTIONS, normalizeProductFactory } from '@/lib/product-factories'
import type { ComponentType, PaymentCompleted, Product, Ticket, TicketReceptionTag, TicketStatus } from '@/lib/types'
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
  PICKUP_WAITING:    { label: '회수 대기 중',      className: 'bg-violet-50 text-violet-700 border-violet-200' },
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

type PurchaseProofValue = NonNullable<Ticket['purchaseProofType']>
type EditableFieldOption = { value: string; label: string }

const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  AUTO: '자동',
  MANUAL: '수동',
}

const PURCHASE_PROOF_OPTIONS: Array<{ value: PurchaseProofValue; label: string }> = [
  { value: '-', label: '-' },
  { value: 'MEMBERSHIP', label: '멤버십' },
  { value: 'WARRANTY_CARD', label: '보증카드' },
  { value: 'RECEIPT', label: '구매 영수증' },
  { value: 'OTHER', label: '기타' },
]

const PICKUP_CARRIER_OPTIONS: EditableFieldOption[] = [
  { value: 'CJ', label: 'CJ대한통운' },
  { value: 'DHL', label: 'DHL' },
]
const US_PICKUP_CARRIER_OPTIONS: EditableFieldOption[] = [
  { value: 'FedEx', label: 'FedEx' },
]
const OUTBOUND_TYPE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '보증확인', label: '보증확인' },
  { value: '타제품교환', label: '타제품교환' },
  { value: '수리불가', label: '수리불가' },
  { value: '일반상담', label: '일반상담' },
  { value: '물품 진위여부 확인', label: '물품 진위여부 확인' },
  { value: '수리 중 내용 변경', label: '수리 중 내용 변경' },
  { value: '수리 중 파손', label: '수리 중 파손' },
  { value: '다중접수', label: '다중접수' },
  { value: '캠페인', label: '캠페인' },
]
const CONSULTATION_STATUS_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '상담대기', label: '상담대기' },
  { value: '부재중', label: '부재중' },
  { value: '회신대기', label: '회신대기' },
  { value: '콜백필요', label: '콜백필요' },
  { value: '상담완료', label: '상담완료' },
]
const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const CONSULTATION_MANAGER_OPTIONS: EditableFieldOption[] = [
  { value: '', label: '-' },
  ...MEMBERS
    .filter(member => member.status === 'active')
    .map(member => ({
      value: `${member.name}(${member.loginId})`,
      label: `${member.name}(${member.loginId})`,
    })),
]
const REPAIR_DEPARTMENT_OPTIONS: EditableFieldOption[] = [
  { value: '본사', label: '본사' },
  { value: '3PL', label: '3PL' },
  { value: '협력업체', label: '협력업체' },
]
const SHIPPING_METHOD_OPTIONS: EditableFieldOption[] = [
  { value: '택배(HQ)', label: '택배(HQ)' },
  { value: '행낭(HQ)', label: '행낭(HQ)' },
  { value: '해외 택배(HQ)', label: '해외 택배(HQ)' },
  { value: '자체 수령(HQ)', label: '자체 수령(HQ)' },
  { value: '퀵(HQ)', label: '퀵(HQ)' },
  { value: '택배(3PL)', label: '택배(3PL)' },
  { value: '해외 택배(3PL)', label: '해외 택배(3PL)' },
]
const REPAIR_DETAIL_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '부품교체', label: '부품교체' },
  { value: '토탈케어', label: '토탈케어' },
  { value: '장식수리', label: '장식수리' },
  { value: '심플리페어', label: '심플리페어' },
  { value: '도금수리', label: '도금수리' },
  { value: '융접수리', label: '융접수리' },
  { value: '제품교환', label: '제품교환' },
  { value: '타제품교환', label: '타제품교환' },
  { value: '부속품제공', label: '부속품제공' },
  { value: '미입금발송', label: '미입금발송' },
  { value: '수리불가', label: '수리불가' },
  { value: '수리취소', label: '수리취소' },
  { value: '환불', label: '환불' },
]
const REPAIR_CHARGE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: 'PAID', label: '유상' },
  { value: 'FREE', label: '무상' },
]
const LENS_TYPE_OPTIONS: EditableFieldOption[] = [
  { value: '-', label: '-' },
  { value: '미삽입', label: '미삽입' },
  { value: '제품의 기존 렌즈', label: '제품의 기존 렌즈' },
  { value: '별도로 제작한 렌즈', label: '별도로 제작한 렌즈' },
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
  '제품 파손 · 변형',
  '장식 문제',
  '부속품 교체',
  '부속품 요청',
  '제품 결함 · 이상 확인요청',
  '그 외 문제',
  '부품 분실',
  '매장/SIS 파손',
  '가품',
]
const REPAIR_ISSUE_AREA_OPTIONS = [
  '경첩', '나사', '렌즈', '리벳', '림 고리', '슬렉스', '와이어', '코기둥', '코받침',
  '팁', '프론트', '템플', '프론트 용접부', '템플 용접부', '프론트 접합부',
  '템플 접합부', '프론트 장식', '템플 장식', '템플팁 장식',
]
const REPAIR_ISSUE_TYPE_OPTIONS = [
  '박리', '변형', '부식', '유격', '탈락', '파손', '마모', '변색', '이염',
  '수축', '백화', '들뜸', '균열', 'UP 불량', '오염', '손상',
]

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

function hasShipmentReadyStatus(ticket: Ticket) {
  return ['READY_TO_SHIP', 'SHIPPING', 'SHIPPED', 'CLOSED'].includes(ticket.status)
}

function hasDeliveryCompletedStatus(ticket: Ticket) {
  return ['SHIPPED', 'CLOSED'].includes(ticket.status)
}

function isOverseasDestination(ticket: Ticket) {
  const country = String(ticket.deliveryCountry ?? '').trim().toUpperCase()
  if (country && !['KR', 'KOR', 'KOREA', '대한민국'].includes(country)) return true
  return isGlobalTicket(ticket)
}

function getNormalizedShippingMethod(ticket: Ticket, receptionMethod: ReturnType<typeof getReceptionMethod>) {
  const raw = String(ticket.shippingMethod ?? '').trim()
  const known = SHIPPING_METHOD_OPTIONS.find(option => option.value === raw)
  if (known) return known.value
  if (/퀵/.test(raw)) return '퀵(HQ)'
  if (/자체/.test(raw)) return '자체 수령(HQ)'

  const is3pl = /3PL/i.test(`${ticket.repairDepartment} ${raw}`)
  const overseas = isOverseasDestination(ticket)
  if (is3pl) return overseas ? '해외 택배(3PL)' : '택배(3PL)'
  if (overseas) return '해외 택배(HQ)'
  if (receptionMethod === 'store') return '행낭(HQ)'
  return '택배(HQ)'
}

function getOutboundCarrier(ticket: Ticket, normalizedShippingMethod: string) {
  if (normalizedShippingMethod.includes('행낭')) return '성화기업'
  if (normalizedShippingMethod.includes('해외')) return isUsTicket(ticket) ? 'FedEx' : 'DHL'
  if (normalizedShippingMethod.includes('택배')) return 'CJ'
  return '-'
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

function getHqTrackingNo(ticket: Ticket, normalizedShippingMethod: string) {
  if (ticket.hqTrackingNo) return ticket.hqTrackingNo
  if (!normalizedShippingMethod.includes('HQ')) return null
  return ticket.trackingNo
}

function isGlobalTicket(ticket: Ticket) {
  return ticket.branchCode === 'C1002' || /Global|US|DHL|FedEx/i.test(`${ticket.receptionPlace} ${ticket.shippingMethod}`)
}

function isUsTicket(ticket: Ticket) {
  return ticket.branchCode === 'C1002' || /US|U\.S\.A|IICOMBINED|FedEx|미국/i.test(`${ticket.receptionPlace} ${ticket.shippingMethod}`)
}

function getDefaultPickupCarrier(ticket: Ticket) {
  if (isUsTicket(ticket)) return 'FedEx'
  if (isGlobalTicket(ticket)) return 'DHL'
  return 'CJ'
}

function parsePickupTrackingNo(ticket: Ticket, value?: string | null) {
  const raw = String(value ?? '').trim()
  const defaultCarrier = getDefaultPickupCarrier(ticket)
  if (!raw) return { carrier: defaultCarrier, trackingNo: '' }

  const carrierMatch = raw.match(/^(FedEx|DHL|CJ대한통운|CJ)\s*/i)
  if (!carrierMatch) return { carrier: defaultCarrier, trackingNo: raw }

  const matchedCarrier = carrierMatch[1].toLowerCase()
  const carrier = matchedCarrier.startsWith('fedex') ? 'FedEx' : matchedCarrier.startsWith('dhl') ? 'DHL' : 'CJ'
  return {
    carrier,
    trackingNo: raw.slice(carrierMatch[0].length).trim(),
  }
}

function shouldHavePickup(ticket: Ticket) {
  return ticket.reRepairYn === 'Y' || getReceptionMethod(ticket) === 'house' || ticket.status === 'PICKUP_WAITING'
}

function getAutoPickupTrackingNo(ticket: Ticket, carrier = getDefaultPickupCarrier(ticket)) {
  const numericSeed = ticket.ticketNo.replace(/\D/g, '')
  if (carrier === 'FedEx') {
    return `FedEx ${numericSeed.slice(-12).padStart(12, '0')}`
  }
  if (carrier === 'DHL') {
    return `DHL JD${numericSeed.slice(-14).padStart(14, '0')}`
  }
  return `CJ ${numericSeed.slice(-12).padStart(12, '0')}`
}

function getPickupTrackingInfo(ticket: Ticket) {
  if (!shouldHavePickup(ticket)) return null
  if (ticket.pickupTrackingNo) return parsePickupTrackingNo(ticket, ticket.pickupTrackingNo)
  if (ticket.trackingNo) {
    return parsePickupTrackingNo(ticket, `${getDefaultPickupCarrier(ticket)} ${ticket.trackingNo}`)
  }
  return parsePickupTrackingNo(ticket, getAutoPickupTrackingNo(ticket))
}

function getUrgentRepairYn(ticket: Ticket) {
  if (ticket.urgentRepairYn) return ticket.urgentRepairYn
  return ticket.reRepairYn === 'Y' || ticket.repairDetail.includes('제품교환') ? 'Y' : 'N'
}

function getPurchaseProofValue(ticket: Ticket): NonNullable<Ticket['purchaseProofType']> {
  if (ticket.purchaseProofType) return ticket.purchaseProofType
  return /온라인|online|my account/i.test(`${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`)
    ? 'MEMBERSHIP'
    : '-'
}

function isOrderHistoryPurchaseInfo(ticket: Ticket) {
  if (ticket.purchaseInfoSource) return ticket.purchaseInfoSource === 'ORDER_HISTORY'
  if (ticket.purchaseProofType) return false
  return /온라인|online|my account/i.test(`${ticket.receptionTitle ?? ''} ${ticket.receptionPlace}`)
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

function normalizeProductText(value?: string | null) {
  return String(value ?? '').replace(/\s/g, '').toLowerCase()
}

function findProductForTicket(ticket: Ticket, products: Product[]) {
  const ticketProductCode = ticket.productCode?.trim()
  if (ticketProductCode) {
    const productByCode = products.find(product => product.productCode === ticketProductCode)
    if (productByCode) return productByCode
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
  if (value === '용접수리') return '융접수리'
  if (value === '젠틀케어') return '토탈케어'
  if (value === '심플케어') return '심플리페어'
  return value
}

function normalizeSymptom(value?: string | null) {
  if (!value) return null
  if (value === '토탈케어') return '토탈 케어 요청'
  if (value === '제품 파손·변형') return '제품 파손 · 변형'
  if (value === '제품 결함/이상') return '제품 결함 · 이상 확인요청'
  if (value === '제품 결함 이상 문의') return '제품 결함 · 이상 확인요청'
  if (value === '부속품 문제') return '부속품 교체'
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
  if (normalizedDetail === '도금수리' || normalizedDetail === '융접수리') return 30000
  if (normalizedDetail === '부품교체') return fallbackCost && fallbackCost > 0 ? fallbackCost : 45000
  return fallbackCost ?? 0
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

function EditableReceptionField({
  label,
  value,
  type = 'text',
  options = [],
  onSave,
}: {
  label: string
  value?: string | null
  type?: 'text' | 'textarea' | 'date' | 'select'
  options?: EditableFieldOption[]
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
    <div className="-m-1 rounded-lg p-1 transition-colors hover:bg-gray-50">
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
          title="더블클릭하여 수정"
          className="min-h-5 cursor-text whitespace-pre-wrap text-sm text-gray-800 underline-offset-4 hover:text-gray-950 hover:underline decoration-dotted"
        >
          {displayValue || '-'}
        </dd>
      )}
    </div>
  )
}

function EditableTagField({
  label,
  values,
  options,
  onChange,
}: {
  label: string
  values: string[]
  options: string[]
  onChange: (values: string[]) => void
}) {
  const [selectOpen, setSelectOpen] = useState(false)
  const availableOptions = options.filter(option => !values.includes(option))

  function removeTag(value: string) {
    onChange(values.filter(item => item !== value))
  }

  function addTag(value: string) {
    if (!value) return
    onChange([...values, value])
    setSelectOpen(false)
  }

  return (
    <div className="-m-1 rounded-lg p-1 transition-colors hover:bg-gray-50">
      <dt className="text-[11px] font-medium text-gray-400 mb-1">{label}</dt>
      <dd
        className="min-h-7"
        onDoubleClick={() => setSelectOpen(true)}
        title="더블클릭하여 추가"
      >
        <div className="flex flex-wrap gap-1.5">
          {values.length > 0 ? values.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => removeTag(value)}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="클릭하여 제거"
            >
              {value}
            </button>
          )) : (
            <span className="text-sm text-gray-400">-</span>
          )}
          {!selectOpen && (
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
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
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
  editable = true,
  onEdit,
}: {
  title: string
  children: React.ReactNode
  editLabel?: string
  editable?: boolean
  onEdit?: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
  const [componentReturnModalOpen, setComponentReturnModalOpen] = useState(false)
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType>('NONE')
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [componentReturnCreated, setComponentReturnCreated] = useState(false)
  const [, setTicketRevision] = useState(0)
  const [detailScanValue, setDetailScanValue] = useState('')
  const [detailScanError, setDetailScanError] = useState(false)
  const detailScanInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<number | null>(null)
  const { parts } = useParts()
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

  useEffect(() => {
    if (!ticket) return
    const hasConsultationRequest = ticket.consultationRequestedYn === 'Y' || Boolean(ticket.outboundType && ticket.outboundType !== '-')
    const terminalStatus = ticket.status === 'CLOSED' || ticket.status === 'CANCELED'
    if (hasConsultationRequest && ticket.status !== 'JUDGEMENT_PENDING' && !terminalStatus) {
      updatePrototypeTicket(ticket.ticketNo, { status: 'JUDGEMENT_PENDING' })
      setTicketRevision(revision => revision + 1)
    }
  }, [ticket?.consultationRequestedYn, ticket?.outboundType, ticket?.status, ticket?.ticketNo])

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
  const customerCountry = (mappedCustomer?.country || (ticket.branchCode === 'C1002' ? 'US' : 'KR')).slice(0, 2).toUpperCase()
  const customerMarketingAgree = mappedCustomer?.marketingAgree ?? '-'
  const customerPrivacyAgree = mappedCustomer ? 'Y' : '-'
  const fallbackReceivingAddress = mappedCustomer?.addresses?.find(address => address.isDefault) ?? mappedCustomer?.addresses?.[0]
  const receivingInfo = formatReceivingInfo(ticket, fallbackReceivingAddress)
  const normalizedShippingMethod = getNormalizedShippingMethod(ticket, receptionMethod)
  const shipmentCompletedYn = getShipmentCompletedYn(ticket)
  const shipmentCompletedAt = getShipmentCompletedAt(ticket)
  const deliveryCompletedYn = getDeliveryCompletedYn(ticket)
  const deliveredAt = getDeliveredAt(ticket)
  const storePickupCompletedYn = getStorePickupCompletedYn(ticket, receptionMethod)
  const storePickupCompletedAt = getStorePickupCompletedAt(ticket, receptionMethod)
  const hqTrackingNo = getHqTrackingNo(ticket, normalizedShippingMethod)
  const outboundCarrier = getOutboundCarrier(ticket, normalizedShippingMethod)
  const pickupTrackingInfo = getPickupTrackingInfo(ticket)
  const pickupCarrier = pickupTrackingInfo?.carrier ?? getDefaultPickupCarrier(ticket)
  const pickupTrackingNo = pickupTrackingInfo?.trackingNo ?? ''
  const pickupCarrierOptions = isUsTicket(ticket) ? US_PICKUP_CARRIER_OPTIONS : PICKUP_CARRIER_OPTIONS
  const urgentRepairYn = getUrgentRepairYn(ticket)
  const purchaseProofValue = getPurchaseProofValue(ticket)
  const purchaseProofLabel = PURCHASE_PROOF_OPTIONS.find(option => option.value === purchaseProofValue)?.label ?? purchaseProofValue
  const canEditPurchaseInfo = !isOrderHistoryPurchaseInfo(ticket)
  const customerRequest = ticket.customerRequest || '수리 전 상태와 비용을 확인한 뒤 진행해 주세요.'
  const attachments = ticket.attachments ?? ['고객 첨부 이미지 1', '구매 증빙 이미지 1']
  const outboundType = ticket.outboundType || '-'
  const consultationRequestedYn = ticket.consultationRequestedYn ?? (outboundType !== '-' ? 'Y' : 'N')
  const consultationRequestLocked = consultationRequestedYn === 'Y'
  const consultationStatus = ticket.consultationStatus || (consultationRequestedYn === 'Y' ? '상담대기' : '-')
  const matchedProduct = findProductForTicket(ticket, PRODUCT_SNAPSHOTS)
  const matchedProductParts = matchedProduct ? parts.filter(part => part.productCode === matchedProduct.productCode) : []
  const productMidCategory = ticket.productMidCategory ?? matchedProduct?.midCategory ?? null
  const productSubCategory = ticket.productSubCategory ?? matchedProduct?.subCategory ?? null
  const productStockAvailableYn = ticket.productStockAvailableYn ?? (matchedProduct ? ynLabel(hasAvailableStock(matchedProduct)) : null)
  const productRestorationRepairYn = ticket.productRestorationRepairYn ?? (matchedProduct ? ynLabel(isRestorationRepairProduct(matchedProduct)) : null)
  const productDecorationYn = ticket.productDecorationYn ?? (matchedProduct ? ynLabel(Boolean(matchedProduct.hasDecoration)) : null)
  const productLaunchDate = ticket.productLaunchDate ?? matchedProduct?.releaseDate ?? null
  const productSerialNumber = ticket.productSerialNumber ?? ticket.serialNumber ?? null
  const productFactory1 = normalizeProductFactory(ticket.productFactory1 ?? ticket.productFactory ?? matchedProduct?.factory1)
  const productFactory2 = normalizeProductFactory(ticket.productFactory2 ?? matchedProduct?.factory2)
  const productFactory3 = normalizeProductFactory(ticket.productFactory3 ?? matchedProduct?.factory3)
  const repairDetailValue = normalizeRepairDetail(ticket.repairDetail)
  const repairSymptomTags = splitTagText(ticket.symptom)
  const repairPartTags = ticket.repairPartTags ?? defaultRepairParts(ticket)
  const repairIssueAreaTags = ticket.repairIssueAreaTags ?? repairPartTags.map(part => part.replace(/\((R|L)\)/, ''))
  const repairIssueTypeTags = ticket.repairIssueTypeTags ?? defaultIssueTypes(ticket)
  const productProblemYn = ticket.productProblemYn ?? (repairIssueTypeTags.length > 0 ? 'Y' : 'N')
  const lensType = getLensType(ticket)
  const careRequest = ticket.careRequest || (repairDetailValue.includes('케어') ? repairDetailValue : null)
  const repairAgainReason = ticket.repairAgainReason || '-'

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleDetailBarcodeScan() {
    const value = detailScanValue.trim()
    if (!value) {
      detailScanInputRef.current?.focus()
      return
    }

    if (value !== currentTicket.ticketNo) {
      setDetailScanError(true)
      showToast('현재 티켓과 바코드가 일치하지 않습니다.', false)
      detailScanInputRef.current?.focus()
      return
    }

    setDetailScanValue('')
    setDetailScanError(false)
    showToast('바코드가 확인되었습니다. 상태 검증을 진행합니다.')
    detailScanInputRef.current?.focus()
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
    const record = createComponentReturnFromTicket(ticket, selectedComponentType)
    setComponentReturnCreated(true)
    setComponentReturnModalOpen(false)
    navigate(`/${langCode}/shipping/component-returns`, {
      state: { componentReturnId: record.id },
    })
  }

  function saveReceptionPatch(patch: Partial<Ticket>) {
    const nextReRepairYn = patch.reRepairYn ?? currentTicket.reRepairYn ?? 'N'
    const isReRepair = nextReRepairYn === 'Y'
    const nextPatch: Partial<Ticket> = { ...patch, reRepairYn: nextReRepairYn }

    if (isReRepair) {
      nextPatch.urgentRepairYn = 'Y'
      nextPatch.status = 'PICKUP_WAITING'
      if (!nextPatch.pickupTrackingNo && !currentTicket.pickupTrackingNo && !pickupTrackingNo) {
        nextPatch.pickupTrackingNo = getAutoPickupTrackingNo(currentTicket, pickupCarrier)
      }
    }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    setTicketRevision(revision => revision + 1)
    showToast(isReRepair
      ? '접수 정보가 저장되었습니다. 재수리 건은 회수 대기 중 상태와 긴급수리 Y로 적용됩니다.'
      : '접수 정보가 저장되었습니다.'
    )
  }

  function saveConsultationPatch(patch: Partial<Ticket>) {
    const currentOutboundType = currentTicket.outboundType ?? '-'
    const currentConsultationRequestedYn = currentTicket.consultationRequestedYn ?? (currentOutboundType !== '-' ? 'Y' : 'N')
    if (currentConsultationRequestedYn === 'Y' && patch.consultationRequestedYn === 'N') {
      showToast('상담 희망 여부 Y는 변경할 수 없습니다.')
      return
    }

    const nextOutboundType = patch.outboundType ?? currentTicket.outboundType ?? '-'
    const nextConsultationRequestedYn = patch.consultationRequestedYn ?? currentTicket.consultationRequestedYn ?? (nextOutboundType && nextOutboundType !== '-' ? 'Y' : 'N')
    const nextConsultationStatus = patch.consultationStatus ?? currentTicket.consultationStatus
    const nextPatch: Partial<Ticket> = {
      ...patch,
      outboundType: nextOutboundType === '-' ? null : nextOutboundType,
      consultationRequestedYn: nextConsultationRequestedYn,
    }

    if (nextOutboundType !== '-') {
      nextPatch.consultationRequestedYn = 'Y'
      if (!nextConsultationStatus) nextPatch.consultationStatus = '상담대기'
    }

    if (patch.consultationRequestedYn === 'Y' && !nextConsultationStatus) {
      nextPatch.consultationStatus = '상담대기'
    }

    if (nextPatch.consultationRequestedYn === 'Y') {
      nextPatch.status = 'JUDGEMENT_PENDING'
    }

    if (patch.consultationStatus === '상담완료') {
      nextPatch.consultationManager = CURRENT_ADMIN_LABEL
      if (!currentTicket.consultationCompletedAt) {
        nextPatch.consultationCompletedAt = nowLocalText()
      }
    }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    setTicketRevision(revision => revision + 1)
    showToast('상담 정보가 저장되었습니다.')
  }

  function saveRepairPatch(patch: Partial<Ticket>) {
    const nextPatch: Partial<Ticket> = { ...patch }
    const nextRepairDetail = normalizeRepairDetail(patch.repairDetail ?? currentTicket.repairDetail)
    const nextRepairChargeType = patch.repairChargeType ?? currentTicket.repairChargeType ?? soInfo.repairChargeType

    if (patch.repairChargeType === 'FREE') {
      nextPatch.repairCost = 0
    }

    if (patch.repairChargeType === 'PAID') {
      nextPatch.repairCost = estimateRepairCost(nextRepairDetail, currentTicket.repairCost ?? soInfo.repairCost)
    }

    if (patch.repairDetail && nextRepairChargeType === 'PAID') {
      nextPatch.repairCost = estimateRepairCost(nextRepairDetail, currentTicket.repairCost ?? soInfo.repairCost)
    }

    if (patch.repairAgainReason && patch.repairAgainReason !== '-') {
      nextPatch.reRepairYn = 'Y'
    }

    if (patch.repairIssueTypeTags) {
      nextPatch.productProblemYn = patch.repairIssueTypeTags.length > 0 ? 'Y' : 'N'
    }

    updatePrototypeTicket(currentTicket.ticketNo, nextPatch)
    setTicketRevision(revision => revision + 1)
    showToast('수리 정보가 저장되었습니다.')
  }

  function saveShippingPatch(patch: Partial<Ticket>) {
    updatePrototypeTicket(currentTicket.ticketNo, patch)
    setTicketRevision(revision => revision + 1)
    showToast('출고 정보가 저장되었습니다.')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '개요' },
    { id: 'pricing',  label: '가격결정' },
    { id: 'kakao',    label: '알림톡 발송내역' },
    { id: 'email',    label: '메일 발송내역' },
  ]

  return (
    <div className="mx-auto min-w-0 w-full max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="relative flex justify-center py-1 sm:justify-end">
          <div className={`flex h-9 w-full max-w-[320px] items-center gap-2 rounded-full border bg-white/95 px-3 shadow-sm backdrop-blur transition-colors ${
              detailScanError
                ? 'border-red-300 text-red-500 focus-within:border-red-400'
                : 'border-gray-200 bg-gray-50 focus-within:border-gray-400 focus-within:bg-white'
            }`}>
              <ScanLine className={`h-3.5 w-3.5 flex-shrink-0 ${detailScanError ? 'text-red-400' : 'text-gray-400'}`} />
              <input
                ref={detailScanInputRef}
                type="text"
                value={detailScanValue}
                placeholder="바코드 스캔"
                autoFocus
                onChange={event => {
                  setDetailScanValue(event.target.value)
                  setDetailScanError(false)
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleDetailBarcodeScan()
                  }
                }}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-gray-800 placeholder:font-sans placeholder:text-gray-300 focus:outline-none"
              />
              {detailScanValue && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailScanValue('')
                    setDetailScanError(false)
                    detailScanInputRef.current?.focus()
                  }}
                  className="text-gray-300 transition-colors hover:text-gray-500"
                  aria-label="스캔값 지우기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Enter</span>
          </div>
          {detailScanError && (
            <p className="absolute right-0 top-11 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500 shadow-sm">
              현재 티켓과 일치하지 않습니다.
            </p>
          )}
        </div>

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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">

                {/* 상세 정보 카드 */}
                <div className="space-y-4">

                  {/* 접수 정보 카드 */}
                  <SectionCard title="접수 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="접수일" value={`${ticket.receivedAt} (KST)`} />
                      <Field label="접수처 유형" value={receptionChannel} />
                      <Field label="접수처" value={ticket.receptionPlace} />
                      {shouldShowReceptionContact && (
                        <Field label="담당자 연락처" value={receptionContact} />
                      )}
                      {pickupTrackingInfo && (
                        <>
                          <Field
                            label="픽업 택배사"
                            value={pickupCarrierOptions.find(option => option.value === pickupCarrier)?.label ?? pickupCarrier}
                          />
                          <Field label="픽업 운송장 No." value={pickupTrackingNo} />
                        </>
                      )}
                      <Field label="B2C 여부(법인용)" value={soInfo.b2cYn} />
                      <ToggleField
                        label="재수리 여부"
                        checked={(ticket.reRepairYn ?? 'N') === 'Y'}
                        onChange={checked => saveReceptionPatch({ reRepairYn: checked ? 'Y' : 'N' })}
                      />
                      <ToggleField
                        label="긴급수리 여부"
                        checked={urgentRepairYn === 'Y'}
                        onChange={checked => saveReceptionPatch({ urgentRepairYn: checked ? 'Y' : 'N' })}
                      />
                      <TicketLinkField
                        label="기존 티켓번호"
                        ticketNo={ticket.originalTicketNo}
                        onClick={originalTicketNo => navigate(`/${langCode}/tickets/${originalTicketNo}`)}
                      />
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
                          value={ticket.purchaseDate || '2026-05-12'}
                          type="date"
                          onSave={value => saveReceptionPatch({
                            purchaseDate: value || null,
                            purchaseInfoSource: 'ADMIN',
                          })}
                        />
                      ) : (
                        <Field label="구매일" value={ticket.purchaseDate || '2026-05-12'} />
                      )}
                      <div className="col-span-2">
                        {canEditPurchaseInfo ? (
                          <EditableReceptionField
                            label="구매처"
                            value={ticket.purchasePlace || 'GENTLE MONSTER 공식 온라인 스토어'}
                            onSave={value => saveReceptionPatch({
                              purchasePlace: value || null,
                              purchaseInfoSource: 'ADMIN',
                            })}
                          />
                        ) : (
                          <Field label="구매처" value={ticket.purchasePlace || 'GENTLE MONSTER 공식 온라인 스토어'} />
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
                        <div className="flex items-center gap-1.5">
                          <button className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50">
                            이미지 생성
                          </button>
                          <button className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                            이미지 삭제
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((attachment, index) => (
                          <div
                            key={`${attachment}-${index}`}
                            className="flex h-20 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-[11px] text-gray-400"
                          >
                            {attachment}
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  {/* 고객 정보 카드 */}
                  <SectionCard title="고객 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <ClickableField label="이메일" value={ticket.email} onClick={handleCustomerClick} />
                      <Field label="고객명" value={ticket.customerName} />
                      <Field label="전화번호" value={ticket.phone} />
                      <Field label="국가" value={customerCountry} />
                      <Field label="마케팅 동의" value={customerMarketingAgree} />
                      <Field label="개인정보 동의" value={customerPrivacyAgree} />
                      <div className="col-span-2">
                        <Field label="수령 유형" value={receptionMethodLabel} />
                      </div>
                      <div className="col-span-2">
                        <Field label="수령 정보" value={receivingInfo} />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 상담 카드 */}
                  <SectionCard title="상담" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="상담 티켓" value={ticket.consultationTicketNo} />
                      <ToggleField
                        label="상담 희망 여부"
                        checked={consultationRequestedYn === 'Y'}
                        disabled={consultationRequestLocked}
                        onChange={checked => saveConsultationPatch({ consultationRequestedYn: checked ? 'Y' : 'N' })}
                      />
                      <EditableReceptionField
                        label="Outbound 유형"
                        value={outboundType}
                        type="select"
                        options={OUTBOUND_TYPE_OPTIONS}
                        onSave={value => saveConsultationPatch({ outboundType: value })}
                      />
                      <EditableReceptionField
                        label="상담 담당자"
                        value={ticket.consultationManager ?? ''}
                        type="select"
                        options={CONSULTATION_MANAGER_OPTIONS}
                        onSave={value => saveConsultationPatch({ consultationManager: value || null })}
                      />
                      <EditableReceptionField
                        label="상담 상태"
                        value={consultationStatus}
                        type="select"
                        options={CONSULTATION_STATUS_OPTIONS}
                        onSave={value => saveConsultationPatch({ consultationStatus: value === '-' ? null : value })}
                      />
                      <Field
                        label="상담일시"
                        value={ticket.consultationCompletedAt ? `${ticket.consultationCompletedAt} (KST)` : null}
                      />
                      <EditableReceptionField
                        label="예외 처리 분류"
                        value={ticket.consultationExceptionCategory ?? ''}
                        onSave={value => saveConsultationPatch({ consultationExceptionCategory: value || null })}
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

                </div>

                <div className="space-y-4">

                  {/* 제품 정보 카드 */}
                  <SectionCard title="제품 정보" editable={false}>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="제품명" value={matchedProduct?.name ?? ticket.productName} />
                      <Field label="제품 ID" value={matchedProduct?.productCode} />
                      {productSerialNumber ? <Field label="시리얼 번호" value={productSerialNumber} /> : null}
                      <Field label="중분류" value={productMidCategory} />
                      <Field label="소분류" value={productSubCategory} />
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
                        <dt className="mb-2 text-[11px] font-semibold text-gray-500">부속품</dt>
                        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
                          <table className="w-full table-fixed text-left text-xs">
                            <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-400">
                              <tr>
                                <th className="px-3 py-2.5">부속품명</th>
                                <th className="w-24 px-3 py-2.5 text-center">부속품수량</th>
                                <th className="w-40 px-3 py-2.5">부속품 보관위치</th>
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
                                    등록된 부속품 정보가 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 수리 정보 카드 */}
                  <SectionCard title="수리 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="본사 입고일" value={ticket.hqReceivedAt} />
                      <Field label="출고 예정일" value={ticket.expectedShipAt} />
                      <EditableTagField
                        label="현상 부위"
                        values={repairPartTags}
                        options={REPAIR_PART_OPTIONS}
                        onChange={values => saveRepairPatch({ repairPartTags: values })}
                      />
                      <EditableTagField
                        label="현상"
                        values={repairSymptomTags}
                        options={REPAIR_SYMPTOM_OPTIONS}
                        onChange={values => saveRepairPatch({ symptom: values.join(', ') || null })}
                      />
                      <EditableTagField
                        label="문제 부위"
                        values={repairIssueAreaTags}
                        options={REPAIR_ISSUE_AREA_OPTIONS}
                        onChange={values => saveRepairPatch({ repairIssueAreaTags: values })}
                      />
                      <EditableTagField
                        label="문제 유형"
                        values={repairIssueTypeTags}
                        options={REPAIR_ISSUE_TYPE_OPTIONS}
                        onChange={values => saveRepairPatch({ repairIssueTypeTags: values })}
                      />
                      <EditableReceptionField
                        label="케어요청사항"
                        value={careRequest}
                        type="text"
                        onSave={value => saveRepairPatch({ careRequest: value || null })}
                      />
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
                        onSave={value => saveRepairPatch({ repairDepartment: value })}
                      />
                      <EditableReceptionField
                        label="수리 내용"
                        value={repairDetailValue}
                        type="select"
                        options={REPAIR_DETAIL_OPTIONS}
                        onSave={value => saveRepairPatch({ repairDetail: value === '-' ? '' : value })}
                      />
                      <EditableReceptionField
                        label="수리비용 결정"
                        value={ticket.repairChargeType ?? soInfo.repairChargeType}
                        type="select"
                        options={REPAIR_CHARGE_OPTIONS}
                        onSave={value => {
                          if (value === '-') return
                          saveRepairPatch({ repairChargeType: value as Ticket['repairChargeType'] })
                        }}
                      />
                      <EditableReceptionField
                        label="수리 비용"
                        value={String(soInfo.repairCost)}
                        type="text"
                        onSave={value => saveRepairPatch({ repairCost: Number(value.replace(/[^\d]/g, '')) || 0 })}
                      />
                      <Field label="서비스 기술자" value={technicianLabel} />
                      <EditableReceptionField
                        label="수리 진행일"
                        value={ticket.repairBeginDate}
                        type="date"
                        onSave={value => saveRepairPatch({ repairBeginDate: value || null })}
                      />
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
                    </dl>
                  </SectionCard>

                  {/* 결제 정보 카드 */}
                  <SectionCard title="결제 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="결제 완료 여부" value={PAYMENT_META[ticket.paymentCompleted]} />
                      <Field label="결제 일자" value={ticket.paymentDate} />
                      <Field label="결제 수단" value="-" />
                      <Field label="결제 승인 번호" value={soInfo.paymentApprovalNo} />
                      <Field label="결제 만료기한" value={ticket.paymentExpiresAt} />
                      <Field label="결제 취소 상태" value={ticket.paymentCompleted === 'C' ? '취소' : '-'} />
                    </dl>
                  </SectionCard>

                  {/* 출고 정보 카드 */}
                  <SectionCard title="출고 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="출고완료" value={shipmentCompletedYn} />
                      <Field label="출고완료일" value={shipmentCompletedAt} />
                      <EditableReceptionField
                        label="출고방식"
                        value={normalizedShippingMethod}
                        type="select"
                        options={SHIPPING_METHOD_OPTIONS}
                        onSave={value => saveShippingPatch({ shippingMethod: value })}
                      />
                      <Field label="운송사" value={outboundCarrier} />
                      <Field label="배송완료" value={deliveryCompletedYn} />
                      <Field label="배송일자" value={deliveredAt} />
                      <Field label="등기번호" value={ticket.trackingNo} />
                      <Field label="고객픽업여부(매장)" value={storePickupCompletedYn} />
                      <Field label="고객픽업일자(매장)" value={storePickupCompletedAt} />
                      <Field label="HQ 운송장 No." value={hqTrackingNo} />
                      <Field label="법인 출고완료일" value={ticket.corporateShippedAt} />
                      <Field label="법인 운송장 No." value={ticket.corporateTrackingNo} />
                      <Field label="법인 Invoice No." value={ticket.corporateInvoiceNo} />
                      <Field label="HQ Invoice No." value={ticket.hqInvoiceNo} />
                      <Field label="재수출 이행 조건" value={ticket.reexportCondition} />
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
