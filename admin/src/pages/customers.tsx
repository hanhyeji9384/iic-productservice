import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link2, Search, UserSearch } from 'lucide-react'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import { getCustomersWithOverrides, getTicketsWithExtras } from '@/lib/prototype-storage'
import { I18nKeyCaption, I18nText, useI18nLabel } from '@/lib/i18n-inspector'
import type { Customer, Ticket } from '@/lib/types'

type SearchType = 'customerKey' | 'email' | 'phone' | 'name'

const SEARCH_TYPE_META: Record<SearchType, { label: string; i18nKey: string }> = {
  customerKey: { label: '고객 Key', i18nKey: 'customers.search.criteria.customer_key' },
  email: { label: 'ID/이메일', i18nKey: 'customers.search.criteria.email' },
  phone: { label: '휴대폰 번호', i18nKey: 'customers.search.criteria.phone' },
  name: { label: '이름', i18nKey: 'customers.search.criteria.name' },
}

const CUSTOMER_TABLE_HEADERS = [
  { label: '고객 Key', i18nKey: 'customers.list.column.customer_key' },
  { label: 'ID', i18nKey: 'customers.list.column.id' },
  { label: '이름', i18nKey: 'customers.list.column.name' },
  { label: '휴대폰 번호', i18nKey: 'customers.list.column.phone' },
  { label: '국가', i18nKey: 'customers.list.column.country' },
  { label: '가입일시', i18nKey: 'customers.list.column.registered_at' },
  { label: 'PS 접수 이력', i18nKey: 'customers.list.column.ticket_history' },
  { label: '최근 접수', i18nKey: 'customers.list.column.latest_ticket' },
]

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function countryLabel(code: string) {
  const labels: Record<string, string> = {
    KR: '한국',
    JP: '일본',
    CN: '중국',
    GB: '영국',
    SG: '싱가포르',
    HK: '홍콩',
    TW: '대만',
    AU: '호주',
    FR: '프랑스',
    IT: '이탈리아',
    CA: '캐나다',
  }
  return labels[code] ? `${labels[code]} (${code})` : code
}

function matchCustomer(customer: Customer, type: SearchType, keyword: string) {
  const q = keyword.trim().toLowerCase()
  if (!q) return false
  if (type === 'customerKey') return customer.id.toLowerCase() === q
  if (type === 'email') return customer.email.toLowerCase() === q
  if (type === 'phone') return normalizeDigits(customer.phone) === normalizeDigits(q)
  return customer.name.toLowerCase() === q
}

function linkedTickets(customer: Customer, tickets: Ticket[]) {
  return tickets
    .filter(ticket => ticket.email === customer.email || ticket.phone === customer.phone)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

function lastTicketLabel(ticket?: Ticket) {
  if (!ticket) return '-'
  return `${ticket.ticketNo} · ${ticket.receivedAt} (KST)`
}

export function CustomersPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const i18nLabel = useI18nLabel()
  const [customers] = useState<Customer[]>(() => getCustomersWithOverrides())
  const [tickets] = useState<Ticket[]>(() => getTicketsWithExtras())
  const [searchType, setSearchType] = useState<SearchType>('customerKey')
  const [keyword, setKeyword] = useState('')
  const [appliedSearch, setAppliedSearch] = useState<{ type: SearchType; keyword: string } | null>(null)

  const results = useMemo(() => {
    if (!appliedSearch) return []
    return customers.filter(customer => matchCustomer(customer, appliedSearch.type, appliedSearch.keyword))
  }, [customers, appliedSearch])

  function handleSearch() {
    const nextKeyword = keyword.trim()
    if (!nextKeyword) return
    setAppliedSearch({ type: searchType, keyword: nextKeyword })
  }

  function handleReset() {
    setKeyword('')
    setAppliedSearch(null)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <I18nText i18nKey="customers.title">고객 조회</I18nText>
            </h1>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-end gap-3">
              <div className="w-48">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  <I18nText i18nKey="customers.search.criteria.label">검색 기준</I18nText>
                </label>
                <select
                  value={searchType}
                  onChange={event => setSearchType(event.target.value as SearchType)}
                  className="w-full rounded-xl border border-gray-100 bg-[#f8f9fb] px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-300 focus:bg-white"
                >
                  {(Object.keys(SEARCH_TYPE_META) as SearchType[]).map(type => (
                    <option key={type} value={type}>
                      {i18nLabel(SEARCH_TYPE_META[type].i18nKey, SEARCH_TYPE_META[type].label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[360px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  <I18nText i18nKey="customers.search.keyword.label">검색어</I18nText>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && handleSearch()}
                    placeholder={i18nLabel('customers.search.keyword.placeholder', '선택한 기준의 전체 값을 입력')}
                    className="w-full rounded-xl border border-gray-100 bg-[#f8f9fb] py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-300 focus:bg-white"
                  />
                </div>
                <I18nKeyCaption i18nKey="customers.search.keyword.placeholder" />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={!keyword.trim()}
                className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Search className="h-4 w-4" />
                <I18nText i18nKey="common.action.search" display="tooltip">조회</I18nText>
              </button>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
                >
                  <I18nText i18nKey="common.action.reset" display="tooltip">초기화</I18nText>
                </button>
              )}
            </div>
          </div>

          {!appliedSearch ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <UserSearch className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-gray-900">
                <I18nText i18nKey="customers.empty.ready">고객 정보를 검색해 주세요.</I18nText>
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <UserSearch className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-gray-900">
                <I18nText i18nKey="customers.empty.no_result">조회된 고객 정보가 없습니다.</I18nText>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {CUSTOMER_TABLE_HEADERS.map(header => (
                      <th key={header.i18nKey} className="whitespace-nowrap bg-gray-50/50 px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500">
                        <I18nText i18nKey={header.i18nKey} display="tooltip">{header.label}</I18nText>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map(customer => {
                    const customerTickets = linkedTickets(customer, tickets)
                    const lastTicket = customerTickets[0]
                    return (
                      <tr key={customer.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/${langCode}/customers/${customer.id}`)}
                            className="font-mono text-sm text-gray-900 underline-offset-2 hover:underline"
                          >
                            {customer.id}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">{maskEmail(customer.email)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900">{maskName(customer.name)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">{maskPhone(customer.phone)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">{countryLabel(customer.country)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-600">
                          {customer.registeredAt} <span className="font-sans text-gray-400">(KST)</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            <Link2 className="h-3 w-3" />
                            {customerTickets.length}건
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-600">
                          {lastTicketLabel(lastTicket)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
