import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Download, ExternalLink, Plus, RefreshCw, Search, X } from 'lucide-react'
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
import { useParts } from '@/lib/parts-context'
import { useProducts } from '@/lib/products-context'
import { downloadCsv } from '@/lib/csv'
import { BRANCHES, MEMBERS, STORES } from '@/lib/mock-data'
import {
  createPartOrderRequest,
  getPartOrderRequests,
  localTimestamp,
  updatePartOrderRequest,
} from '@/lib/prototype-storage'
import { formatKstDateTime } from '@/lib/utils'
import {
  getPartOrderQuantityOptions,
  getPartOrderStatusMeta,
  getPartOrderStoreTypeFromStore,
  PART_ORDER_STATUS_OPTIONS,
} from '@/lib/part-order-request'
import type { Part, PartOrderRequest, PartOrderRequestStatus, Product, Store } from '@/lib/types'

const CURRENT_ADMIN_MEMBER = MEMBERS.find(member => member.loginId === 'monster563') ?? MEMBERS[0]
const CURRENT_ADMIN_LABEL = CURRENT_ADMIN_MEMBER
  ? `${CURRENT_ADMIN_MEMBER.name}(${CURRENT_ADMIN_MEMBER.loginId})`
  : '한혜지(monster563)'
const IS_CURRENT_ADMIN = CURRENT_ADMIN_MEMBER?.roleId === 'SUPER_ADMIN'
const ITEMS_PER_PAGE = 20
const DEFAULT_PART_ORDER_BRANCH_CODE = '1110'

type PartOrderPageMode = 'requester' | 'management'
type PartOrderDetailAction = 'EDIT' | PartOrderRequestStatus

function getDetailActions(status: PartOrderRequestStatus, isAdmin: boolean): PartOrderDetailAction[] {
  if (status === 'COMPLETED' || status === 'OUT_OF_STOCK' || status === 'CANCELED') return []
  if (status === 'REQUESTED') {
    return isAdmin ? ['EDIT', 'COMPLETED', 'HOLD', 'CANCELED'] : ['EDIT', 'CANCELED']
  }
  if (status === 'HOLD') return isAdmin ? ['EDIT', 'COMPLETED', 'CANCELED'] : ['EDIT', 'CANCELED']
  return isAdmin ? ['EDIT', 'COMPLETED', 'HOLD', 'CANCELED'] : []
}

type RequestDateFilterKey = 'requestedAt' | 'processedAt'
type RequestDateFilters = DateFilterState<RequestDateFilterKey>

const REQUEST_DATE_FILTER_OPTIONS: DateFilterOption<RequestDateFilterKey>[] = [
  { value: 'requestedAt', label: '요청일' },
  { value: 'processedAt', label: '처리일' },
]

function getInitialDateFilters(): RequestDateFilters {
  return {
    dateType: 'requestedAt',
    from: monthsAgoStr(1),
    to: todayStr(),
  }
}

function updateWithProgressMeta(record: PartOrderRequest, status: PartOrderRequestStatus): PartOrderRequest {
  return {
    ...record,
    status,
    processedAt: localTimestamp(),
    processor: CURRENT_ADMIN_LABEL,
    processorId: CURRENT_ADMIN_MEMBER?.id ?? null,
  }
}

function StatusBadge({ status }: { status: PartOrderRequestStatus }) {
  const meta = getPartOrderStatusMeta(status)
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function isPartOrderSelectable(status: PartOrderRequestStatus) {
  return status !== 'COMPLETED' && status !== 'OUT_OF_STOCK' && status !== 'CANCELED'
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  )
}

function ReadonlyFormField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <div className="mt-1.5 flex min-h-[42px] w-full items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
        <span className="truncate">{value || '-'}</span>
      </div>
    </label>
  )
}

function getBranchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function isCurrentMemberPartOrder(record: PartOrderRequest, assignedStoreCodes: string[]) {
  if (assignedStoreCodes.length > 0) {
    return Boolean(record.storeCode && assignedStoreCodes.includes(record.storeCode))
  }
  return record.requesterId === CURRENT_ADMIN_MEMBER?.id || record.requester === CURRENT_ADMIN_LABEL
}

type SearchComboItem = {
  id: string
  label: string
  sub?: string
  keywords: string
}

function SearchCombo({
  label,
  placeholder,
  items,
  selectedId,
  onSelect,
  onClear,
  disabled,
  helpText,
}: {
  label: string
  placeholder: string
  items: SearchComboItem[]
  selectedId?: string | null
  onSelect: (id: string) => void
  onClear?: () => void
  disabled?: boolean
  helpText?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLLabelElement>(null)
  const selected = items.find(item => item.id === selectedId)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items.slice(0, 20)
    return items
      .filter(item => item.keywords.toLowerCase().includes(normalized))
      .slice(0, 30)
  }, [items, query])

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <label className="block" ref={rootRef}>
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <div className="relative mt-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(current => !current)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition-colors ${
            disabled ? 'cursor-default text-gray-400' : 'text-gray-900 hover:border-gray-300'
          } ${open ? 'border-gray-400' : ''}`}
        >
          <span className={selected ? 'truncate' : 'text-gray-300'}>{selected?.label ?? placeholder}</span>
          <span className="flex flex-shrink-0 items-center gap-1">
            {selected && onClear && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={event => {
                  event.stopPropagation()
                  onClear()
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  onClear()
                }}
                className="rounded-full p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                aria-label={`${label} 선택 해제`}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <Search className="h-3.5 w-3.5 text-gray-400" />
          </span>
        </button>
        {open && !disabled && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/[0.08]">
            <div className="flex items-center gap-2 border-b border-gray-100 px-2.5 py-2">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="검색어 입력"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-300 outline-none"
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-5 text-center text-xs text-gray-400">조회 결과가 없습니다.</li>
              )}
              {filtered.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id)
                      setQuery('')
                      setOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      selectedId === item.id ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <span className="block truncate">{item.label}</span>
                    {item.sub && <span className="mt-0.5 block truncate text-[11px] text-gray-400">{item.sub}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {helpText && <span className="mt-1.5 block text-[11px] font-medium text-gray-400">{helpText}</span>}
    </label>
  )
}

function productItem(product: Product): SearchComboItem {
  return {
    id: product.productCode,
    label: `${product.name} / ${product.productCode}`,
    sub: product.barcode,
    keywords: `${product.name} ${product.productCode} ${product.barcode}`,
  }
}

function storeItem(store: Store): SearchComboItem {
  return {
    id: store.code,
    label: store.name,
    sub: [store.code, store.address1, store.address2].filter(Boolean).join(' / '),
    keywords: `${store.code} ${store.name} ${store.country} ${store.address1 ?? ''} ${store.address2 ?? ''}`,
  }
}

function partItem(part: Part): SearchComboItem {
  return {
    id: part.partCode,
    label: `${part.name} / ${part.partCode}`,
    sub: part.storageLocation,
    keywords: `${part.partCode} ${part.name} ${part.color} ${part.storageLocation}`,
  }
}

function buildInitialDraft(): PartOrderRequest {
  const assignedStoreCodes = CURRENT_ADMIN_MEMBER?.assignedStores ?? []
  const assignedStore = assignedStoreCodes.length > 0
    ? STORES.find(store => store.code === assignedStoreCodes[0])
    : undefined
  const storeType = assignedStore ? getPartOrderStoreTypeFromStore(assignedStore) : '기타'

  return {
    id: '',
    requestNo: '',
    requestedAt: '',
    status: 'REQUESTED',
    requester: CURRENT_ADMIN_LABEL,
    requesterId: CURRENT_ADMIN_MEMBER?.id,
    storeType,
    storeCode: assignedStore?.code ?? null,
    storeName: assignedStore?.name ?? '기타',
    productCode: '',
    productName: '',
    partCode: '',
    partName: '',
    partStorageLocation: '',
    color: '',
    quantityPairs: getPartOrderQuantityOptions(storeType)[0],
    requestMemo: '',
    processedAt: null,
    processor: null,
    processorId: null,
  }
}

function PartOrderRequestDetail({
  record,
  isNew,
  canManage,
  onBack,
  onSaved,
}: {
  record: PartOrderRequest
  isNew: boolean
  canManage: boolean
  onBack: () => void
  onSaved: (requestNo?: string) => void
}) {
  const { parts } = useParts()
  const { products } = useProducts()
  const [draft, setDraft] = useState(record)
  const [editing, setEditing] = useState(false)
  const assignedStoreCodes = CURRENT_ADMIN_MEMBER?.assignedStores ?? []
  const hasAssignedStore = assignedStoreCodes.length > 0
  const availableStores = assignedStoreCodes.length > 0
    ? STORES.filter(store => assignedStoreCodes.includes(store.code))
    : STORES

  useEffect(() => {
    setDraft(record)
    setEditing(false)
  }, [record.requestNo, isNew])

  useEffect(() => {
    const options = getPartOrderQuantityOptions(draft.storeType)
    if (!options.includes(draft.quantityPairs)) {
      setDraft(current => ({ ...current, quantityPairs: options[0] }))
    }
  }, [draft.storeType, draft.quantityPairs])

  const filteredParts = useMemo(() => (
    draft.productCode
      ? parts.filter(part => part.productCode === draft.productCode)
      : parts
  ), [draft.productCode, parts])
  const detailActions = useMemo(
    () => getDetailActions(draft.status, canManage && IS_CURRENT_ADMIN),
    [canManage, draft.status],
  )
  const canEditDetail = detailActions.includes('EDIT')
  const statusActions = detailActions.filter((action): action is PartOrderRequestStatus => action !== 'EDIT')
  const isEditable = isNew || editing

  function selectStore(storeCode: string) {
    const store = STORES.find(item => item.code === storeCode)
    if (!store) return
    setDraft(current => ({
      ...current,
      storeCode: store.code,
      storeName: store.name,
      storeType: getPartOrderStoreTypeFromStore(store),
    }))
  }

  function selectProduct(productCode: string) {
    const product = products.find(item => item.productCode === productCode)
    setDraft(current => ({
      ...current,
      productCode,
      productName: product?.name ?? '',
      partCode: '',
      partName: '',
      partStorageLocation: '',
      color: '',
    }))
  }

  function clearProduct() {
    setDraft(current => ({
      ...current,
      productCode: '',
      productName: '',
      partCode: '',
      partName: '',
      partStorageLocation: '',
      color: '',
    }))
  }

  function selectPart(partCode: string) {
    const part = parts.find(item => item.partCode === partCode)
    if (!part) return
    setDraft(current => ({
      ...current,
      partCode: part.partCode,
      partName: part.name,
      partStorageLocation: part.storageLocation,
      color: part.color,
    }))
  }

  function changeStatus(status: PartOrderRequestStatus) {
    if (!statusActions.includes(status)) return
    const next = updateWithProgressMeta(draft, status)
    setDraft(next)
    setEditing(false)
    if (!isNew) {
      updatePartOrderRequest(next)
      onSaved()
    }
  }

  function save() {
    const payload = {
      ...draft,
      requestMemo: draft.requestMemo?.trim() || null,
    }
    if (isNew) {
      const created = createPartOrderRequest({
        status: payload.status,
        requester: payload.requester,
        requesterId: payload.requesterId,
        storeType: payload.storeType,
        storeCode: payload.storeCode,
        storeName: payload.storeName,
        productCode: payload.productCode,
        productName: payload.productName,
        partCode: payload.partCode,
        partName: payload.partName,
        partStorageLocation: payload.partStorageLocation,
        color: payload.color,
        quantityPairs: payload.quantityPairs,
        requestMemo: payload.requestMemo,
      })
      onSaved(created.requestNo)
      return
    }
    updatePartOrderRequest(payload)
    setEditing(false)
    onSaved()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="mb-4 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700">
        ← {isNew ? '목록으로' : '뒤로가기'}
      </button>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400">부품 요청 번호</p>
            <h1 className="mt-1 text-lg font-bold text-gray-900">{isNew ? '신규 요청' : record.requestNo}</h1>
          </div>
          <StatusBadge status={draft.status} />
        </div>

        {!isNew && (
          <>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <FieldRow label="요청일시" value={formatKstDateTime(draft.requestedAt)} />
              <FieldRow label="요청담당자" value={draft.requester} />
              <FieldRow label="처리일시" value={formatKstDateTime(draft.processedAt)} />
              <FieldRow label="처리자" value={draft.processor} />
            </div>
          </>
        )}

        {isEditable ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {hasAssignedStore ? (
                <>
                  <ReadonlyFormField label="매장명" value={draft.storeName} />
                  <ReadonlyFormField label="매장유형" value={draft.storeType} />
                </>
              ) : (
                <>
                  <SearchCombo
                    label="매장명"
                    placeholder="매장 검색"
                    items={availableStores.map(storeItem)}
                    selectedId={draft.storeCode}
                    onSelect={selectStore}
                  />
                  <ReadonlyFormField label="매장유형" value={draft.storeType} />
                </>
              )}

              <SearchCombo
                label="제품명"
                placeholder="제품 검색"
                items={products.map(productItem)}
                selectedId={draft.productCode}
                onSelect={selectProduct}
                onClear={clearProduct}
                helpText="제품을 선택하지 않아도 부품명을 직접 입력해 요청할 수 있습니다."
              />

              {draft.productCode ? (
                <SearchCombo
                  label="부품명"
                  placeholder="부품 검색"
                  items={filteredParts.map(partItem)}
                  selectedId={draft.partCode}
                  onSelect={selectPart}
                />
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">부품명 직접 입력</span>
                  <input
                    value={draft.partName}
                    onChange={event => setDraft(current => ({
                      ...current,
                      partCode: '',
                      partName: event.target.value,
                      partStorageLocation: '',
                      color: '',
                    }))}
                    placeholder="부품명을 입력해 주세요"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-400"
                  />
                  <span className="mt-1.5 block text-[11px] font-medium text-gray-400">
                    제품을 특정하지 않는 요청은 부품명을 직접 입력해 주세요.
                  </span>
                </label>
              )}

              {draft.productCode && <ReadonlyFormField label="부품 보관위치" value={draft.partStorageLocation} />}

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">수량(조)</span>
                <select
                  value={draft.quantityPairs}
                  onChange={event => setDraft(current => ({ ...current, quantityPairs: Number(event.target.value) }))}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-400"
                >
                  {getPartOrderQuantityOptions(draft.storeType).map(quantity => (
                    <option key={quantity} value={quantity}>{quantity}조</option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-gray-500">추가 요청사항</span>
                <textarea
                  value={draft.requestMemo ?? ''}
                  onChange={event => setDraft(current => ({ ...current, requestMemo: event.target.value }))}
                  placeholder="필요한 요청사항을 입력해 주세요."
                  className="mt-1.5 min-h-[110px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-400"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(record)
                    setEditing(false)
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400"
                >
                  수정 취소
                </button>
              )}
              <button
                type="button"
                onClick={save}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                {isNew ? '요청' : '저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FieldRow label="매장유형" value={draft.storeType} />
              <FieldRow label="매장명" value={draft.storeName} />
              <FieldRow label="제품명" value={draft.productName} />
              <FieldRow label="부품명" value={draft.partName} />
              <FieldRow label="부품 보관위치" value={draft.partStorageLocation} />
              <FieldRow label="수량(조)" value={`${draft.quantityPairs}조`} />
              <FieldRow label="추가 요청사항" value={draft.requestMemo} />
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              {canEditDetail && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400"
                >
                  수정
                </button>
              )}
              {statusActions.map(status => {
                const meta = getPartOrderStatusMeta(status)
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => changeStatus(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white ${meta.className}`}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export function PartOrderRequestsPage({ mode = 'requester' }: { mode?: PartOrderPageMode }) {
  const { langCode = 'ko', requestNo } = useParams<{ langCode: string; requestNo?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { products } = useProducts()
  const isManagementMode = mode === 'management'
  const basePath = isManagementMode ? 'part-request-management' : 'part-requests'
  const listPath = `/${langCode}/stock/${basePath}`
  const detailPath = (targetRequestNo: string) => `/${langCode}/stock/${basePath}/${targetRequestNo}`
  const newPath = `/${langCode}/stock/part-requests/new`
  const [records, setRecords] = useState<PartOrderRequest[]>(() => getPartOrderRequests())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<PartOrderRequestStatus>('COMPLETED')
  const [page, setPage] = useState(1)
  const [branchCode, setBranchCode] = useState(DEFAULT_PART_ORDER_BRANCH_CODE)
  const defaultDateFilters = useMemo(() => getInitialDateFilters(), [])
  const [dateFilters, setDateFilters] = useState<RequestDateFilters>(() => getInitialDateFilters())
  const assignedStoreCodes = CURRENT_ADMIN_MEMBER?.assignedStores ?? []
  const assignedStoreKey = assignedStoreCodes.join('|')

  function reload() {
    setRecords(getPartOrderRequests())
    setSelected(new Set())
    setPage(1)
  }

  const productByCode = useMemo(() => {
    return new Map(products.map(product => [product.productCode, product]))
  }, [products])

  const storeByCode = useMemo(() => {
    return new Map(STORES.map(store => [store.code, store]))
  }, [])

  const scopedRecords = useMemo(() => {
    if (isManagementMode) return records
    return records.filter(record => isCurrentMemberPartOrder(record, assignedStoreCodes))
  }, [assignedStoreKey, isManagementMode, records])

  const branchOptions = useMemo(() => {
    const seen = new Set<string>([DEFAULT_PART_ORDER_BRANCH_CODE])
    const options = [DEFAULT_PART_ORDER_BRANCH_CODE]
    scopedRecords.forEach(record => {
      const code = productByCode.get(record.productCode)?.branchCode ?? (record.storeCode ? storeByCode.get(record.storeCode)?.branchCode : '') ?? ''
      if (!code || seen.has(code)) return
      seen.add(code)
      options.push(code)
    })
    return options.sort((a, b) => getBranchLabel(a).localeCompare(getBranchLabel(b), 'ko'))
  }, [productByCode, scopedRecords, storeByCode])

  const filteredRecords = useMemo(() => scopedRecords.filter(record => {
    const recordBranchCode = productByCode.get(record.productCode)?.branchCode ?? (record.storeCode ? storeByCode.get(record.storeCode)?.branchCode : '') ?? ''
    if (branchCode && recordBranchCode !== branchCode) return false
    const selectedDate = dateValue(record[dateFilters.dateType])
    if (dateFilters.from && (!selectedDate || selectedDate < dateFilters.from)) return false
    if (dateFilters.to && (!selectedDate || selectedDate > dateFilters.to)) return false
    return true
  }), [branchCode, dateFilters, productByCode, scopedRecords, storeByCode])

  const columns = useMemo<TableControlColumn<PartOrderRequest, string>[]>(() => [
    { key: 'requestNo', label: '부품 요청 No.', getValue: record => record.requestNo },
    {
      key: 'status',
      label: '상태',
      filterType: 'select',
      filterOptions: PART_ORDER_STATUS_OPTIONS.map(option => option.label),
      getValue: record => getPartOrderStatusMeta(record.status).label,
    },
    { key: 'requestedAt', label: '요청일시', filterable: false, getValue: record => record.requestedAt },
    { key: 'requester', label: '요청담당자', getValue: record => record.requester },
    { key: 'storeType', label: '매장유형', getValue: record => record.storeType },
    { key: 'storeName', label: '매장명', getValue: record => record.storeName },
    { key: 'productName', label: '제품명', getValue: record => record.productName },
    { key: 'partName', label: '부품명', getValue: record => record.partName },
    ...(isManagementMode
      ? [
          { key: 'partStorageLocation', label: '부품 보관위치', getValue: (record: PartOrderRequest) => record.partStorageLocation },
        ] satisfies TableControlColumn<PartOrderRequest, string>[]
      : []),
    { key: 'quantityPairs', label: '수량', getValue: record => `${record.quantityPairs}조`, filterValue: record => `${record.quantityPairs} ${record.quantityPairs}조` },
    ...(isManagementMode
      ? [
          {
            key: 'processedAt',
            label: '처리일시',
            filterable: false,
            getValue: (record: PartOrderRequest) => record.processedAt ? formatKstDateTime(record.processedAt) : '-',
          },
          { key: 'processor', label: '처리자', getValue: (record: PartOrderRequest) => record.processor ?? '-' },
        ] satisfies TableControlColumn<PartOrderRequest, string>[]
      : []),
  ], [isManagementMode])
  const tableControls = useTableColumnControls(filteredRecords, columns)
  const paginatedRows = tableControls.rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tableControls.rows.length / ITEMS_PER_PAGE))
    if (page > totalPages) setPage(totalPages)
  }, [page, tableControls.rows.length])

  const isNew = !isManagementMode && (requestNo === 'new' || location.pathname.endsWith('/stock/part-requests/new'))
  const detailRecord = isNew
    ? buildInitialDraft()
    : requestNo
      ? scopedRecords.find(record => record.requestNo === requestNo)
      : undefined

  if (requestNo || isNew) {
    if (!detailRecord) {
      return (
        <div className="p-8 text-center text-sm text-gray-500">
          부품 요청을 찾을 수 없습니다.
          <button onClick={() => navigate(listPath)} className="ml-2 text-blue-600 hover:underline">
            목록으로
          </button>
        </div>
      )
    }

    return (
      <PartOrderRequestDetail
        record={detailRecord}
        isNew={isNew}
        canManage={isManagementMode}
        onBack={() => {
          if (!isNew && window.history.length > 1) navigate(-1)
          else navigate(listPath)
        }}
        onSaved={createdNo => {
          reload()
          if (createdNo) navigate(detailPath(createdNo))
        }}
      />
    )
  }

  const selectableRows = paginatedRows.filter(record => isPartOrderSelectable(record.status))
  const allSelected = selectableRows.length > 0 && selectableRows.every(record => selected.has(record.requestNo))

  function toggleAll() {
    setSelected(() => allSelected ? new Set() : new Set(selectableRows.map(record => record.requestNo)))
  }

  function toggleSelected(record: PartOrderRequest) {
    if (!isPartOrderSelectable(record.status)) return
    setSelected(current => {
      const next = new Set(current)
      if (next.has(record.requestNo)) next.delete(record.requestNo)
      else next.add(record.requestNo)
      return next
    })
  }

  function applyBulkStatus() {
    if (!isManagementMode) return
    records
      .filter(record => selected.has(record.requestNo) && isPartOrderSelectable(record.status))
      .forEach(record => updatePartOrderRequest(updateWithProgressMeta(record, bulkStatus)))
    reload()
  }

  function exportCsv() {
    const headers = isManagementMode
      ? [
          '부품 요청 No.',
          '상태',
          '요청일시',
          '요청담당자',
          '매장유형',
          '매장명',
          '제품명',
          '부품명',
          '부품 보관위치',
          '수량',
          '처리일시',
          '처리자',
        ]
      : [
          '부품 요청 No.',
          '상태',
          '요청일시',
          '요청담당자',
          '매장유형',
          '매장명',
          '제품명',
          '부품명',
          '수량',
        ]
    const rows = tableControls.rows.map(record => (
      isManagementMode
        ? [
            record.requestNo,
            getPartOrderStatusMeta(record.status).label,
            formatKstDateTime(record.requestedAt),
            record.requester,
            record.storeType,
            record.storeName,
            record.productName,
            record.partName,
            record.partStorageLocation,
            `${record.quantityPairs}조`,
            formatKstDateTime(record.processedAt),
            record.processor ?? '-',
          ]
        : [
            record.requestNo,
            getPartOrderStatusMeta(record.status).label,
            formatKstDateTime(record.requestedAt),
            record.requester,
            record.storeType,
            record.storeName,
            record.productName,
            record.partName,
            `${record.quantityPairs}조`,
          ]
    ))
    downloadCsv(`part_requests_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  function applyDateFilter(key: keyof RequestDateFilters, value: string) {
    setPage(1)
    setDateFilters(prev => constrainDateRange({ ...prev, [key]: value }, key))
  }

  function resetFilters() {
    setBranchCode(DEFAULT_PART_ORDER_BRANCH_CODE)
    setSelected(new Set())
    setDateFilters(getInitialDateFilters())
    setPage(1)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isManagementMode ? '부품 요청 관리' : '부품 요청'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isManagementMode && (
              <button
                type="button"
                onClick={() => navigate(newPath)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                <Plus className="h-3.5 w-3.5" />
                부품 요청
              </button>
            )}
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
            showReset={isDateFilterActive(dateFilters, defaultDateFilters) || branchCode !== DEFAULT_PART_ORDER_BRANCH_CODE}
          >
            <label className="flex items-center">
              <span className="sr-only">법인</span>
              <select
                value={branchCode}
                onChange={event => {
                  setBranchCode(event.target.value || DEFAULT_PART_ORDER_BRANCH_CODE)
                  setSelected(new Set())
                  setPage(1)
                }}
                className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              >
                {branchOptions.map(option => (
                  <option key={option} value={option}>{getBranchLabel(option)}</option>
                ))}
              </select>
            </label>
          </DateRangeFilterBar>
          {tableControls.renderResetBar()}
          <div className="overflow-x-auto">
            <table className={`${isManagementMode ? 'min-w-[1680px]' : 'min-w-[1280px]'} w-full border-collapse text-left text-xs`}>
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-normal text-gray-500">
                <tr>
                  {isManagementMode && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        disabled={selectableRows.length === 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </th>
                  )}
                  {columns.map(column => tableControls.renderHeaderCell(column))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map(record => {
                  const selectable = isPartOrderSelectable(record.status)
                  return (
                    <tr
                      key={record.requestNo}
                      onClick={isManagementMode ? () => navigate(detailPath(record.requestNo)) : undefined}
                      className={`${isManagementMode ? 'cursor-pointer' : ''} transition-colors hover:bg-gray-50/70 ${selected.has(record.requestNo) ? 'bg-gray-50' : ''}`}
                    >
                    {isManagementMode && (
                      <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(record.requestNo)}
                          disabled={!selectable}
                          onChange={() => toggleSelected(record)}
                          className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                      {isManagementMode ? (
                        <span className="inline-flex items-center gap-1.5">
                          {record.requestNo}
                          <ExternalLink className="h-3 w-3 text-gray-300" />
                        </span>
                      ) : record.requestNo}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={record.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(record.requestedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.requester}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.storeType}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.storeName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.partName}</td>
                    {isManagementMode && (
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">{record.partStorageLocation}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{record.quantityPairs}조</td>
                    {isManagementMode && (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatKstDateTime(record.processedAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.processor ?? '-'}</td>
                      </>
                    )}
                    </tr>
                  )
                })}
                {tableControls.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + (isManagementMode ? 1 : 0)} className="px-4 py-16 text-center text-sm text-gray-400">
                      조회된 부품 요청이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={tableControls.rows.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
        </section>
        {tableControls.renderFilterPopover()}

        {isManagementMode && selected.size > 0 && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-xl">
            <span className="text-xs font-semibold text-white">{selected.size}개 선택됨</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={event => setBulkStatus(event.target.value as PartOrderRequestStatus)}
                className="rounded-xl border border-gray-700 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none"
              >
                {PART_ORDER_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkStatus}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-900 transition-colors hover:bg-gray-100"
              >
                상태 일괄변경
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
