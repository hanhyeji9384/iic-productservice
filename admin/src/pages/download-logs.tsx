import { useMemo, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { getDownloadLogs } from '@/lib/download-logs'
import { maskName } from '@/lib/masking'
import type { DownloadLog, DownloadType } from '@/lib/download-logs'

const ITEMS_PER_PAGE = 12

const initFilters = {
  target: 'all',
  downloadType: 'all',
}
type Filters = typeof initFilters

function downloadTypeBadgeStyle(type: DownloadType) {
  if (type === '원본') return 'bg-gray-900 text-white'
  return 'bg-gray-100 text-gray-600'
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

export function DownloadLogsPage() {
  const [logs] = useState<DownloadLog[]>(() => [...getDownloadLogs()])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(initFilters)
  const [applied, setApplied] = useState<Filters>(initFilters)
  const [page, setPage] = useState(1)

  const set = (key: keyof Filters) => (value: string) => setFilters(prev => ({ ...prev, [key]: value }))

  const targetOptions = useMemo(() =>
    [...new Set(logs.map(log => log.target))].sort((a, b) => a.localeCompare(b, 'ko')),
    [logs]
  )

  const activeFilterCount = useMemo(() =>
    (Object.keys(initFilters) as (keyof Filters)[]).filter(key => applied[key] !== initFilters[key]).length + (appliedSearch ? 1 : 0),
    [applied, appliedSearch]
  )

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase()
    return logs.filter(log => {
      if (q && !log.adminName.toLowerCase().includes(q) && !log.adminId.toLowerCase().includes(q) && !log.target.toLowerCase().includes(q)) return false
      if (applied.target !== 'all' && log.target !== applied.target) return false
      if (applied.downloadType !== 'all' && log.downloadType !== applied.downloadType) return false
      return true
    })
  }, [logs, appliedSearch, applied])

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSearch() {
    setAppliedSearch(search)
    setApplied(filters)
    setPage(1)
  }

  function handleReset() {
    setSearch('')
    setAppliedSearch('')
    setFilters(initFilters)
    setApplied(initFilters)
    setPage(1)
  }

  return (
    <div className="overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-[1100px] space-y-6">
        <h1 className="text-xl font-bold text-gray-900">다운로드 로그</h1>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[260px]">
              <input
                type="text"
                placeholder="관리자 이름, 계정 ID, 다운로드 대상으로 검색..."
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
              <div className="grid grid-cols-2 gap-3">
                <SelectFilter label="다운로드 대상" value={filters.target} onChange={set('target')}>
                  <option value="all">전체</option>
                  {targetOptions.map(target => <option key={target} value={target}>{target}</option>)}
                </SelectFilter>
                <SelectFilter label="다운로드 유형" value={filters.downloadType} onChange={set('downloadType')}>
                  <option value="all">전체</option>
                  <option value="마스킹">마스킹</option>
                  <option value="원본">원본</option>
                </SelectFilter>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
