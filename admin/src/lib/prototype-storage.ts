import { COMPONENT_RETURNS, CUSTOMERS, TICKETS } from './mock-data'
import type { ComponentReturn, Customer, CustomerAddress, Ticket } from './types'

const CUSTOMER_OVERRIDES_KEY = 'ps-admin-customer-overrides'
const EXTRA_TICKETS_KEY = 'ps-admin-extra-tickets'
const CUSTOMER_CANCELLED_TICKETS_KEY = 'ps-customer-cancelled-tickets'
const COMPONENT_RETURNS_KEY = 'ps-admin-component-returns'

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

  return [...extraCustomers, ...mergedBase]
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
  return readJson<Ticket[]>(EXTRA_TICKETS_KEY, [])
}

export function getTicketsWithExtras(): Ticket[] {
  const extras = getExtraTickets()
  const extraNos = new Set(extras.map(ticket => ticket.ticketNo))
  const cancelledTickets = readJson<Record<string, unknown>>(CUSTOMER_CANCELLED_TICKETS_KEY, {})
  const merged = [
    ...extras,
    ...TICKETS.filter(ticket => !extraNos.has(ticket.ticketNo)),
  ]

  return merged.map(ticket => cancelledTickets[ticket.ticketNo]
    ? {
        ...ticket,
        status: 'CANCELED' as const,
        paymentCompleted: 'C' as const,
        paymentDate: null,
        repairDetail: ticket.repairDetail || '수리취소',
      }
    : ticket
  )
}

export function addPrototypeTicket(ticket: Ticket) {
  const extras = getExtraTickets().filter(item => item.ticketNo !== ticket.ticketNo)
  writeJson(EXTRA_TICKETS_KEY, [ticket, ...extras])
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
  const storedIds = new Set(stored.map(record => record.id))
  return [
    ...stored,
    ...COMPONENT_RETURNS.filter(record => !storedIds.has(record.id)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createComponentReturnFromTicket(ticket: Ticket) {
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
    componentType: 'OTHER',
    courier: ticket.branchCode === 'C1002' ? 'FedEx' : 'CJ대한통운',
    trackingNo: null,
    status: 'WAITING',
    createdAt: localTimestamp(),
    returnedAt: null,
    alimtalkSentYn: 'N',
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
