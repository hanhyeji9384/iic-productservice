import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ExternalLink, FileDown, Search, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  SURVEYS,
  SATISFIED_KEYWORDS,
  DISSATISFIED_KEYWORDS,
  ENFORCE_KEYWORDS,
  KEYWORD_GROUPS,
} from '@/lib/mock-data'
import { addDownloadLog } from '@/lib/download-logs'
import { Pagination } from '@/components/pagination'
import type { Survey } from '@/lib/types'

const ITEMS_PER_PAGE = 20

// ─── 상수 ─────────────────────────────────────────────────────────────────
const REPAIR_DEPARTMENT_OPTIONS = ['전체', '본사', '3PL', 'US Office', 'JP Office']

const CALLBACK_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '전체', value: '' },
  { label: '콜백 대기', value: '콜백 대기' },
  { label: '콜백 완료', value: '콜백 완료' },
  { label: '부재', value: '부재' },
]

const SATISFACTION_OPTIONS = [
  { label: '전체', value: '' },
  { label: '만족', value: '1' },
  { label: '불만족', value: '2' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function monthsAgoStr(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}
function yearsAgoStr(n: number) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

function constrainTo3Years(from: string, to: string, changed: 'from' | 'to'): { from: string; to: string } {
  if (!from || !to) return { from, to }
  const f = new Date(from), t = new Date(to)
  const maxMs = 3 * 365.25 * 24 * 60 * 60 * 1000
  if (t.getTime() - f.getTime() > maxMs) {
    if (changed === 'from') {
      const capped = new Date(f)
      capped.setFullYear(capped.getFullYear() + 3)
      return { from, to: capped.toISOString().slice(0, 10) }
    } else {
      const capped = new Date(t)
      capped.setFullYear(capped.getFullYear() - 3)
      return { from: capped.toISOString().slice(0, 10), to }
    }
  }
  return { from, to }
}

// ─── 키워드 코드 → 레이블 변환 ──────────────────────────────────────────
function resolveKeywords(codes: string | null, map: Record<string, string>): string {
  if (!codes) return '-'
  return codes.split(';').map(c => map[c] ?? c).join(', ')
}

// ─── 콜백 뱃지 색상 ──────────────────────────────────────────────────────
function callbackBadgeClass(value: string | null) {
  if (value === '콜백 대기') return 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
  if (value === '콜백 완료') return 'bg-green-50 text-green-600 ring-1 ring-green-200'
  if (value === '부재') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-400'
}

// ─── 만족도 뱃지 ─────────────────────────────────────────────────────────
function satisfactionBadge(value: 1 | 2 | null) {
  if (value === 1) return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">만족</span>
  if (value === 2) return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-200">불만족</span>
  return <span className="text-gray-300 text-xs">-</span>
}

// ─── 필터 상태 타입 ──────────────────────────────────────────────────────
interface Filters {
  from: string
  to: string
  ticketNo: string
  satisfaction: string
  keyword: string
  satisfiedKeyword: string
  dissatisfiedKeyword: string
  satisfactionEtcText: string
  enforceKeyword: string
  enforceKeywordEtc: string
  additionalComment: string
  repairDepartment: string
  repairDetail: string
  callBack: string
  commentMemo: string
}

const INIT_FILTERS: Filters = {
  from: monthsAgoStr(1),
  to: todayStr(),
  ticketNo: '',
  satisfaction: '',
  keyword: '',
  satisfiedKeyword: '',
  dissatisfiedKeyword: '',
  satisfactionEtcText: '',
  enforceKeyword: '',
  enforceKeywordEtc: '',
  additionalComment: '',
  repairDepartment: '',
  repairDetail: '',
  callBack: '',
  commentMemo: '',
}

// ─── 엑셀 내보내기 ────────────────────────────────────────────────────────
function exportToExcel(data: Survey[]) {
  const rows = data.map(s => ({
    '티켓번호': s.ticketNo,
    '설문종료일': s.responseEndDate,
    '만족여부': s.satisfaction === 1 ? '만족' : s.satisfaction === 2 ? '불만족' : '-',
    '그룹키워드': resolveKeywords(s.keyword, KEYWORD_GROUPS),
    '만족키워드': resolveKeywords(s.satisfiedKeyword, SATISFIED_KEYWORDS),
    '불만족키워드': resolveKeywords(s.dissatisfiedKeyword, DISSATISFIED_KEYWORDS),
    '만족/불만족 기타서술': s.satisfactionEtcText ?? '',
    '강화키워드': resolveKeywords(s.enforceKeyword, ENFORCE_KEYWORDS),
    '강화기타서술': s.enforceKeywordEtc ?? '',
    '추가서술': s.additionalComment ?? '',
    '수리진행처': s.repairDepartment ?? '-',
    '수리내용': s.repairDetail ?? '-',
    '콜백상태': s.callBack ?? '-',
    '코멘트': s.commentMemo ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '설문조사')
  XLSX.writeFile(wb, `survey_${new Date().toISOString().slice(0, 10)}.xlsx`)
  addDownloadLog({
    adminName: '한혜지',
    adminId: 'monster563',
    target: '설문조사',
    downloadType: '원본',
    count: rows.length,
    ip: '10.0.1.42',
    reason: '-',
  })
}

// ─── 컬럼 선택 편집 모달 (콜백 상태 & 코멘트) ────────────────────────────
interface EditModalState {
  surveyId: number
  field: 'callBack' | 'commentMemo'
  value: string
}

export function SurveyPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()

  const [surveys, setSurveys] = useState<Survey[]>(SURVEYS)
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS)
  const [applied, setApplied] = useState<Filters>(INIT_FILTERS)
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<EditModalState | null>(null)
  const [editValue, setEditValue] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // ─── 필터 적용 ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return surveys.filter(s => {
      if (applied.from && s.responseEndDate < applied.from) return false
      if (applied.to && s.responseEndDate > applied.to) return false
      if (applied.ticketNo && !s.ticketNo.toLowerCase().includes(applied.ticketNo.toLowerCase())) return false
      if (applied.satisfaction) {
        const sat = applied.satisfaction === '1' ? 1 : 2
        if (s.satisfaction !== sat) return false
      }
      if (applied.keyword && s.keyword !== applied.keyword) return false
      if (applied.satisfiedKeyword && !s.satisfiedKeyword?.split(';').includes(applied.satisfiedKeyword)) return false
      if (applied.dissatisfiedKeyword && !s.dissatisfiedKeyword?.split(';').includes(applied.dissatisfiedKeyword)) return false
      if (applied.satisfactionEtcText && !s.satisfactionEtcText?.toLowerCase().includes(applied.satisfactionEtcText.toLowerCase())) return false
      if (applied.enforceKeyword && !s.enforceKeyword?.split(';').includes(applied.enforceKeyword)) return false
      if (applied.enforceKeywordEtc && !s.enforceKeywordEtc?.toLowerCase().includes(applied.enforceKeywordEtc.toLowerCase())) return false
      if (applied.additionalComment && !s.additionalComment?.toLowerCase().includes(applied.additionalComment.toLowerCase())) return false
      if (applied.repairDepartment && applied.repairDepartment !== '전체' && s.repairDepartment !== applied.repairDepartment) return false
      if (applied.repairDetail && !s.repairDetail?.toLowerCase().includes(applied.repairDetail.toLowerCase())) return false
      if (applied.callBack && s.callBack !== applied.callBack) return false
      if (applied.commentMemo && !s.commentMemo?.toLowerCase().includes(applied.commentMemo.toLowerCase())) return false
      return true
    })
  }, [surveys, applied])

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSearch() {
    setApplied(filters)
    setPage(1)
  }

  function handleReset() {
    setFilters(INIT_FILTERS)
    setApplied(INIT_FILTERS)
    setPage(1)
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'from' || key === 'to') {
        const constrained = constrainTo3Years(next.from, next.to, key as 'from' | 'to')
        return { ...next, ...constrained }
      }
      return next
    })
  }

  // ─── 인라인 편집 ───────────────────────────────────────────────────────
  function openEdit(survey: Survey, field: 'callBack' | 'commentMemo') {
    setEditModal({ surveyId: survey.id, field, value: survey[field] ?? '' })
    setEditValue(survey[field] ?? '')
  }

  function saveEdit() {
    if (!editModal) return
    setSurveys(prev => prev.map(s =>
      s.id === editModal.surveyId
        ? { ...s, [editModal.field]: editValue || null }
        : s
    ))
    setEditModal(null)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">설문조사</h1>
          <p className="mt-0.5 text-xs text-gray-400">Qualtrics 설문 응답 결과 조회 및 콜백 관리</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 엑셀 내보내기 */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(v => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              내보내기
              <ChevronDown className={`h-3 w-3 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => { exportToExcel(filtered); setExportMenuOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <FileDown className="h-3.5 w-3.5 text-gray-400" />
                  엑셀 다운로드 ({filtered.length.toLocaleString()}건)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 필터 카드 */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center text-xs">

            {/* 설문 종료일 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">설문 종료일</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from}
                min={yearsAgoStr(3)}
                max={filters.to || todayStr()}
                onChange={e => updateFilter('from', e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              />
              <span className="text-gray-300">~</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || yearsAgoStr(3)}
                max={todayStr()}
                onChange={e => updateFilter('to', e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              />
              <span className="text-gray-300 text-[10px]">최대 3년</span>
              {/* 빠른 기간 선택 */}
              {[
                { label: '1개월', months: 1 },
                { label: '3개월', months: 3 },
                { label: '6개월', months: 6 },
              ].map(({ label, months }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const from = monthsAgoStr(months)
                    const to = todayStr()
                    setFilters(prev => ({ ...prev, from, to }))
                  }}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 티켓번호 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">티켓번호</span>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={filters.ticketNo}
                onChange={e => updateFilter('ticketNo', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="티켓번호 검색"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
              />
            </div>

            {/* 만족도 + 수리진행처 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">만족도</span>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {SATISFACTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFilter('satisfaction', opt.value)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      filters.satisfaction === opt.value
                        ? opt.value === '1' ? 'bg-blue-500 text-white'
                          : opt.value === '2' ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <span className="h-4 w-px bg-gray-200" />

              <span className="font-medium text-gray-500 whitespace-nowrap">수리진행처</span>
              <div className="flex gap-1">
                {REPAIR_DEPARTMENT_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateFilter('repairDepartment', opt === '전체' ? '' : opt)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      (opt === '전체' ? '' : opt) === filters.repairDepartment
                        ? 'bg-gray-800 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 그룹 키워드 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">그룹 키워드</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => updateFilter('keyword', '')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.keyword === '' ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >전체</button>
              {Object.entries(KEYWORD_GROUPS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateFilter('keyword', code)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filters.keyword === code ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 만족 키워드 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">만족 키워드</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => updateFilter('satisfiedKeyword', '')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.satisfiedKeyword === '' ? 'bg-blue-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >전체</button>
              {Object.entries(SATISFIED_KEYWORDS).filter(([k]) => k !== 'etc').map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateFilter('satisfiedKeyword', code)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filters.satisfiedKeyword === code ? 'bg-blue-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 불만족 키워드 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">불만족 키워드</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => updateFilter('dissatisfiedKeyword', '')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.dissatisfiedKeyword === '' ? 'bg-red-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >전체</button>
              {Object.entries(DISSATISFIED_KEYWORDS).filter(([k]) => k !== 'etc').map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateFilter('dissatisfiedKeyword', code)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filters.dissatisfiedKeyword === code ? 'bg-red-500 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 강화 키워드 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">강화 키워드</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => updateFilter('enforceKeyword', '')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.enforceKeyword === '' ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >전체</button>
              {Object.entries(ENFORCE_KEYWORDS).filter(([k]) => k !== 'etc').map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateFilter('enforceKeyword', code)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filters.enforceKeyword === code ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 콜백 상태 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">콜백 상태</span>
            <div className="flex gap-1">
              {CALLBACK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilter('callBack', opt.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    filters.callBack === opt.value
                      ? opt.value === '콜백 대기' ? 'bg-orange-500 text-white'
                        : opt.value === '콜백 완료' ? 'bg-green-600 text-white'
                        : opt.value === '부재' ? 'bg-gray-500 text-white'
                        : 'bg-gray-800 text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 서술형 검색 */}
            <span className="font-medium text-gray-500 whitespace-nowrap">서술형 검색</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'satisfactionEtcText' as const, placeholder: '만족/불만족 기타 서술' },
                { key: 'enforceKeywordEtc' as const, placeholder: '강화 기타 서술' },
                { key: 'additionalComment' as const, placeholder: '마지막 서술형' },
                { key: 'repairDetail' as const, placeholder: '수리내용' },
                { key: 'commentMemo' as const, placeholder: '코멘트' },
              ].map(({ key, placeholder }) => (
                <div key={key} className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    value={filters[key]}
                    onChange={e => updateFilter(key, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder={placeholder}
                    className="w-44 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 조회/초기화 버튼 */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-xs font-medium text-white hover:bg-gray-800"
            >
              <Search className="h-3.5 w-3.5" />
              조회
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              초기화
            </button>
            <span className="ml-auto text-xs text-gray-400">
              총 <strong className="text-gray-700">{filtered.length.toLocaleString()}</strong>건
            </span>
          </div>
        </div>

        {/* 테이블 */}
        {filtered.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-gray-900">조회된 설문 응답이 없습니다.</p>
            <p className="text-xs text-gray-400">필터 조건을 변경해 보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {[
                    '티켓번호', '설문종료일', '만족도', '그룹 키워드',
                    '만족 키워드', '불만족 키워드', '만족/불만족 기타',
                    '강화 키워드', '강화 기타', '마지막 서술형',
                    '수리진행처', '수리내용', '콜백 상태', '코멘트',
                  ].map(h => (
                    <th key={h} className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(s => (
                  <tr key={s.id} className="group transition-colors hover:bg-gray-50/50">
                    {/* 티켓번호 */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/${langCode}/tickets/${s.ticketNo}`)}
                        className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline"
                      >
                        {s.ticketNo}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>

                    {/* 설문 종료일 */}
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">{s.responseEndDate}</td>

                    {/* 만족도 */}
                    <td className="whitespace-nowrap px-4 py-3">{satisfactionBadge(s.satisfaction)}</td>

                    {/* 그룹 키워드 */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                      {s.keyword ? KEYWORD_GROUPS[s.keyword] ?? s.keyword : '-'}
                    </td>

                    {/* 만족 키워드 */}
                    <td className="max-w-[180px] px-4 py-3 text-xs text-gray-600">
                      {s.satisfiedKeyword
                        ? s.satisfiedKeyword.split(';').map(k => (
                            <span key={k} className="mr-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                              {SATISFIED_KEYWORDS[k] ?? k}
                            </span>
                          ))
                        : <span className="text-gray-300">-</span>}
                    </td>

                    {/* 불만족 키워드 */}
                    <td className="max-w-[180px] px-4 py-3 text-xs text-gray-600">
                      {s.dissatisfiedKeyword
                        ? s.dissatisfiedKeyword.split(';').map(k => (
                            <span key={k} className="mr-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">
                              {DISSATISFIED_KEYWORDS[k] ?? k}
                            </span>
                          ))
                        : <span className="text-gray-300">-</span>}
                    </td>

                    {/* 만족/불만족 기타 서술 */}
                    <td className="max-w-[160px] px-4 py-3 text-xs text-gray-600">
                      <span className="line-clamp-2">{s.satisfactionEtcText ?? '-'}</span>
                    </td>

                    {/* 강화 키워드 */}
                    <td className="max-w-[160px] px-4 py-3 text-xs text-gray-600">
                      {s.enforceKeyword
                        ? s.enforceKeyword.split(';').map(k => (
                            <span key={k} className="mr-1 inline-block rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">
                              {ENFORCE_KEYWORDS[k] ?? k}
                            </span>
                          ))
                        : <span className="text-gray-300">-</span>}
                    </td>

                    {/* 강화 기타 서술 */}
                    <td className="max-w-[140px] px-4 py-3 text-xs text-gray-600">
                      <span className="line-clamp-2">{s.enforceKeywordEtc ?? '-'}</span>
                    </td>

                    {/* 마지막 서술형 */}
                    <td className="max-w-[160px] px-4 py-3 text-xs text-gray-600">
                      <span className="line-clamp-2">{s.additionalComment ?? '-'}</span>
                    </td>

                    {/* 수리진행처 */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{s.repairDepartment ?? '-'}</td>

                    {/* 수리내용 */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{s.repairDetail ?? '-'}</td>

                    {/* 콜백 상태 - 클릭 편집 */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(s, 'callBack')}
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${callbackBadgeClass(s.callBack)}`}
                      >
                        {s.callBack ?? '-'}
                      </button>
                    </td>

                    {/* 코멘트 - 클릭 편집 */}
                    <td className="max-w-[180px] px-4 py-3 text-xs text-gray-600">
                      <button
                        type="button"
                        onClick={() => openEdit(s, 'commentMemo')}
                        className="w-full text-left line-clamp-2 hover:text-blue-600 transition-colors"
                      >
                        {s.commentMemo
                          ? <span>{s.commentMemo}</span>
                          : <span className="text-gray-300 italic">메모 추가</span>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4">
            <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
          </div>
        )}
      </div>

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
                      <input
                        type="radio"
                        name="callBack"
                        value={opt.value}
                        checked={editValue === opt.value}
                        onChange={() => setEditValue(opt.value)}
                        className="h-4 w-4 accent-gray-800"
                      />
                      <span className={`text-sm font-medium ${callbackBadgeClass(opt.value || null)} inline-flex items-center rounded-md px-2.5 py-1`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                  {editValue === '콜백 대기' && (
                    <p className="mt-1 rounded-lg bg-orange-50 px-3 py-2 text-[10px] text-orange-600">
                      ⚠️ '콜백 대기' 설정 시 Salesforce에 아웃바운드 티켓이 생성됩니다.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={4}
                  placeholder="코멘트를 입력하세요"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none resize-none"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-xl bg-black px-5 py-2 text-xs font-medium text-white hover:bg-gray-800"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
