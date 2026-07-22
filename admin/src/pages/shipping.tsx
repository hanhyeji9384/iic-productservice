import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Filter, Printer } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { PRODUCTS } from '@/lib/mock-data'
import { getComponentReturns, getCustomersWithOverrides, getTicketsWithExtras } from '@/lib/prototype-storage'
import { maskName } from '@/lib/masking'
import type { ComponentReturn, Ticket } from '@/lib/types'

type Tab = 'cj' | 'dhl'
type SortKey = 'ticketNo' | 'customerName' | 'productName' | 'receptionPlace' | 'receivedAt'
type SortDir = 'asc' | 'desc'

const TABS: { key: Tab; label: string; method: string; branch: '1110' }[] = [
  { key: 'cj',        label: 'CJ대한통운', method: '택배(HQ)',        branch: '1110'  },
  { key: 'dhl',       label: 'DHL',   method: '해외택배(DHL)',    branch: '1110'  },
]

const BRANCH_TABS: Record<string, Tab[]> = {
  '':      ['cj', 'dhl'],
  '1110':  ['cj', 'dhl'],
}

const TBD_TABS: Tab[] = []

type ColKey = 'tag' | 'ticketNo' | 'customerName' | 'productName' | 'receptionPlace' | 'receivedAt'

const TABLE_COLS: { key: ColKey; label: string; sort: SortKey; filterable: boolean }[] = [
  { key: 'tag',           label: '태그',         sort: 'ticketNo',       filterable: false },
  { key: 'ticketNo',      label: 'Ticket No.',  sort: 'ticketNo',       filterable: true  },
  { key: 'customerName',  label: '고객명',       sort: 'customerName',   filterable: true  },
  { key: 'productName',   label: '제품코드',     sort: 'productName',    filterable: false },
  { key: 'receptionPlace',label: '접수처',       sort: 'receptionPlace', filterable: false },
  { key: 'receivedAt',    label: '접수일시',     sort: 'receivedAt',     filterable: false },
]

const initFilters: Record<string, string> = { ticketNo: '', customerName: '' }
const PAGE_SIZE = 20

type ShippingRow = {
  id: string
  type: 'ticket' | 'component-return'
  ticketNo: string
  status?: Ticket['status']
  branchCode: string
  customerName: string
  phone: string
  email: string
  productName: string
  receptionPlace: string
  receivedAt: string
  symptom?: string | null
  repairDetail?: string | null
  customerRequest?: string | null
  deliveryCountry?: string | null
  shippingMethod?: string | null
}

function ticketToRow(ticket: Ticket): ShippingRow {
  return {
    id: `ticket:${ticket.ticketNo}`,
    type: 'ticket',
    ticketNo: ticket.ticketNo,
    status: ticket.status,
    branchCode: ticket.branchCode,
    customerName: ticket.customerName,
    phone: ticket.phone,
    email: ticket.email,
    productName: ticket.productName,
    receptionPlace: ticket.receptionPlace,
    receivedAt: ticket.receivedAt,
    symptom: ticket.symptom,
    repairDetail: ticket.repairDetail,
    customerRequest: ticket.customerRequest,
    deliveryCountry: ticket.deliveryCountry,
    shippingMethod: ticket.shippingMethod,
  }
}

function componentReturnToRow(record: ComponentReturn): ShippingRow {
  return {
    id: `component-return:${record.id}`,
    type: 'component-return',
    ticketNo: record.sourceTicketNo,
    branchCode: record.branchCode,
    customerName: record.customerName,
    phone: record.phone,
    email: record.email,
    productName: record.productName,
    receptionPlace: '구성품 반송 출고',
    receivedAt: record.createdAt,
    repairDetail: null,
  }
}

function getShippingTag(row: ShippingRow) {
  if (row.type === 'component-return') {
    return {
      label: '구성품 반송',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  if (isPaymentDelayedReturnRow(row)) {
    return {
      label: '결제지연반송',
      className: 'border-orange-200 bg-orange-50 text-orange-700',
    }
  }

  if (isServiceCancelShippingRow(row)) {
    return {
      label: '서비스 완료 출고',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (isServiceUnavailableShippingRow(row)) {
    return {
      label: '서비스 완료 출고',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (row.status === 'PARTS_READY' || isPartsRequestRow(row)) {
    return {
      label: '서비스 완료 출고',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  return {
    label: '서비스 완료 출고',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

function getShippingTagSourceText(row: ShippingRow) {
  return [row.symptom, row.repairDetail, row.customerRequest, row.receptionPlace].filter(Boolean).join(' ')
}

function isPaymentDelayedReturnRow(row: ShippingRow) {
  return /결제\s*지연|결제지연|미입금\s*반송|미입금반송|미입금발송|미결제\s*반송|결제\s*미확인/i.test(
    getShippingTagSourceText(row),
  )
}

function isServiceCancelShippingRow(row: ShippingRow) {
  return (
    row.status === 'CANCELED' ||
    /수리\s*취소|수리취소|서비스\s*취소|서비스취소/i.test(getShippingTagSourceText(row))
  )
}

function isServiceUnavailableShippingRow(row: ShippingRow) {
  return (
    row.status === 'SERVICE_UNAVAILABLE' ||
    /수리\s*불가|수리불가|서비스\s*불가|서비스불가/i.test(getShippingTagSourceText(row))
  )
}

function isPartsRequestRow(row: ShippingRow) {
  return /부속품\s*요청|부품\s*요청|부속품\s*제공|부품\s*제공|부속품제공|부품제공/i.test(
    getShippingTagSourceText(row),
  )
}

function isClearedFromShippingQueue(ticket: Ticket) {
  return (
    ticket.shipmentCompletedYn === 'Y' ||
    Boolean(ticket.shipmentCompletedAt) ||
    ticket.status === 'SHIPPING' ||
    ticket.status === 'SHIPPED' ||
    ticket.status === 'SERVICE_DONE' ||
    ticket.status === 'CLOSED'
  )
}

function ticketMatchesTab(ticket: Ticket, tab: { key: Tab; method: string }) {
  if (isClearedFromShippingQueue(ticket)) return false
  if (ticket.status === 'READY_TO_SHIP') return ticket.shippingMethod === tab.method
  if (ticket.status !== 'PARTS_READY') return false

  const deliveryCountry = (ticket.deliveryCountry || '').toUpperCase()
  const isKrDelivery = deliveryCountry === 'KR' || ticket.receptionPlace.includes('국내')

  if (isKrDelivery) return tab.key === 'cj'
  return tab.key === 'dhl'
}

function componentReturnMatchesTab(record: ComponentReturn, tab: Tab) {
  if (record.status === 'COMPLETED') return false
  if (tab === 'cj') return record.courier === 'CJ대한통운'
  if (tab === 'dhl') return record.courier === 'DHL'
  return false
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function findMappedCustomer(row: ShippingRow) {
  const rowEmail = row.email.trim().toLowerCase()
  const rowPhone = normalizeDigits(row.phone)
  return getCustomersWithOverrides().find(customer => {
    const sameEmail = Boolean(rowEmail && customer.email.trim().toLowerCase() === rowEmail)
    const customerPhone = normalizeDigits(customer.phone)
    const samePhone = Boolean(rowPhone && customerPhone === rowPhone)
    return sameEmail || samePhone
  })
}

export function ShippingPage() {
  const navigate = useNavigate()
  const { langCode = 'ko' } = useParams()
  const [branch, setBranch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('cj')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(initFilters)
  const [appliedFilters, setAppliedFilters] = useState(initFilters)
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('receivedAt')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const visibleTabs = TABS.filter(t => BRANCH_TABS[branch].includes(t.key))
  const currentTab = visibleTabs.find(t => t.key === activeTab) ?? visibleTabs[0]
  const isTbd = TBD_TABS.includes(currentTab.key)

  const allTickets = getTicketsWithExtras()
  const componentReturns = getComponentReturns()

  const baseRows = useMemo(() => {
    if (isTbd) return []

    const regularRows = allTickets
      .filter(ticket =>
        ticketMatchesTab(ticket, currentTab) &&
        (!branch || ticket.branchCode === branch)
      )
      .map(ticketToRow)

    const componentReturnRows = componentReturns
      .filter(record =>
        componentReturnMatchesTab(record, currentTab.key) &&
        (!branch || record.branchCode === branch)
      )
      .map(componentReturnToRow)

    return [...componentReturnRows, ...regularRows]
  }, [allTickets, branch, componentReturns, currentTab.key, currentTab.method, isTbd])

  const filtered = useMemo(() => {
    return baseRows.filter(row => {
      if (appliedFilters.ticketNo.trim() && !row.ticketNo.toLowerCase().includes(appliedFilters.ticketNo.trim().toLowerCase())) return false
      if (appliedFilters.customerName.trim() && !row.customerName.toLowerCase().includes(appliedFilters.customerName.trim().toLowerCase())) return false
      return true
    })
  }, [baseRows, appliedFilters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const currentPageRowIds = paginated.map(row => row.id)
  const allSelected = currentPageRowIds.length > 0 && currentPageRowIds.every(rowId => selectedIds.has(rowId))

  useEffect(() => {
    if (!filterPopover) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-filter-popover]')) setFilterPopover(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [filterPopover])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, sorted.length])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string, ok = true) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleCustomerClick(row: ShippingRow) {
    const customer = findMappedCustomer(row)
    if (!customer) {
      showToast('연결된 고객 정보를 찾을 수 없습니다.', false)
      return
    }
    navigate(`/${langCode}/customers/${customer.id}`)
  }

  function handleBranchChange(code: string) {
    setBranch(code)
    const firstNonTbd = (BRANCH_TABS[code] ?? []).find(k => !TBD_TABS.includes(k))
    setActiveTab(firstNonTbd ?? BRANCH_TABS[code][0])
    setSelectedIds(new Set())
    setCurrentPage(1)
  }

  function handleTabChange(tab: Tab) {
    if (TBD_TABS.includes(tab)) return
    setActiveTab(tab)
    setSelectedIds(new Set())
    setCurrentPage(1)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function applyFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setAppliedFilters(prev => ({ ...prev, [key]: value }))
    setFilterPopover(null)
    setCurrentPage(1)
  }

  function hasActiveFilter(col: string) {
    return col in appliedFilters && appliedFilters[col] !== ''
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-2 w-2 flex-shrink-0 text-gray-300 group-hover:text-gray-400" />
    if (sortDir === 'asc') return <ArrowUp className="h-2 w-2 flex-shrink-0 text-gray-700" />
    return <ArrowDown className="h-2 w-2 flex-shrink-0 text-gray-700" />
  }

  function toggleAll() {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) currentPageRowIds.forEach(rowId => next.delete(rowId))
      else currentPageRowIds.forEach(rowId => next.add(rowId))
      return next
    })
  }

  function toggleSelect(rowId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  function handlePrint(type: 'all' | 'selected') {
    const ids = type === 'selected' ? [...selectedIds] : sorted.map(row => row.id)
    // TODO: navigate to print page per delivery type
    alert(`${currentTab.label} 송장 출력 (${ids.length}건)\n준비 중입니다.`)
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">출고 관리</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 법인 선택 필터바 */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <select
              value={branch}
              onChange={e => handleBranchChange(e.target.value)}
              className="w-52 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="">전체</option>
              <option value="1110">본사 (KR)</option>
            </select>
          </div>

          {/* 탭 + 전체 출력 */}
          <div className="px-5 pt-4 pb-0 border-b border-gray-100 flex items-end justify-between">
            <div className="flex gap-1">
              {visibleTabs.map(tab => {
                const tbd = TBD_TABS.includes(tab.key)
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    disabled={tbd}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tbd
                        ? 'text-gray-300 border-transparent cursor-not-allowed'
                        : currentTab.key === tab.key
                          ? 'text-gray-900 border-gray-900'
                          : 'text-gray-400 border-transparent hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                    {tbd && <span className="text-[10px] font-normal text-gray-300">TBD</span>}
                  </button>
                )
              })}
            </div>
            {!isTbd && (
              <div className="flex items-center gap-2 pb-3">
                <span className="text-xs text-gray-400">
                  {baseRows.length > 0 ? `출력 가능 ${baseRows.length}건` : '출력 가능한 건 없음'}
                </span>
                <button
                  onClick={() => handlePrint('all')}
                  disabled={baseRows.length === 0}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >전체 출력</button>
              </div>
            )}
          </div>

          {/* 선택 시 인라인 액션 바 */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-2.5 bg-gray-900 flex items-center justify-between">
              <span className="text-xs font-medium text-white">{selectedIds.size}개 선택됨</span>
              <button
                onClick={() => handlePrint('selected')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                출력
              </button>
            </div>
          )}

          {/* 내용 */}
          {isTbd ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-gray-400">준비 중입니다.</p>
            </div>
          ) : baseRows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Printer className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">배치 처리된 건이 없습니다.</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 bg-gray-50/50 w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 cursor-pointer" />
                    </th>
                    {TABLE_COLS.map(col => {
                      const isFiltered = hasActiveFilter(col.key)
                      return (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-left text-[10px] font-medium leading-none whitespace-nowrap transition-colors ${
                            isFiltered ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSort(col.sort)}
                              className="group flex items-center gap-1 text-[10px] font-medium leading-none hover:text-gray-700 transition-colors"
                            >
                              {col.label}
                              <SortIcon col={col.sort} />
                            </button>
                            {col.filterable && (
                              <button
                                onClick={e => handleFilterIconClick(col.key, e)}
                                className={`rounded transition-colors ${
                                  filterPopover?.col === col.key || isFiltered
                                    ? 'text-blue-500'
                                    : 'text-gray-300 hover:text-gray-500'
                                }`}
                              >
                                <Filter className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          {isFiltered && (
                            <div className="mt-1 max-w-[140px] truncate text-[10px] font-medium text-blue-600 normal-case tracking-normal">
                              {appliedFilters[col.key]}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={TABLE_COLS.length + 1} className="px-5 py-10 text-center text-xs text-gray-400">검색 결과가 없습니다.</td>
                    </tr>
                  ) : paginated.map(row => (
                    <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(row.id) ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-gray-300 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const tag = getShippingTag(row)
                          return (
                            <span className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none ${tag.className}`}>
                              {tag.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/${langCode}/tickets/${row.ticketNo}`)}
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-900 underline-offset-4 hover:underline"
                        >
                          {row.ticketNo}
                          <ExternalLink className="h-3 w-3 text-gray-300" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleCustomerClick(row)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 underline-offset-4 hover:text-blue-600 hover:underline"
                        >
                          {maskName(row.customerName)}
                          <ExternalLink className="h-3 w-3 text-gray-300" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700">
                        {PRODUCTS.find(p => p.name === row.productName)?.productCode ?? row.productName}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.receptionPlace}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {row.receivedAt} <span className="font-sans text-gray-400">(KST)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sorted.length > PAGE_SIZE && (
                <Pagination
                  total={sorted.length}
                  perPage={PAGE_SIZE}
                  current={currentPage}
                  onChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* 필터 팝오버 */}
      {filterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
          <div
            data-filter-popover
            className="fixed z-[50] bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-max"
            style={{
              top: filterPopover.rect.bottom + 6,
              ...(filterPopover.rect.left + 200 > window.innerWidth
                ? { right: Math.max(8, window.innerWidth - filterPopover.rect.right) }
                : { left: filterPopover.rect.left }),
            }}
          >
            <div className="w-44 space-y-1.5">
              <input
                type="text"
                autoFocus
                value={filters[filterPopover.col] ?? ''}
                placeholder={filterPopover.col === 'ticketNo' ? '티켓번호' : '고객명'}
                onChange={e => setFilters(prev => ({ ...prev, [filterPopover.col]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilter(filterPopover.col, filters[filterPopover.col] ?? '')}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
              />
              <div className="flex gap-1.5">
                {filters[filterPopover.col] && (
                  <button
                    onClick={() => applyFilter(filterPopover.col, '')}
                    className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
                  >지우기</button>
                )}
                <button
                  onClick={() => applyFilter(filterPopover.col, filters[filterPopover.col] ?? '')}
                  className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >적용</button>
              </div>
            </div>
          </div>
        </>
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
