import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { getDownloadLogs } from '@/lib/download-logs'
import { maskName } from '@/lib/masking'
import type { DownloadLog, DownloadType } from '@/lib/download-logs'

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
  target: 'all',
  downloadType: 'all' as DownloadType | 'all',
}
type ColFilters = typeof initColFilters

function downloadTypeBadgeStyle(type: DownloadType) {
  if (type === '원본') return 'bg-gray-900 text-white'
  return 'bg-gray-100 text-gray-600'
}

export function DownloadLogsPage() {
  const [logs] = useState<DownloadLog[]>(() => [...getDownloadLogs()])
  const [dateFrom, setDateFrom] = useState(monthsAgoStr(1))
  const [dateTo, setDateTo] = useState(todayStr())
  const [filters, setFilters] = useState<ColFilters>(initColFilters)
  const [page, setPage] = useState(1)

  const targetOptions = useMemo(() =>
    [...new Set(logs.map(log => log.target))].sort((a, b) => a.localeCompare(b, 'ko')),
    [logs]
  )

  function setFilter(key: keyof ColFilters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const isAnyFilterActive =
    filters.target !== 'all' || filters.downloadType !== 'all'

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const dateStr = log.downloadedAt.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
      if (filters.target !== 'all' && log.target !== filters.target) return false
      if (filters.downloadType !== 'all' && log.downloadType !== filters.downloadType) return false
      return true
    })
  }, [logs, filters, dateFrom, dateTo])

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleReset() {
    setDateFrom(monthsAgoStr(1))
    setDateTo(todayStr())
    setFilters(initColFilters)
    setPage(1)
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1100px] space-y-6">
        <h1 className="text-xl font-bold text-gray-900">다운로드 로그</h1>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 필터 바 */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <select
              value={filters.target}
              onChange={e => setFilter('target', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="all">다운로드 대상 전체</option>
              {targetOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filters.downloadType}
              onChange={e => setFilter('downloadType', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="all">유형 전체</option>
              <option value="마스킹">마스킹</option>
              <option value="원본">원본</option>
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
            <div className="ml-auto text-xs text-gray-400">
              총 <strong className="text-gray-700">{filtered.length.toLocaleString()}</strong>건
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {['일시', '관리자', '계정 ID', '다운로드 대상', '유형', '항목 수', 'IP', '사유'].map(header => (
                    <th key={header} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                      다운로드 이력이 없습니다.
                    </td>
                  </tr>
                ) : paginated.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.downloadedAt} <span className="text-gray-400 font-sans">(KST)</span></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{maskName(log.adminName)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.adminId}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{log.target}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${downloadTypeBadgeStyle(log.downloadType)}`}>
                        {log.downloadType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{log.count.toLocaleString()}</td>
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
