import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Minus, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import {
  DateRangeFilterBar,
  constrainDateRange,
  dateValue,
  isDateFilterActive,
  monthsAgoStr,
  todayStr,
  type DateFilterOption,
  type DateFilterState,
} from '@/components/date-range-filter-bar'
import { Pagination } from '@/components/pagination'
import { useTableColumnControls, type TableControlColumn } from '@/components/table-column-controls'
import { downloadCsv } from '@/lib/csv'
import { BRANCHES, MEMBERS } from '@/lib/mock-data'
import { useProducts } from '@/lib/products-context'
import { formatKstDateTime } from '@/lib/utils'
import {
  changeStockTransferStatus,
  createStockTransfer,
  getStockTransfers,
} from '@/lib/prototype-storage'
import { STOCK_TRANSFER_STATUS_OPTIONS, getStockTransferStatusMeta } from '@/lib/stock-inventory'
import type { Product, StockTransfer, StockTransferLine, StockTransferStatus } from '@/lib/types'

const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const ITEMS_PER_PAGE = 20
const DEFAULT_BRANCH_CODE = '1110'

type RequestDateFilterKey = 'requestedAt' | 'shippedAt' | 'receivedAt'
type RequestDateFilters = DateFilterState<RequestDateFilterKey>

const REQUEST_DATE_FILTER_OPTIONS: DateFilterOption<RequestDateFilterKey>[] = [
  { value: 'requestedAt', label: '요청일' },
  { value: 'shippedAt', label: '출고일' },
  { value: 'receivedAt', label: '입고일' },
]

type DraftLine = Omit<StockTransferLine, 'id'>

function getInitialDateFilters(): RequestDateFilters {
  return {
    dateType: 'requestedAt',
    from: monthsAgoStr(1),
    to: todayStr(),
  }
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR')
}

function StatusBadge({ status }: { status: StockTransferStatus }) {
  const meta = getStockTransferStatusMeta(status)
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function DetailField({
  label,
  value,
  children,
  className = '',
}: {
  label: string
  value?: string | number | null
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      {children ?? (
        <p className="mt-1.5 text-sm font-semibold text-gray-900">{value || '-'}</p>
      )}
    </div>
  )
}

function getBranchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function getDefaultBranchCode(options: string[]) {
  if (options.includes(DEFAULT_BRANCH_CODE)) return DEFAULT_BRANCH_CODE
  return options[0] ?? DEFAULT_BRANCH_CODE
}

function inferBranchCodeFromProductCode(productCode: string) {
  if (productCode.startsWith('11')) return '1110'
  return ''
}

function getTransferBranchCodes(record: StockTransfer, productByCode: Map<string, Product>) {
  const branchCodes = new Set<string>()
  record.items.forEach(item => {
    const branchCode = productByCode.get(item.productCode)?.branchCode ?? inferBranchCodeFromProductCode(item.productCode)
    if (branchCode) branchCodes.add(branchCode)
  })
  return branchCodes
}

function findProduct(products: Product[], input: string) {
  const query = input.trim().toLowerCase()
  if (!query) return undefined
  return products.find(product => (
    product.barcode.toLowerCase() === query ||
    product.productCode.toLowerCase() === query ||
    product.name.toLowerCase() === query
  )) ?? products.find(product => (
    product.barcode.toLowerCase().includes(query) ||
    product.productCode.toLowerCase().includes(query) ||
    product.name.toLowerCase().includes(query)
  ))
}

function getProductMatches(products: Product[], input: string) {
  const query = input.trim().toLowerCase()
  if (!query) return []
  return products
    .filter(product => (
      product.barcode.toLowerCase().includes(query) ||
      product.productCode.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query)
    ))
    .sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aExact = a.productCode.toLowerCase() === query || a.barcode.toLowerCase() === query || aName === query
      const bExact = b.productCode.toLowerCase() === query || b.barcode.toLowerCase() === query || bName === query
      if (aExact !== bExact) return aExact ? -1 : 1
      const aStarts = a.productCode.toLowerCase().startsWith(query) || aName.startsWith(query)
      const bStarts = b.productCode.toLowerCase().startsWith(query) || bName.startsWith(query)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.name.localeCompare(b.name, 'ko')
    })
    .slice(0, 10)
}

function buildLine(product: Product): DraftLine {
  return {
    productCode: product.productCode,
    productName: product.name,
    barcode: product.barcode,
    quantity: 1,
  }
}

export function StockTransferNewPage() {
  const { products } = useProducts()
  const navigate = useNavigate()
  const params = useParams()
  const langCode = params.langCode ?? 'ko'
  const [barcodeInput, setBarcodeInput] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const productMatches = useMemo(() => getProductMatches(products, barcodeInput), [barcodeInput, products])

  function addProduct(product: Product) {
    setLines(current => {
      const exists = current.find(line => line.barcode === product.barcode)
      if (exists) {
        return current.map(line => line.barcode === product.barcode ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, buildLine(product)]
    })
    setBarcodeInput('')
    setMessage(null)
    setSearchOpen(false)
  }

  function addProductFromInput() {
    const product = findProduct(products, barcodeInput)
    if (!product) {
      setMessage('제품코드, 제품명 또는 바코드를 확인해 주세요.')
      setSearchOpen(true)
      return
    }
    if (productMatches.length > 1 && ![
      product.barcode.toLowerCase(),
      product.productCode.toLowerCase(),
      product.name.toLowerCase(),
    ].includes(barcodeInput.trim().toLowerCase())) {
      setMessage('검색 결과에서 제품을 선택해 주세요.')
      setSearchOpen(true)
      return
    }
    addProduct(product)
  }

  function changeLineQty(barcode: string, delta: number) {
    setLines(current => current
      .map(line => line.barcode === barcode ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line)
      .filter(line => line.quantity > 0)
    )
  }

  function removeLine(barcode: string) {
    setLines(current => current.filter(line => line.barcode !== barcode))
  }

  function submitTransfer() {
    if (lines.length === 0) {
      setMessage('출고 요청할 제품을 먼저 추가해 주세요.')
      return
    }
    createStockTransfer({
      requester: CURRENT_ADMIN_LABEL,
      requesterId: CURRENT_ADMIN_MEMBER?.id,
      items: lines,
      memo,
    })
    navigate(`/${langCode}/stock/transfers`)
  }

  const draftTotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate(`/${langCode}/stock/transfers`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        type="button"
        onClick={goBack}
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        뒤로가기
      </button>

      <div className="space-y-4">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="min-w-[280px] flex-1">
            <h1 className="text-base font-bold tracking-tight text-gray-900">WMS 재고 출고</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                신규 요청
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <DetailField label="진행상태" className="min-w-[140px] px-5 py-1 first:pl-0">
              <div className="mt-1.5">
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                  작성중
                </span>
              </div>
            </DetailField>
            <DetailField label="요청담당자" value={CURRENT_ADMIN_LABEL} className="min-w-[160px] px-5 py-1" />
          </div>
        </section>

        <section className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">출고 요청 제품</h2>
            <div className="relative w-full md:w-[520px]">
              <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-colors ${
                searchOpen ? 'border-gray-400' : 'border-gray-200'
              }`}>
                <Search className="h-4 w-4 flex-shrink-0 text-gray-300" />
                <input
                  value={barcodeInput}
                  onFocus={() => barcodeInput.trim() && setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                  onChange={event => {
                    setBarcodeInput(event.target.value)
                    setSearchOpen(true)
                    setMessage(null)
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addProductFromInput()
                    }
                  }}
                  placeholder="제품명, 제품코드, 바코드 검색"
                  className="w-full bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={addProductFromInput}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  추가
                </button>
              </div>
              {searchOpen && barcodeInput.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]">
                  <ul className="max-h-60 overflow-y-auto py-1">
                    {productMatches.length === 0 ? (
                      <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다.</li>
                    ) : productMatches.map(product => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => addProduct(product)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-gray-400">{product.productCode}</span>
                          <span className="ml-2 font-mono text-[11px] text-gray-300">{product.barcode}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {message && <p className="px-5 pt-3 text-xs font-medium text-red-500">{message}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  <th className="px-4 py-3">제품코드</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">바코드</th>
                  <th className="px-4 py-3 text-right">수량</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-xs text-gray-400">
                      추가된 출고 품목이 없습니다.
                    </td>
                  </tr>
                ) : lines.map(line => (
                  <tr key={line.barcode}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{line.productCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{line.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-500">{line.barcode}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button type="button" onClick={() => changeLineQty(line.barcode, -1)} className="rounded-lg border border-gray-200 p-1 text-gray-500 hover:bg-gray-50">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-6 text-center font-semibold text-gray-900">{formatNumber(line.quantity)}</span>
                        <button type="button" onClick={() => changeLineQty(line.barcode, 1)} className="rounded-lg border border-gray-200 p-1 text-gray-500 hover:bg-gray-50">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button type="button" onClick={() => removeLine(line.barcode)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {lines.length > 0 && (
                <tfoot className="border-t border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">총수량</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(draftTotal)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">요청 정보</h2>
          </div>
          <div className="grid gap-3 px-5 py-5 md:grid-cols-[1fr_140px]">
            <input
              value={memo}
              onChange={event => setMemo(event.target.value)}
              placeholder="메모"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-400"
            />
            <button
              type="button"
              onClick={submitTransfer}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200"
              disabled={lines.length === 0}
            >
              출고 요청
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export function StockTransferDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const langCode = params.langCode ?? 'ko'
  const transferNo = params.transferNo ?? ''
  const [record, setRecord] = useState<StockTransfer | null>(() => (
    getStockTransfers().find(item => item.transferNo === transferNo) ?? null
  ))

  function reload() {
    setRecord(getStockTransfers().find(item => item.transferNo === transferNo) ?? null)
  }

  function changeStatus(status: StockTransferStatus) {
    if (!record) return
    changeStockTransferStatus(record, status, CURRENT_ADMIN_LABEL)
    reload()
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate(`/${langCode}/stock/transfers`)
  }

  if (!record) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">WMS 재고 출고 요청을 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate(`/${langCode}/stock/transfers`)}
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            목록으로
          </button>
        </div>
      </div>
    )
  }

  const showFooterActions = record.status === 'REQUESTED' || record.status === 'SHIPPED'

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        type="button"
        onClick={goBack}
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        뒤로가기
      </button>

      <div className="space-y-4">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[280px] flex-1">
              <h1 className="truncate font-mono text-base font-bold tracking-tight text-gray-900">{record.transferNo}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <DetailField label="진행상태" className="min-w-[140px] px-5 py-1 first:pl-0">
              <div className="mt-1.5">
                <StatusBadge status={record.status} />
              </div>
            </DetailField>
            <DetailField label="요청담당자" value={record.requester} className="min-w-[160px] px-5 py-1" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">요청 정보</h2>
          </div>
          <div className="grid gap-x-8 gap-y-5 px-5 py-5 md:grid-cols-4">
            <DetailField label="요청일시" value={formatKstDateTime(record.requestedAt)} />
            <DetailField label="출고일시" value={formatKstDateTime(record.shippedAt)} />
            <DetailField label="입고일시" value={formatKstDateTime(record.receivedAt)} />
            <DetailField label="입고확인자" value={record.receiver || '-'} />
            {record.status === 'FAILED' && (
              <>
                <DetailField label="ERP 처리일시" value={formatKstDateTime(record.failedAt)} />
                <DetailField label="ERP 결과코드" value={record.erpResultCode || '-'} />
                <DetailField label="ERP 실패사유" value={record.erpResultMessage || '-'} className="md:col-span-2" />
              </>
            )}
            <DetailField label="메모" value={record.memo || '-'} className="md:col-span-4" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">출고 요청 제품</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  <th className="px-4 py-3">제품코드</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">바코드</th>
                  <th className="px-4 py-3 text-right">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {record.items.map(item => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{item.productCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{item.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-500">{item.barcode}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatNumber(item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showFooterActions && (
          <div className="flex justify-end gap-2">
            {record.status === 'REQUESTED' && (
              <button
                type="button"
                onClick={() => changeStatus('CANCELED')}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
            )}
            {record.status === 'SHIPPED' && (
              <button
                type="button"
                onClick={() => changeStatus('RECEIVED')}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
              >
                입고 확인
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function StockTransfersPage() {
  const navigate = useNavigate()
  const params = useParams()
  const langCode = params.langCode ?? 'ko'
  const { products } = useProducts()
  const [records, setRecords] = useState<StockTransfer[]>(() => getStockTransfers())
  const [page, setPage] = useState(1)
  const [branchCode, setBranchCode] = useState(DEFAULT_BRANCH_CODE)
  const defaultDateFilters = useMemo(() => getInitialDateFilters(), [])
  const [dateFilters, setDateFilters] = useState<RequestDateFilters>(() => getInitialDateFilters())

  function reload() {
    setRecords(getStockTransfers())
    setPage(1)
  }

  const productByCode = useMemo(() => {
    return new Map(products.map(product => [product.productCode, product]))
  }, [products])

  const branchOptions = useMemo(() => {
    const seen = new Set<string>()
    records.forEach(record => {
      getTransferBranchCodes(record, productByCode).forEach(code => seen.add(code))
    })
    return Array.from(seen).sort((a, b) => getBranchLabel(a).localeCompare(getBranchLabel(b), 'ko'))
  }, [productByCode, records])
  const defaultBranchCode = useMemo(() => getDefaultBranchCode(branchOptions), [branchOptions])
  const branchSelectOptions = branchOptions.length > 0 ? branchOptions : [defaultBranchCode]

  const filteredRecords = useMemo(() => records.filter(record => {
    if (!branchCode || !getTransferBranchCodes(record, productByCode).has(branchCode)) return false
    const selectedDate = dateValue(record[dateFilters.dateType])
    if (dateFilters.from && (!selectedDate || selectedDate < dateFilters.from)) return false
    if (dateFilters.to && (!selectedDate || selectedDate > dateFilters.to)) return false
    return true
  }), [branchCode, dateFilters, productByCode, records])

  const columns = useMemo<TableControlColumn<StockTransfer, string>[]>(() => [
    { key: 'transferNo', label: '출고 요청 No.', getValue: record => record.transferNo },
    {
      key: 'status',
      label: '상태',
      filterType: 'select',
      filterOptions: STOCK_TRANSFER_STATUS_OPTIONS.map(option => option.label),
      getValue: record => getStockTransferStatusMeta(record.status).label,
    },
    { key: 'requestedAt', label: '요청일시', filterable: false, getValue: record => record.requestedAt },
    { key: 'requester', label: '요청담당자', getValue: record => record.requester },
    { key: 'trackingNo', label: 'Tracking No.', getValue: record => record.trackingNo || '-' },
    { key: 'shippedAt', label: '출고일시', filterable: false, getValue: record => record.shippedAt || '-' },
    { key: 'receivedAt', label: '입고일시', filterable: false, getValue: record => record.receivedAt || '-' },
  ], [])
  const tableControls = useTableColumnControls(filteredRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableControls.rows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [page, tableControls.rows.length])

  useEffect(() => {
    if (branchOptions.length === 0 || branchOptions.includes(branchCode)) return
    setBranchCode(defaultBranchCode)
    setPage(1)
  }, [branchCode, branchOptions, defaultBranchCode])

  function applyDateFilter(key: keyof RequestDateFilters, value: string) {
    setPage(1)
    setDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
  }

  function resetFilters() {
    setBranchCode(defaultBranchCode)
    setDateFilters(getInitialDateFilters())
    setPage(1)
  }

  function exportCsv() {
    const headers = ['출고 요청 No.', '상태', '요청일시', '요청담당자', 'Tracking No.', '출고일시', '입고일시', '입고확인자', 'ERP 처리일시', 'ERP 결과코드', 'ERP 메시지', '메모']
    const rows = tableControls.rows.map(record => [
      record.transferNo,
      getStockTransferStatusMeta(record.status).label,
      formatKstDateTime(record.requestedAt),
      record.requester,
      record.trackingNo || '-',
      formatKstDateTime(record.shippedAt),
      formatKstDateTime(record.receivedAt),
      record.receiver,
      formatKstDateTime(record.failedAt),
      record.erpResultCode,
      record.erpResultMessage,
      record.memo,
    ])
    downloadCsv(`stock_transfers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">WMS 재고 출고</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/${langCode}/stock/transfers/new`)}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              출고 요청
            </button>
            <button
              type="button"
              onClick={reload}
              className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Excel 다운로드
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <DateRangeFilterBar
            value={dateFilters}
            options={REQUEST_DATE_FILTER_OPTIONS}
            onChange={applyDateFilter}
            onReset={resetFilters}
            showReset={isDateFilterActive(dateFilters, defaultDateFilters) || branchCode !== defaultBranchCode}
          >
            <label className="flex items-center">
              <span className="sr-only">법인</span>
              <select
                value={branchCode}
                onChange={event => {
                  setBranchCode(event.target.value)
                  setPage(1)
                }}
                className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              >
                {branchSelectOptions.map(option => (
                  <option key={option} value={option}>{getBranchLabel(option)}</option>
                ))}
              </select>
            </label>
          </DateRangeFilterBar>
          {tableControls.renderResetBar()}
          <div className="overflow-x-auto">
            <table className="min-w-[1220px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  {columns.map(column => tableControls.renderHeaderCell(column))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedRows.map(record => (
                  <tr key={record.transferNo} className="hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/${langCode}/stock/transfers/${record.transferNo}`)}
                        className="font-mono text-[11px] font-semibold text-gray-900 underline-offset-2 hover:underline"
                      >
                        {record.transferNo}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={record.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3">{formatKstDateTime(record.requestedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{record.requester}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gray-600">{record.trackingNo || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatKstDateTime(record.shippedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatKstDateTime(record.receivedAt)}</td>
                  </tr>
                ))}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                      조회된 WMS 재고 출고 요청이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={tableControls.rows.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </section>
        {tableControls.renderFilterPopover()}
      </div>
    </div>
  )
}
