import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, X, Trash2, Plus, History, Settings, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/pagination'
import { cn } from '@/lib/utils'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'

// ─── Types ────────────────────────────────────────────────────────────────────

type DateOverride =
  | { type: 'override'; max: number; reason: string }
  | { type: 'closed'; reason: string }

type ManualHoliday = { date: string; name: string }
type DefaultEntry = { from: string; max: number }
type LogEntry = {
  id: number
  timestamp: string
  category: '기본 설정' | '날짜별 설정' | '휴무일'
  description: string
  changedByName: string
  changedById: string
}
type Tab = 'settings' | 'holidays' | 'history'

const LOG_PAGE_SIZE = 20

const CATEGORY_STYLES: Record<LogEntry['category'], { className: string; i18nKey: string }> = {
  '기본 설정':  { className: 'bg-gray-100 text-gray-700', i18nKey: 'reception_slots.history.category.default' },
  '날짜별 설정': { className: 'bg-blue-50 text-blue-700', i18nKey: 'reception_slots.history.category.date' },
  '휴무일':     { className: 'bg-purple-50 text-purple-700', i18nKey: 'reception_slots.history.category.holiday' },
}

const TABS: Array<{ tab: Tab; label: string; i18nKey: string; Icon: typeof Settings }> = [
  { tab: 'settings', label: '슬롯 설정', i18nKey: 'reception_slots.tab.settings', Icon: Settings },
  { tab: 'holidays', label: '공휴일·휴무일', i18nKey: 'reception_slots.tab.holidays', Icon: CalendarDays },
  { tab: 'history', label: '변경 이력', i18nKey: 'common.label.history', Icon: History },
]

const DEFAULT_GUIDES = [
  { text: '영업일(월~금) 기준으로 적용됩니다. 토·일 및 공휴일은 자동으로 비활성화됩니다.', i18nKey: 'reception_slots.default.guide.weekday' },
  { text: '날짜별 개별 설정이 있는 경우 기본값보다 우선 적용됩니다.', i18nKey: 'reception_slots.default.guide.priority' },
  { text: '저장 시 오늘 이후 날짜에만 적용됩니다. 과거 날짜는 변경되지 않습니다.', i18nKey: 'reception_slots.default.guide.today' },
  { text: '설정 변경은 이미 접수된 건에는 영향을 주지 않습니다.', i18nKey: 'reception_slots.default.guide.existing' },
]

const SLOT_LEGEND_ITEMS = [
  { cls: 'bg-white border border-gray-200', label: '예약 가능', i18nKey: 'reception_slots.legend.available' },
  { cls: 'bg-red-50 border border-red-200', label: '마감', i18nKey: 'reception_slots.legend.full' },
  { cls: 'bg-white border-2 border-blue-400', label: '개별 설정', i18nKey: 'reception_slots.legend.custom' },
  { cls: 'bg-gray-100 border border-gray-200', label: '휴무 · 공휴일', i18nKey: 'reception_slots.legend.closed' },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const KR_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2026: [
    { date: '2026-01-01', name: '신정' },
    { date: '2026-01-28', name: '설날 연휴' },
    { date: '2026-01-29', name: '설날' },
    { date: '2026-01-30', name: '설날 연휴' },
    { date: '2026-03-01', name: '삼일절' },
    { date: '2026-05-05', name: '어린이날' },
    { date: '2026-05-24', name: '부처님 오신 날' },
    { date: '2026-06-06', name: '현충일' },
    { date: '2026-08-17', name: '광복절 대체공휴일' },
    { date: '2026-09-23', name: '추석 연휴' },
    { date: '2026-09-24', name: '추석' },
    { date: '2026-09-25', name: '추석 연휴' },
    { date: '2026-10-03', name: '개천절' },
    { date: '2026-10-09', name: '한글날' },
    { date: '2026-12-25', name: '크리스마스' },
  ],
  2027: [
    { date: '2027-01-01', name: '신정' },
    { date: '2027-01-15', name: '설날 연휴' },
    { date: '2027-01-16', name: '설날' },
    { date: '2027-01-17', name: '설날 연휴' },
    { date: '2027-03-01', name: '삼일절' },
    { date: '2027-05-05', name: '어린이날' },
    { date: '2027-06-06', name: '현충일' },
    { date: '2027-08-15', name: '광복절' },
    { date: '2027-10-03', name: '개천절' },
    { date: '2027-10-09', name: '한글날' },
    { date: '2027-12-25', name: '크리스마스' },
  ],
}

const INITIAL_OVERRIDES: Record<string, DateOverride> = {
  '2026-06-03': { type: 'override', max: 50, reason: '이벤트 특별 운영' },
  '2026-06-11': { type: 'closed', reason: '시스템 점검' },
}

const DOW_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`
}

function parseDate(ds: string): Date {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ReceptionSlotsPage() {
  const i18nLabel = useI18nLabel()
  const todayStr = fmtDate(new Date())
  const [defaultHistory, setDefaultHistory] = useState<DefaultEntry[]>([
    { from: '0000-01-01', max: 30 },
  ])
  const [defaultMaxInput, setDefaultMaxInput] = useState('30')
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>(INITIAL_OVERRIDES)
  const [autoHolidays, setAutoHolidays] = useState(true)
  const [manualHolidays, setManualHolidays] = useState<ManualHoliday[]>([])

  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // detail panel state
  const [detailOpt, setDetailOpt] = useState<'default' | 'override' | 'closed'>('default')
  const [detailMax, setDetailMax] = useState('')
  const [detailReason, setDetailReason] = useState('')

  // holiday management
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [addDate, setAddDate] = useState('')
  const [addName, setAddName] = useState('')

  const [toast, setToast] = useState<{ msg: string; ok: boolean; i18nKey?: string } | null>(null)
  const [changeLog, setChangeLog] = useState<LogEntry[]>([
    { id:  1, timestamp: '2026-05-20 14:15:00', category: '날짜별 설정', description: '2026-06-03 — 최대 50건 개별 설정 (이벤트 특별 운영)',              changedByName: '한혜지',  changedById: 'monster563' },
    { id:  2, timestamp: '2026-05-20 14:14:00', category: '날짜별 설정', description: '2026-06-11 — 휴무일 지정 (시스템 점검)',                           changedByName: '한혜지',  changedById: 'monster563' },
    { id:  3, timestamp: '2026-05-15 10:30:00', category: '기본 설정',   description: '기본 최대 건수 25건 → 30건 변경 (오늘(2026-05-15) 이후 적용)',     changedByName: '김민준',  changedById: 'monster001' },
    { id:  4, timestamp: '2026-05-08 15:45:00', category: '휴무일',      description: '2026-07-04 추가 — 창립기념일',                                     changedByName: '한혜지',  changedById: 'monster563' },
    { id:  5, timestamp: '2026-04-30 11:00:00', category: '날짜별 설정', description: '2026-05-06 — 기본값으로 초기화',                                   changedByName: '이수진',  changedById: 'monster042' },
    { id:  6, timestamp: '2026-04-22 16:10:00', category: '날짜별 설정', description: '2026-05-06 — 휴무일 지정 (임시 휴업)',                             changedByName: '이수진',  changedById: 'monster042' },
    { id:  7, timestamp: '2026-04-01 09:00:00', category: '기본 설정',   description: '기본 최대 건수 20건 → 25건 변경 (오늘(2026-04-01) 이후 적용)',     changedByName: '김민준',  changedById: 'monster001' },
    { id:  8, timestamp: '2026-03-18 13:20:00', category: '휴무일',      description: '2026-04-15 삭제 — 봄 정기휴일',                                   changedByName: '한혜지',  changedById: 'monster563' },
    { id:  9, timestamp: '2026-03-05 10:00:00', category: '휴무일',      description: '2026-04-15 추가 — 봄 정기휴일',                                   changedByName: '한혜지',  changedById: 'monster563' },
    { id: 10, timestamp: '2026-02-10 14:00:00', category: '기본 설정',   description: '기본 최대 건수 30건 → 20건 변경 (오늘(2026-02-10) 이후 적용)',     changedByName: '김민준',  changedById: 'monster001' },
    { id: 11, timestamp: '2026-01-20 09:30:00', category: '날짜별 설정', description: '2026-02-14 — 최대 15건 개별 설정 (밸런타인 특수)',                 changedByName: '이수진',  changedById: 'monster042' },
    { id: 12, timestamp: '2026-01-05 11:00:00', category: '기본 설정',   description: '기본 최대 건수 25건 → 30건 변경 (오늘(2026-01-05) 이후 적용)',     changedByName: '김민준',  changedById: 'monster001' },
  ])
  const [logsPage, setLogsPage] = useState(1)
  const [activeTab, setActiveTab] = useState<Tab>('settings')

  // ─── domain helpers ───

  function isKrHoliday(ds: string): boolean {
    const year = parseInt(ds.slice(0, 4))
    return (KR_HOLIDAYS[year] ?? []).some(h => h.date === ds)
  }

  function isManualHoliday(ds: string): boolean {
    return manualHolidays.some(h => h.date === ds)
  }

  function isHolidayDate(ds: string): boolean {
    if (isManualHoliday(ds)) return true
    return autoHolidays && isKrHoliday(ds)
  }

  function getHolidayName(ds: string): string {
    const mh = manualHolidays.find(h => h.date === ds)
    if (mh) return mh.name
    if (!autoHolidays) return ''
    const year = parseInt(ds.slice(0, 4))
    return (KR_HOLIDAYS[year] ?? []).find(h => h.date === ds)?.name ?? ''
  }

  const currentDefault = useMemo(
    () => [...defaultHistory].sort((a, b) => b.from.localeCompare(a.from))[0]?.max ?? 30,
    [defaultHistory],
  )

  function getDefaultForDate(ds: string): number {
    const applicable = defaultHistory
      .filter(e => e.from <= ds)
      .sort((a, b) => b.from.localeCompare(a.from))
    return applicable[0]?.max ?? 30
  }

  function getEffectiveMax(ds: string): number {
    const ov = overrides[ds]
    return ov?.type === 'override' ? ov.max : getDefaultForDate(ds)
  }

  function getMockUsage(ds: string): number {
    const dow = parseDate(ds).getDay()
    if (dow === 0 || dow === 6) return 0
    if (isHolidayDate(ds) || overrides[ds]?.type === 'closed') return 0
    let hash = 0
    for (let i = 0; i < ds.length; i++) hash = (hash * 31 + ds.charCodeAt(i)) & 0xffff
    const m = getEffectiveMax(ds)
    const ratios = [0.1, 0.3, 0.45, 0.6, 0.75, 0.85, 1.0]
    return Math.min(m, Math.floor(m * ratios[hash % 7]))
  }

  // ─── calendar cells ───

  const calCells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (string | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(fmtDate(new Date(viewYear, viewMonth, d)))
    }
    return cells
  }, [viewYear, viewMonth])


  // ─── actions ───

  function showToast(msg: string, ok = true, i18nKey?: string) {
    setToast({ msg, ok, i18nKey })
    setTimeout(() => setToast(null), 2500)
  }

  function addLog(category: LogEntry['category'], description: string) {
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    setChangeLog(prev => [{ id: now.getTime(), timestamp: ts, category, description, changedByName: '한혜지', changedById: 'monster563' }, ...prev])
    setLogsPage(1)
  }

  function handleSaveDefault() {
    const v = parseInt(defaultMaxInput, 10)
    if (!v || v < 1) { showToast('올바른 건수를 입력해주세요.', false, 'reception_slots.toast.invalid_count'); return }
    if (v === currentDefault) { showToast('변경 사항이 없습니다.', false, 'reception_slots.toast.no_changes'); return }
    const prev = currentDefault
    setDefaultHistory(hist => {
      const filtered = hist.filter(e => e.from !== todayStr)
      return [...filtered, { from: todayStr, max: v }]
    })
    addLog('기본 설정', `기본 최대 건수 ${prev}건 → ${v}건 변경 (오늘(${todayStr}) 이후 적용)`)
    showToast(`기본 최대 접수 건수를 ${v}건으로 저장했습니다.`, true, 'reception_slots.toast.default_saved')
  }

  function handleToggleAutoHolidays() {
    setAutoHolidays(prev => {
      const next = !prev
      showToast(
        next ? '한국 공휴일 자동 반영을 켰습니다.' : '한국 공휴일 자동 반영을 껐습니다.',
        true,
        next ? 'reception_slots.toast.auto_holiday_enabled' : 'reception_slots.toast.auto_holiday_disabled',
      )
      return next
    })
  }

  function handleSelectDate(ds: string) {
    const dow = parseDate(ds).getDay()
    if (dow === 0 || dow === 6) return
    setSelectedDate(ds)
    const ov = overrides[ds]
    if (ov?.type === 'closed') {
      setDetailOpt('closed'); setDetailMax(''); setDetailReason(ov.reason)
    } else if (ov?.type === 'override') {
      setDetailOpt('override'); setDetailMax(String(ov.max)); setDetailReason(ov.reason)
    } else {
      setDetailOpt('default'); setDetailMax(String(getDefaultForDate(ds))); setDetailReason('')
    }
  }

  function handleSaveOverride() {
    if (!selectedDate) return
    if (detailOpt === 'default') {
      setOverrides(prev => { const n = { ...prev }; delete n[selectedDate]; return n })
      addLog('날짜별 설정', `${selectedDate} — 기본값으로 초기화`)
      showToast('기본값으로 초기화했습니다.', true, 'reception_slots.toast.date_default_reset')
    } else if (detailOpt === 'override') {
      const v = parseInt(detailMax, 10)
      if (!v || v < 1) { showToast('올바른 건수를 입력해주세요.', false, 'reception_slots.toast.invalid_count'); return }
      setOverrides(prev => ({ ...prev, [selectedDate]: { type: 'override', max: v, reason: detailReason } }))
      addLog('날짜별 설정', `${selectedDate} — 최대 ${v}건 개별 설정${detailReason ? ` (${detailReason})` : ''}`)
      showToast(`${selectedDate} — 최대 ${v}건으로 설정했습니다.`, true, 'reception_slots.toast.date_override_saved')
    } else {
      setOverrides(prev => ({ ...prev, [selectedDate]: { type: 'closed', reason: detailReason } }))
      addLog('날짜별 설정', `${selectedDate} — 휴무일 지정${detailReason ? ` (${detailReason})` : ''}`)
      showToast(`${selectedDate} — 휴무일로 지정했습니다.`, true, 'reception_slots.toast.date_closed_saved')
    }
    setSelectedDate(null)
  }

  function handleResetOverride() {
    if (!selectedDate) return
    setOverrides(prev => { const n = { ...prev }; delete n[selectedDate]; return n })
    addLog('날짜별 설정', `${selectedDate} — 날짜별 설정 초기화`)
    showToast('날짜별 설정을 초기화했습니다.', true, 'reception_slots.toast.date_reset')
    setSelectedDate(null)
  }

  function handleAddHoliday() {
    if (!addDate) { showToast('날짜를 선택해주세요.', false, 'reception_slots.toast.date_required'); return }
    if (manualHolidays.some(h => h.date === addDate)) { showToast('이미 등록된 날짜입니다.', false, 'reception_slots.toast.holiday_duplicate'); return }
    const name = addName.trim() || '지정 휴무일'
    setManualHolidays(prev => [...prev, { date: addDate, name }])
    addLog('휴무일', `${addDate} 추가 — ${name}`)
    setAddDate(''); setAddName('')
    showToast('휴무일을 추가했습니다.', true, 'reception_slots.toast.holiday_added')
  }

  function handleRemoveHoliday(date: string) {
    const name = manualHolidays.find(h => h.date === date)?.name ?? ''
    setManualHolidays(prev => prev.filter(h => h.date !== date))
    addLog('휴무일', `${date} 삭제${name ? ` — ${name}` : ''}`)
    showToast('휴무일을 삭제했습니다.', true, 'reception_slots.toast.holiday_deleted')
  }

  // ─── cell rendering ───

  function renderCell(ds: string) {
    const d = parseDate(ds)
    const dow = d.getDay()
    const isWknd = dow === 0 || dow === 6
    const isSun = dow === 0
    const isSat = dow === 6
    const ov = overrides[ds]
    const isClosed = !isWknd && (isHolidayDate(ds) || ov?.type === 'closed')
    const isOv = ov?.type === 'override'
    const isPast = ds < todayStr
    const isToday = ds === todayStr
    const usage = getMockUsage(ds)
    const maxVal = getEffectiveMax(ds)
    const ratio = maxVal > 0 ? usage / maxVal : 0
    const isFull = !isWknd && !isClosed && ratio >= 1
    const isSelected = selectedDate === ds
    const holidayName = getHolidayName(ds)

    return (
      <div
        key={ds}
        onClick={() => !isWknd && handleSelectDate(ds)}
        className={cn(
          'relative flex flex-col gap-0.5 p-1.5 rounded-lg border transition-all text-left min-h-16',
          isWknd ? 'border-transparent' : 'cursor-pointer',
          !isWknd && !isClosed && !isPast && !isToday && !isFull &&
            'bg-white border-gray-200 hover:border-blue-300',
          isClosed && 'bg-gray-100 border-gray-200 hover:border-gray-300',
          !isWknd && (isPast || isToday) && !isClosed && !isFull &&
            (isToday ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-gray-50 border-gray-100 hover:border-gray-300'),
          isFull && 'bg-red-50 border-red-200 hover:border-red-300',
          isOv && !isClosed && 'border-blue-400',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
        )}
      >
        {/* override badge */}
        {isOv && !isClosed && (
          <span className="absolute top-1 right-1 text-[9px] font-semibold text-blue-600 bg-blue-100 px-1 rounded">
            <I18nText i18nKey="reception_slots.calendar.badge.custom" display="tooltip">개별</I18nText>
          </span>
        )}

        {/* date number */}
        <span className={cn(
          'text-xs font-semibold leading-none',
          isSun ? 'text-red-400' : isSat ? 'text-indigo-400' :
          isWknd ? 'text-gray-300' : isToday ? 'text-blue-700' :
          isPast ? 'text-gray-400' : isClosed ? 'text-gray-400' : 'text-gray-700',
        )}>
          {d.getDate()}
        </span>

        {/* content */}
        {!isWknd && (
          isClosed ? (
            <span className="text-[10px] text-gray-400 font-medium">
              {holidayName || <I18nText i18nKey="reception_slots.calendar.cell.closed" display="tooltip">휴무</I18nText>}
            </span>
          ) : (
            <span className={cn(
              'text-[10px] font-medium tabular-nums',
              isFull ? 'text-red-600' : isPast ? 'text-gray-400' : 'text-gray-500',
            )}>
              {usage}<span className="text-gray-300 mx-px">/</span>{maxVal}
            </span>
          )
        )}
      </div>
    )
  }

  // ─── detail panel ───

  function renderDetailPanel() {
    if (!selectedDate) return null
    const d = parseDate(selectedDate)
    const dow = d.getDay()
    const ov = overrides[selectedDate]
    const holidayName = getHolidayName(selectedDate)
    const hasOverride = !!ov

    return (
      <div className="space-y-5 h-full">
        {/* 패널 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {viewYear}년 {MONTH_NAMES[viewMonth]} {d.getDate()}일 ({DOW_NAMES[dow]})
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {holidayName ? `${holidayName} · ` : ''}
              {selectedDate < todayStr
                ? <I18nText i18nKey="reception_slots.detail.label.past_date" display="tooltip">이미 지난 날짜</I18nText>
                : selectedDate === todayStr
                  ? <I18nText i18nKey="reception_slots.detail.label.today" display="tooltip">오늘</I18nText>
                  : <I18nText i18nKey="reception_slots.detail.label.available_date" display="tooltip">예약 가능 일자</I18nText>}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 설정 옵션 */}
        <div className="space-y-2">
          {[
            { val: 'default' as const, titleKey: 'reception_slots.detail.option.default.title', title: '기본값 사용', descKey: 'reception_slots.detail.option.default.description', desc: `${currentDefault}건 적용` },
            { val: 'override' as const, titleKey: 'reception_slots.detail.option.override.title', title: '직접 지정', descKey: 'reception_slots.detail.option.override.description', desc: '이 날짜만 별도 설정' },
            { val: 'closed' as const, titleKey: 'reception_slots.detail.option.closed.title', title: '휴무일 지정', descKey: 'reception_slots.detail.option.closed.description', desc: '접수 전체 차단' },
          ].map(({ val, title, titleKey, desc, descKey }) => (
            <label
              key={val}
              onClick={() => setDetailOpt(val)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                detailOpt === val ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50/50',
              )}
            >
              <input
                type="radio"
                name="detail-opt"
                checked={detailOpt === val}
                onChange={() => setDetailOpt(val)}
                className="mt-0.5 accent-blue-600 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900"><I18nText i18nKey={titleKey} display="tooltip">{title}</I18nText></p>
                <p className="text-xs text-gray-400 mt-0.5"><I18nText i18nKey={descKey} display="tooltip">{desc}</I18nText></p>
                {val === 'override' && detailOpt === 'override' && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={detailMax}
                        onChange={e => setDetailMax(e.target.value)}
                        className="w-20 text-right font-semibold rounded-xl border-gray-200"
                        min={1} max={999}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-sm text-gray-500"><I18nText i18nKey="reception_slots.detail.unit.count" display="tooltip">건</I18nText></span>
                    </div>
                    <Input
                      value={detailReason}
                      onChange={e => setDetailReason(e.target.value)}
                      placeholder={i18nLabel('reception_slots.detail.placeholder.override_memo', '메모 — 예: 이벤트, 직원 연수')}
                      data-i18n-managed="true"
                      data-i18n-placeholder-key="reception_slots.detail.placeholder.override_memo"
                      className="text-xs rounded-xl border-gray-200"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                )}
                {val === 'closed' && detailOpt === 'closed' && (
                  <div className="mt-2.5">
                    <Input
                      value={detailReason}
                      onChange={e => setDetailReason(e.target.value)}
                      placeholder={i18nLabel('reception_slots.detail.placeholder.closed_memo', '메모 — 예: 시스템 점검')}
                      data-i18n-managed="true"
                      data-i18n-placeholder-key="reception_slots.detail.placeholder.closed_memo"
                      className="text-xs rounded-xl border-gray-200"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* 현재 상태 표시 */}
        <p className="text-xs text-gray-400 leading-relaxed">
          {hasOverride
            ? (ov!.type === 'closed'
              ? <I18nText i18nKey="reception_slots.detail.state.closed" display="tooltip">현재 설정: 휴무일</I18nText>
              : <I18nText i18nKey="reception_slots.detail.state.override" display="tooltip">{`현재 설정: ${(ov as { type: 'override'; max: number }).max}건 개별 적용`}</I18nText>)
            : isHolidayDate(selectedDate)
            ? `공휴일 자동 비활성화 (${holidayName})`
            : <I18nText i18nKey="reception_slots.detail.state.default" display="tooltip">{`현재: 기본값 ${currentDefault}건 적용 중`}</I18nText>}
        </p>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 pt-1">
          {hasOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOverride}
              className="gap-1.5 text-gray-500 rounded-xl border-gray-200 hover:border-gray-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <I18nText i18nKey="common.button.reset" display="tooltip">
                초기화
              </I18nText>
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="rounded-xl border-gray-200 hover:border-gray-400"
            >
              <I18nText i18nKey="common.button.cancel" display="tooltip">
                취소
              </I18nText>
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOverride}
              className="rounded-xl bg-black hover:bg-gray-800 text-white"
            >
              <I18nText i18nKey="common.label.saved" display="tooltip">
                저장
              </I18nText>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── holiday list data ───

  const holidayListItems = useMemo(() => {
    const items: Array<{ date: string; name: string; auto: boolean }> = []
    if (autoHolidays) {
      ;(KR_HOLIDAYS[holidayYear] ?? []).forEach(h => items.push({ ...h, auto: true }))
    }
    manualHolidays
      .filter(h => h.date.startsWith(String(holidayYear)))
      .forEach(h => items.push({ ...h, auto: false }))
    return items.sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [autoHolidays, manualHolidays, holidayYear])

  // ─── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

        {/* ── 페이지 헤더 ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <I18nText i18nKey="nav.system_management.reception_slots" display="tooltip">
                접수 슬롯 설정
              </I18nText>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <I18nText i18nKey="reception_slots.description">
                온라인 수리 접수 시 고객이 선택하는 출고 희망일의 일 최대 접수 건수를 관리합니다.
              </I18nText>
            </p>
          </div>
        </div>

        {/* ── 탭 ── */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(({ tab, label, i18nKey, Icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <I18nText i18nKey={i18nKey} display="tooltip">
                {label}
              </I18nText>
            </button>
          ))}
        </div>

        {/* ── 탭 1: 슬롯 설정 ── */}
        {activeTab === 'settings' && <>

        {/* ── 기본 설정 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              <I18nText i18nKey="reception_slots.default.title" display="tooltip">
                기본 설정
              </I18nText>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              <I18nText i18nKey="reception_slots.default.description">
                날짜별 개별 설정이 없는 영업일에 공통 적용됩니다.
              </I18nText>
            </p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium text-gray-700 w-52 flex-shrink-0">
                <I18nText i18nKey="reception_slots.label.default_max" display="tooltip">
                  영업일 기준 일 최대 접수 건수
                </I18nText>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={defaultMaxInput}
                  onChange={e => setDefaultMaxInput(e.target.value)}
                  className="w-24 text-right font-semibold tabular-nums rounded-xl border border-gray-200 focus:border-gray-400"
                  min={1} max={999}
                />
                <span className="text-sm text-gray-500">
                  <I18nText i18nKey="reception_slots.unit.per_day" display="tooltip">
                    건 / 일
                  </I18nText>
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveDefault}
                  className="px-4 bg-black hover:bg-gray-800 text-white rounded-xl"
                >
                  <I18nText i18nKey="common.label.saved" display="tooltip">
                    저장
                  </I18nText>
                </Button>
              </div>
            </div>
            <ul className="space-y-1.5 bg-gray-50/70 rounded-xl px-4 py-3">
              {DEFAULT_GUIDES.map(({ text, i18nKey }) => (
                <li key={i18nKey} className="text-xs text-gray-500 flex gap-2">
                  <span className="mt-0.5 text-gray-300 flex-shrink-0">•</span>
                  <I18nText i18nKey={i18nKey}>{text}</I18nText>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── 달력 + 날짜 상세 패널 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* 카드 헤더 */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                <I18nText i18nKey="reception_slots.calendar.title" display="tooltip">
                  월별 슬롯 현황 · 날짜별 설정
                </I18nText>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                <I18nText i18nKey="reception_slots.calendar.description">
                  날짜를 클릭하면 최대 건수 변경 또는 휴무 지정이 가능합니다.
                </I18nText>
              </p>
            </div>
            {/* 월 이동 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1); setSelectedDate(null) }}
                disabled={viewYear === 2026 && viewMonth === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-bold text-gray-900 min-w-[6rem] text-center tabular-nums">
                {viewYear}년 {MONTH_NAMES[viewMonth]}
              </span>
              <button
                onClick={() => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1); setSelectedDate(null) }}
                disabled={viewYear === 2027 && viewMonth === 11}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 달력 본문 — 2열 그리드: 달력 | 상세 패널 */}
          <div className={cn(
            'grid transition-all duration-300',
            selectedDate ? 'grid-cols-[1fr_320px]' : 'grid-cols-1',
          )}>
            {/* 달력 영역 */}
            <div className="px-6 py-5 space-y-3 min-w-0">
              {/* 범례 */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-400 pb-3 border-b border-gray-100">
                {SLOT_LEGEND_ITEMS.map(({ cls, label, i18nKey }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={cn('inline-block w-3 h-3 rounded', cls)} />
                    <I18nText i18nKey={i18nKey} display="tooltip">
                      {label}
                    </I18nText>
                  </span>
                ))}
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1.5">
                {['일', '월', '화', '수', '목', '금', '토'].map((wd, i) => (
                  <div
                    key={wd}
                    className={cn(
                      'text-center text-[11px] font-semibold py-1.5',
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-indigo-400' : 'text-gray-400',
                    )}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* 달력 그리드 */}
              <div className="grid grid-cols-7 gap-1.5">
                {calCells.map((ds, idx) =>
                  ds === null
                    ? <div key={`empty-${idx}`} />
                    : renderCell(ds)
                )}
              </div>
            </div>

            {/* 날짜 상세 패널 (선택 시만 표시) */}
            {selectedDate && (
              <div className="border-l border-gray-100 px-5 py-5">
                {renderDetailPanel()}
              </div>
            )}
          </div>
        </div>

        </>}

        {/* ── 탭 2: 공휴일·휴무일 ── */}
        {activeTab === 'holidays' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  <I18nText i18nKey="reception_slots.holiday.title" display="tooltip">
                    공휴일 · 휴무일 관리
                  </I18nText>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <I18nText i18nKey="reception_slots.holiday.description">
                    지정된 날짜는 달력에서 자동으로 비활성화됩니다.
                  </I18nText>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHolidayYear(y => y - 1)}
                  disabled={holidayYear <= 2026}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-sm font-bold text-gray-900 min-w-[4rem] text-center tabular-nums">
                  {holidayYear}년
                </span>
                <button
                  onClick={() => setHolidayYear(y => y + 1)}
                  disabled={holidayYear >= 2027}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 자동 반영 토글 */}
              <div className="flex items-center justify-between p-4 bg-gray-50/70 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    <I18nText i18nKey="reception_slots.holiday.auto_title" display="tooltip">
                      한국 공휴일 자동 반영
                    </I18nText>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <I18nText i18nKey="reception_slots.holiday.auto_description">
                      대한민국 법정 공휴일을 자동으로 휴무일로 처리합니다.
                    </I18nText>
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={autoHolidays}
                  onClick={handleToggleAutoHolidays}
                  className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', autoHolidays ? 'bg-blue-500' : 'bg-gray-200')}
                >
                  <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200', autoHolidays ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </div>

              {/* 통합 목록 */}
              {holidayListItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  <I18nText i18nKey="common.empty.no_results">
                    조회 결과가 없습니다.
                  </I18nText>
                </p>
              ) : (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 tracking-wide">
                          <I18nText i18nKey="common.label.date" display="tooltip">날짜</I18nText>
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 tracking-wide">
                          <I18nText i18nKey="common.label.name" display="tooltip">이름</I18nText>
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 tracking-wide w-[80px]">
                          <I18nText i18nKey="common.label.type" display="tooltip">구분</I18nText>
                        </th>
                        <th className="px-4 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {holidayListItems.map(({ date, name, auto }) => {
                        const d = parseDate(date)
                        return (
                          <tr key={date} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                              {date} <span className="text-gray-400 font-sans">({DOW_NAMES[d.getDay()]})</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{name}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                auto ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600',
                              )}>
                                <I18nText
                                  i18nKey={auto ? 'reception_slots.holiday.type.public_holiday' : 'reception_slots.holiday.type.closed_day'}
                                  display="tooltip"
                                >
                                  {auto ? '공휴일' : '휴무일'}
                                </I18nText>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {!auto && (
                                <button
                                  onClick={() => handleRemoveHoliday(date)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 휴무일 추가 폼 */}
              <div className="flex items-end gap-3 pt-1 border-t border-gray-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <I18nText i18nKey="common.label.date" display="tooltip">날짜</I18nText>
                  </Label>
                  <Input
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="w-40 rounded-xl border border-gray-200 focus:border-gray-400"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-medium text-gray-500">
                    <I18nText i18nKey="common.label.name" display="tooltip">이름</I18nText>
                    <span className="text-gray-400 font-normal"> (선택)</span>
                  </Label>
                  <Input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder={i18nLabel('reception_slots.placeholder.holiday_name', '예: 창립기념일')}
                    data-i18n-managed="true"
                    data-i18n-placeholder-key="reception_slots.placeholder.holiday_name"
                    className="rounded-xl border border-gray-200 focus:border-gray-400"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddHoliday}
                  className="gap-1.5 rounded-xl border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700 mb-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <I18nText i18nKey="reception_slots.button.add_holiday" display="tooltip">
                    휴무일 추가
                  </I18nText>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 2: 변경 이력 ── */}
        {activeTab === 'history' && (() => {
          const paginated = changeLog.slice((logsPage - 1) * LOG_PAGE_SIZE, logsPage * LOG_PAGE_SIZE)
          return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                        <I18nText i18nKey="common.label.processed_at" display="tooltip">처리 일시</I18nText>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap w-[100px]">
                        <I18nText i18nKey="common.label.type" display="tooltip">구분</I18nText>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50">
                        <I18nText i18nKey="common.label.change_summary" display="tooltip">변경 내용</I18nText>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                        <I18nText i18nKey="common.label.changed_by" display="tooltip">처리자</I18nText>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                          <I18nText i18nKey="common.empty.no_results">
                            조회 결과가 없습니다.
                          </I18nText>
                        </td>
                      </tr>
                    ) : paginated.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {entry.timestamp} <span className="text-gray-400">(KST)</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', CATEGORY_STYLES[entry.category].className)}>
                            <I18nText i18nKey={CATEGORY_STYLES[entry.category].i18nKey} display="tooltip">
                              {entry.category}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{entry.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.changedByName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{entry.changedById}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={changeLog.length} perPage={LOG_PAGE_SIZE} current={logsPage} onChange={setLogsPage} />
            </div>
          )
        })()}

      {/* ── 토스트 ── */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-50',
            'animate-in slide-in-from-bottom-2 fade-in duration-200',
            toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.i18nKey ? (
            <I18nText i18nKey={toast.i18nKey} display="tooltip">
              {toast.msg}
            </I18nText>
          ) : toast.msg}
        </div>
      )}
    </div>
  )
}
