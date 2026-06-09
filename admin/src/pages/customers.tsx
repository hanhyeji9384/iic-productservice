import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { addPrivacyLog } from '@/lib/download-logs'
import { CUSTOMERS } from '@/lib/mock-data'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import type { Customer } from '@/lib/types'

const ITEMS_PER_PAGE = 15
const REMOVED_CUSTOMERS_STORAGE_KEY = 'ps-admin-removed-customers'

const initFilters = {
  ticketYn: 'all',
  marketingAgree: 'all',
  registeredFrom: '',
  registeredTo: '',
}
type Filters = typeof initFilters
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

function localTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
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
  return CUSTOMERS.map(customer => {
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

function SelectFilter({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function DateFilter({ label, value, onChange }: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <input
        type="date"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
      />
    </div>
  )
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [removeTargets, setRemoveTargets] = useState<CustomerRow[] | null>(null)
  const [removeReason, setRemoveReason] = useState('')

  const set = (key: keyof Filters) => (value: string) => setFilters(prev => ({ ...prev, [key]: value }))

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(key => applied[key] !== initFilters[key]).length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase()
    const qDigits = normalizeDigits(q)
    return customers.filter(customer => {
      if (q) {
        const textMatched =
          customer.id.toLowerCase().includes(q) ||
          (!customer.privacyRemoved && (
            customer.name.toLowerCase().includes(q) ||
            customer.email.toLowerCase().includes(q)
          ))
        const phoneMatched = !customer.privacyRemoved && qDigits.length > 0 && normalizeDigits(customer.phone).includes(qDigits)
        if (!textMatched && !phoneMatched) return false
      }
      if (applied.ticketYn !== 'all' && customer.ticketYn !== applied.ticketYn) return false
      if (applied.marketingAgree !== 'all' && (customer.privacyRemoved || customer.marketingAgree !== applied.marketingAgree)) return false
      const registeredDate = customer.registeredAt.slice(0, 10)
      if (applied.registeredFrom && registeredDate < applied.registeredFrom) return false
      if (applied.registeredTo && registeredDate > applied.registeredTo) return false
      return true
    })
  }, [customers, appliedSearch, applied])

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

  function handleSearch() {
    setAppliedSearch(search)
    setApplied(filters)
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleReset() {
    setSearch('')
    setAppliedSearch('')
    setFilters(initFilters)
    setApplied(initFilters)
    setPage(1)
    setSortKey(null)
    setSortDir(null)
    setSelectedIds(new Set())
  }

  function handleRefresh() {
    setCustomers(prev => [...prev])
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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[260px]">
              <input
                type="text"
                placeholder="No., 이름, ID, 전화번호로 검색..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
              />
            </div>
            <button onClick={handleSearch} className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Search className="w-4 h-4" />검색
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              상세검색
              {activeFilterCount > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${showFilters ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5" />초기화
              </button>
            )}
          </div>

          {showFilters && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-4 gap-3">
                <SelectFilter label="재접수" value={filters.ticketYn} onChange={set('ticketYn')}>
                  <option value="all">전체</option>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </SelectFilter>
                <SelectFilter label="마케팅 동의" value={filters.marketingAgree} onChange={set('marketingAgree')}>
                  <option value="all">전체</option>
                  <option value="Y">동의</option>
                  <option value="N">미동의</option>
                </SelectFilter>
                <DateFilter label="등록일자 시작" value={filters.registeredFrom} onChange={set('registeredFrom')} />
                <DateFilter label="등록일자 종료" value={filters.registeredTo} onChange={set('registeredTo')} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                  {([
                    { key: 'id', label: 'No.', sort: 'id' },
                    { key: 'name', label: '이름', sort: 'name' },
                    { key: 'email', label: 'ID', sort: 'email' },
                    { key: 'phone', label: '전화번호', sort: 'phone' },
                    { key: 'ticketYn', label: '재접수', sort: 'ticketYn' },
                    { key: 'marketingAgree', label: '마케팅 동의', sort: 'marketingAgree' },
                    { key: 'registeredAt', label: '등록일자', sort: 'registeredAt' },
                  ] as { key: string; label: string; sort: SortKey }[]).map(col => (
                    <th key={col.key} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      <button onClick={() => handleSort(col.sort)} className="group flex items-center gap-1.5 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                        {col.label} <SortIcon col={col.sort} />
                      </button>
                    </th>
                  ))}
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
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
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
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{customer.id}</td>
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
    </div>
  )
}
