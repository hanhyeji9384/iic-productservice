import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export type DateFilterState<T extends string = string> = {
  dateType: T
  from: string
  to: string
}

export type DateFilterOption<T extends string = string> = {
  value: T
  label: string
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function monthsAgoStr(n: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - n)
  return date.toISOString().slice(0, 10)
}

export function dateValue(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function constrainDateRange<T extends DateFilterState<string>>(
  next: T,
  changedKey: keyof DateFilterState<string>,
): T {
  if (changedKey !== 'from' && changedKey !== 'to') return next
  if (!next.from || !next.to) return next

  const from = new Date(next.from)
  const to = new Date(next.to)
  const maxMs = 3 * 365.25 * 24 * 60 * 60 * 1000
  if (to.getTime() - from.getTime() <= maxMs) return next

  if (changedKey === 'from') {
    const capped = new Date(from)
    capped.setFullYear(capped.getFullYear() + 3)
    return { ...next, to: capped.toISOString().slice(0, 10) }
  }

  const capped = new Date(to)
  capped.setFullYear(capped.getFullYear() - 3)
  return { ...next, from: capped.toISOString().slice(0, 10) }
}

export function isDateFilterActive<T extends string>(
  value: DateFilterState<T>,
  defaults: DateFilterState<T>,
) {
  return value.dateType !== defaults.dateType || value.from !== defaults.from || value.to !== defaults.to
}

export function DateRangeFilterBar<T extends string>({
  value,
  options,
  onChange,
  onReset,
  showReset,
  actions,
  children,
}: {
  value: DateFilterState<T>
  options: readonly DateFilterOption<T>[]
  onChange: (key: keyof DateFilterState<T>, nextValue: string) => void
  onReset?: () => void
  showReset?: boolean
  actions?: ReactNode
  children?: ReactNode
}) {
  const today = todayStr()
  const maxTo = (() => {
    if (!value.from) return today
    const date = new Date(value.from)
    date.setFullYear(date.getFullYear() + 3)
    const capped = date.toISOString().slice(0, 10)
    return capped < today ? capped : today
  })()
  const minFrom = value.to
    ? (() => {
      const date = new Date(value.to)
      date.setFullYear(date.getFullYear() - 3)
      return date.toISOString().slice(0, 10)
    })()
    : undefined

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
      {children && (
        <>
          {children}
          <div className="h-4 w-px flex-shrink-0 bg-gray-200" />
        </>
      )}
      <select
        value={value.dateType}
        onChange={event => onChange('dateType', event.target.value)}
        className="w-28 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.from}
          min={minFrom}
          max={value.to || today}
          onChange={event => onChange('from', event.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
        />
        <span className="flex-shrink-0 text-xs text-gray-400">~</span>
        <input
          type="date"
          value={value.to}
          min={value.from || undefined}
          max={maxTo}
          onChange={event => onChange('to', event.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
        />
      </div>
      {actions}
      {showReset && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
          초기화
        </button>
      )}
    </div>
  )
}
