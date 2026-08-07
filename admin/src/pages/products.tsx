import { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react'
import { X, ArrowUp, ArrowDown, ArrowUpDown, Download, Check, Clock, List, Filter, FileDown, Upload, RefreshCw } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { downloadCsv } from '@/lib/csv'
import { useProducts } from '@/lib/products-context'
import { BRANCHES } from '@/lib/mock-data'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'
import { PRODUCT_FACTORY_SELECT_OPTIONS, displayProductFactory, normalizeProductFactory } from '@/lib/product-factories'
import type { Product, ProductChangeLog, SalesStatus } from '@/lib/types'

function fmtRetention(dateStr: string): string {
  if (!dateStr) return '—'
  return dateStr.slice(0, 7)
}

type SortKey = 'productCode' | 'barcode' | 'name' | 'brandCategory' | 'midCategory' | 'subCategory' | 'hasDecoration' | 'salesStatus' | 'isRestorationRepair'
  | 'factory1' | 'factory2' | 'factory3' | 'releaseDate' | 'partsRetentionPeriod' | 'netWeight' | 'netWeightUnit'
type Tab = 'list' | 'history'
type ProductsPageMode = 'list' | 'management'
type BulkYnValue = 'keep' | 'true' | 'false'

const ITEMS_PER_PAGE = 20
const HISTORY_PER_PAGE = 20
const SALES_STATUSES: SalesStatus[] = ['사용중', '종료 예정', '판매 종료 (P)', '판매 종료 (C)']

const SALES_STATUS_KEYS: Record<SalesStatus, string> = {
  '사용중': 'products.sales_status.active',
  '종료 예정': 'products.sales_status.ending_soon',
  '판매 종료 (P)': 'products.sales_status.discontinued_p',
  '판매 종료 (C)': 'products.sales_status.discontinued_c',
}

const CHANGE_TYPE_STYLES: Record<ProductChangeLog['changeType'], { bg: string; label: string }> = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
}

const COMMON_COL_KEYS: Record<string, string> = {
  brandCategory: 'common.label.brand',
  barcode: 'common.label.barcode',
  productCode: 'common.label.product_code',
  name: 'common.label.product_name',
  midCategory: 'common.label.middle_category',
  subCategory: 'common.label.sub_category',
  releaseDate: 'common.label.release_date',
  salesStatus: 'common.label.sales_status',
  isRestorationRepair: 'products.label.restoration_repair',
  hasDecoration: 'products.label.has_decoration',
  factory1: 'products.label.factory_1',
  factory2: 'products.label.factory_2',
  factory3: 'products.label.factory_3',
  partsRetentionPeriod: 'products.label.parts_retention_period',
  netWeight: 'products.label.net_weight',
  netWeightUnit: 'products.label.net_weight_unit',
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
}




function splitNetWeight(raw?: string) {
  const value = raw?.trim() ?? ''
  const matched = value.match(/^([\d.]+)\s*([a-zA-Z]+)$/)
  if (!matched) return { value, unit: '' }
  return { value: matched[1], unit: matched[2] }
}

function fallbackNetWeight(product: Product) {
  if (product.midCategory === 'ACCESSORY') return product.subCategory === 'CLEANING KIT' ? '0.20' : '0.15'
  return '0.04'
}

function netWeightLabel(product: Product) {
  const parsed = splitNetWeight(product.netWeight)
  return parsed.value || fallbackNetWeight(product)
}

function netWeightUnitLabel(product: Product) {
  const parsed = splitNetWeight(product.netWeight)
  return product.netWeightUnit || parsed.unit || 'kg'
}

function ProductFactorySelect({
  value,
  onChange,
}: {
  value?: string | null
  onChange: (value: string) => void
}) {
  return (
    <select
      value={normalizeProductFactory(value)}
      onChange={event => onChange(event.target.value)}
      className="h-8 min-w-24 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-gray-500"
    >
      {PRODUCT_FACTORY_SELECT_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map(cell => cell.trim())
}

function normalizeHeader(header: string) {
  return header.replace(/^\ufeff/, '').replace(/\s/g, '').toLowerCase()
}

function parseYn(value: string) {
  const normalized = value.trim().toLowerCase()
  if (['y', 'yes', 'true', '1', '예'].includes(normalized)) return true
  if (['n', 'no', 'false', '0', '아니오'].includes(normalized)) return false
  return undefined
}

function ynLabel(value: boolean | undefined) {
  return value ? 'Y' : 'N'
}

function ynBadgeClass(value: boolean | undefined, negative = false) {
  if (value) return 'bg-emerald-50 text-emerald-700'
  return negative ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'
}

function salesStatusBadgeClass(status: SalesStatus) {
  if (status === '사용중') return 'bg-emerald-50 text-emerald-700'
  if (status === '종료 예정') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function parseProductManagementUpdates(text: string) {
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter(line => line.trim())

  const [headerLine, ...bodyLines] = lines
  if (!headerLine) return { rows: [], invalidCount: 0 }

  const headers = parseCsvLine(headerLine).map(normalizeHeader)
  const idx = (aliases: string[]) => headers.findIndex(header => aliases.includes(header))
  const productCodeIdx = idx(['제품id', '제품 id', '제품코드', '제품 코드', 'productid', 'productcode'])
  const decorationIdx = idx(['변경장식보유여부', '장식보유여부', '장식 보유 여부', 'hasdecoration', 'decoration'])
  const restorationIdx = idx(['변경복원가능여부', '복원가능여부', '복원 가능 여부', '변경복원의뢰여부', '복원의뢰여부', '변경복원수리', '복원수리', 'isrestorationrepair', 'restorationrepair'])

  if (productCodeIdx < 0) return { rows: [], invalidCount: 0 }

  let invalidCount = 0
  const rows: Array<{
    productCode: string
    hasDecoration?: boolean
    isRestorationRepair?: boolean
  }> = []

  bodyLines.forEach(line => {
    const cells = parseCsvLine(line)
    const productCode = cells[productCodeIdx]?.trim() ?? ''
    const hasDecoration = decorationIdx >= 0 ? parseYn(cells[decorationIdx] ?? '') : undefined
    const isRestorationRepair = restorationIdx >= 0 ? parseYn(cells[restorationIdx] ?? '') : undefined

    if (!productCode) {
      invalidCount += 1
      return
    }
    const row = {
      productCode,
      hasDecoration,
      isRestorationRepair,
    }

    if (Object.entries(row).every(([key, value]) => key === 'productCode' || value === undefined)) return
    rows.push(row)
  })

  return { rows, invalidCount }
}

export function ProductsPage({ mode = 'list' }: { mode?: ProductsPageMode }) {
  const i18nLabel = useI18nLabel()
  const isManagementMode = mode === 'management'
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const { products, productChangeLogs, updateStockFields, updateProductManagementFields } = useProducts()

  const branchOptions = useMemo(() => {
    const codes = [...new Set(products.map(p => p.branchCode).filter(Boolean))] as string[]
    return BRANCHES.filter(branch => codes.includes(branch.code))
  }, [products])
  const defaultBranchCode = branchOptions.find(branch => branch.code === '1110')?.code ?? branchOptions[0]?.code ?? ''
  const defaultBranchFilter = useMemo<Record<string, string>>(
    () => {
      const filter: Record<string, string> = {}
      if (defaultBranchCode) filter.branch = defaultBranchCode
      return filter
    },
    [defaultBranchCode]
  )
  const [activeTab, setActiveTab] = useState<Tab>('list')

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => ({ ...defaultBranchFilter }))
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<Record<string, string>>(() => ({ ...defaultBranchFilter }))
  const [filterPopover, setFilterPopover] = useState<{ col: string; rect: DOMRect } | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [decorationValue, setDecorationValue] = useState<BulkYnValue>('keep')
  const [restorationRepairValue, setRestorationRepairValue] = useState<BulkYnValue>('keep')
  const [historyPage, setHistoryPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadResult, setUploadResult] = useState('')

  useEffect(() => {
    if (!defaultBranchCode) return
    if (appliedColumnFilters.branch) return
    setColumnFilters(prev => ({ ...prev, branch: defaultBranchCode }))
    setAppliedColumnFilters(prev => ({ ...prev, branch: defaultBranchCode }))
  }, [appliedColumnFilters.branch, defaultBranchCode])

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
    return <ArrowDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
  }

  const brandCategories = useMemo(() => [...new Set(products.map(p => p.brandCategory))].sort(), [products])
  const midCategories = useMemo(() => [...new Set(products.map(p => p.midCategory))].sort(), [products])
  const subCategories = useMemo(() => [...new Set(products.map(p => p.subCategory))].sort(), [products])
  const filtered = useMemo(() => {
    return products.filter(p => {
      if (appliedColumnFilters.branch && p.branchCode !== appliedColumnFilters.branch) return false
      if (appliedColumnFilters.productCode && !p.productCode.toLowerCase().includes(appliedColumnFilters.productCode.toLowerCase())) return false
      if (appliedColumnFilters.barcode && !p.barcode.toLowerCase().includes(appliedColumnFilters.barcode.toLowerCase())) return false
      if (appliedColumnFilters.name && !p.name.toLowerCase().includes(appliedColumnFilters.name.toLowerCase())) return false
      if (appliedColumnFilters.brandCategory && p.brandCategory !== appliedColumnFilters.brandCategory) return false
      if (appliedColumnFilters.midCategory && p.midCategory !== appliedColumnFilters.midCategory) return false
      if (appliedColumnFilters.subCategory && p.subCategory !== appliedColumnFilters.subCategory) return false
      if (appliedColumnFilters.factory1 && !displayProductFactory(p.factory1).toLowerCase().includes(appliedColumnFilters.factory1.toLowerCase())) return false
      if (appliedColumnFilters.factory2 && !displayProductFactory(p.factory2).toLowerCase().includes(appliedColumnFilters.factory2.toLowerCase())) return false
      if (appliedColumnFilters.factory3 && !displayProductFactory(p.factory3).toLowerCase().includes(appliedColumnFilters.factory3.toLowerCase())) return false
      if (appliedColumnFilters.hasDecoration && (p.hasDecoration ?? false) !== (appliedColumnFilters.hasDecoration === 'true')) return false
      if (appliedColumnFilters.salesStatus && p.salesStatus !== appliedColumnFilters.salesStatus) return false
      if (appliedColumnFilters.restorationRepair && isRestorationRepairProduct(p) !== (appliedColumnFilters.restorationRepair === 'true')) return false
      if (appliedColumnFilters.releaseDateFrom && p.releaseDate < appliedColumnFilters.releaseDateFrom) return false
      if (appliedColumnFilters.releaseDateTo && p.releaseDate > appliedColumnFilters.releaseDateTo) return false
      if (appliedColumnFilters.partsRetention && !p.partsRetentionPeriod?.startsWith(appliedColumnFilters.partsRetention)) return false
      return true
    })
  }, [appliedColumnFilters, products])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'factory1'
              ? displayProductFactory(a.factory1)
            : sortKey === 'factory2'
              ? displayProductFactory(a.factory2)
            : sortKey === 'factory3'
              ? displayProductFactory(a.factory3)
            : sortKey === 'netWeight'
              ? netWeightLabel(a)
            : sortKey === 'netWeightUnit'
              ? netWeightUnitLabel(a)
          : sortKey === 'isRestorationRepair'
            ? isRestorationRepairProduct(a)
            : sortKey === 'hasDecoration'
              ? a.hasDecoration ?? false
              : a[sortKey as keyof Product]
      const bv = sortKey === 'factory1'
              ? displayProductFactory(b.factory1)
            : sortKey === 'factory2'
              ? displayProductFactory(b.factory2)
            : sortKey === 'factory3'
              ? displayProductFactory(b.factory3)
            : sortKey === 'netWeight'
              ? netWeightLabel(b)
            : sortKey === 'netWeightUnit'
              ? netWeightUnitLabel(b)
          : sortKey === 'isRestorationRepair'
            ? isRestorationRepairProduct(b)
            : sortKey === 'hasDecoration'
              ? b.hasDecoration ?? false
              : b[sortKey as keyof Product]
      const sortableA = av
      const sortableB = bv
      if (sortableA == null && sortableB == null) return 0
      if (sortableA == null) return 1
      if (sortableB == null) return -1
      if (typeof sortableA === 'number' && typeof sortableB === 'number') return (sortableA - sortableB) * dir
      return (String(sortableA) < String(sortableB) ? -1 : String(sortableA) > String(sortableB) ? 1 : 0) * dir
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const filteredLogs = useMemo(() => {
    const branch = appliedColumnFilters.branch
    if (!branch) return productChangeLogs
    const branchCodes = new Set(products.filter(p => p.branchCode === branch).map(p => p.productCode))
    return productChangeLogs.filter(log => branchCodes.has(log.productCode))
  }, [productChangeLogs, appliedColumnFilters.branch, products])
  const paginatedLogs = filteredLogs.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
  const allPageSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id))
  const somePageSelected = paginated.some(p => selected.has(p.id)) && !allPageSelected

  function toggleSelectAll() {
    if (allPageSelected) setSelected(prev => { const s = new Set(prev); paginated.forEach(p => s.delete(p.id)); return s })
    else setSelected(prev => { const s = new Set(prev); paginated.forEach(p => s.add(p.id)); return s })
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function handleExport() {
    const headers = isManagementMode
      ? ['브랜드','바코드','제품 코드','제품명','중분류','소분류','복원 가능 여부','장식 보유 여부','생산공장1','생산공장2','생산공장3','출시일','판매상태','부품보유기간','Net weight','Unit']
      : ['브랜드','제품 코드','제품명','중분류','소분류','복원 가능 여부','장식 보유 여부','생산공장1','생산공장2','생산공장3','출시일','부품보유기한','Net weight','Unit']
    const rows = isManagementMode
      ? sorted.map(p => [
          p.brandCategory,
          p.barcode,
          p.productCode,
          p.name,
          p.midCategory,
          p.subCategory,
          isRestorationRepairProduct(p) ? 'Y' : 'N',
          ynLabel(p.hasDecoration),
          displayProductFactory(p.factory1),
          displayProductFactory(p.factory2),
          displayProductFactory(p.factory3),
          p.releaseDate,
          p.salesStatus,
          p.partsRetentionPeriod,
          netWeightLabel(p),
          netWeightUnitLabel(p),
        ])
      : sorted.map(p => [
          p.brandCategory,
          p.productCode,
          p.name,
          p.midCategory,
          p.subCategory,
          isRestorationRepairProduct(p) ? 'Y' : 'N',
          ynLabel(p.hasDecoration),
          displayProductFactory(p.factory1),
          displayProductFactory(p.factory2),
          displayProductFactory(p.factory3),
          p.releaseDate,
          p.partsRetentionPeriod,
          netWeightLabel(p),
          netWeightUnitLabel(p),
        ])

    downloadCsv(`products_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  function handleUploadTemplateDownload() {
    downloadCsv(
      `products_bulk_update_template_${new Date().toISOString().slice(0, 10)}.csv`,
      ['제품 코드','제품명','바코드','복원 가능 여부','장식 보유 여부'],
      sorted.map(product => [
        product.productCode,
        product.name,
        product.barcode,
        isRestorationRepairProduct(product) ? 'Y' : 'N',
        ynLabel(product.hasDecoration),
      ])
    )
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const { rows, invalidCount } = parseProductManagementUpdates(await file.text())
    event.target.value = ''

    if (rows.length === 0) {
      setUploadResult(invalidCount > 0 ? `오류 ${invalidCount}건 — 제품 코드가 비어있습니다.` : '업로드 항목을 찾지 못했습니다.')
      return
    }

    const changedCount = updateProductManagementFields(rows)
    setUploadOpen(false)
    setSelected(new Set())
    setUploadResult(
      invalidCount > 0
        ? `${changedCount}건 변경 완료, ${invalidCount}건 오류(제품 코드 누락)`
        : `${changedCount}건 변경 완료`
    )
  }

  function applyFilter(updates: Record<string, string | undefined>) {
    setColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
      return next
    })
    setAppliedColumnFilters(prev => {
      const next = { ...prev }
      Object.entries(updates).forEach(([k, v]) => { if (v === undefined) delete next[k]; else next[k] = v })
      return next
    })
    setPage(1)
    setFilterPopover(null)
  }

  function applyCurrentFilters() {
    setAppliedColumnFilters({ ...columnFilters })
    setPage(1)
    setFilterPopover(null)
  }

  function handleReset() {
    setColumnFilters({ ...defaultBranchFilter })
    setAppliedColumnFilters({ ...defaultBranchFilter })
    setPage(1)
    setSelected(new Set())
    setUploadOpen(false)
    setDecorationValue('keep')
    setRestorationRepairValue('keep')
  }

  function handleRefresh() {
    setPage(1)
    setSelected(new Set())
    setFilterPopover(null)
    setUploadOpen(false)
    setUploadResult('')
    setDecorationValue('keep')
    setRestorationRepairValue('keep')
  }

  function handleBulkManagementApply() {
    if (decorationValue === 'keep' && restorationRepairValue === 'keep') {
      setUploadResult('변경할 값을 선택해 주세요.')
      return
    }

    const updates = products
      .filter(product => selected.has(product.id))
      .map(product => ({
        productCode: product.productCode,
        hasDecoration: decorationValue === 'keep' ? undefined : decorationValue === 'true',
        isRestorationRepair: restorationRepairValue === 'keep' ? undefined : restorationRepairValue === 'true',
      }))

    const changedCount = updateProductManagementFields(updates)
    setUploadResult(`${changedCount}건 변경 완료`)
    setSelected(new Set())
    setDecorationValue('keep')
    setRestorationRepairValue('keep')
  }

  function handleFilterIconClick(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterPopover(prev => prev?.col === col ? null : { col, rect })
  }

  function getAppliedFilterDisplay(col: string): string {
    switch (col) {
      case 'hasDecoration':
      case 'restorationRepair':
        return appliedColumnFilters[col] === 'true' ? 'Y' : 'N'
      case 'releaseDate': {
        const from = appliedColumnFilters.releaseDateFrom
        const to = appliedColumnFilters.releaseDateTo
        if (from && to) return `${from} ~ ${to}`
        if (from) return `${from} ~`
        if (to) return `~ ${to}`
        return ''
      }
      case 'partsRetention':
        return appliedColumnFilters.partsRetention ?? ''
      default:
        return appliedColumnFilters[col] ?? ''
    }
  }

  function isColFiltered(col: string): boolean {
    switch (col) {
      case 'releaseDate':
        return !!(appliedColumnFilters.releaseDateFrom || appliedColumnFilters.releaseDateTo)
      case 'partsRetention':
        return !!appliedColumnFilters.partsRetention
      default:
        return !!appliedColumnFilters[col]
    }
  }

  function renderFilterPopoverContent(col: string) {
    switch (col) {
      case 'brandCategory':
      case 'midCategory':
      case 'subCategory': {
        const options = col === 'brandCategory' ? brandCategories : col === 'midCategory' ? midCategories : subCategories
        return (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button onClick={() => applyFilter({ [col]: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters[col] ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <I18nText i18nKey="common.option.all" display="tooltip">전체</I18nText>
            </button>
            {options.map(option => (
              <button key={option} onClick={() => applyFilter({ [col]: option })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters[col] === option ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >{option}</button>
            ))}
          </div>
        )
      }
      case 'hasDecoration':
      case 'restorationRepair': {
        const labelKey = col === 'restorationRepair' ? 'restorationRepair' : col
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ [labelKey]: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters[labelKey] ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <I18nText i18nKey="common.option.all" display="tooltip">전체</I18nText>
            </button>
            <button onClick={() => applyFilter({ [labelKey]: 'true' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters[labelKey] === 'true' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <I18nText i18nKey="common.value.y" display="tooltip">Y</I18nText>
            </button>
            <button onClick={() => applyFilter({ [labelKey]: 'false' })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters[labelKey] === 'false' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <I18nText i18nKey="common.value.n" display="tooltip">N</I18nText>
            </button>
          </div>
        )
      }
      case 'salesStatus':
        return (
          <div className="space-y-1">
            <button onClick={() => applyFilter({ salesStatus: undefined })}
              className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${!columnFilters.salesStatus ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <I18nText i18nKey="common.option.all" display="tooltip">전체</I18nText>
            </button>
            {SALES_STATUSES.map(status => (
              <button key={status} onClick={() => applyFilter({ salesStatus: status })}
                className={`block whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs transition-colors ${columnFilters.salesStatus === status ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <I18nText i18nKey={SALES_STATUS_KEYS[status]} display="tooltip">{status}</I18nText>
              </button>
            ))}
          </div>
        )
      case 'factory1':
      case 'factory2':
      case 'factory3': {
        const label = col === 'factory1' ? '생산공장1' : col === 'factory2' ? '생산공장2' : '생산공장3'
        return (
          <div className="w-44 space-y-1.5">
            <input type="text" value={columnFilters[col] ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, [col]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
              placeholder={`${label} 검색...`}
              autoFocus
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
            <div className="flex gap-1.5">
              {columnFilters[col] && (
                <button onClick={() => applyFilter({ [col]: undefined })}
                  className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">
                  <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
                </button>
              )}
              <button onClick={applyCurrentFilters}
                className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
            </div>
          </div>
        )
      }
      case 'releaseDate':
        return (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              <I18nText i18nKey="common.label.release_date" display="tooltip">출시일</I18nText>
            </p>
            <div className="space-y-1.5">
              <input type="date" value={columnFilters.releaseDateFrom ?? ''}
                onChange={e => setColumnFilters(prev => ({ ...prev, releaseDateFrom: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400"
                placeholder={i18nLabel('common.label.start_date', '시작일')} />
              <span className="block text-center text-gray-300 text-xs">~</span>
              <input type="date" value={columnFilters.releaseDateTo ?? ''}
                onChange={e => setColumnFilters(prev => ({ ...prev, releaseDateTo: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400"
                placeholder={i18nLabel('common.label.end_date', '종료일')} />
            </div>
            <div className="flex gap-1.5 pt-1">
              {(columnFilters.releaseDateFrom || columnFilters.releaseDateTo) && (
                <button onClick={() => applyFilter({ releaseDateFrom: undefined, releaseDateTo: undefined })}
                  className="flex-1 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1.5 border border-gray-200 rounded-lg"
                >
                  <I18nText i18nKey="common.button.reset" display="tooltip">초기화</I18nText>
                </button>
              )}
              <button onClick={applyCurrentFilters}
                className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
            </div>
          </div>
        )
      case 'partsRetention':
        return (
          <div className="space-y-1.5">
            <input type="month" value={columnFilters.partsRetention ?? ''}
              onChange={e => setColumnFilters(prev => ({ ...prev, partsRetention: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400" />
            <div className="flex gap-1.5">
              {columnFilters.partsRetention && (
                <button onClick={() => applyFilter({ partsRetention: undefined })}
                  className="flex-1 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1.5 border border-gray-200 rounded-lg">
                  <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
                </button>
              )}
              <button onClick={applyCurrentFilters}
                className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
            </div>
          </div>
        )
      case 'productCode':
      case 'barcode':
      case 'name': {
        const placeholder =
          col === 'productCode'
            ? i18nLabel('products.placeholder.product_code_search', '제품 코드 검색...')
            : col === 'barcode'
              ? i18nLabel('products.placeholder.barcode_search', '바코드 검색...')
              : i18nLabel('products.placeholder.product_name_search', '제품명 검색...')
        return (
          <div className="w-44 space-y-1.5">
            <input type="text" value={columnFilters[col] ?? ''}
              onChange={e => setColumnFilters(p => ({ ...p, [col]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyCurrentFilters()}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-300" />
            <div className="flex gap-1.5">
              {columnFilters[col] && (
                <button onClick={() => applyFilter({ [col]: undefined })}
                  className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors">
                  <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
                </button>
              )}
              <button onClick={applyCurrentFilters}
                className="flex-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  const FILTERABLE_COLS = new Set([
    'name', 'productCode', 'barcode', 'brandCategory', 'midCategory', 'subCategory', 'factory1', 'factory2', 'factory3',
    'releaseDate', 'partsRetentionPeriod', 'hasDecoration', 'salesStatus', 'isRestorationRepair',
  ])

  const COL_FILTER_KEY: Record<string, string> = {
    productCode: 'productCode',
    barcode: 'barcode',
    name: 'name',
    brandCategory: 'brandCategory',
    midCategory: 'midCategory',
    subCategory: 'subCategory',
    hasDecoration: 'hasDecoration',
    salesStatus: 'salesStatus',
    isRestorationRepair: 'restorationRepair',
    factory1: 'factory1',
    factory2: 'factory2',
    factory3: 'factory3',
    releaseDate: 'releaseDate',
    partsRetentionPeriod: 'partsRetention',
  }

  const listTableColumns: { key: string; label: string; sort: SortKey | null }[] = [
    { key: 'brandCategory',        label: '브랜드',      sort: 'brandCategory' },
    { key: 'productCode',          label: '제품 코드',    sort: 'productCode' },
    { key: 'name',                 label: '제품명',      sort: 'name' },
    { key: 'midCategory',          label: '중분류',      sort: 'midCategory' },
    { key: 'subCategory',          label: '소분류',      sort: 'subCategory' },
    { key: 'isRestorationRepair',  label: '복원 가능 여부', sort: 'isRestorationRepair' },
    { key: 'hasDecoration',        label: '장식 보유 여부', sort: 'hasDecoration' },
    { key: 'factory1',             label: '생산공장1',   sort: 'factory1' },
    { key: 'factory2',             label: '생산공장2',   sort: 'factory2' },
    { key: 'factory3',             label: '생산공장3',   sort: 'factory3' },
    { key: 'releaseDate',          label: '출시일',      sort: 'releaseDate' },
    { key: 'partsRetentionPeriod', label: '부품보유기한', sort: 'partsRetentionPeriod' },
    { key: 'netWeight',            label: 'Net weight', sort: 'netWeight' },
    { key: 'netWeightUnit',        label: 'Unit',       sort: 'netWeightUnit' },
  ]
  const managementTableColumns: { key: string; label: string; sort: SortKey | null }[] = [
    { key: 'brandCategory',        label: '브랜드',      sort: 'brandCategory' },
    { key: 'barcode',              label: '바코드',      sort: 'barcode' },
    { key: 'productCode',          label: '제품 코드',    sort: 'productCode' },
    { key: 'name',                 label: '제품명',      sort: 'name' },
    { key: 'midCategory',          label: '중분류',      sort: 'midCategory' },
    { key: 'subCategory',          label: '소분류',      sort: 'subCategory' },
    { key: 'isRestorationRepair',  label: '복원 가능 여부', sort: 'isRestorationRepair' },
    { key: 'hasDecoration',        label: '장식 보유 여부', sort: 'hasDecoration' },
    { key: 'factory1',             label: '생산공장1',   sort: 'factory1' },
    { key: 'factory2',             label: '생산공장2',   sort: 'factory2' },
    { key: 'factory3',             label: '생산공장3',   sort: 'factory3' },
    { key: 'releaseDate',          label: '출시일',      sort: 'releaseDate' },
    { key: 'salesStatus',          label: '판매상태',    sort: 'salesStatus' },
    { key: 'partsRetentionPeriod', label: '부품보유기간', sort: 'partsRetentionPeriod' },
    { key: 'netWeight',            label: 'Net weight', sort: 'netWeight' },
    { key: 'netWeightUnit',        label: 'Unit',       sort: 'netWeightUnit' },
  ]
  const tableColumns = isManagementMode ? managementTableColumns : listTableColumns

  const tabs = isManagementMode
    ? [
        { key: 'list' as const, label: '제품 관리', Icon: List },
        { key: 'history' as const, label: '변경 이력', Icon: Clock },
      ]
    : []

  const hasAnyFilter = Object.entries(appliedColumnFilters).some(([key, value]) => key !== 'branch' && Boolean(value))

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <I18nText i18nKey={isManagementMode ? 'nav.master_management.product_management' : 'nav.master_management.products'} display="tooltip">
                {isManagementMode ? '제품 관리' : '제품 리스트'}
              </I18nText>
            </h1>
            {isManagementMode && (
              <p className="mt-1 text-sm text-gray-500">
                <I18nText i18nKey="products.management.description">
                  제품 관리 항목을 조회하고 변경합니다.
                </I18nText>
              </p>
            )}
          </div>
          {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <I18nText i18nKey="common.button.refresh" display="tooltip">새로고침</I18nText>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <I18nText i18nKey="common.button.excel_download" display="tooltip">Excel 다운로드</I18nText>
            </button>
            {isManagementMode && (
              <>
                <input ref={uploadInputRef} type="file" accept=".csv,text/csv" onChange={handleUpload} className="hidden" />
                <div className="relative">
                  <button
                    onClick={() => setUploadOpen(prev => !prev)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                      uploadOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <I18nText i18nKey="common.button.bulk_update" display="tooltip">일괄 변경</I18nText>
                  </button>
                  {uploadOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            <I18nText i18nKey="products.bulk.title" display="tooltip">제품 변경사항 일괄 변경</I18nText>
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            <I18nText i18nKey="products.bulk.description">복원 가능 여부, 장식 보유 여부만 수정</I18nText>
                          </p>
                        </div>
                        <button onClick={() => setUploadOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 p-3">
                        <button
                          onClick={handleUploadTemplateDownload}
                          className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-white">
                            <FileDown className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">
                              <I18nText i18nKey="common.button.template_download" display="tooltip">업로드 템플릿 다운로드</I18nText>
                            </span>
                          </span>
                        </button>
                        <button
                          onClick={() => uploadInputRef.current?.click()}
                          className="group flex w-full items-center gap-3 rounded-xl bg-gray-950 px-3.5 py-3 text-left text-white hover:bg-gray-800 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                            <Upload className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              <I18nText i18nKey="common.button.file_select" display="tooltip">파일 선택</I18nText>
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          )}
        </div>

        {isManagementMode && (
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
                setSelected(new Set())
                setUploadOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <I18nText i18nKey={key === 'list' ? 'nav.master_management.product_management' : 'common.label.history'} display="tooltip">
                {label}
              </I18nText>
            </button>
          ))}
        </div>
        )}

        {/* 필터 */}
        {activeTab === 'list' && (
        <>
        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <select
              value={columnFilters.branch ?? defaultBranchCode}
              onChange={e => {
                const val = e.target.value
                setColumnFilters(prev => ({ ...prev, branch: val }))
                setAppliedColumnFilters(prev => ({ ...prev, branch: val }))
                setPage(1)
                setSelected(new Set())
              }}
              className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {branchOptions.map(b => (
                <option key={b.code} value={b.code}>{b.code} {b.name}</option>
              ))}
            </select>
            {hasAnyFilter && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3 h-3" />
                <I18nText i18nKey="common.button.reset" display="tooltip">초기화</I18nText>
              </button>
            )}
          </div>
          {isManagementMode && uploadResult && (
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3 text-sm text-gray-600">
              <span>{uploadResult}</span>
              <button onClick={() => setUploadResult('')} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-max w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {isManagementMode && (
                  <th className="pl-5 pr-2 py-4 bg-gray-50/50 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        allPageSelected ? 'bg-gray-900 border-gray-900' : somePageSelected ? 'bg-gray-300 border-gray-300' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {(allPageSelected || somePageSelected) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                  </th>
                  )}
                  {tableColumns.map(col => {
                    const filterKey = COL_FILTER_KEY[col.key]
                    const isFilterable = FILTERABLE_COLS.has(col.key)
                    const isFiltered = isFilterable ? isColFiltered(filterKey) : false
                    return (
                      <th
                        key={col.key}
                        className={`px-5 py-4 text-left text-xs font-semibold tracking-wide bg-gray-50/50 whitespace-nowrap align-top ${isFiltered ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.sort ? (
                            <button
                              onClick={() => handleSort(col.sort!)}
                              className="group flex items-center gap-1 hover:text-gray-700 transition-colors text-xs font-semibold tracking-wide"
                            >
                              <I18nText i18nKey={COMMON_COL_KEYS[col.key] ?? `products.column.${col.key}`} display="tooltip">
                                {col.label}
                              </I18nText>
                              <SortIcon col={col.sort} />
                            </button>
                          ) : (
                            <span>
                              <I18nText i18nKey={COMMON_COL_KEYS[col.key] ?? `products.column.${col.key}`} display="tooltip">
                                {col.label}
                              </I18nText>
                            </span>
                          )}
                          {isFilterable && (
                            <button
                              onClick={e => handleFilterIconClick(filterKey, e)}
                              className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                                filterPopover?.col === filterKey || isFiltered
                                  ? 'text-blue-500'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                            >
                              <Filter className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {isFiltered && (
                          <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium normal-case tracking-normal text-blue-600">
                            {getAppliedFilterDisplay(filterKey)}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + (isManagementMode ? 1 : 0)} className="px-6 py-12 text-center text-sm text-gray-400">
                      <I18nText i18nKey="common.empty.no_results">조회 결과가 없습니다.</I18nText>
                    </td>
                  </tr>
                ) : paginated.map(p => {
                  const isSelected = selected.has(p.id)
                  return (
                    <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                      {isManagementMode && (
                      <td className="pl-5 pr-2 py-3.5">
                        <button
                          onClick={() => toggleSelect(p.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </button>
                      </td>
                      )}
                      {isManagementMode ? (
                        <>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{p.brandCategory}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{p.barcode}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-sm font-normal text-gray-600">{p.productCode}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{p.name}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.midCategory}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.subCategory}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${ynBadgeClass(isRestorationRepairProduct(p))}`}>
                            <I18nText i18nKey={isRestorationRepairProduct(p) ? 'common.value.y' : 'common.value.n'} display="tooltip">
                              {ynLabel(isRestorationRepairProduct(p))}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${ynBadgeClass(p.hasDecoration)}`}>
                            <I18nText i18nKey={p.hasDecoration ? 'common.value.y' : 'common.value.n'} display="tooltip">
                              {ynLabel(p.hasDecoration)}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <ProductFactorySelect
                            value={p.factory1}
                            onChange={value => updateStockFields(p.id, { factory1: value })}
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <ProductFactorySelect
                            value={p.factory2}
                            onChange={value => updateStockFields(p.id, { factory2: value })}
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <ProductFactorySelect
                            value={p.factory3}
                            onChange={value => updateStockFields(p.id, { factory3: value })}
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{p.releaseDate}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${salesStatusBadgeClass(p.salesStatus)}`}>
                            <I18nText i18nKey={SALES_STATUS_KEYS[p.salesStatus]} display="tooltip">
                              {p.salesStatus}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{fmtRetention(p.partsRetentionPeriod)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{netWeightLabel(p)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-500">{netWeightUnitLabel(p)}</td>
                        </>
                      ) : (
                        <>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.brandCategory}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-sm font-normal text-gray-600">{p.productCode}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{p.name}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.midCategory}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{p.subCategory}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${ynBadgeClass(isRestorationRepairProduct(p))}`}>
                            <I18nText i18nKey={isRestorationRepairProduct(p) ? 'common.value.y' : 'common.value.n'} display="tooltip">
                              {ynLabel(isRestorationRepairProduct(p))}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${ynBadgeClass(p.hasDecoration)}`}>
                            <I18nText i18nKey={p.hasDecoration ? 'common.value.y' : 'common.value.n'} display="tooltip">
                              {ynLabel(p.hasDecoration)}
                            </I18nText>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{displayProductFactory(p.factory1)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{displayProductFactory(p.factory2)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">{displayProductFactory(p.factory3)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{p.releaseDate}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{fmtRetention(p.partsRetentionPeriod)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{netWeightLabel(p)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-500">{netWeightUnitLabel(p)}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </div>
        </>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <select
                value={columnFilters.branch ?? defaultBranchCode}
                onChange={e => {
                  const val = e.target.value
                  setColumnFilters(prev => ({ ...prev, branch: val }))
                  setAppliedColumnFilters(prev => ({ ...prev, branch: val }))
                  setHistoryPage(1)
                }}
                className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
              >
                {branchOptions.map(b => (
                  <option key={b.code} value={b.code}>{b.code} {b.name}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-max w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      <I18nText i18nKey="common.label.processed_at" display="tooltip">처리 일시</I18nText>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap w-[80px]">
                      <I18nText i18nKey="common.label.type" display="tooltip">유형</I18nText>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      <I18nText i18nKey="common.label.target_product" display="tooltip">대상 제품</I18nText>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50">
                      <I18nText i18nKey="common.label.change_summary" display="tooltip">변경 내용</I18nText>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">
                      <I18nText i18nKey="common.label.changed_by" display="tooltip">처리자</I18nText>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                        <I18nText i18nKey="common.empty.no_results">조회 결과가 없습니다.</I18nText>
                      </td>
                    </tr>
                  ) : paginatedLogs.map(log => {
                    const style = CHANGE_TYPE_STYLES[log.changeType]
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono text-gray-600">{log.changedAt} <span className="text-gray-400 font-sans">(KST)</span></td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg}`}>{style.label}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{log.productName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.productCode}</div>
                        </td>
                        <td className="px-5 py-3.5"><SummaryCell summary={log.summary} changeType={log.changeType} /></td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.changedById}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination total={filteredLogs.length} perPage={HISTORY_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
          </div>
        )}

        {isManagementMode && activeTab === 'list' && selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-gray-700">
              <span className="text-sm font-semibold whitespace-nowrap">
                <I18nText i18nKey="common.bulk.selected_count" display="tooltip">
                  {selected.size}개 선택
                </I18nText>
              </span>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  <I18nText i18nKey="products.label.has_decoration" display="tooltip">장식 보유 여부</I18nText>
                </span>
                <select
                  value={decorationValue}
                  onChange={e => setDecorationValue(e.target.value as BulkYnValue)}
                  className="w-24 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="keep">{i18nLabel('common.value.keep', '유지')}</option>
                  <option value="true">{i18nLabel('common.value.y', 'Y')}</option>
                  <option value="false">{i18nLabel('common.value.n', 'N')}</option>
                </select>
              </div>
              <div className="w-px h-5 bg-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  <I18nText i18nKey="products.label.restoration_repair" display="tooltip">복원 가능 여부</I18nText>
                </span>
                <select
                  value={restorationRepairValue}
                  onChange={e => setRestorationRepairValue(e.target.value as BulkYnValue)}
                  className="w-24 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg outline-none focus:border-gray-400 text-white"
                >
                  <option value="keep">{i18nLabel('common.value.keep', '유지')}</option>
                  <option value="true">{i18nLabel('common.value.y', 'Y')}</option>
                  <option value="false">{i18nLabel('common.value.n', 'N')}</option>
                </select>
              </div>
              <button
                onClick={handleBulkManagementApply}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                <I18nText i18nKey="common.button.apply" display="tooltip">적용</I18nText>
              </button>
              <button
                onClick={() => {
                  setSelected(new Set())
                  setDecorationValue('keep')
                  setRestorationRepairValue('keep')
                }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">
                  <I18nText i18nKey="common.button.clear" display="tooltip">지우기</I18nText>
                </span>
              </button>
            </div>
          </div>
        )}

      </div>

      {filterPopover && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setFilterPopover(null)} />
          <div
            className="fixed z-[50] bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-max"
            style={{
              top: filterPopover.rect.bottom + 6,
              ...(filterPopover.rect.left + 240 > window.innerWidth
                ? { right: Math.max(8, window.innerWidth - filterPopover.rect.right) }
                : { left: filterPopover.rect.left }),
            }}
          >
            {renderFilterPopoverContent(filterPopover.col)}
          </div>
        </>
      )}

    </div>
  )
}
