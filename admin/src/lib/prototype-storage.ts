import {
  COMPONENT_RETURNS,
  CUSTOMERS,
  PART_ORDER_REQUESTS,
  STOCK_ADJUSTMENTS,
  STOCK_LEDGER_ENTRIES,
  STOCK_REQUESTS,
  STOCK_SNAPSHOTS,
  STOCK_TRANSFERS,
  THREE_PL_STO_REQUESTS,
  TICKETS,
  isVisibleGmBranchCode,
  isVisibleGmProductCode,
  isVisibleGmText,
  isVisibleGmTicket,
} from './mock-data'
import { getStockRequestReasonMeta } from './stock-request'
import type {
  ComponentReturn,
  ComponentType,
  Customer,
  CustomerAddress,
  PartOrderRequest,
  StockAdjustment,
  StockAdjustmentStatus,
  StockLedgerEntry,
  StockRequest,
  StockSnapshotRow,
  StockRequestReason,
  StockTransfer,
  StockTransferLine,
  StockTransferStatus,
  ThreePlStoRequest,
  ThreePlStoStatus,
  Ticket,
  TicketChangeLog,
} from './types'

const CUSTOMER_OVERRIDES_KEY = 'ps-admin-customer-overrides'
const EXTRA_TICKETS_KEY = 'ps-admin-extra-tickets'
const CUSTOMER_CANCELLED_TICKETS_KEY = 'ps-customer-cancelled-tickets'
const COMPONENT_RETURNS_KEY = 'ps-admin-component-returns'
const STOCK_REQUESTS_KEY = 'ps-admin-stock-requests-v2'
const PART_ORDER_REQUESTS_KEY = 'ps-admin-part-order-requests'
const STOCK_LEDGER_KEY = 'ps-admin-stock-ledger'
const STOCK_TRANSFERS_KEY = 'ps-admin-stock-transfers'
const STOCK_ADJUSTMENTS_KEY = 'ps-admin-stock-adjustments-v2'
const STOCK_SNAPSHOTS_KEY = 'ps-admin-stock-snapshots'
const THREE_PL_STO_KEY = 'ps-admin-three-pl-sto-v2'
const TICKET_CHANGE_LOGS_KEY = 'ps-admin-ticket-change-logs'

type CustomerOverride = Partial<Omit<Customer, 'id'>>

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function localTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function normalizeTicketWording(ticket: Ticket): Ticket {
  const legacyTotalCareLabel = '\uC820\uD2C0\uCF00\uC5B4'
  if (ticket.repairDetail !== legacyTotalCareLabel) return ticket
  return { ...ticket, repairDetail: '토탈케어' }
}

function getCustomerOverrides() {
  return readJson<Record<string, CustomerOverride>>(CUSTOMER_OVERRIDES_KEY, {})
}

function saveCustomerOverrides(overrides: Record<string, CustomerOverride>) {
  writeJson(CUSTOMER_OVERRIDES_KEY, overrides)
}

export function getCustomersWithOverrides(): Customer[] {
  const overrides = getCustomerOverrides()
  const baseIds = new Set(CUSTOMERS.map(customer => customer.id))
  const mergedBase = CUSTOMERS.map(customer => {
    const override = overrides[customer.id]
    return override
      ? { ...customer, ...override, addresses: override.addresses ?? customer.addresses }
      : { ...customer }
  })

  const extraCustomers = Object.entries(overrides)
    .filter(([id]) => !baseIds.has(id))
    .map(([id, override]) => ({
      id,
      name: override.name ?? '',
      email: override.email ?? '',
      phone: override.phone ?? '',
      country: override.country ?? 'KR',
      branchCode: override.branchCode ?? '1110',
      ticketYn: override.ticketYn ?? 'Y',
      marketingAgree: override.marketingAgree ?? 'N',
      registeredAt: override.registeredAt ?? localTimestamp(),
      addresses: override.addresses ?? [],
    }))

  return [...extraCustomers, ...mergedBase].filter(customer => isVisibleGmBranchCode(customer.branchCode))
}

export function getCustomerById(customerId?: string) {
  if (!customerId) return undefined
  return getCustomersWithOverrides().find(customer => customer.id === customerId)
}

export function saveCustomerAddresses(customerId: string, addresses: CustomerAddress[]) {
  const overrides = getCustomerOverrides()
  const existing = getCustomersWithOverrides().find(customer => customer.id === customerId)
  overrides[customerId] = {
    ...(existing ? {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      country: existing.country,
      branchCode: existing.branchCode,
      ticketYn: existing.ticketYn,
      marketingAgree: existing.marketingAgree,
      registeredAt: existing.registeredAt,
    } : overrides[customerId]),
    addresses,
  }
  saveCustomerOverrides(overrides)
}

export function upsertPrototypeCustomer(customer: Customer) {
  const overrides = getCustomerOverrides()
  overrides[customer.id] = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    country: customer.country,
    branchCode: customer.branchCode,
    ticketYn: customer.ticketYn,
    marketingAgree: customer.marketingAgree,
    registeredAt: customer.registeredAt,
    addresses: customer.addresses ?? [],
  }
  saveCustomerOverrides(overrides)
}

export function getExtraTickets() {
  return readJson<Ticket[]>(EXTRA_TICKETS_KEY, []).filter(isVisibleGmTicket)
}

export function getTicketsWithExtras(): Ticket[] {
  const extras = getExtraTickets()
  const extraNos = new Set(extras.map(ticket => ticket.ticketNo))
  const cancelledTickets = readJson<Record<string, unknown>>(CUSTOMER_CANCELLED_TICKETS_KEY, {})
  const merged = [
    ...extras,
    ...TICKETS.filter(ticket => !extraNos.has(ticket.ticketNo)),
  ]

  return merged.map(ticket => {
    const normalizedTicket = normalizeTicketWording(ticket)
    return cancelledTickets[normalizedTicket.ticketNo]
      ? {
        ...normalizedTicket,
        status: 'CANCELED' as const,
        paymentCompleted: 'C' as const,
        paymentDate: null,
        repairDetail: normalizedTicket.repairDetail || '수리취소',
      }
      : normalizedTicket
  }).filter(isVisibleGmTicket)
}

export function addPrototypeTicket(ticket: Ticket) {
  const extras = getExtraTickets().filter(item => item.ticketNo !== ticket.ticketNo)
  writeJson(EXTRA_TICKETS_KEY, [ticket, ...extras])
}

export function updatePrototypeTicket(ticketNo: string, patch: Partial<Ticket>) {
  const existing = getTicketsWithExtras().find(ticket => ticket.ticketNo === ticketNo)
  if (!existing) return

  const updatedTicket = { ...existing, ...patch }
  const extras = getExtraTickets().filter(item => item.ticketNo !== ticketNo)
  writeJson(EXTRA_TICKETS_KEY, [updatedTicket, ...extras])
}

export function getTicketChangeLogs(ticketNo: string): TicketChangeLog[] {
  return readJson<TicketChangeLog[]>(TICKET_CHANGE_LOGS_KEY, [])
    .filter(log => log.ticketNo === ticketNo)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
}

export function appendTicketChangeLog(log: Omit<TicketChangeLog, 'id' | 'changedAt'> & { changedAt?: string }) {
  const savedLogs = readJson<TicketChangeLog[]>(TICKET_CHANGE_LOGS_KEY, [])
  const nextLog: TicketChangeLog = {
    ...log,
    id: `ticket-log-${log.ticketNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    changedAt: log.changedAt ?? localTimestamp(),
  }
  writeJson(TICKET_CHANGE_LOGS_KEY, [nextLog, ...savedLogs])
  return nextLog
}

function getStoredComponentReturns() {
  return readJson<ComponentReturn[]>(COMPONENT_RETURNS_KEY, [])
}

function saveStoredComponentReturns(records: ComponentReturn[]) {
  writeJson(COMPONENT_RETURNS_KEY, records)
}

function componentReturnId() {
  const now = new Date()
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `CR${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export function getComponentReturns(): ComponentReturn[] {
  const stored = getStoredComponentReturns()
    .filter(record => isVisibleGmBranchCode(record.branchCode) && isVisibleGmText(record.productName))
  const storedIds = new Set(stored.map(record => record.id))
  return [
    ...stored,
    ...COMPONENT_RETURNS.filter(record => !storedIds.has(record.id)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createComponentReturnFromTicket(ticket: Ticket, componentType: ComponentType = 'NONE', deliveryAddress?: string | null) {
  const existing = getComponentReturns().find(record => record.sourceTicketNo === ticket.ticketNo)
  if (existing) return existing

  const record: ComponentReturn = {
    id: componentReturnId(),
    sourceTicketNo: ticket.ticketNo,
    branchCode: ticket.branchCode,
    customerName: ticket.customerName,
    phone: ticket.phone,
    email: ticket.email,
    productName: ticket.productName,
    componentType,
    courier: 'CJ대한통운',
    trackingNo: null,
    status: 'WAITING',
    createdAt: localTimestamp(),
    returnedAt: null,
    alimtalkSentYn: 'N',
    deliveryAddress: deliveryAddress ?? null,
    createdBy: '한혜지(monster563)',
  }

  saveStoredComponentReturns([record, ...getStoredComponentReturns()])
  return record
}

export function updateComponentReturn(record: ComponentReturn) {
  const stored = getStoredComponentReturns()
  const next = stored.some(item => item.id === record.id)
    ? stored.map(item => item.id === record.id ? record : item)
    : [record, ...stored]
  saveStoredComponentReturns(next)
}

function getStoredStockRequests() {
  return readJson<StockRequest[]>(STOCK_REQUESTS_KEY, [])
}

function saveStoredStockRequests(records: StockRequest[]) {
  writeJson(STOCK_REQUESTS_KEY, records)
}

function randomToken(length: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let value = ''
  for (let index = 0; index < length; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return value
}

function stockRequestNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `SR${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(10)}`
}

function partOrderRequestNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `PR${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(10)}`
}

function stockLedgerId() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `SL${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(8)}`
}

function stockTransferNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `ST${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(10)}`
}

function stockTransferTrackingNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `WMS${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(8)}`
}

function stockAdjustmentNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `SA${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(10)}`
}

const LEDGER_3PL_PS_LOCATION = 'GM 물류센터(1100) / PS창고(1120)'
const LEDGER_PS_OFFICE_LOCATION = 'GM_PS_국내(E1008) / 가용창고(1110)'

function ledgerQuantityBase(productCode: string, offset = 0) {
  const seed = productCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 80 + ((seed + offset) % 180)
}

function stockTransferLedgerQuantity(
  item: StockTransferLine,
  status: Extract<StockTransferStatus, 'SHIPPED' | 'RECEIVED'>,
) {
  const quantity = status === 'SHIPPED' ? -item.quantity : item.quantity
  const beforeQty = ledgerQuantityBase(item.productCode, status === 'SHIPPED' ? 0 : 40)
  return {
    quantity,
    beforeQty,
    afterQty: Math.max(beforeQty + quantity, 0),
  }
}

function normalizeLedgerLocation(location?: string | null) {
  if (!location) return LEDGER_PS_OFFICE_LOCATION
  return location.includes('1120')
    || location.includes('Maersk')
    || location.includes('3PL')
    || location.includes('물류센터')
    || location === 'PS창고'
    ? LEDGER_3PL_PS_LOCATION
    : LEDGER_PS_OFFICE_LOCATION
}

function normalizeLedgerLocationAlias(location: string | null) {
  if (!location) return location
  if (
    location.includes('1120')
    || location.includes('Maersk')
    || location.includes('3PL')
    || location.includes('물류센터')
    || location === 'PS창고'
  ) {
    return LEDGER_3PL_PS_LOCATION
  }
  if (
    location.includes('E1008')
    || location.includes('1110')
    || location.includes('GM_PS')
    || location.includes('가용창고')
    || location === 'PS Office'
  ) {
    return LEDGER_PS_OFFICE_LOCATION
  }
  return location
}

export function getStockRequests(): StockRequest[] {
  const stored = getStoredStockRequests()
    .filter(record => isVisibleGmProductCode(record.productCode) && isVisibleGmText(record.productName))
  const storedNos = new Set(stored.map(record => record.requestNo))
  return [
    ...stored,
    ...STOCK_REQUESTS.filter(record => !storedNos.has(record.requestNo)),
  ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function createStockRequestFromTicket(
  ticket: Ticket,
  reason: StockRequestReason,
  requester?: { id?: string; label: string },
) {
  const meta = getStockRequestReasonMeta(reason)
  const record: StockRequest = {
    id: `stock-request-${Date.now()}-${randomToken(5).toLowerCase()}`,
    requestNo: stockRequestNo(),
    ticketNo: ticket.ticketNo,
    requestedAt: localTimestamp(),
    status: 'REQUESTED',
    requester: requester?.label ?? '한혜지(monster563)',
    requesterId: requester?.id,
    productCode: ticket.productCode ?? '-',
    productName: ticket.productName,
    reason,
    reasonLargeCategory: meta.large,
    reasonMiddleCategory: meta.middle,
    processedAt: null,
    processor: null,
    processorId: null,
  }

  saveStoredStockRequests([record, ...getStoredStockRequests()])
  return record
}

export function updateStockRequest(record: StockRequest) {
  const stored = getStoredStockRequests()
  const next = stored.some(item => item.requestNo === record.requestNo)
    ? stored.map(item => item.requestNo === record.requestNo ? record : item)
    : [record, ...stored]
  saveStoredStockRequests(next)
}

function threePlStoNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `STO${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomToken(8)}`
}

function getStoredThreePlStoRequests() {
  return readJson<ThreePlStoRequest[]>(THREE_PL_STO_KEY, [])
}

function saveStoredThreePlStoRequests(records: ThreePlStoRequest[]) {
  writeJson(THREE_PL_STO_KEY, records)
}

export function getThreePlStoRequests(): ThreePlStoRequest[] {
  const stored = getStoredThreePlStoRequests()
  const storedIds = new Set(stored.map(r => r.stoNo))
  return [
    ...stored,
    ...THREE_PL_STO_REQUESTS.filter(r => !storedIds.has(r.stoNo)),
  ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function createThreePlStoRequest(
  stockRequestNos: string[],
  requester?: { id?: string; label: string },
): ThreePlStoRequest {
  const record: ThreePlStoRequest = {
    id: `three-pl-sto-${Date.now()}-${randomToken(5).toLowerCase()}`,
    stoNo: threePlStoNo(),
    requestedAt: localTimestamp(),
    requester: requester?.label ?? '한혜지(monster563)',
    requesterId: requester?.id ?? null,
    stockRequestNos,
    status: 'REQUESTED',
    processedAt: null,
    processor: null,
  }
  saveStoredThreePlStoRequests([record, ...getStoredThreePlStoRequests()])

  // 포함된 재고 요청들을 STO_REQUESTED 상태로 변경 (mock data 포함 전체에서 찾아서 저장)
  const now = localTimestamp()
  const all = getStockRequests()
  all
    .filter(req => stockRequestNos.includes(req.requestNo))
    .forEach(req => {
      updateStockRequest({ ...req, status: 'STO_REQUESTED', processedAt: now, processor: requester?.label ?? '한혜지(monster563)' })
    })

  return record
}

export function updateThreePlStoRequest(record: ThreePlStoRequest, status: ThreePlStoStatus, processor: string) {
  const stored = getStoredThreePlStoRequests()
  const now = localTimestamp()
  const updated: ThreePlStoRequest = { ...record, status, processedAt: now, processor }
  const next = stored.some(item => item.stoNo === record.stoNo)
    ? stored.map(item => item.stoNo === record.stoNo ? updated : item)
    : [updated, ...stored]
  saveStoredThreePlStoRequests(next)
  return updated
}

function getStoredPartOrderRequests() {
  return readJson<PartOrderRequest[]>(PART_ORDER_REQUESTS_KEY, [])
}

function saveStoredPartOrderRequests(records: PartOrderRequest[]) {
  writeJson(PART_ORDER_REQUESTS_KEY, records)
}

export function getPartOrderRequests(): PartOrderRequest[] {
  const stored = getStoredPartOrderRequests()
    .filter(record => (
      isVisibleGmProductCode(record.productCode)
      && isVisibleGmText(record.productName)
      && isVisibleGmText(record.storeName)
    ))
  const storedNos = new Set(stored.map(record => record.requestNo))
  return [
    ...stored,
    ...PART_ORDER_REQUESTS.filter(record => !storedNos.has(record.requestNo)),
  ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function createPartOrderRequest(
  payload: Omit<PartOrderRequest, 'id' | 'requestNo' | 'requestedAt' | 'processedAt' | 'processor' | 'processorId'> &
    Partial<Pick<PartOrderRequest, 'requestNo' | 'requestedAt' | 'processedAt' | 'processor' | 'processorId'>>,
) {
  const record: PartOrderRequest = {
    ...payload,
    id: `part-order-request-${Date.now()}-${randomToken(5).toLowerCase()}`,
    requestNo: payload.requestNo ?? partOrderRequestNo(),
    requestedAt: payload.requestedAt ?? localTimestamp(),
    processedAt: payload.processedAt ?? null,
    processor: payload.processor ?? null,
    processorId: payload.processorId ?? null,
  }

  saveStoredPartOrderRequests([record, ...getStoredPartOrderRequests()])
  return record
}

export function updatePartOrderRequest(record: PartOrderRequest) {
  const stored = getStoredPartOrderRequests()
  const next = stored.some(item => item.requestNo === record.requestNo)
    ? stored.map(item => item.requestNo === record.requestNo ? record : item)
    : [record, ...stored]
  saveStoredPartOrderRequests(next)
}

function getStoredStockLedgerEntries() {
  return readJson<StockLedgerEntry[]>(STOCK_LEDGER_KEY, [])
}

function saveStoredStockLedgerEntries(records: StockLedgerEntry[]) {
  writeJson(STOCK_LEDGER_KEY, records)
}

function normalizeStockLedgerEntry(record: StockLedgerEntry): StockLedgerEntry {
  const eventTypeMap: Record<string, StockLedgerEntry['eventType']> = {
    이동요청: '출고요청',
    이동출고: '출고완료',
    이동입고: '입고완료',
  }
  const sourceTypeMap: Record<string, StockLedgerEntry['sourceType']> = {
    재고이동: '재고출고',
  }

  const normalized: StockLedgerEntry = {
    ...record,
    eventType: eventTypeMap[String(record.eventType)] ?? record.eventType,
    sourceType: sourceTypeMap[String(record.sourceType)] ?? record.sourceType,
    fromLocation: normalizeLedgerLocationAlias(record.fromLocation),
    toLocation: normalizeLedgerLocationAlias(record.toLocation),
  }

  if (normalized.eventType !== '출고완료' && normalized.eventType !== '입고완료') {
    return normalized
  }

  const signedQuantity = normalized.eventType === '출고완료'
    ? -Math.abs(normalized.quantity)
    : Math.abs(normalized.quantity)
  const fallbackBeforeQty = ledgerQuantityBase(
    normalized.productCode,
    normalized.eventType === '출고완료' ? 0 : 40,
  )
  const beforeQty = normalized.beforeQty
    ?? (normalized.afterQty !== null ? Math.max(normalized.afterQty - signedQuantity, 0) : fallbackBeforeQty)
  const afterQty = normalized.afterQty ?? Math.max(beforeQty + signedQuantity, 0)

  return {
    ...normalized,
    quantity: signedQuantity,
    beforeQty,
    afterQty,
  }
}

export function getStockLedgerEntries(): StockLedgerEntry[] {
  const stored = getStoredStockLedgerEntries()
    .map(normalizeStockLedgerEntry)
    .filter(record => (
      isVisibleGmBranchCode(record.branchCode)
      && isVisibleGmProductCode(record.productCode)
      && isVisibleGmText(record.productName)
    ))
  const storedIds = new Set(stored.map(record => record.id))
  return [
    ...stored,
    ...STOCK_LEDGER_ENTRIES.filter(record => !storedIds.has(record.id)).map(normalizeStockLedgerEntry),
  ]
    .filter(record => (
      record.status !== '대기'
      && record.eventType !== '출고요청'
      && record.eventType !== '조정대기'
      && record.eventType !== '재고예약'
      && record.eventType !== '예약해제'
    ))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function appendStockLedgerEntry(payload: Omit<StockLedgerEntry, 'id' | 'occurredAt'> & { occurredAt?: string }) {
  const record: StockLedgerEntry = {
    ...payload,
    id: stockLedgerId(),
    occurredAt: payload.occurredAt ?? localTimestamp(),
  }
  saveStoredStockLedgerEntries([record, ...getStoredStockLedgerEntries()])
  return record
}

function getStoredStockTransfers() {
  return readJson<StockTransfer[]>(STOCK_TRANSFERS_KEY, [])
}

function saveStoredStockTransfers(records: StockTransfer[]) {
  writeJson(STOCK_TRANSFERS_KEY, records)
}

function normalizeStockTransfer(record: StockTransfer): StockTransfer {
  if ((record.status === 'SHIPPED' || record.status === 'RECEIVED') && !record.trackingNo) {
    return {
      ...record,
      trackingNo: `WMS-${record.transferNo.slice(-8)}`,
    }
  }
  return {
    ...record,
    trackingNo: record.trackingNo ?? null,
  }
}

export function getStockTransfers(): StockTransfer[] {
  const stored = getStoredStockTransfers()
    .map(normalizeStockTransfer)
    .filter(record => record.items.every(item => (
      isVisibleGmProductCode(item.productCode)
      && isVisibleGmText(item.productName)
    )))
  const storedNos = new Set(stored.map(record => record.transferNo))
  return [
    ...stored,
    ...STOCK_TRANSFERS.filter(record => !storedNos.has(record.transferNo)).map(normalizeStockTransfer),
  ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function createStockTransfer(payload: {
  requester: string
  requesterId?: string | null
  items: Omit<StockTransferLine, 'id'>[]
  memo?: string | null
}) {
  const transferNo = stockTransferNo()
  const record: StockTransfer = {
    id: `stock-transfer-${Date.now()}-${randomToken(5).toLowerCase()}`,
    transferNo,
    requestedAt: localTimestamp(),
    status: 'REQUESTED',
    requester: payload.requester,
    requesterId: payload.requesterId ?? null,
    fromLocation: '3PL',
    toLocation: 'PS Office',
    shippedAt: null,
    receivedAt: null,
    trackingNo: null,
    failedAt: null,
    erpResultCode: null,
    erpResultMessage: null,
    receiver: null,
    memo: payload.memo?.trim() || null,
    items: payload.items.map((item, index) => ({
      ...item,
      id: `stock-transfer-line-${Date.now()}-${index}-${randomToken(4).toLowerCase()}`,
    })),
  }

  saveStoredStockTransfers([record, ...getStoredStockTransfers()])
  return record
}

export function updateStockTransfer(record: StockTransfer) {
  const stored = getStoredStockTransfers()
  const next = stored.some(item => item.transferNo === record.transferNo)
    ? stored.map(item => item.transferNo === record.transferNo ? record : item)
    : [record, ...stored]
  saveStoredStockTransfers(next)
}

export function changeStockTransferStatus(
  record: StockTransfer,
  status: StockTransferStatus,
  handler: string,
) {
  const now = localTimestamp()
  const next: StockTransfer = {
    ...record,
    status,
    shippedAt: status === 'SHIPPED' && !record.shippedAt ? now : record.shippedAt,
    receivedAt: status === 'RECEIVED' && !record.receivedAt ? now : record.receivedAt,
    trackingNo: (status === 'SHIPPED' || status === 'RECEIVED') && !record.trackingNo
      ? stockTransferTrackingNo()
      : record.trackingNo ?? null,
    failedAt: status === 'FAILED' && !record.failedAt ? now : record.failedAt,
    erpResultMessage: status === 'FAILED'
      ? record.erpResultMessage ?? 'ERP 출고 요청 처리 실패'
      : record.erpResultMessage,
    receiver: status === 'RECEIVED' ? handler : record.receiver,
  }

  updateStockTransfer(next)

  if (status === 'SHIPPED' || status === 'RECEIVED') {
    next.items.forEach(item => {
      const balance = stockTransferLedgerQuantity(item, status)
      appendStockLedgerEntry({
        eventType: status === 'SHIPPED' ? '출고완료' : '입고완료',
        status: '완료',
        sourceType: '재고출고',
        sourceNo: next.transferNo,
        branchCode: '1110',
        branchName: 'GM 본사',
        fromLocation: LEDGER_3PL_PS_LOCATION,
        toLocation: LEDGER_PS_OFFICE_LOCATION,
        productCode: item.productCode,
        productName: item.productName,
        barcode: item.barcode,
        quantity: balance.quantity,
        beforeQty: balance.beforeQty,
        afterQty: balance.afterQty,
        handler,
      })
    })
  }

  return next
}

function getStoredStockAdjustments() {
  return readJson<StockAdjustment[]>(STOCK_ADJUSTMENTS_KEY, [])
}

function saveStoredStockAdjustments(records: StockAdjustment[]) {
  writeJson(STOCK_ADJUSTMENTS_KEY, records)
}

function normalizeStockAdjustment(record: StockAdjustment): StockAdjustment {
  const status = record.status as StockAdjustmentStatus | 'APPROVED' | 'CANCELED'
  if (status === 'APPROVED') {
    return {
      ...record,
      status: 'REQUESTED',
      appliedAt: null,
      processor: null,
    }
  }
  if (status === 'CANCELED') {
    return {
      ...record,
      status: 'REJECTED',
    }
  }
  return record
}

export function getStockAdjustments(): StockAdjustment[] {
  const stored = getStoredStockAdjustments()
    .map(normalizeStockAdjustment)
    .filter(record => (
      isVisibleGmBranchCode(record.branchCode)
      && isVisibleGmProductCode(record.productCode)
      && isVisibleGmText(record.productName)
    ))
  const storedNos = new Set(stored.map(record => record.adjustmentNo))
  return [
    ...stored,
    ...STOCK_ADJUSTMENTS.filter(record => !storedNos.has(record.adjustmentNo)).map(normalizeStockAdjustment),
  ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function createStockAdjustment(
  payload: Omit<StockAdjustment, 'id' | 'adjustmentNo' | 'requestedAt' | 'appliedAt' | 'processor'> &
    Partial<Pick<StockAdjustment, 'adjustmentNo' | 'requestedAt' | 'appliedAt' | 'processor'>>,
) {
  const adjustmentNo = payload.adjustmentNo ?? stockAdjustmentNo()
  const record: StockAdjustment = {
    ...payload,
    id: `stock-adjustment-${Date.now()}-${randomToken(5).toLowerCase()}`,
    adjustmentNo,
    requestedAt: payload.requestedAt ?? localTimestamp(),
    appliedAt: payload.appliedAt ?? null,
    processor: payload.processor ?? null,
    memo: payload.memo?.trim() || null,
  }

  saveStoredStockAdjustments([record, ...getStoredStockAdjustments()])
  return record
}

export function updateStockAdjustment(record: StockAdjustment) {
  const stored = getStoredStockAdjustments()
  const next = stored.some(item => item.adjustmentNo === record.adjustmentNo)
    ? stored.map(item => item.adjustmentNo === record.adjustmentNo ? record : item)
    : [record, ...stored]
  saveStoredStockAdjustments(next)
}

export function changeStockAdjustmentStatus(
  record: StockAdjustment,
  status: StockAdjustmentStatus,
  handler: string,
) {
  const isProcessed = status === 'APPLIED' || status === 'REJECTED'
  const next: StockAdjustment = {
    ...record,
    status,
    appliedAt: isProcessed && !record.appliedAt ? localTimestamp() : record.appliedAt,
    processor: isProcessed ? handler : record.processor,
  }
  updateStockAdjustment(next)

  if (status === 'APPLIED') {
    const beforeQty = ledgerQuantityBase(next.productCode, 80)
    appendStockLedgerEntry({
      eventType: '조정반영',
      status: '완료',
      sourceType: '재고조정',
      sourceNo: next.adjustmentNo,
      branchCode: next.branchCode ?? '1110',
      branchName: next.branchName ?? 'GM 본사',
      fromLocation: normalizeLedgerLocation(next.locationName ?? next.location),
      toLocation: normalizeLedgerLocation(next.locationName ?? next.location),
      productCode: next.productCode,
      productName: next.productName,
      barcode: next.barcode,
      quantity: next.quantityDelta,
      beforeQty,
      afterQty: Math.max(beforeQty + next.quantityDelta, 0),
      handler,
    })
  }

  return next
}

function getStoredStockSnapshots() {
  const stored = readJson<StockSnapshotRow[] | null>(STOCK_SNAPSHOTS_KEY, null)
  return stored && stored.length > 0 ? stored : STOCK_SNAPSHOTS
}

function normalizeStockSnapshotBranch(row: StockSnapshotRow): StockSnapshotRow {
  const isLogisticsStock = row.branchCode === '1100'
    || row.branchName === 'GM_WH_Maersk'
    || row.storeCode === '1100'
    || row.storeName === 'GM_WH_Maersk'
    || row.storeName === 'GM 물류센터'
    || row.locationCode === '1120'

  const isPsStock = row.branchCode === '1110'
    || row.branchName === 'GM_PS_국내'
    || row.branchName === 'GM 본사'
    || row.storeCode === '1110'
    || row.storeCode === 'E1008'
    || row.storeName === 'GM_PS_국내'
    || row.locationCode === '1110'

  if (!isLogisticsStock && !isPsStock) return row

  return {
    ...row,
    branchCode: '1110',
    branchName: 'GM 본사',
    storeCode: isLogisticsStock ? '1100' : 'E1008',
    storeName: isLogisticsStock ? 'GM 물류센터' : 'GM_PS_국내',
    locationCode: isLogisticsStock ? '1120' : '1110',
    locationName: isLogisticsStock ? 'PS창고' : '가용창고',
  }
}

export function getStockSnapshots(): StockSnapshotRow[] {
  return getStoredStockSnapshots()
    .map(normalizeStockSnapshotBranch)
    .filter(record => (
      isVisibleGmBranchCode(record.branchCode)
      && isVisibleGmProductCode(record.productCode)
      && isVisibleGmText(record.productName)
    ))
    .sort((a, b) => b.saveDate.localeCompare(a.saveDate))
}
