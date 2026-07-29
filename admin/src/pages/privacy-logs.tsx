import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, X } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { getPrivacyLogs } from '@/lib/download-logs'
import { maskName } from '@/lib/masking'
import type { PrivacyActionType, PrivacyProcessingLog } from '@/lib/download-logs'

const ITEMS_PER_PAGE = 20

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function monthsAgoStr(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}

function actionTypeBadgeStyle(actionType: PrivacyActionType) {
  switch (actionType) {
    case '조회': return 'bg-sky-50 text-sky-700'
    case '생성': return 'bg-emerald-50 text-emerald-700'
    case '수정': return 'bg-amber-50 text-amber-700'
    case '삭제': return 'bg-red-50 text-red-600'
  }
}

const TH = 'whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wide bg-gray-50/50 text-gray-500'

const initColFilters = { adminName: '', adminId: '', subjectNo: '', processedFields: '', reason: '' }
type ColFilters = typeof initColFilters
type ColFilterKey = keyof ColFilters
type SortKey = 'processedAt' | 'adminName' | 'adminId' | 'subjectType' | 'subjectNo' | 'actionType'

export function PrivacyLogsPage() {
  const [logs] = useState<PrivacyProcessingLog[]>(() => [...getPrivacyLogs()])
  const [dateFrom, setDateFrom] = useState(monthsAgoStr(1))
  const [dateTo, setDateTo] = useState(todayStr())
  const [actionType, setActionType] = useState<PrivacyActionType | 'all'>('all')
  const [subjectType, setSubjectType] = useState<'고객' | '티켓' | 'all'>('all')
  const [colFilters, setColFilters] = useState<ColFilters>(initColFilters)
  const [appliedColFilters, setAppliedColFilters] = useState<ColFilters>(initColFilters)
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('processedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterPopover(null) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [])

  function applyColFilter(key: ColFilterKey, value: string) {
    const next = { ...colFilters, [key]: value }
    setColFilters(next)
    setAppliedColFilters(next)
    setFilterPopover(null)
    setPage(1)
  }

  function applyCurrentColFilters() {
    setAppliedColFilters({ ...colFilters })
    setFilterPopover(null)
    setPage(1)
  }

  function handleReset() {
    setDateFrom(monthsAgoStr(1))
    setDateTo(todayStr())
    setActionType('all')
    setSubjectType('all')
    setColFilters(initColFilters)
    setAppliedColFilters(initColFilters)
    setSortKey('processedAt')
    setSortDir('desc')
    setPage(1)
  }

  const isAnyFilterActive =
    actionType !== 'all' ||
    subjectType !== 'all' ||
    (Object.keys(initColFilters) as ColFilterKey[]).some(k => appliedColFilters[k] !== '')

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const dateStr = log.processedAt.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
      if (actionType !== 'all' && log.actionType !== actionType) return false
      if (subjectType !== 'all' && log.subjectType !== subjectType) return false
      if (appliedColFilters.adminName && !maskName(log.adminName).toLowerCase().includes(appliedColFilters.adminName.toLowerCase())) return false
      if (appliedColFilters.adminId && !log.adminId.toLowerCase().includes(appliedColFilters.adminId.toLowerCase())) return false
      if (appliedColFilters.subjectNo && !log.subjectNo.toLowerCase().includes(appliedColFilters.subjectNo.toLowerCase())) return false
      if (appliedColFilters.processedFields && !log.processedFields.join(', ').toLowerCase().includes(appliedColFilters.processedFields.toLowerCase())) return false
      if (appliedColFilters.reason && !log.reason.toLowerCase().includes(appliedColFilters.reason.toLowerCase())) return false
      return true
    })
  }, [logs, actionType, subjectType, dateFrom, dateTo, appliedColFilters])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'adminName' ? maskName(a.adminName) : String(a[sortKey] ?? '')
      const bv = sortKey === 'adminName' ? maskName(b.adminName) : String(b[sortKey] ?? '')
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey('processedAt'); setSortDir('desc') }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function renderTextFilter(key: ColFilterKey, placeholder: string) {
    const val = colFilters[key]
    return (
      <div className="w-44 space-y-1.5">
        <input type="text" value={val} placeholder={placeholder} autoFocus
          onChange={e => setColFilters(prev => ({ ...prev, [key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && applyCurrentColFilters()}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
        <div className="flex gap-1.5">
          {val && (
            <button onClick={() => applyColFilter(key, '')}
              className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">지우기</button>
          )}
          <button onClick={applyCurrentColFilters}
            className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">적용</button>
        </div>
      </div>
    )
  }

  function ColTh({ col, label, active, sort }: { col: string; label: string; active: boolean; sort?: SortKey }) {
    return (
      <th className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wide transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-500'}`}>
        <div className="flex items-center gap-1.5">
          {sort ? (
            <button type="button" onClick={() => handleSort(sort)}
              className="flex items-center gap-1 hover:opacity-70 transition-opacity text-[11px] font-semibold tracking-wide">
              {label} <SortIcon col={sort} />
            </button>
          ) : <span>{label}</span>}
          <button type="button" onClick={e => handleFilterIconClick(col, e)}
            className="flex items-center rounded hover:opacity-70 transition-opacity">
            <Filter className={`h-3 w-3 ${active ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
          </button>
        </div>
      </th>
    )
  }

  function SortTh({ col, label }: { col: SortKey; label: string }) {
    return (
      <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wide bg-gray-50/50 text-gray-500">
        <button type="button" onClick={() => handleSort(col)}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity text-[11px] font-semibold tracking-wide">
          {label} <SortIcon col={col} />
        </button>
      </th>
    )
  }

  function renderFilterPopoverContent(col: string) {
    switch (col) {
      case 'adminName':      return renderTextFilter('adminName', '처리자')
      case 'adminId':        return renderTextFilter('adminId', '계정 ID')
      case 'subjectNo':      return renderTextFilter('subjectNo', 'No.')
      case 'processedFields': return renderTextFilter('processedFields', '처리항목')
      case 'reason':         return renderTextFilter('reason', '사유')
      case 'subjectType':
        return (
          <div>
            {[{ label: '전체', value: 'all' }, { label: '고객', value: '고객' }, { label: '티켓', value: '티켓' }].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { setSubjectType(opt.value as '고객' | '티켓' | 'all'); setFilterPopover(null); setPage(1) }}
                className={`block w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${subjectType === opt.value ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )
      case 'actionType':
        return (
          <div>
            {[{ label: '전체', value: 'all' }, { label: '조회', value: '조회' }, { label: '생성', value: '생성' }, { label: '수정', value: '수정' }, { label: '삭제', value: '삭제' }].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { setActionType(opt.value as PrivacyActionType | 'all'); setFilterPopover(null); setPage(1) }}
                className={`block w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${actionType === opt.value ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500" onClick={() => setFilterPopover(null)}>
      <div className="min-w-[1180px] space-y-6">
        <h1 className="text-xl font-bold text-gray-900">개인정보 처리 로그</h1>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 필터 바 */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} max={dateTo}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400" />
            <span className="text-gray-300 text-xs">~</span>
            <input type="date" value={dateTo} min={dateFrom}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400" />
            {isAnyFilterActive && (
              <>
                <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
                <button onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="w-3 h-3" />초기화
                </button>
              </>
            )}
          </div>

          <div className="overflow-x-auto" onClick={e => e.stopPropagation()}>
            <table className="min-w-[1300px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <SortTh col="processedAt" label="처리일시" />
                  <ColTh col="adminName" label="처리자" active={appliedColFilters.adminName !== ''} sort="adminName" />
                  <ColTh col="adminId" label="계정 ID" active={appliedColFilters.adminId !== ''} sort="adminId" />
                  <ColTh col="subjectType" label="대상" active={subjectType !== 'all'} sort="subjectType" />
                  <ColTh col="subjectNo" label="No." active={appliedColFilters.subjectNo !== ''} sort="subjectNo" />
                  <ColTh col="actionType" label="처리유형" active={actionType !== 'all'} sort="actionType" />
                  <ColTh col="processedFields" label="처리항목" active={appliedColFilters.processedFields !== ''} />
                  <th className={TH}>IP</th>
                  <ColTh col="reason" label="사유" active={appliedColFilters.reason !== ''} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">
                      개인정보 처리 이력이 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{log.processedAt} <span className="text-gray-400 font-sans">(KST)</span></td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-900">{maskName(log.adminName)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">{log.adminId}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{log.subjectType}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-900">{log.subjectNo}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${actionTypeBadgeStyle(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">{log.processedFields.join(', ')}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-500">{log.ip}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
      </div>

      {/* 컬럼 필터 팝오버 */}
      {filterPopover && (() => {
        const content = renderFilterPopoverContent(filterPopover.col)
        if (!content) return null
        return (
          <div
            style={{ position: 'fixed', top: filterPopover.rect.bottom + 6, left: filterPopover.rect.left, zIndex: 9999 }}
            className="rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08] p-2"
            onClick={e => e.stopPropagation()}
          >
            {content}
          </div>
        )
      })()}
    </div>
  )
}
