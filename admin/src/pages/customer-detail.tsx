import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, MapPin, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { BRANCHES, COUNTRIES, MEMBERS, PRODUCTS } from '@/lib/mock-data'
import { getCustomerById, getTicketsWithExtras, saveCustomerAddresses, upsertPrototypeCustomer } from '@/lib/prototype-storage'
import type { Customer, CustomerAddress, Ticket, TicketStatus } from '@/lib/types'
import { inputCls } from '@/lib/utils'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function monthsAgoStr(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10)
}
function constrainMax3Y(next: { from: string; to: string }, changed: 'from' | 'to') {
  if (!next.from || !next.to) return next
  const ms = new Date(next.to).getTime() - new Date(next.from).getTime()
  const maxMs = 3 * 365.25 * 24 * 60 * 60 * 1000
  if (ms <= maxMs) return next
  if (changed === 'from') {
    const d = new Date(next.from); d.setFullYear(d.getFullYear() + 3)
    return { ...next, to: d.toISOString().slice(0, 10) }
  }
  const d = new Date(next.to); d.setFullYear(d.getFullYear() - 3)
  return { ...next, from: d.toISOString().slice(0, 10) }
}

const COUNTRY_NAMES: Record<string, string> = {
  KR: '한국', US: '미국', CN: '중국', JP: '일본', GB: '영국',
  SG: '싱가포르', HK: '홍콩', TW: '대만', AU: '호주', FR: '프랑스',
  IT: '이탈리아', CA: '캐나다', AE: '아랍에미리트', MY: '말레이시아', TH: '태국',
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
  PICKUP_WAITING: '픽업대기',
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
  PICKUP_WAITING:     'bg-amber-50 text-amber-700',
}

type AddressForm = { address1: string; address2: string; zipCode: string; country: string }
const EMPTY_FORM: AddressForm = { address1: '', address2: '', zipCode: '', country: 'KR' }
const TICKETS_PER_PAGE = 10

type CustomerForm = {
  name: string
  phone: string
  country: string
  branchCode: string
  marketingAgree: 'Y' | 'N'
}

const EMPTY_CUSTOMER_FORM: CustomerForm = {
  name: '',
  phone: '',
  country: 'KR',
  branchCode: '1110',
  marketingAgree: 'N',
}

type CustomerTicketFilterKey =
  | 'ticketNo'
  | 'status'
  | 'productCode'
  | 'purchaseDate'
  | 'purchasePlace'
  | 'receivedAt'
  | 'symptom'
  | 'repairDetail'
  | 'technician'

type CustomerTicketFilters = Record<CustomerTicketFilterKey, string>

const INIT_TICKET_FILTERS: CustomerTicketFilters = {
  ticketNo: '',
  status: 'all',
  productCode: '',
  purchaseDate: '',
  purchasePlace: '',
  receivedAt: '',
  symptom: '',
  repairDetail: '',
  technician: 'all',
}

function toCustomerForm(customer?: Customer): CustomerForm {
  if (!customer) return EMPTY_CUSTOMER_FORM
  return {
    name: customer.name,
    phone: customer.phone,
    country: customer.country,
    branchCode: customer.branchCode,
    marketingAgree: customer.marketingAgree,
  }
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

export function CustomerDetailPage() {
  const { customerId, langCode } = useParams()
  const navigate = useNavigate()

  const base = getCustomerById(customerId)
  const [customer, setCustomer] = useState<Customer | undefined>(base)
  const [customerForm, setCustomerForm] = useState<CustomerForm>(() => toCustomerForm(base))
  const [customerEditMode, setCustomerEditMode] = useState(false)

  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => {
    const addrs = base?.addresses ?? []
    return [...addrs.filter(a => a.isDefault), ...addrs.filter(a => !a.isDefault)]
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddressForm>(EMPTY_FORM)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<AddressForm>(EMPTY_FORM)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [ticketPage, setTicketPage] = useState(1)
  const [ticketFilters, setTicketFilters] = useState<CustomerTicketFilters>(INIT_TICKET_FILTERS)
  const [dateFrom, setDateFrom] = useState(monthsAgoStr(6))
  const [dateTo, setDateTo] = useState(todayStr())

  useEffect(() => {
    const next = getCustomerById(customerId)
    setCustomer(next)
    setCustomerForm(toCustomerForm(next))
    setCustomerEditMode(false)
    const addrs = next?.addresses ?? []
    setAddresses([...addrs.filter(a => a.isDefault), ...addrs.filter(a => !a.isDefault)])
    setTicketFilters(INIT_TICKET_FILTERS)
    setTicketPage(1)
  }, [customerId])

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-400 text-sm">고객을 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-gray-500 underline">뒤로가기</button>
      </div>
    )
  }

  const currentCustomer = customer
  const branchName = BRANCHES.find(b => b.code === currentCustomer.branchCode)?.name ?? currentCustomer.branchCode
  const allCustomerTickets = getTicketsWithExtras().filter(t =>
    t.phone === currentCustomer.phone || t.email === currentCustomer.email
  )
  const customerTickets = allCustomerTickets.filter(t => {
    const date = t.receivedAt.slice(0, 10)
    if (dateFrom && date < dateFrom) return false
    if (dateTo && date > dateTo) return false
    if (ticketFilters.status !== 'all' && t.status !== ticketFilters.status) return false
    if (ticketFilters.technician !== 'all' && t.technicianId !== ticketFilters.technician) return false
    if (!includesQuery(t.ticketNo, ticketFilters.ticketNo)) return false
    if (!includesQuery(getProductCode(t), ticketFilters.productCode)) return false
    if (!includesQuery(getPurchaseDate(t), ticketFilters.purchaseDate)) return false
    if (!includesQuery(getPurchasePlace(t), ticketFilters.purchasePlace)) return false
    if (!includesQuery(t.receivedAt.slice(0, 10), ticketFilters.receivedAt)) return false
    if (!includesQuery(getSymptom(t), ticketFilters.symptom)) return false
    if (!includesQuery(t.repairDetail, ticketFilters.repairDetail)) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(customerTickets.length / TICKETS_PER_PAGE))
  const pagedTickets = customerTickets.slice((ticketPage - 1) * TICKETS_PER_PAGE, ticketPage * TICKETS_PER_PAGE)

  function commitAddresses(next: CustomerAddress[]) {
    setAddresses(next)
    saveCustomerAddresses(currentCustomer.id, next)
  }

  function setDefault(id: string) {
    commitAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })))
  }

  function startEdit(addr: CustomerAddress) {
    setEditingId(addr.id)
    setEditForm({ address1: addr.address1, address2: addr.address2 ?? '', zipCode: addr.zipCode ?? '', country: addr.country })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  function saveEdit(id: string) {
    if (!editForm.address1.trim()) return
    commitAddresses(addresses.map(a =>
      a.id === id
        ? { ...a, address1: editForm.address1.trim(), address2: editForm.address2.trim() || undefined, zipCode: editForm.zipCode.trim() || undefined, country: editForm.country }
        : a
    ))
    cancelEdit()
  }

  function handleAdd() {
    if (!addForm.address1.trim()) return
    const isFirst = addresses.length === 0
    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      isDefault: isFirst,
      address1: addForm.address1.trim(),
      address2: addForm.address2.trim() || undefined,
      zipCode: addForm.zipCode.trim() || undefined,
      country: addForm.country,
    }
    commitAddresses([...addresses, newAddr])
    setAddForm(EMPTY_FORM)
    setShowAddForm(false)
  }

  function handleDelete(id: string) {
    const next = addresses.filter(a => a.id !== id)
    if (next.length > 0 && !next.some(a => a.isDefault)) {
      next[0] = { ...next[0], isDefault: true }
    }
    commitAddresses(next)
    setDeleteTargetId(null)
  }

  function updateCustomerForm<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setCustomerForm(prev => ({ ...prev, [key]: value }))
  }

  function cancelCustomerEdit() {
    setCustomerForm(toCustomerForm(currentCustomer))
    setCustomerEditMode(false)
  }

  function saveCustomerInfo() {
    if (!customerForm.name.trim() || !customerForm.phone.trim()) return
    const next: Customer = {
      ...currentCustomer,
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      country: customerForm.country,
      branchCode: customerForm.branchCode,
      marketingAgree: customerForm.marketingAgree,
      addresses,
    }
    upsertPrototypeCustomer(next)
    setCustomer(next)
    setCustomerEditMode(false)
  }

  function updateTicketFilter(key: CustomerTicketFilterKey, value: string) {
    setTicketFilters(prev => ({ ...prev, [key]: value }))
    setTicketPage(1)
  }

  function resetTicketFilters() {
    setTicketFilters(INIT_TICKET_FILTERS)
    setDateFrom(monthsAgoStr(6))
    setDateTo(todayStr())
    setTicketPage(1)
  }

  const ticketFilterActive =
    dateFrom !== monthsAgoStr(6) ||
    dateTo !== todayStr() ||
    Object.entries(ticketFilters).some(([key, value]) => value !== INIT_TICKET_FILTERS[key as CustomerTicketFilterKey])

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />뒤로가기
      </button>

      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">기본 정보</h3>
            {customerEditMode ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelCustomerEdit}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveCustomerInfo}
                  disabled={!customerForm.name.trim() || !customerForm.phone.trim()}
                  className="px-2.5 py-1 rounded-lg bg-gray-900 text-[11px] font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-gray-400">{customer.id}</span>
                <button
                  type="button"
                  onClick={() => setCustomerEditMode(true)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  수정
                </button>
              </div>
            )}
          </div>
          <div className="p-5">
            {customerEditMode ? (
              <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                <CustomerInput label="이름" required>
                  <input
                    type="text"
                    value={customerForm.name}
                    onChange={e => updateCustomerForm('name', e.target.value)}
                    className={inputCls}
                  />
                </CustomerInput>
                <CustomerInput label="전화번호" required>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={e => updateCustomerForm('phone', e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </CustomerInput>
                <CustomerInput label="이메일">
                  <input
                    type="text"
                    value={customer.email}
                    readOnly
                    className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
                  />
                </CustomerInput>
                <CustomerInput label="국가">
                  <CountrySearchSelect
                    value={customerForm.country}
                    onChange={country => updateCustomerForm('country', country)}
                  />
                </CustomerInput>
                <CustomerInput label="법인">
                  <select
                    value={customerForm.branchCode}
                    onChange={e => updateCustomerForm('branchCode', e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {BRANCHES.map(branch => (
                      <option key={branch.code} value={branch.code}>{branch.code} {branch.name}</option>
                    ))}
                  </select>
                </CustomerInput>
                <CustomerInput label="마케팅 동의">
                  <select
                    value={customerForm.marketingAgree}
                    onChange={e => updateCustomerForm('marketingAgree', e.target.value as 'Y' | 'N')}
                    className={`${inputCls} cursor-pointer`}
                  >
                    <option value="Y">동의</option>
                    <option value="N">미동의</option>
                  </select>
                </CustomerInput>
                <CustomerInput label="등록일">
                  <input
                    type="text"
                    value={customer.registeredAt}
                    readOnly
                    className={`${inputCls} bg-gray-50 text-gray-500 font-mono cursor-not-allowed`}
                  />
                </CustomerInput>
              </div>
            ) : (
              <dl className="grid grid-cols-3 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">이름</dt>
                  <dd className="text-sm text-gray-900 font-semibold">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">전화번호</dt>
                  <dd className="text-sm text-gray-900 font-mono">{customer.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">이메일</dt>
                  <dd className="text-sm text-gray-900 truncate">{customer.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">국가</dt>
                  <dd className="text-sm text-gray-900">{COUNTRY_NAMES[customer.country] ?? customer.country}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">법인</dt>
                  <dd className="text-sm text-gray-900">{branchName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">마케팅 동의</dt>
                  <dd>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                      customer.marketingAgree === 'Y' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {customer.marketingAgree === 'Y' ? '동의' : '미동의'}
                    </span>
                  </dd>
                </div>
                <div className="col-span-3">
                  <dt className="text-[11px] font-medium text-gray-400 mb-0.5">등록일</dt>
                  <dd className="text-sm text-gray-600 font-mono">{customer.registeredAt}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* 주소 관리 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">주소 관리</h3>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />추가
              </button>
            )}
          </div>

          <div className="p-5 space-y-2">
            {addresses.length === 0 && !showAddForm ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
                <MapPin className="w-5 h-5 text-gray-200 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">등록된 주소가 없습니다.</p>
              </div>
            ) : (
              addresses.map(addr =>
                editingId === addr.id ? (
                  <AddressEditForm
                    key={addr.id}
                    form={editForm}
                    onChange={setEditForm}
                    onSave={() => saveEdit(addr.id)}
                    onCancel={cancelEdit}
                  />
                ) : addr.isDefault ? (
                  <div key={addr.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold text-amber-600 mb-1">기본 주소</p>
                          <p className="text-sm text-gray-800 font-medium">{addr.address1}</p>
                          {addr.address2 && <p className="text-xs text-gray-500 mt-0.5">{addr.address2}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                            {[addr.zipCode, COUNTRY_NAMES[addr.country] ?? addr.country].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconBtn icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(addr)} />
                        <IconBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteTargetId(addr.id)} danger />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={addr.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-700">{addr.address1}</p>
                          {addr.address2 && <p className="text-xs text-gray-500 mt-0.5">{addr.address2}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                            {[addr.zipCode, COUNTRY_NAMES[addr.country] ?? addr.country].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setDefault(addr.id)}
                          className="px-2 py-1 rounded-lg text-[11px] text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors"
                        >기본으로</button>
                        <IconBtn icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(addr)} />
                        <IconBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteTargetId(addr.id)} danger />
                      </div>
                    </div>
                  </div>
                )
              )
            )}

            {showAddForm && (
              <AddressEditForm
                form={addForm}
                onChange={setAddForm}
                onSave={handleAdd}
                onCancel={() => { setShowAddForm(false); setAddForm(EMPTY_FORM) }}
                isNew
              />
            )}
          </div>
        </div>

        {/* 티켓 이력 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700">
                티켓
                <span className="ml-1.5 text-gray-400 font-normal">
                  {customerTickets.length !== allCustomerTickets.length
                    ? `${customerTickets.length} / ${allCustomerTickets.length}건`
                    : `${allCustomerTickets.length}건`}
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || todayStr()}
                  onChange={e => {
                    const next = constrainMax3Y({ from: e.target.value, to: dateTo }, 'from')
                    setDateFrom(next.from); setDateTo(next.to); setTicketPage(1)
                  }}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                />
                <span className="text-gray-400 text-xs">~</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  max={todayStr()}
                  onChange={e => {
                    const next = constrainMax3Y({ from: dateFrom, to: e.target.value }, 'to')
                    setDateFrom(next.from); setDateTo(next.to); setTicketPage(1)
                  }}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                />
              </div>
              {ticketFilterActive && (
                <button
                  type="button"
                  onClick={resetTicketFilters}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>
          {allCustomerTickets.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">접수 이력이 없습니다.</p>
            </div>
          ) : customerTickets.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <TicketHeader label="Ticket No." />
                      <TicketHeader label="상태" />
                      <TicketHeader label="제품코드" />
                      <TicketHeader label="구매일" />
                      <TicketHeader label="구매처" />
                      <TicketHeader label="접수일" />
                      <TicketHeader label="현상" />
                      <TicketHeader label="수리내용" />
                      <TicketHeader label="서비스기술자" />
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.ticketNo} placeholder="검색" onChange={value => updateTicketFilter('ticketNo', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketSelectFilter value={ticketFilters.status} onChange={value => updateTicketFilter('status', value)}>
                          <option value="all">전체</option>
                          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map(status => (
                            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                          ))}
                        </TicketSelectFilter>
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.productCode} placeholder="제품코드" onChange={value => updateTicketFilter('productCode', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.purchaseDate} placeholder="YYYY-MM-DD" onChange={value => updateTicketFilter('purchaseDate', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.purchasePlace} placeholder="구매처" onChange={value => updateTicketFilter('purchasePlace', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.receivedAt} placeholder="YYYY-MM-DD" onChange={value => updateTicketFilter('receivedAt', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.symptom} placeholder="현상" onChange={value => updateTicketFilter('symptom', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketTextFilter value={ticketFilters.repairDetail} placeholder="수리내용" onChange={value => updateTicketFilter('repairDetail', value)} />
                      </TicketFilterCell>
                      <TicketFilterCell>
                        <TicketSelectFilter value={ticketFilters.technician} onChange={value => updateTicketFilter('technician', value)}>
                          <option value="all">전체</option>
                          {MEMBERS.filter(member => member.isTechnician).map(member => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </TicketSelectFilter>
                      </TicketFilterCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedTickets.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/${langCode}/tickets/${t.ticketNo}`)}
                            className="text-xs font-mono font-semibold text-gray-900 hover:underline underline-offset-2 decoration-gray-400"
                          >{t.ticketNo}</button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLOR[t.status]}`}>
                            {STATUS_LABELS[t.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">{getProductCode(t)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{getPurchaseDate(t) || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{getPurchasePlace(t) || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{t.receivedAt.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 min-w-[140px]">{getSymptom(t) || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{t.repairDetail || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{getTechnicianLabel(t) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    {(ticketPage - 1) * TICKETS_PER_PAGE + 1}–{Math.min(ticketPage * TICKETS_PER_PAGE, customerTickets.length)} / {customerTickets.length}건
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                      disabled={ticketPage === 1}
                      className="px-2.5 py-1 rounded-lg text-xs text-gray-500 border border-gray-200 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >이전</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setTicketPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs transition-colors ${
                          p === ticketPage ? 'bg-gray-900 text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-300'
                        }`}
                      >{p}</button>
                    ))}
                    <button
                      onClick={() => setTicketPage(p => Math.min(totalPages, p + 1))}
                      disabled={ticketPage === totalPages}
                      className="px-2.5 py-1 rounded-lg text-xs text-gray-500 border border-gray-200 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >다음</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 삭제 확인 */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">주소 삭제</h3>
            <p className="text-sm text-gray-500">이 주소를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={() => handleDelete(deleteTargetId)}
                className="px-4 py-2 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IconBtn({ icon, onClick, danger }: { icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? 'text-gray-300 hover:text-red-400 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
    </button>
  )
}

function CustomerInput({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-gray-400 mb-1">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  )
}

function CountrySearchSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = COUNTRIES.find(country => country.code === value)
  const filtered = query.trim()
    ? COUNTRIES.filter(country =>
        country.name.toLowerCase().includes(query.toLowerCase()) ||
        country.code.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES

  useEffect(() => {
    if (!open) return
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
        setQuery('')
      }
    }
    function handleScroll(event: Event) {
      if (dropdownRef.current?.contains(event.target as Node)) return
      setOpen(false)
      setQuery('')
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
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(code: string) {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  function handleClear(event: React.MouseEvent) {
    event.stopPropagation()
    onChange('')
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`flex w-full items-center justify-between rounded-xl border bg-white py-2 pl-3 pr-2.5 text-sm transition-colors hover:border-gray-300 ${
          open ? 'border-gray-400' : 'border-gray-200'
        }`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-300'}>
          {selected ? `${selected.name} (${selected.code})` : '국가 검색 또는 선택'}
        </span>
        <span className="flex flex-shrink-0 items-center gap-1">
          {selected && (
            <span onClick={handleClear} className="cursor-pointer rounded p-0.5 text-gray-300 transition-colors hover:text-gray-500">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]"
          style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="국가명 또는 코드 검색"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-300 transition-colors hover:text-gray-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
            ) : filtered.map(country => (
              <li key={country.code}>
                <button
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                    country.code === value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <span>{country.name}</span>
                  <span className="font-mono text-[11px] text-gray-400">{country.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function TicketHeader({ label }: { label: string }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50 whitespace-nowrap">
      {label}
    </th>
  )
}

function TicketFilterCell({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-normal">{children}</th>
}

function TicketTextFilter({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full min-w-[110px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 pr-6 text-xs font-normal text-gray-700 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function TicketSelectFilter({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full min-w-[110px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-normal text-gray-700 focus:border-gray-400 focus:outline-none"
    >
      {children}
    </select>
  )
}

function AddressEditForm({
  form,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  form: { address1: string; address2: string; zipCode: string; country: string }
  onChange: (f: { address1: string; address2: string; zipCode: string; country: string }) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-600">{isNew ? '새 주소 추가' : '주소 수정'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-400 mb-1">주소1 <span className="text-red-400">*</span></label>
        <input type="text" value={form.address1} onChange={e => onChange({ ...form, address1: e.target.value })}
          placeholder="시/도, 구/군, 도로명 주소"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-400 mb-1">주소2</label>
        <input type="text" value={form.address2} onChange={e => onChange({ ...form, address2: e.target.value })}
          placeholder="동/호수, 층 등 상세주소"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">우편번호</label>
          <input type="text" value={form.zipCode} onChange={e => onChange({ ...form, zipCode: e.target.value })}
            placeholder="12345"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">국가</label>
          <select value={form.country} onChange={e => onChange({ ...form, country: e.target.value })}
            className="w-full appearance-none px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors">
            {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onSave} disabled={!form.address1.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Check className="w-3.5 h-3.5" />저장
        </button>
      </div>
    </div>
  )
}
