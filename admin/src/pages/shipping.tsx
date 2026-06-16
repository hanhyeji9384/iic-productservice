import { useMemo, useState, useEffect } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, Printer } from 'lucide-react'
import { PRODUCTS } from '@/lib/mock-data'
import { getTicketsWithExtras } from '@/lib/prototype-storage'
import { maskName } from '@/lib/masking'

type Tab = 'cj' | 'dhl' | 'haengrang' | 'fedex'
type SortKey = 'ticketNo' | 'customerName' | 'productName' | 'receptionPlace' | 'receivedAt'
type SortDir = 'asc' | 'desc'

const TABS: { key: Tab; label: string; method: string; branch: '1110' | 'C1002' }[] = [
  { key: 'cj',        label: 'CJ',    method: '택배(HQ)',        branch: '1110'  },
  { key: 'dhl',       label: 'DHL',   method: '해외택배(DHL)',    branch: '1110'  },
  { key: 'haengrang', label: '행낭',  method: '행낭(HQ)',         branch: '1110'  },
  { key: 'fedex',     label: 'FedEx', method: '해외택배(FedEx)',  branch: 'C1002' },
]

const BRANCH_TABS: Record<string, Tab[]> = {
  '':      ['cj', 'dhl', 'haengrang', 'fedex'],
  '1110':  ['cj', 'dhl', 'haengrang'],
  'C1002': ['fedex'],
}

const TBD_TABS: Tab[] = ['haengrang']

type ColKey = 'ticketNo' | 'customerName' | 'productName' | 'receptionPlace' | 'receivedAt'

const TABLE_COLS: { key: ColKey; label: string; sort: SortKey; filterable: boolean }[] = [
  { key: 'ticketNo',      label: 'Ticket No.',  sort: 'ticketNo',       filterable: true  },
  { key: 'customerName',  label: '고객명',       sort: 'customerName',   filterable: true  },
  { key: 'productName',   label: '제품코드',     sort: 'productName',    filterable: false },
  { key: 'receptionPlace',label: '접수처',       sort: 'receptionPlace', filterable: false },
  { key: 'receivedAt',    label: '접수일시',     sort: 'receivedAt',     filterable: false },
]

const initFilters: Record<string, string> = { ticketNo: '', customerName: '' }

export function ShippingPage() {
  const [branch, setBranch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('cj')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(initFilters)
  const [appliedFilters, setAppliedFilters] = useState(initFilters)
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('receivedAt')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const visibleTabs = TABS.filter(t => BRANCH_TABS[branch].includes(t.key))
  const currentTab = visibleTabs.find(t => t.key === activeTab) ?? visibleTabs[0]
  const isTbd = TBD_TABS.includes(currentTab.key)

  const allTickets = getTicketsWithExtras()

  const baseTickets = useMemo(() =>
    isTbd ? [] : allTickets.filter(t =>
      t.status === 'READY_TO_SHIP' && t.shippingMethod === currentTab.method
    ),
    [isTbd, allTickets, currentTab.method]
  )

  const filtered = useMemo(() => {
    return baseTickets.filter(t => {
      if (appliedFilters.ticketNo.trim() && !t.ticketNo.toLowerCase().includes(appliedFilters.ticketNo.trim().toLowerCase())) return false
      if (appliedFilters.customerName.trim() && !t.customerName.toLowerCase().includes(appliedFilters.customerName.trim().toLowerCase())) return false
      return true
    })
  }, [baseTickets, appliedFilters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir])

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length

  useEffect(() => {
    if (!filterPopover) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-filter-popover]')) setFilterPopover(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [filterPopover])

  function handleBranchChange(code: string) {
    setBranch(code)
    const firstNonTbd = (BRANCH_TABS[code] ?? []).find(k => !TBD_TABS.includes(k))
    setActiveTab(firstNonTbd ?? BRANCH_TABS[code][0])
    setSelectedIds(new Set())
  }

  function handleTabChange(tab: Tab) {
    if (TBD_TABS.includes(tab)) return
    setActiveTab(tab)
    setSelectedIds(new Set())
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function applyFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setAppliedFilters(prev => ({ ...prev, [key]: value }))
    setFilterPopover(null)
  }

  function hasActiveFilter(col: string) {
    return col in appliedFilters && appliedFilters[col] !== ''
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map(t => t.ticketNo)))
  }

  function toggleSelect(ticketNo: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(ticketNo)) next.delete(ticketNo)
      else next.add(ticketNo)
      return next
    })
  }

  function handlePrint(type: 'all' | 'selected') {
    const ids = type === 'selected' ? [...selectedIds] : sorted.map(t => t.ticketNo)
    // TODO: navigate to print page per delivery type
    alert(`${currentTab.label} 송장 출력 (${ids.length}건)\n준비 중입니다.`)
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">출고 관리</h1>
            <p className="mt-1 text-sm text-gray-400">배치 처리 완료 후 송장 출력을 진행합니다.</p>
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
              <option value="C1002">미국 법인 (US)</option>
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
                  {baseTickets.length > 0 ? `출력 가능 ${baseTickets.length}건` : '출력 가능한 건 없음'}
                </span>
                <button
                  onClick={() => handlePrint('all')}
                  disabled={baseTickets.length === 0}
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
          ) : baseTickets.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Printer className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">배치 처리된 건이 없습니다.</p>
            </div>
          ) : (
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
                        className={`px-4 py-3 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
                          isFiltered ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSort(col.sort)}
                            className="group flex items-center gap-1 hover:text-gray-700 transition-colors"
                          >
                            {col.label}
                            <SortIcon col={col.sort} />
                          </button>
                          {col.filterable && (
                            <button
                              onClick={e => handleFilterIconClick(col.key, e)}
                              className={`p-0.5 rounded transition-colors ${
                                filterPopover?.col === col.key || isFiltered
                                  ? 'text-blue-500'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                            >
                              <Filter className="w-3 h-3" />
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
                    <td colSpan={6} className="px-5 py-10 text-center text-xs text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : sorted.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(t.ticketNo) ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(t.ticketNo)} onChange={() => toggleSelect(t.ticketNo)} className="rounded border-gray-300 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-900">{t.ticketNo}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{maskName(t.customerName)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">
                      {PRODUCTS.find(p => p.name === t.productName)?.productCode ?? t.productName}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.receptionPlace}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {t.receivedAt} <span className="font-sans text-gray-400">(KST)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  )
}
