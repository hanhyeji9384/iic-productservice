import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { UserPlus, Edit, ChevronDown, Shield, History, Users, Search, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { MEMBERS as INITIAL_MEMBERS, ROLES, BRANCHES, STORES, DEPARTMENTS } from '@/lib/mock-data'
import type { Member } from '@/lib/types'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'


function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}

function getRoleName(roleId: string) {
  return ROLES.find(r => r.id === roleId)?.name ?? roleId
}

function getBranchName(code: string) {
  return BRANCHES.find(b => b.code === code)?.name ?? code
}

function getStoreName(code: string) {
  return STORES.find(s => s.code === code)?.name ?? code
}

function getDepartmentName(id: string) {
  return DEPARTMENTS.find(d => d.id === id)?.name ?? '—'
}

function ManagedBranchesBadges({ codes }: { codes: string[] }) {
  if (!codes || codes.length === 0) return <span className="text-gray-300">—</span>
  if (codes.includes('*')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
        <Globe className="w-3 h-3" />전체
      </span>
    )
  }
  const visible = codes.slice(0, 2)
  const extra = codes.length - 2
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(c => (
        <span key={c} className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
          {getBranchName(c)}
        </span>
      ))}
      {extra > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-500">
          +{extra}
        </span>
      )}
    </div>
  )
}

function AssignedStoresBadges({ codes }: { codes: string[] }) {
  if (!codes || codes.length === 0) return <span className="text-gray-300">—</span>
  const visible = codes.slice(0, 1)
  const extra = codes.length - 1
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(c => (
        <span key={c} className="px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600 whitespace-nowrap max-w-[140px] truncate">
          {getStoreName(c)}
        </span>
      ))}
      {extra > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-500">
          +{extra}
        </span>
      )}
    </div>
  )
}


const CHANGE_TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  UPDATE: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
  DELETE: { bg: 'bg-red-50 text-red-700',   label: '삭제' },
}

interface ChangeLog {
  id: number
  changedAt: string
  changeType: 'UPDATE' | 'DELETE'
  targetName: string
  targetLoginId: string
  summary: string
  changedByName: string
  changedById?: string
}

const INITIAL_LOGS: ChangeLog[] = [
  { id: 1,  changedAt: '2026-05-10 14:30:00', changeType: 'UPDATE',     targetName: '정태양', targetLoginId: 'monster155', summary: '상태 변경: 활성 → 비활성',              changedByName: '김민준', changedById: 'monster001' },
  { id: 2,  changedAt: '2026-04-22 09:15:00', changeType: 'UPDATE',     targetName: '이수진', targetLoginId: 'monster042', summary: '역할 변경: 매장 접수 담당 → 본사 운영팀', changedByName: '김민준', changedById: 'monster001' },
  { id: 3,  changedAt: '2026-03-18 16:00:00', changeType: 'DELETE',     targetName: '박지현', targetLoginId: 'monster088', summary: '계정 삭제',                              changedByName: '한혜지', changedById: 'monster563' },
  { id: 5,  changedAt: '2026-02-28 17:45:00', changeType: 'UPDATE', targetName: '강지우', targetLoginId: 'monster310', summary: '상태 변경: 활성 → 비활성',              changedByName: '한혜지', changedById: 'monster563' },
  { id: 6,  changedAt: '2026-02-14 09:30:00', changeType: 'UPDATE',     targetName: '윤서준', targetLoginId: 'monster099', summary: '담당 법인 변경: GM 본사 → GM 재팬',     changedByName: '김민준', changedById: 'monster001' },
  { id: 7,  changedAt: '2026-01-30 15:20:00', changeType: 'UPDATE',     targetName: '임채원', targetLoginId: 'monster451', summary: '역할 변경: 조회 전용 → 매장 접수 담당', changedByName: '한혜지', changedById: 'monster563' },
  { id: 8,  changedAt: '2026-01-15 10:05:00', changeType: 'DELETE',     targetName: '송다현', targetLoginId: 'monster072', summary: '계정 삭제',                              changedByName: '김민준', changedById: 'monster001' },
  { id: 9,  changedAt: '2025-12-24 13:00:00', changeType: 'UPDATE',     targetName: '오지호', targetLoginId: 'monster188', summary: '상태 변경: 비활성 → 활성',              changedByName: '한혜지', changedById: 'monster563' },
  { id: 10, changedAt: '2025-12-10 16:30:00', changeType: 'UPDATE', targetName: '권나연', targetLoginId: 'monster267', summary: '상태 변경: 활성 → 비활성',              changedByName: '김민준', changedById: 'monster001' },
  { id: 11, changedAt: '2025-11-28 11:20:00', changeType: 'UPDATE',     targetName: '황준혁', targetLoginId: 'monster333', summary: '담당 스토어 변경',                       changedByName: '한혜지', changedById: 'monster563' },
  { id: 12, changedAt: '2025-11-05 09:45:00', changeType: 'UPDATE',     targetName: '류민지', targetLoginId: 'monster412', summary: '역할 변경: 본사 운영팀 → 조회 전용',    changedByName: '김민준', changedById: 'monster001' },
]

export function MembersPage() {
  const navigate = useNavigate()
  const { countryCode, langCode } = useParams()
  const pfx = `/${countryCode}/${langCode}`
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list')
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [logs, setLogs] = useState<ChangeLog[]>(INITIAL_LOGS)

  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [filterRole, setFilterRole] = useState(searchParams.get('role') ?? 'all')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? 'all')
  const [filterBranch, setFilterBranch] = useState(searchParams.get('branch') ?? 'all')
  const [filterStore, setFilterStore] = useState(searchParams.get('store') ?? 'all')
  const [filterLoginFrom, setFilterLoginFrom] = useState(searchParams.get('loginFrom') ?? '')
  const [filterLoginTo, setFilterLoginTo] = useState(searchParams.get('loginTo') ?? '')

  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('q') ?? '')
  const [appliedRole, setAppliedRole] = useState(searchParams.get('role') ?? 'all')
  const [appliedStatus, setAppliedStatus] = useState(searchParams.get('status') ?? 'all')
  const [appliedBranch, setAppliedBranch] = useState(searchParams.get('branch') ?? 'all')
  const [appliedStore, setAppliedStore] = useState(searchParams.get('store') ?? 'all')
  const [appliedLoginFrom, setAppliedLoginFrom] = useState(searchParams.get('loginFrom') ?? '')
  const [appliedLoginTo, setAppliedLoginTo] = useState(searchParams.get('loginTo') ?? '')

  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') ?? '1'))
  const LOG_PAGE_SIZE = 10
  const [logsPage, setLogsPage] = useState(1)

  const filtered = useMemo(() =>
    members.filter(m => {
      const q = appliedSearch.toLowerCase()
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.loginId.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      const matchRole = appliedRole === 'all' || m.roleId === appliedRole
      const matchStatus = appliedStatus === 'all' || m.status === appliedStatus
      const branches = m.managedBranches ?? []
      const matchBranch = appliedBranch === 'all' || branches.includes('*') || branches.includes(appliedBranch)
      const matchStore = appliedStore === 'all' || (m.assignedStores ?? []).includes(appliedStore)
      const matchLoginFrom = !appliedLoginFrom || (!!m.lastLoginAt && m.lastLoginAt >= appliedLoginFrom)
      const matchLoginTo = !appliedLoginTo || (!!m.lastLoginAt && m.lastLoginAt.slice(0, 10) <= appliedLoginTo)
      return matchSearch && matchRole && matchStatus && matchBranch && matchStore && matchLoginFrom && matchLoginTo
    }),
    [members, appliedSearch, appliedRole, appliedStatus, appliedBranch, appliedStore, appliedLoginFrom, appliedLoginTo]
  )

  function handleSearch() {
    if (filterLoginFrom && filterLoginTo) {
      const from = new Date(filterLoginFrom)
      const to = new Date(filterLoginTo)
      const maxTo = new Date(from)
      maxTo.setFullYear(maxTo.getFullYear() + 1)
      if (to > maxTo) {
        alert('마지막 로그인 검색 기간은 최대 1년까지 설정할 수 있습니다.')
        return
      }
      if (to < from) {
        alert('종료일이 시작일보다 앞에 있습니다.')
        return
      }
    }
    const params: Record<string, string> = {}
    if (search) params.q = search
    if (filterRole !== 'all') params.role = filterRole
    if (filterStatus !== 'all') params.status = filterStatus
    if (filterBranch !== 'all') params.branch = filterBranch
    if (filterStore !== 'all') params.store = filterStore
    if (filterLoginFrom) params.loginFrom = filterLoginFrom
    if (filterLoginTo) params.loginTo = filterLoginTo
    setSearchParams(params)
    setAppliedSearch(search)
    setAppliedRole(filterRole)
    setAppliedStatus(filterStatus)
    setAppliedBranch(filterBranch)
    setAppliedStore(filterStore)
    setAppliedLoginFrom(filterLoginFrom)
    setAppliedLoginTo(filterLoginTo)
    setCurrentPage(1)
  }

  function handleReset() {
    setSearch(''); setFilterRole('all'); setFilterStatus('all')
    setFilterBranch('all'); setFilterStore('all')
    setFilterLoginFrom(''); setFilterLoginTo('')
    setAppliedSearch(''); setAppliedRole('all'); setAppliedStatus('all')
    setAppliedBranch('all'); setAppliedStore('all')
    setAppliedLoginFrom(''); setAppliedLoginTo('')
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeCount = members.filter(m => m.status === 'active').length

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1000px] space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
            <p className="text-sm text-gray-500 mt-1">전체 {members.length}명 · 활성 {activeCount}명</p>
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
            {/* 필터 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="p-5 flex gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    placeholder="이름, ID, 이메일로 검색..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  검색
                </button>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                  상세검색
                </button>
              </div>
              {showFilters && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {/* 1행: 드롭다운 필터 */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">역할</p>
                      <div className="relative">
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer">
                          <option value="all">전체</option>
                          {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">상태</p>
                      <div className="relative">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer">
                          <option value="all">전체</option>
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">법인</p>
                      <div className="relative">
                        <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setFilterStore('all') }} className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer">
                          <option value="all">전체</option>
                          {BRANCHES.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">스토어</p>
                      <div className="relative">
                        <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer">
                          <option value="all">전체</option>
                          {(filterBranch === 'all' ? STORES : STORES.filter(s => s.branchCode === filterBranch)).map(s => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  {/* 2행: 날짜 + 초기화 */}
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">마지막 로그인</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={filterLoginFrom} onChange={e => setFilterLoginFrom(e.target.value)} className="px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                        <span className="text-sm text-gray-400">~</span>
                        <input type="date" value={filterLoginTo} onChange={e => setFilterLoginTo(e.target.value)} className="px-3 py-2 bg-[#f8f9fb] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
                      </div>
                    </div>
                    <button onClick={handleReset} className="ml-auto px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">초기화</button>
                  </div>
                </div>
              )}
            </div>

            {/* 테이블 */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">회원</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">이메일</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">역할</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">부서</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">상태</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">마지막 로그인</th>
                      <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                          조건에 맞는 회원이 없습니다.
                        </td>
                      </tr>
                    ) : paginated.map(m => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{m.loginId}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{m.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Shield className="w-3 h-3 mr-1" />
                            {getRoleName(m.roleId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {m.department ? getDepartmentName(m.department) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {m.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {formatDateTime(m.lastLoginAt)}{m.lastLoginAt && <span className="text-gray-400 font-sans"> (KST)</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`${pfx}/members/${m.id}`)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="상세보기"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
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
                            <div className="text-sm font-semibold text-gray-900">{log.targetName}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{log.targetLoginId}</div>
                          </td>
                          <td className="px-6 py-4"><SummaryCell summary={log.summary} changeType={log.changeType} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
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
