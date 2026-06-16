import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { UserPlus, Shield, History, Users, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, X, Filter } from 'lucide-react'
import { ROLES, BRANCHES, STORES } from '@/lib/mock-data'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { useMembers } from '@/lib/members-context'
import { formatDateTime } from '@/lib/utils'
import type { MemberChangeLog } from '@/lib/types'

function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function getRoleName(roleId: string) {
  return ROLES.find(r => r.id === roleId)?.name ?? roleId
}

function formatMemberCreatedAt(value: string) {
  return value.includes(':') ? formatDateTime(value) : `${value.slice(0, 10)} 00:00:00`
}

const CHANGE_TYPE_STYLES: Record<MemberChangeLog['changeType'], { bg: string; label: string }> = {
  CREATE: { bg: 'bg-gray-100 text-gray-500', label: '생성' },
  UPDATE: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
  DELETE: { bg: 'bg-red-50 text-red-700',   label: '삭제' },
}

export function MembersPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list')
  const { members, memberChangeLogs: logs } = useMembers()

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>({})
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)

  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') ?? '1'))
  const LOG_PAGE_SIZE = 10
  const [logsPage, setLogsPage] = useState(1)

  type SortKey = 'name' | 'loginId' | 'email' | 'status' | 'createdAt' | 'lastLoginAt'
  type SortDir = 'asc' | 'desc' | null
  const [sortKey, setSortKey] = useState<SortKey | null>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700" />
    return <ArrowDown className="w-3 h-3 text-gray-700" />
  }

  const filtered = useMemo(() =>
    members.filter(m => {
      if (appliedColumnFilters.name && !m.name.toLowerCase().includes(appliedColumnFilters.name.toLowerCase())) return false
      if (appliedColumnFilters.loginId && !m.loginId.toLowerCase().includes(appliedColumnFilters.loginId.toLowerCase())) return false
      if (appliedColumnFilters.email && !m.email.toLowerCase().includes(appliedColumnFilters.email.toLowerCase())) return false
      if (appliedColumnFilters.role && m.roleId !== appliedColumnFilters.role) return false
      if (appliedColumnFilters.status && m.status !== appliedColumnFilters.status) return false
      const branches = m.managedBranches ?? []
      if (appliedColumnFilters.branch && !branches.includes('*') && !branches.includes(appliedColumnFilters.branch)) return false
      if (appliedColumnFilters.store && !(m.assignedStores ?? []).includes(appliedColumnFilters.store)) return false
      if (appliedColumnFilters.loginFrom && !(m.lastLoginAt && m.lastLoginAt >= appliedColumnFilters.loginFrom)) return false
      if (appliedColumnFilters.loginTo && !(m.lastLoginAt && m.lastLoginAt.slice(0, 10) <= appliedColumnFilters.loginTo)) return false
      return true
    }),
    [members, appliedColumnFilters]
  )

  function applyCurrentColumnFilters() {
    setAppliedColumnFilters(columnFilters)
    setCurrentPage(1)
    setFilterPopover(null)
  }

  function applyColumnFilterPatch(patch: Record<string, string>) {
    const next = { ...columnFilters }
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next[key] = value
      else delete next[key]
    })
    setColumnFilters(next)
    setAppliedColumnFilters(next)
    setCurrentPage(1)
    setFilterPopover(null)
  }

  function applyColumnFilter(key: string, value: string) {
    applyColumnFilterPatch({ [key]: value })
  }

  function handleReset() {
    setColumnFilters({})
    setAppliedColumnFilters({})
    setCurrentPage(1)
    setSearchParams({})
  }

  function changePage(page: number) {
    setCurrentPage(page)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (page === 1) next.delete('page')
      else next.set('page', String(page))
      return next
    })
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      const dir = sortDir === 'asc' ? 1 : -1
      if (!av && bv) return 1
      if (av && !bv) return -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function renderFilterPopoverContent(col: string) {
    if (col === 'name' || col === 'loginId' || col === 'email') {
      const placeholder = col === 'name' ? '이름 검색...' : col === 'loginId' ? 'ID 검색...' : '이메일 검색...'
      const value = columnFilters[col] ?? ''
      return (
        <div className="w-44 space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={e => setColumnFilters(p => ({ ...p, [col]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyCurrentColumnFilters()}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300"
          />
          <div className="flex gap-1.5">
            {value && (
              <button
                onClick={() => applyColumnFilter(col, '')}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
              >지우기</button>
            )}
            <button
              onClick={applyCurrentColumnFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >적용</button>
          </div>
        </div>
      )
    }
    if (col === 'role') {
      return (
        <div className="space-y-1">
          <button
            onClick={() => applyColumnFilter('role', '')}
            className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.role ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {ROLES.map(r => (
            <button key={r.id}
              onClick={() => applyColumnFilter('role', r.id)}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.role === r.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{r.name}</button>
          ))}
        </div>
      )
    }
    if (col === 'status') {
      return (
        <div className="space-y-1">
          {[{ v: '', l: '전체' }, { v: 'active', l: '활성' }, { v: 'inactive', l: '비활성' }].map(opt => (
            <button key={opt.v || 'all'}
              onClick={() => applyColumnFilter('status', opt.v)}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${(opt.v ? columnFilters.status === opt.v : !columnFilters.status) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{opt.l}</button>
          ))}
        </div>
      )
    }
    if (col === 'lastLogin') {
      return (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">시작일</p>
            <input type="date" value={columnFilters.loginFrom ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, loginFrom: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">종료일</p>
            <input type="date" value={columnFilters.loginTo ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, loginTo: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
          </div>
          <div className="flex gap-1.5">
            {(columnFilters.loginFrom || columnFilters.loginTo) && (
              <button
                onClick={() => applyColumnFilterPatch({ loginFrom: '', loginTo: '' })}
                className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
              >지우기</button>
            )}
            <button
              onClick={applyCurrentColumnFilters}
              className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >적용</button>
          </div>
        </div>
      )
    }
    if (col === 'branch') {
      const availableBranches = BRANCHES.filter(b =>
        members.some(m => (m.managedBranches ?? []).includes(b.code))
      )
      return (
        <div className="space-y-1">
          <button
            onClick={() => applyColumnFilter('branch', '')}
            className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.branch ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {availableBranches.map(b => (
            <button key={b.code}
              onClick={() => applyColumnFilter('branch', b.code)}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.branch === b.code ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{b.code} {b.name}</button>
          ))}
        </div>
      )
    }
    if (col === 'store') {
      const availableStoreCodes = [...new Set(members.flatMap(m => m.assignedStores ?? []))]
      const availableStores = STORES.filter(s => availableStoreCodes.includes(s.code))
      return (
        <div className="space-y-1">
          <button
            onClick={() => applyColumnFilter('store', '')}
            className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.store ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >전체</button>
          {availableStores.map(s => (
            <button key={s.code}
              onClick={() => applyColumnFilter('store', s.code)}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.store === s.code ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{s.name}</button>
          ))}
        </div>
      )
    }
    return null
  }

  const hasActiveFilters = Object.values(appliedColumnFilters).some(Boolean)

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1000px] space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
          </div>
          <button
            onClick={() => navigate(`${pfx}/members/new`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            회원 등록
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-gray-200">
          {([['list', '회원 목록', Users], ['history', '변경 이력', History]] as const).map(([tab, label, Icon]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 탭 1: 회원 목록 */}
        {activeTab === 'list' && (
          <>
            {/* 테이블 */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {hasActiveFilters && (
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-end">
                  <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X className="w-3 h-3" />초기화
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">

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
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {appliedColumnFilters.name}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* ID (loginId) */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.loginId
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleSort('loginId')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                                ID <SortIcon col="loginId" />
                              </button>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'loginId', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {appliedColumnFilters.loginId}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* 이메일 */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.email
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleSort('email')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                                이메일 <SortIcon col="email" />
                              </button>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'email', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {appliedColumnFilters.email}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* 역할 */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.role
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold tracking-wide">역할</span>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'role', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {getRoleName(appliedColumnFilters.role)}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">기술자</th>

                      {/* 상태 */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.status
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleSort('status')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                                상태 <SortIcon col="status" />
                              </button>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'status', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {appliedColumnFilters.status === 'active' ? '활성' : '비활성'}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* 등록일시 */}
                      <th className="px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap text-gray-500">
                        <button onClick={() => handleSort('createdAt')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                          등록일시 <SortIcon col="createdAt" />
                        </button>
                      </th>

                      {/* 마지막 로그인 */}
                      {(() => {
                        const isFiltered = !!(appliedColumnFilters.loginFrom || appliedColumnFilters.loginTo)
                        const loginFilterLabel = [appliedColumnFilters.loginFrom, appliedColumnFilters.loginTo].filter(Boolean).join(' ~ ')
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleSort('lastLoginAt')} className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide">
                                마지막 로그인 <SortIcon col="lastLoginAt" />
                              </button>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'lastLogin', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[160px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {loginFilterLabel}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* 법인 */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.branch
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold tracking-wide">법인</span>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'branch', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {BRANCHES.find(b => b.code === appliedColumnFilters.branch)?.name ?? appliedColumnFilters.branch}
                              </div>
                            )}
                          </th>
                        )
                      })()}

                      {/* 스토어 */}
                      {(() => {
                        const isFiltered = !!appliedColumnFilters.store
                        return (
                          <th className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold tracking-wide">스토어</span>
                              <button
                                onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFilterPopover({ col: 'store', rect }) }}
                                className={`flex-shrink-0 rounded p-0.5 transition-colors ${isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                            {isFiltered && (
                              <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                                {STORES.find(s => s.code === appliedColumnFilters.store)?.name ?? appliedColumnFilters.store}
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
                        <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-400">
                          조건에 맞는 회원이 없습니다.
                        </td>
                      </tr>
                    ) : paginated.map(m => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{maskName(m.name)}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">{m.loginId}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          <button
                            onClick={() => navigate(`${pfx}/members/${m.id}`)}
                            className="text-left text-sm font-normal text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                          >
                            {m.email}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Shield className="w-3 h-3 mr-1" />
                            {getRoleName(m.roleId)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {m.isTechnician
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700">기술자</span>
                            : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {m.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {formatMemberCreatedAt(m.createdAt)}<span className="text-gray-400 font-sans"> (KST)</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {formatDateTime(m.lastLoginAt)}{m.lastLoginAt && <span className="text-gray-400 font-sans"> (KST)</span>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-600">
                          {m.managedBranches?.includes('*')
                            ? '전체'
                            : (m.managedBranches ?? []).map(bc => BRANCHES.find(b => b.code === bc)?.name ?? bc).join(', ') || '—'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                          {(() => {
                            const stores = m.assignedStores ?? []
                            if (stores.length === 0) return <span className="text-gray-300">—</span>
                            const names = stores.map(sc => STORES.find(s => s.code === sc)?.name ?? sc)
                            return <>{names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`}</>
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이징 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-gray-500">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / 전체 {filtered.length}명
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changePage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Column filter popover */}
            {filterPopover && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
                <div
                  className="fixed z-[50] bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-max"
                  style={{ top: filterPopover.rect.bottom + 6, left: filterPopover.rect.left }}
                >
                  {renderFilterPopoverContent(filterPopover.col)}
                </div>
              </>
            )}
          </>
        )}

        {/* 탭 2: 변경 이력 */}
        {activeTab === 'history' && (() => {
          const paginatedLogs = logs.slice((logsPage - 1) * LOG_PAGE_SIZE, logsPage * LOG_PAGE_SIZE)
          return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">처리 일시</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap w-[80px]">유형</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">대상 회원</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50">변경 내용</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">처리자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">변경 이력이 없습니다.</td>
                      </tr>
                    ) : paginatedLogs.map(log => {
                      const style = CHANGE_TYPE_STYLES[log.changeType]
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.changedAt} <span className="text-gray-400">(KST)</span></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg}`}>{style.label}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{maskName(log.targetName)}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{log.targetLoginId}</div>
                          </td>
                          <td className="px-6 py-4"><SummaryCell summary={log.summary} changeType={log.changeType} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{maskName(log.changedByName)}</div>
                            {log.changedById && <div className="text-xs text-gray-400 font-mono mt-0.5">{log.changedById}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={logs.length} perPage={LOG_PAGE_SIZE} current={logsPage} onChange={setLogsPage} />
            </div>
          )
        })()}

      </div>
    </div>
  )
}
