import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  Printer,
  X,
} from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { BRANCHES } from '@/lib/mock-data'
import { getTicketsWithExtras } from '@/lib/prototype-storage'
import { maskName } from '@/lib/masking'
import type { Ticket, TicketStatus } from '@/lib/types'

const ITEMS_PER_PAGE = 20
const TABLE_HEADER_CLASS = 'bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500'
const HISTORY_HEADER_CLASS = 'bg-gray-50/50 px-5 py-3 text-left text-[10px] font-medium leading-none text-gray-500'
const MODAL_HEADER_CLASS = 'px-3 py-2 text-left text-[10px] font-medium leading-none text-gray-500'

type DocumentKind = 'CORP' | 'HQ'
type DocumentPreviewTab = 'invoice' | 'packing'
type SortKey = 'ticketNo' | 'receivedAt' | 'branchCode' | 'customerName' | 'productName'
type SortDir = 'asc' | 'desc'

type DocumentLineItem = {
  category: string
  material: string
  hsCode: string
  price: string
}

type TicketDocumentState = {
  corporateInvoiceNo?: string
  hqInvoiceNo?: string
  globalDeliveryStatus?: 'A' | 'B'
  corporateForwardingAt?: string
}

type InvoicePackingLog = {
  id: string
  name: string
  documentKind: DocumentKind
  branchCode: string
  ticketNos: string[]
  count: number
  createdAt: string
  createdByName: string
  createdById: string
  statusEffect: string
  invoiceUrl: string
  packingUrl?: string
  items: Record<string, DocumentLineItem>
}

type LocationState = {
  selectedTicketNos?: string[]
  branchCode?: string
}

const DOCUMENT_KIND_OPTIONS: {
  value: DocumentKind
  label: string
  shortLabel: string
  helper: string
}[] = [
  {
    value: 'CORP',
    label: '법인 인보이스 생성',
    shortLabel: '법인 인보이스',
    helper: '생성 후 선택 티켓은 법인 발송 완료로 표시됩니다.',
  },
  {
    value: 'HQ',
    label: 'HQ 문서 생성',
    shortLabel: 'HQ 문서',
    helper: 'HQ 문서는 Invoice와 Packing List가 탭으로 구분되어 생성됩니다.',
  },
]

const TARGET_STATUS: TicketStatus[] = ['READY_TO_SHIP']

const BRANCH_EN: Record<string, string> = {
  '1110': 'IICOMBINED CO., LTD.',
  '1210': 'TAMBURINS CO., LTD.',
  '1310': 'NUDAKE CO., LTD.',
  '1410': 'NUFLA CO., LTD.',
  '1610': 'ATII CO., LTD.',
  C1002: 'IICOMBINED U.S.A. INC.',
}

const BRANCH_ADDRESS: Record<string, string[]> = {
  '1110': ['8F Product Service team, 61 Dongil-ro, Seongdong-gu', 'Seoul, 04786, Republic of Korea'],
  C1002: ['2211 E. Howell Ave.', 'Anaheim, CA 92806, USA'],
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowDateTime() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function dateStamp(value = todayStr()) {
  return value.replaceAll('-', '')
}

function branchName(branchCode: string) {
  return BRANCHES.find(branch => branch.code === branchCode)?.name ?? branchCode
}

function branchEnglishName(branchCode: string) {
  return BRANCH_EN[branchCode] ?? branchName(branchCode)
}

function documentKindLabel(kind: DocumentKind) {
  return DOCUMENT_KIND_OPTIONS.find(option => option.value === kind)?.label ?? kind
}

function documentKindShortLabel(kind: DocumentKind) {
  return DOCUMENT_KIND_OPTIONS.find(option => option.value === kind)?.shortLabel ?? kind
}

function documentKindHelper(kind: DocumentKind) {
  return DOCUMENT_KIND_OPTIONS.find(option => option.value === kind)?.helper ?? ''
}

function hsCodeFor(category: string) {
  switch (category) {
    case 'OPTICAL':
      return '9003199000'
    case 'CLIP':
      return '900490000'
    case 'ACCESSORY':
      return '9003900000'
    default:
      return '9004109000'
  }
}

function defaultCategory(ticket: Ticket) {
  return ticket.productName.toUpperCase().includes('OPT') ? 'OPTICAL' : 'SUNGLASS'
}

function defaultLineItem(ticket: Ticket): DocumentLineItem {
  const category = defaultCategory(ticket)
  return {
    category,
    material: 'ACETATE',
    hsCode: hsCodeFor(category),
    price: ticket.repairDetail === '토탈케어' ? '30' : '80',
  }
}

function hasBranchInvoiceInfo(ticket: Ticket) {
  return BRANCHES.some(branch => branch.code === ticket.branchCode)
}

function requiresHqCorporateMovement(ticket: Ticket) {
  const values = [
    ticket.receptionPlace,
    ticket.shippingMethod,
    ticket.repairDepartment,
  ].join(' ')

  return (
    ticket.branchCode !== '1110' ||
    ticket.reexportCondition === 'Y' ||
    values.includes('Global') ||
    values.includes('US_') ||
    values.includes('해외택배') ||
    values.includes('Office')
  )
}

function isGlobalDocumentTarget(ticket: Ticket) {
  return (
    TARGET_STATUS.includes(ticket.status) &&
    hasBranchInvoiceInfo(ticket) &&
    requiresHqCorporateMovement(ticket)
  )
}

function makeDocumentNumber(kind: DocumentKind, branchCode: string, date = todayStr()) {
  const name = branchEnglishName(branchCode).replaceAll(' ', '_')
  const stamp = dateStamp(date)
  return kind === 'CORP'
    ? `${stamp}_Return_form_${name}`
    : `HQ_${stamp}_Return_after_repair_${name}`
}

function makeLog(
  id: string,
  kind: DocumentKind,
  branchCode: string,
  tickets: Ticket[],
  createdAt: string,
  items?: Record<string, DocumentLineItem>,
): InvoicePackingLog {
  const name = makeDocumentNumber(kind, branchCode, createdAt.slice(0, 10))
  const lineItems = Object.fromEntries(
    tickets.map(ticket => [ticket.ticketNo, items?.[ticket.ticketNo] ?? defaultLineItem(ticket)])
  )

  return {
    id,
    name,
    documentKind: kind,
    branchCode,
    ticketNos: tickets.map(ticket => ticket.ticketNo),
    count: tickets.length,
    createdAt,
    createdByName: '한혜지',
    createdById: 'monster563',
    statusEffect: kind === 'CORP' ? '법인 발송 완료 자동 변경' : 'Invoice/Packing List 번호 저장',
    invoiceUrl: `#${id}-invoice`,
    packingUrl: kind === 'HQ' ? `#${id}-packing` : undefined,
    items: lineItems,
  }
}

function buildInitialLogs(tickets: Ticket[]) {
  const documentTargets = tickets.filter(isGlobalDocumentTarget)
  const corporateTargets = documentTargets.filter(ticket => ticket.branchCode !== '1110').slice(0, 3)
  const hqTargets = documentTargets.slice(0, 4)

  return [
    ...(corporateTargets.length ? [makeLog('doc-20260616-001', 'CORP', corporateTargets[0].branchCode, corporateTargets, '2026-06-16 09:30:00')] : []),
    ...(hqTargets.length ? [makeLog('doc-20260616-002', 'HQ', '1110', hqTargets, '2026-06-16 10:15:00')] : []),
  ]
}

function buildInitialDocumentStates(logs: InvoicePackingLog[]): Record<string, TicketDocumentState> {
  const state: Record<string, TicketDocumentState> = {}
  logs.forEach(log => {
    log.ticketNos.forEach(ticketNo => {
      state[ticketNo] = {
        ...state[ticketNo],
        ...(log.documentKind === 'CORP'
          ? {
              corporateInvoiceNo: log.name,
              globalDeliveryStatus: 'B',
              corporateForwardingAt: log.createdAt.slice(0, 10),
            }
          : { hqInvoiceNo: log.name }),
      }
    })
  })
  return state
}

function DocumentPreview({
  log,
  tickets,
  tab,
}: {
  log: InvoicePackingLog
  tickets: Ticket[]
  tab: DocumentPreviewTab
}) {
  const fromBranch = log.documentKind === 'HQ' ? '1110' : log.branchCode
  const toBranch = log.documentKind === 'HQ' ? log.branchCode : '1110'
  const total = tickets.reduce((sum, ticket) => sum + Number(log.items[ticket.ticketNo]?.price ?? 0), 0)

  if (tab === 'packing') {
    return (
      <div className="invoice-packing-print bg-white p-8 text-gray-950">
        <div className="mb-8 flex items-start justify-between border-b border-gray-900 pb-5">
          <div>
            <h2 className="text-xl font-bold tracking-wide">PACKING LIST</h2>
            <p className="mt-1 text-xs text-gray-500">{log.name}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{log.createdAt.slice(0, 10)}</p>
            <p>{branchEnglishName(log.branchCode)}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="mb-2 font-semibold">FROM</p>
            <p className="font-medium">{branchEnglishName(fromBranch)}</p>
            {(BRANCH_ADDRESS[fromBranch] ?? []).map(line => <p key={line} className="text-gray-500">{line}</p>)}
          </div>
          <div>
            <p className="mb-2 font-semibold">TO</p>
            <p className="font-medium">{branchEnglishName(toBranch)}</p>
            {(BRANCH_ADDRESS[toBranch] ?? []).map(line => <p key={line} className="text-gray-500">{line}</p>)}
          </div>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-gray-900">
              <th className="py-2 text-left">No.</th>
              <th className="py-2 text-left">Ticket No.</th>
              <th className="py-2 text-left">Model</th>
              <th className="py-2 text-left">Qty</th>
              <th className="py-2 text-left">Repair</th>
              <th className="py-2 text-left">Customer</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => (
              <tr key={ticket.ticketNo} className="border-b border-gray-200">
                <td className="py-2">{index + 1}</td>
                <td className="py-2 font-mono">{ticket.ticketNo}</td>
                <td className="py-2">{ticket.productName}</td>
                <td className="py-2">1 pcs</td>
                <td className="py-2">{ticket.repairDetail}</td>
                <td className="py-2">{ticket.customerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="invoice-packing-print bg-white p-8 text-gray-950">
      <div className="mb-8 flex items-start justify-between border-b border-gray-900 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-wide">INVOICE(Repair)</h2>
          <p className="mt-1 text-xs text-gray-500">{log.name}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>{log.createdAt.slice(0, 10)}</p>
          <p>{documentKindShortLabel(log.documentKind)}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-8 text-xs">
        <div>
          <p className="mb-2 font-semibold">INVOICING ADDRESS</p>
          <p className="font-medium">{branchEnglishName(toBranch)}</p>
          {(BRANCH_ADDRESS[toBranch] ?? []).map(line => <p key={line} className="text-gray-500">{line}</p>)}
        </div>
        <div>
          <p className="mb-2 font-semibold">SHIPPING ADDRESS</p>
          <p className="font-medium">{branchEnglishName(toBranch)}</p>
          {(BRANCH_ADDRESS[toBranch] ?? []).map(line => <p key={line} className="text-gray-500">{line}</p>)}
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-gray-900">
            <th className="py-2 text-left">Category</th>
            <th className="py-2 text-left">Name of Model</th>
            <th className="py-2 text-left">Material</th>
            <th className="py-2 text-left">HS Code</th>
            <th className="py-2 text-left">Qty</th>
            <th className="py-2 text-left">Unit Price</th>
            <th className="py-2 text-left">Total Amount</th>
            <th className="py-2 text-left">Order Number</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => {
            const item = log.items[ticket.ticketNo] ?? defaultLineItem(ticket)
            return (
              <tr key={ticket.ticketNo} className="border-b border-gray-200">
                <td className="py-2">{item.category}</td>
                <td className="py-2">{ticket.productName}</td>
                <td className="py-2">{item.material}</td>
                <td className="py-2">{item.hsCode}</td>
                <td className="py-2">1 pcs</td>
                <td className="py-2">{item.price}</td>
                <td className="py-2">{item.price}</td>
                <td className="py-2 font-mono">{ticket.ticketNo}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-900 font-semibold">
            <td className="py-2" colSpan={4}>G. Total</td>
            <td className="py-2">{tickets.length} pcs</td>
            <td className="py-2" />
            <td className="py-2">USD {total.toLocaleString()}</td>
            <td className="py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function InvoicePackingPage() {
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const tickets = useMemo(() => getTicketsWithExtras(), [])
  const initialLogs = useMemo(() => buildInitialLogs(tickets), [tickets])

  const [activeTab, setActiveTab] = useState<'target' | 'history'>('target')
  const [branch, setBranch] = useState(state.branchCode ?? '')
  const [documentKind, setDocumentKind] = useState<DocumentKind>('CORP')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('receivedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(state.selectedTicketNos ?? []))
  const [createOpen, setCreateOpen] = useState(false)
  const [lineItems, setLineItems] = useState<Record<string, DocumentLineItem>>({})
  const [logs, setLogs] = useState<InvoicePackingLog[]>(initialLogs)
  const [ticketDocumentState, setTicketDocumentState] = useState<Record<string, TicketDocumentState>>(() => buildInitialDocumentStates(initialLogs))
  const [previewLog, setPreviewLog] = useState<InvoicePackingLog | null>(null)
  const [previewTab, setPreviewTab] = useState<DocumentPreviewTab>('invoice')

  const branchOptions = useMemo(() => BRANCHES, [])

  const documentCandidates = useMemo(() => {
    const normalizedQuery = appliedQuery.trim().toLowerCase()
    return tickets.filter(ticket => {
      if (!isGlobalDocumentTarget(ticket)) return false
      if (branch && ticket.branchCode !== branch) return false
      if (!normalizedQuery) return true
      return [
        ticket.ticketNo,
        ticket.customerName,
        ticket.productName,
        ticket.receptionPlace,
        ticket.shippingMethod,
      ].some(value => value.toLowerCase().includes(normalizedQuery))
    })
  }, [appliedQuery, branch, tickets])

  const sortedCandidates = useMemo(() => {
    return [...documentCandidates].sort((a, b) => {
      const av = String(a[sortKey] ?? '')
      const bv = String(b[sortKey] ?? '')
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    })
  }, [documentCandidates, sortDir, sortKey])

  const paginatedCandidates = sortedCandidates.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const selectedTickets = documentCandidates.filter(ticket => selectedIds.has(ticket.ticketNo))
  const historyRows = logs.filter(log =>
    (!branch || log.branchCode === branch) &&
    log.documentKind === documentKind
  )
  const paginatedHistory = historyRows.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)
  const previewTickets = previewLog ? tickets.filter(ticket => previewLog.ticketNos.includes(ticket.ticketNo)) : []

  const currentPageIds = paginatedCandidates.map(ticket => ticket.ticketNo)
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id))

  function handleBranchChange(nextBranch: string) {
    setBranch(nextBranch)
    setPage(1)
    setHistoryPage(1)
    setSelectedIds(new Set())
  }

  function handleDocumentKindChange(kind: DocumentKind) {
    setDocumentKind(kind)
    setHistoryPage(1)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-2 w-2 text-gray-300 group-hover:text-gray-400" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-2 w-2 text-gray-700" />
      : <ArrowDown className="h-2 w-2 text-gray-700" />
  }

  function toggleCurrentPage() {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allCurrentSelected) currentPageIds.forEach(id => next.delete(id))
      else currentPageIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggleSelect(ticketNo: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(ticketNo)) next.delete(ticketNo)
      else next.add(ticketNo)
      return next
    })
  }

  function openCreateModal() {
    if (selectedTickets.length === 0) return
    setLineItems(prev => {
      const next = { ...prev }
      selectedTickets.forEach(ticket => {
        if (!next[ticket.ticketNo]) next[ticket.ticketNo] = defaultLineItem(ticket)
      })
      return next
    })
    setCreateOpen(true)
  }

  function updateLineItem(ticketNo: string, patch: Partial<DocumentLineItem>) {
    setLineItems(prev => {
      const current = prev[ticketNo] ?? defaultLineItem(tickets.find(ticket => ticket.ticketNo === ticketNo)!)
      const next = { ...current, ...patch }
      if (patch.category) next.hsCode = hsCodeFor(patch.category)
      return { ...prev, [ticketNo]: next }
    })
  }

  function handleCreateDocuments() {
    const grouped = selectedTickets.reduce<Record<string, Ticket[]>>((acc, ticket) => {
      const key = ticket.branchCode
      acc[key] = [...(acc[key] ?? []), ticket]
      return acc
    }, {})

    const createdAt = nowDateTime()
    const newLogs = Object.entries(grouped).map(([branchCode, group], index) =>
      makeLog(`doc-${Date.now()}-${index}`, documentKind, branchCode, group, createdAt, lineItems)
    )

    setLogs(prev => [...newLogs, ...prev])
    setTicketDocumentState(prev => {
      const next = { ...prev }
      newLogs.forEach(log => {
        log.ticketNos.forEach(ticketNo => {
          next[ticketNo] = {
            ...next[ticketNo],
            ...(log.documentKind === 'CORP'
              ? {
                  corporateInvoiceNo: log.name,
                  globalDeliveryStatus: 'B',
                  corporateForwardingAt: log.createdAt.slice(0, 10),
                }
              : { hqInvoiceNo: log.name }),
          }
        })
      })
      return next
    })
    setSelectedIds(new Set())
    setCreateOpen(false)
    setActiveTab('history')
    setHistoryPage(1)
  }

  function statusLabel(ticket: Ticket) {
    const current = ticketDocumentState[ticket.ticketNo]?.globalDeliveryStatus
    if (current === 'B') return '법인 발송 완료'
    return '발송대기'
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-packing-print,
          .invoice-packing-print * { visibility: visible !important; }
          .invoice-packing-print {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            box-shadow: none !important;
          }
          .invoice-packing-controls { display: none !important; }
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">인보이스/패킹리스트</h1>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
            <select
              value={branch}
              onChange={e => handleBranchChange(e.target.value)}
              className="w-52 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none transition-colors focus:border-gray-400"
            >
              <option value="">전체</option>
              {branchOptions.map(item => (
                <option key={item.code} value={item.code}>{item.code} {item.name}</option>
              ))}
            </select>

            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {DOCUMENT_KIND_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleDocumentKindChange(option.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    documentKind === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-gray-400 focus-within:bg-white">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setAppliedQuery(query)
                      setPage(1)
                    }
                  }}
                  placeholder="티켓번호, 고객명, 제품명"
                  className="w-48 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-300"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setAppliedQuery('')
                      setPage(1)
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppliedQuery(query)
                  setPage(1)
                }}
                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                조회
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between border-b border-gray-100 px-5 pt-4">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('target')}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'target' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                생성 대상
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                생성 이력
              </button>
            </div>
            <div className="pb-3 text-xs text-gray-400">
              {activeTab === 'target' ? `${documentCandidates.length}건` : `${historyRows.length}건`}
            </div>
          </div>

          {activeTab === 'target' && selectedTickets.length > 0 && (
            <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-2.5">
              <span className="text-xs font-semibold text-blue-700">{selectedTickets.length}개 선택됨</span>
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <FileText className="h-3.5 w-3.5" />
                {documentKindLabel(documentKind)}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-blue-400 transition-colors hover:text-blue-600"
              >
                선택 해제
              </button>
            </div>
          )}

          {activeTab === 'target' ? (
            <>
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-[1840px] w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-10 bg-gray-50/50 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allCurrentSelected}
                          onChange={toggleCurrentPage}
                          className="cursor-pointer rounded border-gray-300"
                        />
                      </th>
                      {[
                        ['ticketNo', 'Ticket No.'],
                        ['receivedAt', '접수일시'],
                        ['branchCode', '법인'],
                        ['customerName', '고객명'],
                        ['productName', '제품명'],
                      ].map(([key, label]) => (
                        <th key={key} className={TABLE_HEADER_CLASS}>
                          <button
                            type="button"
                            onClick={() => handleSort(key as SortKey)}
                            className="group flex items-center gap-1 text-[10px] font-medium leading-none transition-opacity hover:opacity-70"
                          >
                            {label} <SortIcon col={key as SortKey} />
                          </button>
                        </th>
                      ))}
                      <th className={TABLE_HEADER_CLASS}>접수처</th>
                      <th className={TABLE_HEADER_CLASS}>출고방식</th>
                      <th className={TABLE_HEADER_CLASS}>수리내용</th>
                      <th className={TABLE_HEADER_CLASS}>글로벌 배송상태</th>
                      <th className={TABLE_HEADER_CLASS}>법인 인보이스 No.</th>
                      <th className={TABLE_HEADER_CLASS}>HQ 문서 No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-6 py-12 text-center text-sm text-gray-400">
                          생성 대상이 없습니다.
                        </td>
                      </tr>
                    ) : paginatedCandidates.map(ticket => {
                      const docState = ticketDocumentState[ticket.ticketNo]
                      return (
                        <tr key={ticket.ticketNo} className="transition-colors hover:bg-gray-50/50">
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(ticket.ticketNo)}
                              onChange={() => toggleSelect(ticket.ticketNo)}
                              className="cursor-pointer rounded border-gray-300"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-gray-900">{ticket.ticketNo}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-gray-600">{ticket.receivedAt} <span className="font-sans text-gray-400">(KST)</span></td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700">{branchName(ticket.branchCode)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-gray-900">{maskName(ticket.customerName)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-gray-900">{ticket.productName}</td>
                          <td className="max-w-[260px] truncate px-4 py-3.5 text-xs text-gray-700">{ticket.receptionPlace}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700">{ticket.shippingMethod}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-600">{ticket.repairDetail}</td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                              docState?.globalDeliveryStatus === 'B' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {statusLabel(ticket)}
                            </span>
                          </td>
                          <td className="max-w-[240px] truncate px-4 py-3.5 font-mono text-xs text-gray-600">{docState?.corporateInvoiceNo ?? '-'}</td>
                          <td className="max-w-[240px] truncate px-4 py-3.5 font-mono text-xs text-gray-600">{docState?.hqInvoiceNo ?? '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={documentCandidates.length} perPage={ITEMS_PER_PAGE} current={page} onChange={setPage} />
            </>
          ) : (
            <>
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-[1280px] w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className={HISTORY_HEADER_CLASS}>문서명</th>
                      <th className={HISTORY_HEADER_CLASS}>문서 유형</th>
                      <th className={HISTORY_HEADER_CLASS}>법인</th>
                      <th className={HISTORY_HEADER_CLASS}>대상 건수</th>
                      <th className={HISTORY_HEADER_CLASS}>생성일시</th>
                      <th className={HISTORY_HEADER_CLASS}>생성자</th>
                      <th className={HISTORY_HEADER_CLASS}>처리 결과</th>
                      <th className={`${HISTORY_HEADER_CLASS} text-right`}>미리보기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                          생성 이력이 없습니다.
                        </td>
                      </tr>
                    ) : paginatedHistory.map(log => (
                      <tr key={log.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="max-w-[340px] truncate px-5 py-3.5 font-mono text-xs font-semibold text-gray-900">{log.name}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-700">{documentKindShortLabel(log.documentKind)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-700">{branchName(log.branchCode)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-600">{log.count}건</td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-600">{log.createdAt} <span className="font-sans text-gray-400">(KST)</span></td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-600">{log.createdByName}({log.createdById})</td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {log.statusEffect}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewLog(log)
                              setPreviewTab('invoice')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            열기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={historyRows.length} perPage={ITEMS_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
            </>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{documentKindLabel(documentKind)}</h2>
                <p className="mt-1 text-xs text-gray-400">{selectedTickets.length}개 티켓 / {new Set(selectedTickets.map(ticket => ticket.branchCode)).size}개 법인</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={MODAL_HEADER_CLASS}>Ticket No.</th>
                    <th className={MODAL_HEADER_CLASS}>법인</th>
                    <th className={MODAL_HEADER_CLASS}>제품명</th>
                    <th className={MODAL_HEADER_CLASS}>Category</th>
                    <th className={MODAL_HEADER_CLASS}>Material</th>
                    <th className={MODAL_HEADER_CLASS}>HS Code</th>
                    <th className={MODAL_HEADER_CLASS}>Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedTickets.map(ticket => {
                    const item = lineItems[ticket.ticketNo] ?? defaultLineItem(ticket)
                    return (
                      <tr key={ticket.ticketNo}>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-gray-900">{ticket.ticketNo}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-600">{branchName(ticket.branchCode)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-800">{ticket.productName}</td>
                        <td className="px-3 py-3">
                          <select
                            value={item.category}
                            onChange={e => updateLineItem(ticket.ticketNo, { category: e.target.value })}
                            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400"
                          >
                            <option value="SUNGLASS">SUNGLASS</option>
                            <option value="OPTICAL">OPTICAL</option>
                            <option value="CLIP">CLIP</option>
                            <option value="ACCESSORY">ACCESSORY</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.material}
                            onChange={e => updateLineItem(ticket.ticketNo, { material: e.target.value })}
                            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400"
                          >
                            <option value="ACETATE">ACETATE</option>
                            <option value="METAL">METAL</option>
                            <option value="COMBI">COMBI</option>
                            <option value="TITANIUM">TITANIUM</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={item.hsCode}
                            onChange={e => updateLineItem(ticket.ticketNo, { hsCode: e.target.value })}
                            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-700 outline-none focus:border-gray-400"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={item.price}
                            onChange={e => updateLineItem(ticket.ticketNo, { price: e.target.value.replace(/[^0-9.]/g, '') })}
                            className="w-28 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <p className="text-xs text-gray-400">
                {documentKindHelper(documentKind)}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">취소</button>
                <button type="button" onClick={handleCreateDocuments} className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800">생성</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setPreviewLog(null)}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="invoice-packing-controls flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{previewLog.name}</h2>
                <p className="mt-1 text-xs text-gray-400">{branchName(previewLog.branchCode)} / {previewLog.count}건 / {documentKindShortLabel(previewLog.documentKind)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('invoice')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${previewTab === 'invoice' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Invoice
                  </button>
                  {previewLog.packingUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewTab('packing')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${previewTab === 'packing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Packing List
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  인쇄
                </button>
                <button type="button" onClick={() => setPreviewLog(null)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-6">
              <div className="mx-auto max-w-4xl shadow-sm">
                <DocumentPreview log={previewLog} tickets={previewTickets} tab={previewTab} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
