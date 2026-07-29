import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
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

const initColFilters = {
  actionType: 'all' as PrivacyActionType | 'all',
  subjectType: 'all' as '고객' | '티켓' | 'all',
}
type ColFilters = typeof initColFilters
type ColFilterKey = keyof ColFilters

function actionTypeBadgeStyle(actionType: PrivacyActionType) {
  switch (actionType) {
    case '조회': return 'bg-sky-50 text-sky-700'
    case '생성': return 'bg-emerald-50 text-emerald-700'
    case '수정': return 'bg-amber-50 text-amber-700'
    case '삭제': return 'bg-red-50 text-red-600'
  }
}

const ACTION_TYPE_OPTIONS: { value: PrivacyActionType | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '조회', label: '조회' },
  { value: '생성', label: '생성' },
  { value: '수정', label: '수정' },
  { value: '삭제', label: '삭제' },
]

const SUBJECT_TYPE_OPTIONS: { value: '고객' | '티켓' | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '고객', label: '고객' },
  { value: '티켓', label: '티켓' },
]

export function PrivacyLogsPage() {
  const [logs] = useState<PrivacyProcessingLog[]>(() => [...getPrivacyLogs()])
  const [dateFrom, setDateFrom] = useState(monthsAgoStr(1))
  const [dateTo, setDateTo] = useState(todayStr())
  const [filters, setFilters] = useState<ColFilters>(initColFilters)
  const [page, setPage] = useState(1)

  function setFilter(key: ColFilterKey, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function handleReset() {
    setDateFrom(monthsAgoStr(1))
    setDateTo(todayStr())
    setFilters(initColFilters)
    setPage(1)
  }

  const isAnyFilterActive =
    filters.actionType !== 'all' || filters.subjectType !== 'all'

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const dateStr = log.processedAt.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
      if (filters.actionType !== 'all' && log.actionType !== filters.actionType) return false
      if (filters.subjectType !== 'all' && log.subjectType !== filters.subjectType) return false
      return true
    })
  }, [logs, filters, dateFrom, dateTo])

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const HEADERS = ['처리일시', '처리자', '계정 ID', '대상', 'No.', '처리유형', '처리항목', 'IP', '사유']

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1180px] space-y-6">
        <h1 className="text-xl font-bold text-gray-900">개인정보 처리 로그</h1>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 필터 바 — 티켓 리스트와 동일한 형식 */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <select
              value={filters.actionType}
              onChange={e => setFilter('actionType', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {ACTION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value === 'all' ? '처리유형 전체' : opt.label}</option>
              ))}
            </select>
            <select
              value={filters.subjectType}
              onChange={e => setFilter('subjectType', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {SUBJECT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value === 'all' ? '대상 전체' : opt.label}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
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

          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {HEADERS.map(header => (
                    <th key={header} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
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
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.processedAt} <span className="text-gray-400 font-sans">(KST)</span></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{maskName(log.adminName)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.adminId}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{log.subjectType}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-900">{log.subjectNo}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${actionTypeBadgeStyle(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{log.processedFields.join(', ')}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-500">{log.ip}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
      </div>

    </div>
  )
}
