import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, RefreshCw, Trash2, X } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { addPrivacyLog } from '@/lib/download-logs'
import { BRANCHES } from '@/lib/mock-data'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import { getCustomersWithOverrides, localTimestamp } from '@/lib/prototype-storage'
import type { Customer } from '@/lib/types'

const ITEMS_PER_PAGE = 15
const REMOVED_CUSTOMERS_STORAGE_KEY = 'ps-admin-removed-customers'

type SortKey = 'id' | 'name' | 'email' | 'phone' | 'ticketYn' | 'marketingAgree' | 'registeredAt'
type CustomerRow = Customer & {
  privacyRemoved?: boolean
  privacyRemovedAt?: string
}
type RemovedCustomerRecord = {
  id: string
  removedAt: string
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function consentLabel(value: 'Y' | 'N') {
  return value === 'Y' ? '동의' : '미동의'
}

function ticketLabel(value: 'Y' | 'N') {
  return value === 'Y' ? 'Y' : 'N'
}

function getSortValue(customer: CustomerRow, key: SortKey) {
  if (customer.privacyRemoved && ['name', 'email', 'phone', 'marketingAgree'].includes(key)) return ''
  if (key === 'marketingAgree') return consentLabel(customer.marketingAgree)
  if (key === 'ticketYn') return ticketLabel(customer.ticketYn)
  return customer[key]
}

function loadRemovedCustomers() {
  if (typeof window === 'undefined') return new Map<string, string>()
  try {
    const raw = window.localStorage.getItem(REMOVED_CUSTOMERS_STORAGE_KEY)
    if (!raw) return new Map<string, string>()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Map<string, string>()
    return new Map((parsed as RemovedCustomerRecord[]).map(record => [record.id, record.removedAt]))
  } catch {
    return new Map<string, string>()
  }
}

function persistRemovedCustomers(customers: CustomerRow[]) {
  if (typeof window === 'undefined') return
  const removed = customers
    .filter(customer => customer.privacyRemoved && customer.privacyRemovedAt)
    .map(customer => ({ id: customer.id, removedAt: customer.privacyRemovedAt as string }))
  window.localStorage.setItem(REMOVED_CUSTOMERS_STORAGE_KEY, JSON.stringify(removed))
}

function initialCustomers() {
  const removed = loadRemovedCustomers()
  return getCustomersWithOverrides().map(customer => {
    const removedAt = removed.get(customer.id)
    if (!removedAt) return { ...customer }
    return {
      ...customer,
      name: '',
      email: '',
      phone: '',
      marketingAgree: 'N' as const,
      privacyRemoved: true,
      privacyRemovedAt: removedAt,
    }
  })
}

function getCustomerBranchOptions(customers: Pick<Customer, 'branchCode'>[]) {
  const branchCodes = new Set(customers.map(customer => customer.branchCode).filter(Boolean))
  return BRANCHES.filter(branch => branchCodes.has(branch.code))
}

function getDefaultCustomerBranchCode(customers: Pick<Customer, 'branchCode'>[]) {
  const options = getCustomerBranchOptions(customers)
  return options.find(branch => branch.code === '1110')?.code ?? options[0]?.code ?? ''
}

export function CustomersPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers)
  const [activeBranch, setActiveBranch] = useState(() => getDefaultCustomerBranchCode(initialCustomers()))
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>({})
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [removeTargets, setRemoveTargets] = useState<CustomerRow[] | null>(null)
  const [removeReason, setRemoveReason] = useState('')
  const branchOptions = useMemo(() => getCustomerBranchOptions(customers), [customers])

  const filtered = useMemo(() => {
    return customers.filter(customer => {
      if (activeBranch && customer.branchCode !== activeBranch) return false
      if (appliedColumnFilters.id && !customer.id.toLowerCase().includes(appliedColumnFilters.id.toLowerCase())) return false
      if (appliedColumnFilters.name && (customer.privacyRemoved || !customer.name.toLowerCase().includes(appliedColumnFilters.name.toLowerCase()))) return false
      if (appliedColumnFilters.email && (customer.privacyRemoved || !customer.email.toLowerCase().includes(appliedColumnFilters.email.toLowerCase()))) return false
      if (appliedColumnFilters.phone) {
        if (customer.privacyRemoved) return false
        const qDigits = normalizeDigits(appliedColumnFilters.phone)
        if (qDigits) { if (!normalizeDigits(customer.phone).includes(qDigits)) return false }
        else { if (!customer.phone.includes(appliedColumnFilters.phone)) return false }
      }
      if (appliedColumnFilters.ticketYn && customer.ticketYn !== appliedColumnFilters.ticketYn) return false
      if (appliedColumnFilters.marketingAgree && (customer.privacyRemoved || customer.marketingAgree !== appliedColumnFilters.marketingAgree)) return false
      const registeredDate = customer.registeredAt.slice(0, 10)
      if (appliedColumnFilters.registeredFrom && registeredDate < appliedColumnFilters.registeredFrom) return false
      if (appliedColumnFilters.registeredTo && registeredDate > appliedColumnFilters.registeredTo) return false
      return true
    })
  }, [activeBranch, customers, appliedColumnFilters])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const selectablePaginated = paginated.filter(customer => !customer.privacyRemoved)
  const selectedCustomers = useMemo(() =>
    customers.filter(customer => selectedIds.has(customer.id) && !customer.privacyRemoved),
    [customers, selectedIds]
  )
  const allPageSelected = selectablePaginated.length > 0 && selectablePaginated.every(customer => selectedIds.has(customer.id))
  const selectedCount = selectedCustomers.length

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  function applyFilter(updates: Record<string, string | undefined>) {
    setColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
      return next
    })
    setAppliedColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
      return next
    })
    setPage(1)
    setSelectedIds(new Set())
    setFilterPopover(null)
  }

  function applyCurrentFilters() {
    setAppliedColumnFilters({ ...columnFilters })
    setPage(1)
    setSelectedIds(new Set())
    setFilterPopover(null)
  }

  function handleReset() {
    setColumnFilters({})
    setAppliedColumnFilters({})
    setPage(1)
    setSortKey(null)
    setSortDir(null)
    setSelectedIds(new Set())
  }

  function handleRefresh() {
    setCustomers(initialCustomers())
    setPage(1)
    setSelectedIds(new Set())
  }

  function toggleSelectAll() {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) selectablePaginated.forEach(customer => next.delete(customer.id))
      else selectablePaginated.forEach(customer => next.add(customer.id))
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openRemoveModal() {
    if (selectedCustomers.length === 0) return
    setRemoveTargets(selectedCustomers)
    setRemoveReason('')
  }

  function closeRemoveModal() {
    setRemoveTargets(null)
    setRemoveReason('')
  }

  function handleRemoveCustomerInfo() {
    if (!removeTargets || removeTargets.length === 0 || !removeReason.trim()) return
    const targetIds = new Set(removeTargets.map(customer => customer.id))
    setCustomers(prev => {
      const next = prev.map(customer => (
        targetIds.has(customer.id)
          ? {
              ...customer,
              name: '',
              email: '',
              phone: '',
              marketingAgree: 'N' as const,
              privacyRemoved: true,
              privacyRemovedAt: localTimestamp(),
            }
          : customer
      ))
      persistRemovedCustomers(next)
      return next
    })
    removeTargets.forEach(customer => {
      addPrivacyLog({
        adminName: '한혜지',
        adminId: 'monster563',
        subjectType: '고객',
        subjectNo: customer.id,
        actionType: '고객정보 제거',
        processedFields: ['이름', 'ID', '전화번호', '마케팅 동의'],
        ip: '10.0.1.42',
        reason: removeReason.trim(),
        status: '완료',
      })
    })
    setSelectedIds(prev => {
      const next = new Set(prev)
      targetIds.forEach(id => next.delete(id))
      return next
    })
    closeRemoveModal()
  }

  function renderFilterPopoverContent(col: string) {
    if (col === 'id' || col === 'name' || col === 'email' || col === 'phone') {
      const placeholder = col === 'id' ? 'No. 검색...' : col === 'name' ? '이름 검색...' : col === 'email' ? 'ID 검색...' : '전화번호 검색...'
      return (
        <div className="w-44 space-y-1.5">
          <input
            type="text"
            value={columnFilters[col] ?? ''}
            onChange={e => setColumnFilters(p => ({ ...p, [col]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
          />
          <div className="flex gap-1.5">
            {columnFilters[col] && (
              <button
                onClick={() => applyFilter({ [col]: undefined })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
              >지우기</button>
            )}
            <button
              onClick={applyCurrentFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >적용</button>
          </div>
        </div>
      )
    }
    if (col === 'ticketYn') {
      return (
        <div className="space-y-1">
          {([{ v: undefined, l: '전체' }, { v: 'Y', l: 'Y' }, { v: 'N', l: 'N' }] as { v: string | undefined; l: string }[]).map(opt => (
            <button
              key={opt.l}
              onClick={() => applyFilter({ ticketYn: opt.v })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${(opt.v ? columnFilters.ticketYn === opt.v : !columnFilters.ticketYn) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{opt.l}</button>
          ))}
        </div>
      )
    }
    if (col === 'marketingAgree') {
      return (
        <div className="space-y-1">
          {([{ v: undefined, l: '전체' }, { v: 'Y', l: '동의' }, { v: 'N', l: '미동의' }] as { v: string | undefined; l: string }[]).map(opt => (
            <button
              key={opt.l}
              onClick={() => applyFilter({ marketingAgree: opt.v })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${(opt.v ? columnFilters.marketingAgree === opt.v : !columnFilters.marketingAgree) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{opt.l}</button>
          ))}
        </div>
      )
    }
    if (col === 'registeredAt') {
      return (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">시작일</p>
            <input
              type="date"
              value={columnFilters.registeredFrom ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, registeredFrom: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">종료일</p>
            <input
              type="date"
              value={columnFilters.registeredTo ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, registeredTo: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
            />
          </div>
          <div className="flex gap-1.5">
            {(columnFilters.registeredFrom || columnFilters.registeredTo) && (
              <button
                onClick={() => applyFilter({ registeredFrom: undefined, registeredTo: undefined })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
              >지우기</button>
            )}
            <button
              onClick={applyCurrentFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >적용</button>
          </div>
        </div>
      )
    }
    return null
  }

  const hasActiveFilters = Object.values(appliedColumnFilters).some(Boolean)

  const registeredAtFilterLabel = (() => {
    const from = appliedColumnFilters.registeredFrom
    const to = appliedColumnFilters.registeredTo
    if (!from && !to) return null
    if (from && to) return `${from} ~ ${to}`
    if (from) return `${from} ~`
    return `~ ${to}`
  })()

  const textColFilterLabel = (col: string) => {
    const v = appliedColumnFilters[col]
    return v || null
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1080px] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">고객</h1>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                onClick={openRemoveModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                고객정보 제거 {selectedCount}
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <select
              value={activeBranch}
              onChange={e => { setActiveBranch(e.target.value); setPage(1); setSelectedIds(new Set()) }}
              className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {branchOptions.map(b => <option key={b.code} value={b.code}>{b.code} {b.name}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3 h-3" />초기화
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-12 px-5 py-4 bg-gray-50/50">
                    <input
                      type="checkbox"
                      aria-label="현재 페이지 고객 선택"
                      checked={allPageSelected}
                      disabled={selectablePaginated.length === 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300 disabled:opacity-30"
                    />
                  </th>

                  {/* No. */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.id
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('id')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            No. <SortIcon col="id" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'id', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && textColFilterLabel('id') && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {textColFilterLabel('id')}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* 이름 */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.name
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('name')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            이름 <SortIcon col="name" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'name', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && textColFilterLabel('name') && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {textColFilterLabel('name')}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* ID(이메일) */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.email
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('email')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            ID <SortIcon col="email" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'email', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && textColFilterLabel('email') && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {textColFilterLabel('email')}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* 전화번호 */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.phone
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('phone')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            전화번호 <SortIcon col="phone" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'phone', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && textColFilterLabel('phone') && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {textColFilterLabel('phone')}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* 재접수 */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.ticketYn
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('ticketYn')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            재접수 <SortIcon col="ticketYn" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'ticketYn', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {appliedColumnFilters.ticketYn}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* 마케팅 동의 */}
                  {(() => {
                    const isFiltered = !!appliedColumnFilters.marketingAgree
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('marketingAgree')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            마케팅 동의 <SortIcon col="marketingAgree" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'marketingAgree', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {appliedColumnFilters.marketingAgree === 'Y' ? '동의' : '미동의'}
                          </div>
                        )}
                      </th>
                    )
                  })()}

                  {/* 등록일자 */}
                  {(() => {
                    const isFiltered = !!(appliedColumnFilters.registeredFrom || appliedColumnFilters.registeredTo)
                    return (
                      <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSort('registeredAt')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                            등록일자 <SortIcon col="registeredAt" />
                          </button>
                          <button
                            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'registeredAt', rect }) }}
                            className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>
                        {isFiltered && registeredAtFilterLabel && (
                          <div className="mt-1 max-w-[160px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {registeredAtFilterLabel}
                          </div>
                        )}
                      </th>
                    )
                  })()}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(customer => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        aria-label={`${customer.id} 선택`}
                        checked={selectedIds.has(customer.id)}
                        disabled={customer.privacyRemoved}
                        onChange={() => toggleSelect(customer.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                      {customer.privacyRemoved ? (
                        <span className="text-gray-400">{customer.id}</span>
                      ) : (
                        <button
                          onClick={() => navigate(`/${langCode}/customers/${customer.id}`)}
                          className="font-mono text-sm font-normal text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                        >
                          {customer.id}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {customer.privacyRemoved ? <span className="text-gray-400">제거됨</span> : maskName(customer.name)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                      {customer.privacyRemoved ? <span className="text-gray-400">-</span> : maskEmail(customer.email)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                      {customer.privacyRemoved ? <span className="text-gray-400">-</span> : maskPhone(customer.phone)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{ticketLabel(customer.ticketYn)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {customer.privacyRemoved ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-400">-</span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          customer.marketingAgree === 'Y' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {consentLabel(customer.marketingAgree)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">
                      {customer.registeredAt} <span className="text-gray-400 font-sans">(KST)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
      </div>

      {removeTargets && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">고객정보 제거</h3>
                    <p className="text-xs text-gray-400 mt-1">선택 {removeTargets.length}건</p>
                  </div>
                </div>
                <button onClick={closeRemoveModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
                제거 항목: 이름, ID, 전화번호, 마케팅 동의
              </div>
              <div className="max-h-28 overflow-auto rounded-2xl border border-gray-100">
                {removeTargets.map(customer => (
                  <div key={customer.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0 text-sm">
                    <span className="font-mono text-gray-700">{customer.id}</span>
                    <span className="text-gray-400">{maskName(customer.name)}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  제거 사유 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={removeReason}
                  onChange={event => setRemoveReason(event.target.value)}
                  placeholder="고객 요청, 보유기간 만료 등 처리 사유를 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-[24px] flex items-center justify-end gap-3">
              <button
                onClick={closeRemoveModal}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleRemoveCustomerInfo}
                disabled={!removeReason.trim()}
                className="px-5 py-2.5 bg-black text-white rounded-2xl hover:bg-gray-900 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                제거
              </button>
            </div>
          </div>
        </div>
      )}

      {filterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
          <div
            className="fixed z-[50] bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-max"
            style={{
              top: filterPopover.rect.bottom + 6,
              ...(filterPopover.rect.left + 240 > window.innerWidth
                ? { right: Math.max(8, window.innerWidth - filterPopover.rect.right) }
                : { left: filterPopover.rect.left }),
            }}
          >
            {renderFilterPopoverContent(filterPopover.col)}
          </div>
        </>
      )}
    </div>
  )
}
