import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ExternalLink, FileDown, Filter, Lock, Search, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  SURVEYS,
  SATISFIED_KEYWORDS,
  DISSATISFIED_KEYWORDS,
  ENFORCE_KEYWORDS,
  KEYWORD_GROUPS,
} from '@/lib/mock-data'
import { Pagination } from '@/components/pagination'
import type { Survey } from '@/lib/types'

const ITEMS_PER_PAGE = 20

// ─── 상수 ────────────────────────────────────────────────────────────────
const REPAIR_DEPT_OPTIONS = ['all', '본사', '3PL', 'US Office', 'JP Office'] as const
const SATISFACTION_OPTIONS = [
  { label: '전체', value: 'all' },
  { label: '만족', value: '1' },
  { label: '불만족', value: '2' },
]
const CALLBACK_OPTIONS = [
  { label: '전체', value: 'all' },
  { label: '콜백 대기', value: '콜백 대기' },
  { label: '콜백 완료', value: '콜백 완료' },
  { label: '부재', value: '부재' },
  { label: '-', value: 'none' },
]

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }
function monthsAgoStr(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10)
}

// ─── 필터 상태 ────────────────────────────────────────────────────────────
interface Filters {
  from: string; to: string
  satisfaction: string; repairDepartment: string; keyword: string; callBack: string
  ticketNo: string; satisfiedKeyword: string; dissatisfiedKeyword: string
  satisfactionEtcText: string; enforceKeyword: string; enforceKeywordEtc: string
  additionalComment: string; repairDetail: string; commentMemo: string
}
const INIT_FILTERS: Filters = {
  from: monthsAgoStr(1), to: todayStr(),
  satisfaction: 'all', repairDepartment: 'all', keyword: 'all', callBack: 'all',
  ticketNo: '', satisfiedKeyword: 'all', dissatisfiedKeyword: 'all',
  satisfactionEtcText: '', enforceKeyword: 'all', enforceKeywordEtc: '',
  additionalComment: '', repairDetail: '', commentMemo: '',
}

// ─── 키워드 코드 → 레이블 ────────────────────────────────────────────────
function resolveKeyword(code: string | null, map: Record<string, string>): string {
  if (!code) return '-'
  return map[code] ?? code
}

// ─── 뱃지 ────────────────────────────────────────────────────────────────
function callbackBadgeClass(value: string | null) {
  if (value === '콜백 대기') return 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
  if (value === '콜백 완료') return 'bg-green-50 text-green-600 ring-1 ring-green-200'
  if (value === '부재') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-400'
}

function satisfactionBadge(value: 1 | 2 | null) {
  if (value === 1) return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">만족</span>
  if (value === 2) return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-200">불만족</span>
  return <span className="text-gray-300 text-xs">-</span>
}

// ─── 편집 모달 타입 ────────────────────────────────────────────────────────
interface EditModal { surveyId: number; field: 'callBack' | 'commentMemo' }

// ─── 엑셀 내보내기 ────────────────────────────────────────────────────────
function exportExcel(data: Survey[]) {
  const rows = data.map(s => ({
    '티켓번호': s.ticketNo,
    '설문종료일': s.responseEndDate,
    '만족여부': s.satisfaction === 1 ? '만족' : s.satisfaction === 2 ? '불만족' : '-',
    '그룹키워드': resolveKeyword(s.keyword, KEYWORD_GROUPS),
    '만족키워드': resolveKeyword(s.satisfiedKeyword, SATISFIED_KEYWORDS),
    '불만족키워드': resolveKeyword(s.dissatisfiedKeyword, DISSATISFIED_KEYWORDS),
    '만족/불만족기타': s.satisfactionEtcText ?? '',
    '강화키워드': resolveKeyword(s.enforceKeyword, ENFORCE_KEYWORDS),
    '강화기타': s.enforceKeywordEtc ?? '',
    '추가서술': s.additionalComment ?? '',
    '수리진행처': s.repairDepartment ?? '-',
    '수리내용': s.repairDetail ?? '-',
    '콜백상태': s.callBack ?? '-',
    '코멘트': s.commentMemo ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '설문조사')
  const fileName = `survey_${todayStr()}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─── 필터 팝오버 ──────────────────────────────────────────────────────────
type PopoverCol = keyof Filters

export function SurveyPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()

  const [surveys, setSurveys] = useState<Survey[]>(SURVEYS)
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS)
  const [applied, setApplied] = useState<Filters>(INIT_FILTERS)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof Survey>('responseEndDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterPopover, setFilterPopover] = useState<{ col: PopoverCol; rect: DOMRect } | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const [editValue, setEditValue] = useState('')
  const [inlineCallbackEdit, setInlineCallbackEdit] = useState<number | null>(null)

  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportMenuOpen) return
    const close = (e: MouseEvent) => { if (!exportMenuRef.current?.contains(e.target as Node)) setExportMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [exportMenuOpen])

  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterPopover(null) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [])

  // ─── 필터링 ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return surveys.filter(s => {
      if (applied.from && s.responseEndDate < applied.from) return false
      if (applied.to && s.responseEndDate > applied.to) return false
      if (applied.satisfaction !== 'all') {
        const sat = applied.satisfaction === '1' ? 1 : 2
        if (s.satisfaction !== sat) return false
      }
      if (applied.repairDepartment !== 'all' && s.repairDepartment !== applied.repairDepartment) return false
      if (applied.keyword !== 'all' && s.keyword !== applied.keyword) return false
      if (applied.callBack !== 'all') {
        if (applied.callBack === 'none') { if (s.callBack !== null) return false }
        else { if (s.callBack !== applied.callBack) return false }
      }
      if (applied.ticketNo && !s.ticketNo.toLowerCase().includes(applied.ticketNo.toLowerCase())) return false
      if (applied.satisfiedKeyword !== 'all' && s.satisfiedKeyword !== applied.satisfiedKeyword) return false
      if (applied.dissatisfiedKeyword !== 'all' && s.dissatisfiedKeyword !== applied.dissatisfiedKeyword) return false
      if (applied.satisfactionEtcText && !s.satisfactionEtcText?.toLowerCase().includes(applied.satisfactionEtcText.toLowerCase())) return false
      if (applied.enforceKeyword !== 'all' && s.enforceKeyword !== applied.enforceKeyword) return false
      if (applied.enforceKeywordEtc && !s.enforceKeywordEtc?.toLowerCase().includes(applied.enforceKeywordEtc.toLowerCase())) return false
      if (applied.additionalComment && !s.additionalComment?.toLowerCase().includes(applied.additionalComment.toLowerCase())) return false
      if (applied.repairDetail && !s.repairDetail?.toLowerCase().includes(applied.repairDetail.toLowerCase())) return false
      if (applied.commentMemo && !s.commentMemo?.toLowerCase().includes(applied.commentMemo.toLowerCase())) return false
      return true
    })
  }, [surveys, applied])

  function handleSort(key: keyof Survey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const dir = sortDir === 'asc' ? 1 : -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function applyFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...applied, [key]: value }
    setFilters(next); setApplied(next); setPage(1)
  }

  function handleReset() {
    setFilters(INIT_FILTERS); setApplied(INIT_FILTERS); setPage(1); setFilterPopover(null)
  }

  const activeFilterCount = useMemo(() => {
    const keys: (keyof Filters)[] = ['satisfaction', 'repairDepartment', 'keyword', 'callBack',
      'ticketNo', 'satisfiedKeyword', 'dissatisfiedKeyword', 'satisfactionEtcText',
      'enforceKeyword', 'enforceKeywordEtc', 'additionalComment', 'repairDetail', 'commentMemo']
    const dateChanged = applied.from !== INIT_FILTERS.from || applied.to !== INIT_FILTERS.to ? 1 : 0
    return dateChanged + keys.filter(k => applied[k] !== INIT_FILTERS[k]).length
  }, [applied])

  function isFiltered(col: PopoverCol) { return applied[col] !== INIT_FILTERS[col] }

  // ─── 팝오버 렌더 ─────────────────────────────────────────────────────────
  function renderPopover(col: PopoverCol) {
    if (!filterPopover || filterPopover.col !== col) return null
    const { rect } = filterPopover
    const style: React.CSSProperties = {
      position: 'fixed', top: rect.bottom + 6, zIndex: 9999,
      ...(rect.left + 260 > window.innerWidth
        ? { right: Math.max(8, window.innerWidth - rect.right) }
        : { left: rect.left }),
    }

    // 드롭다운 타입 필터
    const renderDropdown = (options: { label: string; value: string }[], key: PopoverCol) => (
      <div style={style} className="w-56 rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08] p-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { applyFilter(key, opt.value); setFilterPopover(null) }}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${applied[key] === opt.value ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )

    // 텍스트 검색 타입 필터
    const renderTextSearch = (key: PopoverCol, placeholder: string) => {
      const val = filters[key] as string
      return (
        <div style={style} className="w-60 rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08] p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={val}
              autoFocus
              onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { applyFilter(key, val); setFilterPopover(null) } }}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { applyFilter(key, val); setFilterPopover(null) }}
              className="flex-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">적용</button>
            <button type="button" onClick={() => { applyFilter(key, INIT_FILTERS[key] as string); setFilterPopover(null) }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">초기화</button>
          </div>
        </div>
      )
    }

    switch (col) {
      case 'ticketNo': return renderTextSearch('ticketNo', '티켓번호 검색')
      case 'satisfaction': return renderDropdown(SATISFACTION_OPTIONS, 'satisfaction')
      case 'keyword': return renderDropdown([
        { label: '전체', value: 'all' },
        ...Object.entries(KEYWORD_GROUPS).map(([k, v]) => ({ label: v, value: k })),
      ], 'keyword')
      case 'satisfiedKeyword': return renderDropdown([
        { label: '전체', value: 'all' },
        ...Object.entries(SATISFIED_KEYWORDS).map(([k, v]) => ({ label: v, value: k })),
      ], 'satisfiedKeyword')
      case 'dissatisfiedKeyword': return renderDropdown([
        { label: '전체', value: 'all' },
        ...Object.entries(DISSATISFIED_KEYWORDS).map(([k, v]) => ({ label: v, value: k })),
      ], 'dissatisfiedKeyword')
      case 'satisfactionEtcText': return renderTextSearch('satisfactionEtcText', '서술형 내용 검색')
      case 'enforceKeyword': return renderDropdown([
        { label: '전체', value: 'all' },
        ...Object.entries(ENFORCE_KEYWORDS).map(([k, v]) => ({ label: v, value: k })),
      ], 'enforceKeyword')
      case 'enforceKeywordEtc': return renderTextSearch('enforceKeywordEtc', '강화 기타 서술 검색')
      case 'additionalComment': return renderTextSearch('additionalComment', '추가 서술 검색')
      case 'repairDepartment': return renderDropdown([
        { label: '전체', value: 'all' },
        ...REPAIR_DEPT_OPTIONS.filter(o => o !== 'all').map(o => ({ label: o, value: o })),
      ], 'repairDepartment')
      case 'repairDetail': return renderTextSearch('repairDetail', '수리내용 검색')
      case 'callBack': return renderDropdown(CALLBACK_OPTIONS, 'callBack')
      case 'commentMemo': return renderTextSearch('commentMemo', '코멘트 검색')
      default: return null
    }
  }

  function openEdit(s: Survey, field: 'callBack' | 'commentMemo') {
    setEditModal({ surveyId: s.id, field })
    setEditValue(s[field] ?? '')
  }
  function saveEdit() {
    if (!editModal) return
    setSurveys(prev => prev.map(s => s.id === editModal.surveyId ? { ...s, [editModal.field]: editValue || null } : s))
    setEditModal(null)
  }

  // ─── 정렬 아이콘 ──────────────────────────────────────────────────────────
  function SortIcon({ col }: { col: keyof Survey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  // ─── 컬럼 헤더 ───────────────────────────────────────────────────────────
  function ColHeader({ label, col, sort }: { label: string; col: PopoverCol; sort?: keyof Survey }) {
    const active = isFiltered(col)
    const isOpen = filterPopover?.col === col
    return (
      <th className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wide transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-500'}`}>
        <div className="flex items-center gap-1.5">
          {sort ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleSort(sort) }}
              className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity text-[11px] font-semibold tracking-wide"
            >
              {label} <SortIcon col={sort} />
            </button>
          ) : (
            <span>{label}</span>
          )}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              setFilterPopover(isOpen ? null : { col, rect })
            }}
            className={`flex items-center rounded transition-colors hover:opacity-70 ${isOpen ? 'text-blue-600' : ''}`}
          >
            <Filter className={`h-3 w-3 ${active ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
          </button>
        </div>
      </th>
    )
  }

  return (
    <div
      className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500"
      onClick={() => setFilterPopover(null)}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">설문조사</h1>
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <FileDown className="w-4 h-4" />
              Excel 다운로드
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-black/[0.08]">
                <button
                  type="button"
                  onClick={() => { exportExcel(filtered); setExportMenuOpen(false) }}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    <span className="block font-medium">엑셀 다운로드</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{filtered.length.toLocaleString()}건 전체</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
          {/* 필터 바: 날짜 + 빠른선택 + 초기화 */}
          <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <input
              type="date"
              value={filters.from}
              max={filters.to || todayStr()}
              onChange={e => { setFilters(p => ({ ...p, from: e.target.value })); applyFilter('from', e.target.value) }}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              max={todayStr()}
              onChange={e => { setFilters(p => ({ ...p, to: e.target.value })); applyFilter('to', e.target.value) }}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            />
            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3 h-3" />초기화
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400">
              총 <strong className="text-gray-700">{filtered.length.toLocaleString()}</strong>건
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto" onClick={e => e.stopPropagation()}>
            {filtered.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <Search className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-900">조회된 설문 응답이 없습니다.</p>
                <p className="text-xs text-gray-400">필터 조건을 변경해 보세요.</p>
              </div>
            ) : (
              <table className="w-full table-fixed" style={{ minWidth: 2400 }}>
                <colgroup>
                  <col style={{ width: 200 }} />  {/* 티켓번호 */}
                  <col style={{ width: 100 }} />  {/* 설문종료일 */}
                  <col style={{ width: 72 }} />   {/* 만족도 */}
                  <col style={{ width: 120 }} />  {/* 그룹 키워드 */}
                  <col style={{ width: 140 }} />  {/* 만족 키워드 */}
                  <col style={{ width: 140 }} />  {/* 불만족 키워드 */}
                  <col style={{ width: 200 }} />  {/* 만족/불만족 기타 */}
                  <col style={{ width: 120 }} />  {/* 강화 키워드 */}
                  <col style={{ width: 200 }} />  {/* 강화 기타 */}
                  <col style={{ width: 260 }} />  {/* 마지막 서술형 */}
                  <col style={{ width: 90 }} />   {/* 수리진행처 */}
                  <col style={{ width: 90 }} />   {/* 수리내용 */}
                  <col style={{ width: 90 }} />   {/* 콜백 상태 */}
                  <col style={{ width: 260 }} />  {/* 코멘트 */}
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <ColHeader label="티켓번호" col="ticketNo" sort="ticketNo" />
                    <th className="whitespace-nowrap bg-gray-50/50 px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-gray-500">
                      <button type="button" onClick={() => handleSort('responseEndDate')} className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity text-[11px] font-semibold tracking-wide">
                        설문종료일 <SortIcon col="responseEndDate" />
                      </button>
                    </th>
                    <ColHeader label="만족도" col="satisfaction" sort="satisfaction" />
                    <ColHeader label="그룹 키워드" col="keyword" />
                    <ColHeader label="만족 키워드" col="satisfiedKeyword" />
                    <ColHeader label="불만족 키워드" col="dissatisfiedKeyword" />
                    <ColHeader label="만족/불만족 기타" col="satisfactionEtcText" />
                    <ColHeader label="강화 키워드" col="enforceKeyword" />
                    <ColHeader label="강화 기타" col="enforceKeywordEtc" />
                    <ColHeader label="마지막 서술형" col="additionalComment" />
                    <ColHeader label="수리진행처" col="repairDepartment" />
                    <ColHeader label="수리내용" col="repairDetail" />
                    <ColHeader label="콜백 상태" col="callBack" />
                    <ColHeader label="코멘트" col="commentMemo" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map(s => (
                    <tr key={s.id} className="transition-colors hover:bg-gray-50/50">
                      {/* 티켓번호 */}
                      <td className="overflow-hidden px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/${langCode}/tickets/${s.ticketNo}`)}
                          className="flex items-center gap-1 font-mono text-xs text-gray-900 hover:underline truncate"
                        >
                          <span className="truncate">{s.ticketNo}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </button>
                      </td>
                      {/* 설문종료일 */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">{s.responseEndDate}</td>
                      {/* 만족도 */}
                      <td className="px-4 py-3">{satisfactionBadge(s.satisfaction)}</td>
                      {/* 그룹 키워드 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <span className="break-words">{s.keyword ? KEYWORD_GROUPS[s.keyword] ?? s.keyword : '-'}</span>
                      </td>
                      {/* 만족 키워드 */}
                      <td className="overflow-hidden px-4 py-3">
                        {s.satisfiedKeyword
                          ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{SATISFIED_KEYWORDS[s.satisfiedKeyword] ?? s.satisfiedKeyword}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      {/* 불만족 키워드 */}
                      <td className="overflow-hidden px-4 py-3">
                        {s.dissatisfiedKeyword
                          ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">{DISSATISFIED_KEYWORDS[s.dissatisfiedKeyword] ?? s.dissatisfiedKeyword}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      {/* 만족/불만족 기타 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <p className="break-words whitespace-pre-wrap">{s.satisfactionEtcText ?? <span className="text-gray-300">-</span>}</p>
                      </td>
                      {/* 강화 키워드 */}
                      <td className="overflow-hidden px-4 py-3">
                        {s.enforceKeyword
                          ? <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">{ENFORCE_KEYWORDS[s.enforceKeyword] ?? s.enforceKeyword}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      {/* 강화 기타 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <p className="break-words whitespace-pre-wrap">{s.enforceKeywordEtc ?? <span className="text-gray-300">-</span>}</p>
                      </td>
                      {/* 마지막 서술형 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <p className="break-words whitespace-pre-wrap">{s.additionalComment ?? <span className="text-gray-300">-</span>}</p>
                      </td>
                      {/* 수리진행처 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <span className="truncate block">{s.repairDepartment ?? '-'}</span>
                      </td>
                      {/* 수리내용 */}
                      <td className="overflow-hidden px-4 py-3 text-xs text-gray-600">
                        <span className="truncate block">{s.repairDetail ?? '-'}</span>
                      </td>
                      {/* 콜백 상태 */}
                      <td className="px-4 py-3" onDoubleClick={() => setInlineCallbackEdit(s.id)}>
                        {inlineCallbackEdit === s.id ? (
                          <select
                            autoFocus
                            value={s.callBack ?? ''}
                            onChange={e => {
                              const val = e.target.value || null
                              setSurveys(prev => prev.map(r => r.id === s.id ? { ...r, callBack: val as typeof s.callBack } : r))
                              setInlineCallbackEdit(null)
                            }}
                            onBlur={() => setInlineCallbackEdit(null)}
                            className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:border-gray-500"
                          >
                            <option value="">-</option>
                            <option value="콜백 대기">콜백 대기</option>
                            <option value="콜백 완료">콜백 완료</option>
                            <option value="부재">부재</option>
                          </select>
                        ) : (
                          <span
                            title="더블클릭하여 편집"
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${callbackBadgeClass(s.callBack)}`}
                          >
                            {s.callBack ?? '-'}
                          </span>
                        )}
                      </td>
                      {/* 코멘트 */}
                      <td className="overflow-hidden px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(s, 'commentMemo')}
                          className="w-full text-left text-xs text-gray-600 hover:text-blue-600 transition-colors break-words whitespace-pre-wrap"
                        >
                          {s.commentMemo ?? <span className="text-gray-300 italic">메모 추가</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 페이지네이션 */}
          {filtered.length > 0 && (
            <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
          )}
        </div>
      </div>

      {/* 팝오버 렌더 */}
      {filterPopover && renderPopover(filterPopover.col)}

      {/* 편집 모달 */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}
        >
          <div className="w-96 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editModal.field === 'callBack' ? '콜백 상태 수정' : '코멘트 수정'}
              </h2>
              <button type="button" onClick={() => setEditModal(null)}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {editModal.field === 'callBack' ? (
                <div className="flex flex-col gap-2">
                  {[
                    { label: '-', value: '' },
                    { label: '콜백 대기', value: '콜백 대기' },
                    { label: '콜백 완료', value: '콜백 완료' },
                    { label: '부재', value: '부재' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="callBack" value={opt.value}
                        checked={editValue === opt.value} onChange={() => setEditValue(opt.value)}
                        className="h-4 w-4 accent-gray-800"
                      />
                      <span className={`text-sm font-medium inline-flex items-center rounded-md px-2.5 py-1 ${callbackBadgeClass(opt.value || null)}`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                  {editValue === '콜백 대기' && (
                    <p className="rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-600">
                      ⚠️ '콜백 대기' 설정 시 Salesforce에 아웃바운드 티켓이 생성됩니다.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={editValue} onChange={e => setEditValue(e.target.value)} rows={4}
                  placeholder="코멘트를 입력하세요"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none resize-none"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setEditModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50">취소</button>
              <button type="button" onClick={saveEdit}
                className="rounded-xl bg-black px-5 py-2 text-xs font-medium text-white hover:bg-gray-800">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
