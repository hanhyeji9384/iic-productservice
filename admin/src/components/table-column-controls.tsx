import type { CSSProperties, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, X } from 'lucide-react'

export type TableControlColumn<T, K extends string = string> = {
  key: K
  label: ReactNode
  align?: 'right'
  filterable?: boolean
  filterType?: 'text' | 'date' | 'select'
  filterOptions?: readonly string[]
  getValue: (row: T) => unknown
  filterValue?: (row: T) => unknown
}

type SortDir = 'asc' | 'desc' | null
type FilterPopover<K extends string> = { col: K; rect: DOMRect }

function normalizeFilterText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return `${value} ${value.toLocaleString('ko-KR')}`
  return String(value)
}

function normalizeDateText(value: unknown) {
  const raw = normalizeFilterText(value).trim()
  const matched = raw.match(/\d{4}[-./]\d{2}[-./]\d{2}/)
  return matched ? matched[0].replace(/[./]/g, '-') : raw.slice(0, 10)
}

function compareValues(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return normalizeFilterText(a).localeCompare(normalizeFilterText(b), 'ko')
}

function labelText(label: ReactNode) {
  return typeof label === 'string' ? label : '검색'
}

export function useTableColumnControls<T, K extends string>(
  rows: T[],
  columns: readonly TableControlColumn<T, K>[],
) {
  const [sortKey, setSortKey] = useState<K | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<K, string>>>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Partial<Record<K, string>>>({})
  const [filterPopover, setFilterPopover] = useState<FilterPopover<K> | null>(null)

  const filteredRows = useMemo(() => {
    const filterEntries = Object.entries(appliedColumnFilters).filter(([, value]) => value) as Array<[K, string]>
    if (filterEntries.length === 0) return rows

    return rows.filter(row => filterEntries.every(([key, rawValue]) => {
      const column = columns.find(item => item.key === key)
      if (!column) return true
      const query = rawValue.trim().toLowerCase()
      if (!query) return true
      const value = column.filterValue ? column.filterValue(row) : column.getValue(row)
      if (column.filterType === 'date') return normalizeDateText(value) === rawValue
      if (column.filterType === 'select') return normalizeFilterText(value) === rawValue
      return normalizeFilterText(value).toLowerCase().includes(query)
    }))
  }, [appliedColumnFilters, columns, rows])

  const controlledRows = useMemo(() => {
    if (!sortKey || !sortDir) return filteredRows
    const column = columns.find(item => item.key === sortKey)
    if (!column) return filteredRows

    return [...filteredRows].sort((a, b) => {
      const compared = compareValues(column.getValue(a), column.getValue(b))
      return sortDir === 'asc' ? compared : -compared
    })
  }, [columns, filteredRows, sortDir, sortKey])

  const hasAnyFilter = Object.values(appliedColumnFilters).some(Boolean) || Boolean(sortKey && sortDir)

  function handleSort(key: K) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }

    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }

    setSortKey(null)
    setSortDir(null)
  }

  function resetControls() {
    setSortKey(null)
    setSortDir(null)
    setColumnFilters({})
    setAppliedColumnFilters({})
    setFilterPopover(null)
  }

  function SortIcon({ col }: { col: K }) {
    if (sortKey !== col || !sortDir) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />
  }

  function renderHeaderCell(column: TableControlColumn<T, K>, className = '', style?: CSSProperties) {
    const appliedFilter = appliedColumnFilters[column.key]
    const isFiltered = Boolean(appliedFilter)
    const isFilterable = column.filterable !== false

    return (
      <th
        key={column.key}
        style={style}
        className={`whitespace-nowrap px-4 py-3 align-top ${column.align === 'right' ? 'text-right' : 'text-left'} ${isFiltered ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'} ${className}`}
      >
        <div className={`flex items-center gap-1.5 ${column.align === 'right' ? 'justify-end' : ''}`}>
          <button
            type="button"
            onClick={() => handleSort(column.key)}
            className={`group flex items-center gap-1 text-[11px] font-semibold tracking-normal transition-colors hover:text-gray-700 ${column.align === 'right' ? 'justify-end' : ''}`}
          >
            {column.label}
            <SortIcon col={column.key} />
          </button>
          {isFilterable && (
            <button
              type="button"
              onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect()
                setFilterPopover(current => current?.col === column.key ? null : { col: column.key, rect })
              }}
              className={`flex-shrink-0 rounded p-0.5 transition-colors ${filterPopover?.col === column.key || isFiltered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
              aria-label={`${labelText(column.label)} 필터`}
            >
              <Filter className="h-3 w-3" />
            </button>
          )}
        </div>
        {isFiltered && (
          <div className={`mt-1 max-w-[140px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600 ${column.align === 'right' ? 'ml-auto' : ''}`}>
            {appliedFilter}
          </div>
        )}
      </th>
    )
  }

  function renderResetBar() {
    if (!hasAnyFilter) return null
    return (
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={resetControls}
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
          초기화
        </button>
      </div>
    )
  }

  function renderFilterPopoverContent(col: K) {
    const column = columns.find(item => item.key === col)
    if (!column || column.filterable === false) return null
    const isDateFilter = column.filterType === 'date'
    const isSelectFilter = column.filterType === 'select'

    return (
      <form
        className="space-y-2"
        onSubmit={event => {
          event.preventDefault()
          const value = columnFilters[col]?.trim()
          setAppliedColumnFilters(current => ({
            ...current,
            [col]: value || undefined,
          }))
          setFilterPopover(null)
        }}
      >
        <p className="text-[11px] font-semibold text-gray-500">{column.label}</p>
        {isSelectFilter ? (
          <select
            value={columnFilters[col] ?? ''}
            onChange={event => setColumnFilters(current => ({ ...current, [col]: event.target.value }))}
            className="w-44 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none transition-colors focus:border-gray-300"
            autoFocus
          >
            <option value="">전체</option>
            {(column.filterOptions ?? []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={isDateFilter ? 'date' : 'text'}
            value={columnFilters[col] ?? ''}
            onChange={event => setColumnFilters(current => ({ ...current, [col]: event.target.value }))}
            placeholder={isDateFilter ? undefined : '검색어 입력'}
            className={`${isDateFilter ? 'w-44 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:border-gray-300' : 'w-56 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-gray-400'} rounded-lg border border-gray-200 outline-none transition-colors`}
            autoFocus
          />
        )}
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setColumnFilters(current => ({ ...current, [col]: '' }))
              setAppliedColumnFilters(current => ({ ...current, [col]: undefined }))
              setFilterPopover(null)
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            지우기
          </button>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
          >
            적용
          </button>
        </div>
      </form>
    )
  }

  function renderFilterPopover() {
    if (!filterPopover) return null

    const rightOffset = typeof window === 'undefined'
      ? 8
      : Math.max(8, window.innerWidth - filterPopover.rect.right)
    const shouldAlignRight = typeof window !== 'undefined' && filterPopover.rect.left + 240 > window.innerWidth

    return (
      <>
        <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
        <div
          data-filter-popover
          className="fixed z-[50] w-max rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
          style={{
            top: filterPopover.rect.bottom + 6,
            ...(shouldAlignRight ? { right: rightOffset } : { left: filterPopover.rect.left }),
          }}
        >
          {renderFilterPopoverContent(filterPopover.col)}
        </div>
      </>
    )
  }

  return {
    rows: controlledRows,
    hasAnyFilter,
    resetControls,
    renderHeaderCell,
    renderResetBar,
    renderFilterPopover,
  }
}
