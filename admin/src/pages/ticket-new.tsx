import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, RotateCcw, Search, X, UserCheck } from 'lucide-react'
import { BRANCHES, STORES, PRODUCTS, MEMBERS } from '@/lib/mock-data'
import { addPrototypeTicket, getCustomersWithOverrides, getTicketsWithExtras, localTimestamp, saveCustomerAddresses, upsertPrototypeCustomer } from '@/lib/prototype-storage'
import type { Customer, CustomerAddress, Ticket } from '@/lib/types'

const TICKET_BRANCH_CODES = ['1110']
const TICKET_BRANCHES = BRANCHES.filter(branch => TICKET_BRANCH_CODES.includes(branch.code))
const TECHNICIANS = MEMBERS.filter(m => m.isTechnician && m.status === 'active')

// 현재 로그인한 사용자가 기술자인 경우 서비스 기술자로 기본 세팅
const LOGGED_IN_TECHNICIAN = (() => {
  const me = MEMBERS.find(m => m.loginId === 'monster563')
  return me?.isTechnician && me?.status === 'active' ? me : null
})()

type Form = {
  branchCode: string
  receptionStoreCode: string
  receptionStoreName: string
  technicianId: string
  technicianName: string
  customerId: string
  customerLastName: string
  customerFirstName: string
  country: string
  phone: string
  email: string
  marketingAgree: boolean
  productName: string
  discontinuedYear: string
  receptionType: 'HOME' | 'STORE' | ''
  deliveryAddressId: string
  pickupStoreCode: string
  pickupStoreName: string
  newAddressLine1: string
  newAddressLine2: string
  newAddressZipCode: string
  newAddressCity: string
}

type SaveAction = 'save' | 'save_new' | 'save_open'

type TicketNewLocationState = {
  branchCode?: string
  reRepairSourceTicketNo?: string
}

type AddressForm = {
  address1: string
  address2: string
  zipCode: string
  country: string
  city: string
}

const EMPTY_ADDRESS_FORM: AddressForm = { address1: '', address2: '', zipCode: '', country: 'KR', city: '' }

function createInitialForm(branchCode: string): Form {
  return {
    branchCode,
    receptionStoreCode: '',
    receptionStoreName: '',
    technicianId: LOGGED_IN_TECHNICIAN?.id ?? '',
    technicianName: LOGGED_IN_TECHNICIAN?.name ?? '',
    customerId: '',
    customerLastName: '',
    customerFirstName: '',
    country: '',
    phone: '',
    email: '',
    marketingAgree: false,
    productName: '',
    discontinuedYear: '',
    receptionType: '',
    deliveryAddressId: '',
    pickupStoreCode: '',
    pickupStoreName: '',
    newAddressLine1: '',
    newAddressLine2: '',
    newAddressZipCode: '',
    newAddressCity: '',
  }
}

const COUNTRIES = [
  { code: 'KR', name: '대한민국 (Korea)' },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <dt className="text-[11px] font-medium text-gray-400 mb-1">{children}</dt>
}

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300 placeholder:text-gray-300'

interface StoreOption { code: string; name: string }

function StoreSearchSelect({
  stores,
  value,
  onChange,
}: {
  stores: StoreOption[]
  value: string
  onChange: (code: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedStore = stores.find(s => s.code === value)
  const filtered = query.trim()
    ? stores.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.code.toLowerCase().includes(query.toLowerCase())
      )
    : stores

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
        setQuery('')
      }
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(code: string, name: string) {
    onChange(code, name)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('', '')
  }

  return (
    <div className="relative">
      {/* 트리거 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white border rounded-xl text-sm transition-colors hover:border-gray-300 ${
          open ? 'border-gray-400' : 'border-gray-200'
        }`}
      >
        <span className={selectedStore ? 'text-gray-900' : 'text-gray-300'}>
          {selectedStore ? selectedStore.name : '매장 검색 또는 선택'}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selectedStore && (
            <span onClick={handleClear} className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* 드롭다운은 포털로 body에 마운트 */}
      {open && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] overflow-hidden"
          style={{
            top: dropdownRect.bottom + 4,
            left: dropdownRect.left,
            width: dropdownRect.width,
          }}
        >
          {/* 검색 입력 */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="매장명 검색"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* 목록 */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
            ) : filtered.map(s => (
              <li key={s.code}>
                <button
                  type="button"
                  onClick={() => handleSelect(s.code, s.name)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                    s.code === value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  {s.name}
                  <span className="ml-2 text-[11px] text-gray-400 font-mono">{s.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

interface CustomerOption {
  id: string
  name: string
  phone: string
  email: string
  country: string
  marketingAgree: 'Y' | 'N'
  addresses?: CustomerAddress[]
}

function splitName(name: string): { lastName: string; firstName: string } {
  if (!name) return { lastName: '', firstName: '' }
  if (name.includes(' ')) {
    // 영문 이름은 마지막 토큰을 성으로 본다.
    const parts = name.split(' ')
    return { lastName: parts[parts.length - 1], firstName: parts.slice(0, -1).join(' ') }
  }
  // 국문 이름은 첫 글자를 성으로 본다.
  return { lastName: name[0], firstName: name.slice(1) }
}

function CountrySearchSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = COUNTRIES.find(c => c.code === value)
  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false); setQuery('')
      }
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true); setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(code: string) {
    onChange(code); setOpen(false); setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation(); onChange('')
  }

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" onClick={handleOpen}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white border rounded-xl text-sm transition-colors hover:border-gray-300 ${open ? 'border-gray-400' : 'border-gray-200'}`}>
        <span className={selected ? 'text-gray-900' : 'text-gray-300'}>
          {selected ? selected.name : '국가 검색 또는 선택'}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span onClick={handleClear} className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && dropdownRect && createPortal(
        <div ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] overflow-hidden"
          style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}>
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="국가명 검색" className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none" />
              {query && <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
              : filtered.map(c => (
                <li key={c.code}>
                  <button type="button" onClick={() => handleSelect(c.code)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 flex items-center justify-between ${c.code === value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'}`}>
                    <span>{c.name}</span>
                    <span className="text-[11px] text-gray-400 font-mono">{c.code}</span>
                  </button>
                </li>
              ))
            }
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function TechnicianSearchSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = TECHNICIANS.find(m => m.id === value)
  const filtered = query.trim()
    ? TECHNICIANS.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.loginId.toLowerCase().includes(query.toLowerCase())
      )
    : TECHNICIANS

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false); setQuery('')
      }
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true); setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation(); onChange('', '')
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white border rounded-xl text-sm transition-colors hover:border-gray-300 ${open ? 'border-gray-400' : 'border-gray-200'}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-300'}>
          {selected ? <>{selected.name} <span className="text-gray-400">({selected.loginId})</span></> : '담당자 검색 또는 선택'}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span onClick={handleClear} className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && dropdownRect && createPortal(
        <div ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] overflow-hidden"
          style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="이름 검색" className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none" />
              {query && <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
              : filtered.map(m => (
                <li key={m.id}>
                  <button type="button" onClick={() => { onChange(m.id, m.name); setOpen(false); setQuery('') }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${m.id === value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {m.name}
                    <span className="ml-2 text-[11px] text-gray-400 font-mono">{m.loginId}</span>
                  </button>
                </li>
              ))
            }
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function ProductSearchCombo({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string, discontinuedYear: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = searchedQuery.trim()
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchedQuery.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchedQuery.toLowerCase())
      )
    : []

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSearch() {
    setSearchedQuery(query)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation(); onChange('', '')
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white border rounded-xl text-sm transition-colors hover:border-gray-300 ${open ? 'border-gray-400' : 'border-gray-200'}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-300'}>{value || '제품 검색'}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span onClick={handleClear} className="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && dropdownRect && createPortal(
        <div ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] overflow-hidden"
          style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input ref={inputRef} type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="제품명 또는 코드 입력" className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none" />
                {query && <button type="button" onClick={() => { setQuery(''); setSearchedQuery('') }} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <button type="button" onClick={handleSearch}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">
                검색
              </button>
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {!searchedQuery.trim()
              ? <li className="px-3 py-4 text-center text-xs text-gray-400">제품명 또는 코드를 입력 후 검색해주세요</li>
              : filtered.length === 0
                ? <li className="px-3 py-4 text-center text-xs text-gray-400">검색 결과가 없습니다</li>
                : filtered.map(p => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { onChange(p.name, p.discontinuedYear ?? ''); setOpen(false); setQuery(''); setSearchedQuery('') }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${p.name === value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {p.name}
                      <span className="ml-2 text-[11px] text-gray-400 font-mono">{p.productCode}</span>
                    </button>
                  </li>
                ))
            }
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function AddressSelect({
  addresses,
  value,
  onChange,
}: {
  addresses: CustomerAddress[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = addresses.find(a => a.id === value)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false)
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropdownRect(rect)
    setOpen(true)
  }

  function addressLabel(address: CustomerAddress) {
    const countryName = COUNTRIES.find(country => country.code === address.country)?.name ?? address.country
    const location = [countryName, address.city].filter(Boolean).join(' · ')
    return `${address.isDefault ? '[기본] ' : ''}${location ? `${location} · ` : ''}${address.address1}${address.address2 ? ` ${address.address2}` : ''}`
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white border rounded-xl text-sm transition-colors hover:border-gray-300 ${open ? 'border-gray-400' : 'border-gray-200'}`}
      >
        <span className={selected ? 'text-gray-900 truncate' : 'text-gray-300'}>
          {selected
            ? addressLabel(selected)
            : '배송 주소 선택'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && dropdownRect && createPortal(
        <div ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] overflow-hidden"
          style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}
        >
          <ul className="max-h-52 overflow-y-auto py-1">
            {addresses.map(a => (
              <li key={a.id}>
                <button type="button" onClick={() => { onChange(a.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 transition-colors hover:bg-gray-50 ${a.id === value ? 'bg-gray-50' : ''}`}>
                  <span className={`text-sm ${a.id === value ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {addressLabel(a)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

function AddressEditor({
  mode,
  form,
  onChange,
  onSave,
  onCancel,
}: {
  mode: 'add' | 'edit' | null
  form: AddressForm
  onChange: (form: AddressForm) => void
  onSave: () => void
  onCancel: () => void
}) {
  if (!mode) return null
  const isOverseas = isOverseasCountry(form.country)
  const canSave = !!form.address1.trim() && (!isOverseas || !!form.city.trim())

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">{mode === 'add' ? '주소 추가' : '주소 수정'}</p>
        <button type="button" onClick={onCancel} className="text-gray-300 hover:text-gray-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={form.address1}
        onChange={e => onChange({ ...form, address1: e.target.value })}
        placeholder="주소"
        className={inputCls}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.zipCode}
          onChange={e => onChange({ ...form, zipCode: e.target.value })}
          placeholder="우편번호"
          className={inputCls}
        />
        <CountrySearchSelect
          value={form.country}
          onChange={country => {
            const nextCountry = country || 'KR'
            onChange({ ...form, country: nextCountry, city: nextCountry === 'KR' ? '' : form.city })
          }}
        />
      </div>
      {isOverseas && (
        <input
          type="text"
          value={form.city}
          onChange={e => onChange({ ...form, city: e.target.value })}
          placeholder="City *"
          className={inputCls}
        />
      )}
      <input
        type="text"
        value={form.address2}
        onChange={e => onChange({ ...form, address2: e.target.value })}
        placeholder="상세주소"
        className={inputCls}
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-white transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          저장
        </button>
      </div>
    </div>
  )
}

// 보안 요건: LIKE 검색 금지 → 전화번호/이메일 완전 일치로만 조회
function CustomerSearchCombo({
  customers,
  onSelect,
  onNotFound,
  onClear,
}: {
  customers: CustomerOption[]
  onSelect: (c: CustomerOption) => void
  onNotFound: (query: string) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<CustomerOption | null>(null)

  function handleSearch() {
    const q = query.trim()
    if (!q) return
    const found = customers.find(c =>
      c.phone.replace(/-/g, '') === q.replace(/-/g, '') ||
      c.email.toLowerCase() === q.toLowerCase()
    ) ?? null
    setResult(found)
    setSearched(true)
    if (!found) onNotFound(q)
  }

  function handleClear() {
    setQuery('')
    setSearched(false)
    setResult(null)
    onClear()
  }

  function resetSearchOnly() {
    setQuery('')
    setSearched(false)
    setResult(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); setResult(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="전화번호 또는 이메일"
            className={`${inputCls} pr-8`}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <Search className="w-3.5 h-3.5" />조회
        </button>
      </div>

      {searched && (
        result ? (
          <button
            type="button"
            onClick={() => { onSelect(result); resetSearchOnly() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <UserCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-800 font-medium">{result.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{result.phone} · {result.email} · {result.country}</p>
            </div>
          </button>
        ) : (
          <p className="text-xs text-gray-400 px-1">조회된 고객이 없습니다. 신규 고객 정보로 입력합니다.</p>
        )
      )}
    </div>
  )
}

function generateTicketNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const yymmdd = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let random = ''
  for (let i = 0; i < 13; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${yymmdd}${random}`
}

function formatCustomerName(form: Form) {
  const lastName = form.customerLastName.trim()
  const firstName = form.customerFirstName.trim()
  if (form.country === 'KR') return `${lastName}${firstName}`.trim()
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

function defaultCountryForBranch(branchCode: string) {
  return BRANCHES.find(branch => branch.code === branchCode)?.country ?? 'KR'
}

function isOverseasCountry(country: string) {
  return !!country && country !== 'KR'
}

function normalizeTicketBranchCode(branchCode?: string) {
  return branchCode && TICKET_BRANCH_CODES.includes(branchCode) ? branchCode : ''
}

function buildCustomerId(form: Form) {
  if (form.customerId) return form.customerId
  const seed = (form.email || form.phone || Date.now().toString()).replace(/[^0-9a-z]/gi, '').toUpperCase()
  return `C-${seed}`
}

function shippingMethodLabel(form: Form, deliveryCountry = form.country) {
  if (form.receptionType === 'STORE') return '매장 Drop-Off'
  if (form.receptionType === 'HOME') return isOverseasCountry(deliveryCountry) ? '해외 택배(HQ)' : '택배(HQ)'
  return '-'
}

function pickupTrackingNo(ticketNo: string, deliveryCountry: string) {
  const numericSeed = ticketNo.replace(/\D/g, '')
  if (isOverseasCountry(deliveryCountry)) {
    return `DHL JD${numericSeed.slice(-14).padStart(14, '0')}`
  }
  return `CJ대한통운 ${numericSeed.slice(-12).padStart(12, '0')}`
}

function receptionTypeFromTicket(ticket: Ticket): Form['receptionType'] {
  if (/행낭|자체|매장\s*Drop-?Off/i.test(ticket.shippingMethod)) return 'STORE'
  if (ticket.shippingMethod && ticket.shippingMethod !== '-') return 'HOME'
  return ''
}

function createReRepairForm(sourceTicket: Ticket, sourceCustomer?: Customer): Form {
  const branchCode = normalizeTicketBranchCode(sourceTicket.branchCode) || TICKET_BRANCH_CODES[0]
  const { lastName, firstName } = splitName(sourceTicket.customerName)
  const receptionType = receptionTypeFromTicket(sourceTicket)
  const addresses = sourceCustomer?.addresses ?? []

  return {
    ...createInitialForm(branchCode),
    // 고객 정보
    customerId: sourceCustomer?.id ?? '',
    customerLastName: lastName,
    customerFirstName: firstName,
    country: sourceCustomer?.country ?? defaultCountryForBranch(branchCode),
    phone: sourceTicket.phone,
    email: sourceTicket.email,
    marketingAgree: sourceCustomer?.marketingAgree === 'Y',
    // 제품 정보
    productName: sourceTicket.productName,
    discontinuedYear: sourceTicket.discontinuedYear ?? '',
    // 접수 정보 (재수리 여부는 N이 기본값 — submitTicket에서 처리)
    receptionStoreName: sourceTicket.receptionPlace,
    receptionStoreCode: sourceTicket.receptionStoreCode ?? '',
    pickupStoreCode: receptionType === 'STORE' ? (sourceTicket.receptionStoreCode ?? '') : '',
    pickupStoreName: receptionType === 'STORE' ? (sourceTicket.receptionStoreName ?? '') : '',
    receptionType,
    deliveryAddressId: receptionType === 'HOME'
      ? (addresses.find(address => address.isDefault)?.id ?? addresses[0]?.id ?? '')
      : '',
  }
}

export function TicketNewPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const location = useLocation()
  const locationState = (location.state as TicketNewLocationState | null) ?? {}
  const sourceTicket = locationState.reRepairSourceTicketNo
    ? getTicketsWithExtras().find(ticket => ticket.ticketNo === locationState.reRepairSourceTicketNo)
    : undefined
  const initialCustomers = getCustomersWithOverrides()
  const sourceCustomer = sourceTicket
    ? initialCustomers.find(customer => customer.email === sourceTicket.email || customer.phone === sourceTicket.phone)
    : undefined
  const initBranch = normalizeTicketBranchCode(sourceTicket?.branchCode ?? locationState.branchCode)

  const [reRepairSourceTicket, setReRepairSourceTicket] = useState<Ticket | undefined>(() => sourceTicket)
  const [form, setForm] = useState<Form>(() => reRepairSourceTicket ? createReRepairForm(reRepairSourceTicket, sourceCustomer) : createInitialForm(initBranch))

  // isFromDotCom: 신규 고객(미조회) 시 마케팅 동의 체크박스 활성화
  const [isFromDotCom, setIsFromDotCom] = useState(false)
  // isNewCustomer: 고객 조회 결과 없음 → 신규 등록 모드
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>(() => sourceCustomer?.addresses ?? [])
  const [customers, setCustomers] = useState<Customer[]>(() => initialCustomers)
  const [addressEditMode, setAddressEditMode] = useState<'add' | 'edit' | null>(null)
  const [editingAddressId, setEditingAddressId] = useState('')
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM)

  function set(key: keyof Form, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const branchStores = STORES.filter(s =>
    TICKET_BRANCH_CODES.includes(s.branchCode) &&
    (!form.branchCode || s.branchCode === form.branchCode)
  )
  const branchContextLabel = form.branchCode
    ? TICKET_BRANCHES.find(branch => branch.code === form.branchCode)?.name ?? form.branchCode
    : '전체'

  function resolveTicketBranchCode() {
    if (form.branchCode) return form.branchCode
    const selectedStoreBranch = STORES.find(store => store.code === form.receptionStoreCode)?.branchCode
    if (selectedStoreBranch && TICKET_BRANCH_CODES.includes(selectedStoreBranch)) return selectedStoreBranch
    const selectedPickupBranch = STORES.find(store => store.code === form.pickupStoreCode)?.branchCode
    if (selectedPickupBranch && TICKET_BRANCH_CODES.includes(selectedPickupBranch)) return selectedPickupBranch
    return TICKET_BRANCH_CODES[0]
  }
  const newCustomerAddressCountry = form.country || defaultCountryForBranch(resolveTicketBranchCode())
  const isNewCustomerAddressOverseas = isOverseasCountry(newCustomerAddressCountry)

  function resetCustomerFields() {
    setIsNewCustomer(false)
    setIsFromDotCom(false)
    setCustomerAddresses([])
    resetAddressEditor()
    setForm(p => ({
      ...p,
      customerId: '',
      customerLastName: '', customerFirstName: '',
      country: '', phone: '', email: '',
      marketingAgree: false,
      receptionType: '', deliveryAddressId: '',
      pickupStoreCode: '', pickupStoreName: '',
      newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '', newAddressCity: '',
    }))
  }

  function resetAddressEditor() {
    setAddressEditMode(null)
    setEditingAddressId('')
    setAddressForm(EMPTY_ADDRESS_FORM)
  }

  function commitCustomerAddresses(next: CustomerAddress[], nextSelectedId?: string) {
    const fallbackId = next.find(address => address.isDefault)?.id ?? next[0]?.id ?? ''
    setCustomerAddresses(next)
    if (form.customerId) {
      saveCustomerAddresses(form.customerId, next)
      setCustomers(getCustomersWithOverrides())
    }
    setForm(prev => ({
      ...prev,
      deliveryAddressId: nextSelectedId ?? (
        next.some(address => address.id === prev.deliveryAddressId)
          ? prev.deliveryAddressId
          : fallbackId
      ),
    }))
  }

  function openAddressAdd() {
    setAddressEditMode('add')
    setEditingAddressId('')
    setAddressForm({
      address1: '',
      address2: '',
      zipCode: '',
      country: form.country || defaultCountryForBranch(form.branchCode),
      city: '',
    })
  }

  function openAddressEdit() {
    const selected = customerAddresses.find(address => address.id === form.deliveryAddressId)
    if (!selected) return
    setAddressEditMode('edit')
    setEditingAddressId(selected.id)
    setAddressForm({
      address1: selected.address1,
      address2: selected.address2 ?? '',
      zipCode: selected.zipCode ?? '',
      country: selected.country,
      city: selected.city ?? '',
    })
  }

  function saveAddressForm() {
    if (!addressForm.address1.trim()) return
    if (isOverseasCountry(addressForm.country) && !addressForm.city.trim()) return
    if (addressEditMode === 'add') {
      const addressId = `addr-${Date.now()}`
      const next: CustomerAddress[] = [
        ...customerAddresses,
        {
          id: addressId,
          isDefault: customerAddresses.length === 0,
          address1: addressForm.address1.trim(),
          address2: addressForm.address2.trim() || undefined,
          zipCode: addressForm.zipCode.trim() || undefined,
          country: addressForm.country || form.country || defaultCountryForBranch(form.branchCode),
          city: isOverseasCountry(addressForm.country) ? addressForm.city.trim() : undefined,
        },
      ]
      commitCustomerAddresses(next, addressId)
      resetAddressEditor()
      return
    }

    const next = customerAddresses.map(address =>
      address.id === editingAddressId
        ? {
            ...address,
            address1: addressForm.address1.trim(),
            address2: addressForm.address2.trim() || undefined,
            zipCode: addressForm.zipCode.trim() || undefined,
            country: addressForm.country || address.country,
            city: isOverseasCountry(addressForm.country) ? addressForm.city.trim() : undefined,
          }
        : address
    )
    commitCustomerAddresses(next, editingAddressId)
    resetAddressEditor()
  }

  function deleteSelectedAddress() {
    if (!form.deliveryAddressId) return
    const next = customerAddresses.filter(address => address.id !== form.deliveryAddressId)
    if (next.length > 0 && !next.some(address => address.isDefault)) {
      next[0] = { ...next[0], isDefault: true }
    }
    const nextSelectedId = next.find(address => address.isDefault)?.id ?? next[0]?.id ?? ''
    commitCustomerAddresses(next, nextSelectedId)
    resetAddressEditor()
  }

  function setSelectedAddressDefault() {
    if (!form.deliveryAddressId) return
    commitCustomerAddresses(
      customerAddresses.map(address => ({ ...address, isDefault: address.id === form.deliveryAddressId })),
      form.deliveryAddressId
    )
  }

  function resetNewTicketForm() {
    setReRepairSourceTicket(undefined)
    setIsNewCustomer(false)
    setIsFromDotCom(false)
    setCustomerAddresses([])
    resetAddressEditor()
    setForm(createInitialForm(form.branchCode))
  }

  function handleSave(action: SaveAction) {
    const customerName = formatCustomerName(form)
    const customerId = buildCustomerId(form)
    const addresses = [...customerAddresses]
    const ticketBranchCode = resolveTicketBranchCode()
    const selectedDeliveryAddress = customerAddresses.find(address => address.id === form.deliveryAddressId)
    const selectedPickupStore = STORES.find(store => store.code === form.pickupStoreCode)
    const deliveryCountry = isNewCustomer
      ? (form.country || defaultCountryForBranch(ticketBranchCode))
      : (selectedDeliveryAddress?.country || form.country || defaultCountryForBranch(ticketBranchCode))
    const deliveryCity = isNewCustomer ? form.newAddressCity.trim() : selectedDeliveryAddress?.city?.trim()
    const receptionMethod = form.receptionType === 'STORE'
      ? 'store'
      : form.receptionType === 'HOME'
        ? 'house'
        : null
    const isHomeReception = receptionMethod === 'house'
    const isStoreReception = receptionMethod === 'store'
    const isReRepair = Boolean(reRepairSourceTicket)
    const shouldCreatePickup = isReRepair || isHomeReception

    if (form.receptionType === 'HOME' && isOverseasCountry(deliveryCountry) && !deliveryCity) {
      alert('해외 자택수령 주소는 City 입력이 필요합니다.')
      return
    }

    if (isNewCustomer && form.receptionType === 'HOME' && form.newAddressLine1.trim()) {
      addresses.push({
        id: `addr-${Date.now()}`,
        isDefault: addresses.length === 0,
        address1: form.newAddressLine1.trim(),
        address2: form.newAddressLine2.trim() || undefined,
        zipCode: form.newAddressZipCode.trim() || undefined,
        country: form.country || defaultCountryForBranch(ticketBranchCode),
        city: isOverseasCountry(deliveryCountry) ? form.newAddressCity.trim() : undefined,
      })
    }

    if (isNewCustomer && (form.phone || form.email || customerName)) {
      upsertPrototypeCustomer({
        id: customerId,
        name: customerName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country || defaultCountryForBranch(ticketBranchCode),
        branchCode: ticketBranchCode,
        ticketYn: 'Y',
        marketingAgree: form.marketingAgree ? 'Y' : 'N',
        registeredAt: localTimestamp(),
        addresses,
      })
      setCustomers(getCustomersWithOverrides())
    }

    const ticketNo = generateTicketNo()
    const ticket: Ticket = {
      id: `ticket-${ticketNo}`,
      ticketNo,
      branchCode: ticketBranchCode,
      receivedAt: localTimestamp(),
      status: 'RECEIVED',
      hqReceivedAt: null,
      expectedShipAt: null,
      receptionPlace: form.receptionStoreName || TICKET_BRANCHES.find(branch => branch.code === ticketBranchCode)?.name || '-',
      customerName: customerName || '-',
      phone: form.phone.trim(),
      email: form.email.trim(),
      receptionTitle: reRepairSourceTicket ? '재수리 접수' : undefined,
      originalTicketNo: reRepairSourceTicket?.ticketNo,
      reRepairYn: 'N',
      pickupTrackingNo: shouldCreatePickup ? pickupTrackingNo(ticketNo, deliveryCountry) : null,
      serviceCoupon: null,
      urgentRepairYn: 'N',
      purchaseProofType: isNewCustomer ? '-' : 'MEMBERSHIP',
      purchaseInfoSource: 'ADMIN',
      componentType: null,
      customerRequest: null,
      attachments: [],
      receptionMethod,
      receptionStoreCode: isStoreReception ? form.pickupStoreCode || form.receptionStoreCode || null : null,
      receptionStoreName: isStoreReception ? form.pickupStoreName || selectedPickupStore?.name || form.receptionStoreName || null : null,
      deliveryCountry: isHomeReception ? deliveryCountry : null,
      deliveryZipCode: isHomeReception
        ? (isNewCustomer ? form.newAddressZipCode.trim() : selectedDeliveryAddress?.zipCode) || null
        : null,
      deliveryAddress1: isHomeReception
        ? (isNewCustomer ? form.newAddressLine1.trim() : selectedDeliveryAddress?.address1) || null
        : null,
      deliveryAddress2: isHomeReception
        ? (isNewCustomer ? form.newAddressLine2.trim() : selectedDeliveryAddress?.address2) || null
        : null,
      deliveryCity: isHomeReception ? deliveryCity || null : null,
      deliveryState: null,
      productName: form.productName || '-',
      repairDepartment: reRepairSourceTicket?.repairDepartment ?? '',
      repairDetail: reRepairSourceTicket?.repairDetail ?? '',
      symptom: reRepairSourceTicket?.symptom ?? null,
      repairIssueTypeTags: reRepairSourceTicket?.repairIssueTypeTags ?? [],
      repairTypeTags: reRepairSourceTicket?.repairTypeTags ?? [],
      careRequest: reRepairSourceTicket?.careRequest ?? null,
      repairAgainReason: reRepairSourceTicket?.repairAgainReason ?? null,
      technicianId: form.technicianId || undefined,
      technicianName: form.technicianName || undefined,
      trackingNo: null,
      paymentCompleted: 'N',
      paymentDate: null,
      reexportCondition: 'N',
      shippingMethod: shippingMethodLabel(form, deliveryCountry),
      shippedAt: null,
      soDocumentNo: null,
    }

    addPrototypeTicket(ticket)
    if (action === 'save_new') {
      resetNewTicketForm()
      return
    }
    if (action === 'save_open') {
      navigate(`/${langCode}/tickets/${ticketNo}`, { state: { autoPrintBarcodeOnce: true } })
      return
    }
    navigate(`/${langCode}/tickets`)
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />뒤로가기
      </button>

      <div className="space-y-4">

        {/* ── 상단 헤더 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-0.5">티켓 관리</p>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">신규 티켓 생성</h1>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                {branchContextLabel}
              </div>
              <button
                onClick={() => handleSave('save')}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => handleSave('save_new')}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                저장 후 신규생성
              </button>
              <button
                onClick={() => handleSave('save_open')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />저장 후 열기
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {reRepairSourceTicket && (
            <div className="col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-white p-1.5 text-blue-700 shadow-sm">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-900">재수리 접수</p>
                  <p className="mt-1 text-xs text-blue-700">
                    기존 티켓번호 <span className="font-mono font-semibold">{reRepairSourceTicket.ticketNo}</span> 기준으로 고객 정보와 제품 정보를 불러왔습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 접수 정보 */}
          <SectionCard title="2. 접수/수령 정보" className="order-2">
            <dl className="space-y-5">
              <div>
                <FieldLabel>접수처</FieldLabel>
                <dd>
                  <StoreSearchSelect
                    stores={branchStores}
                    value={form.receptionStoreCode}
                    onChange={(code, name) => {
                      resetAddressEditor()
                      setForm(p => ({
                        ...p,
                        receptionStoreCode: code,
                        receptionStoreName: name,
                        receptionType: 'STORE',
                        deliveryAddressId: '',
                        pickupStoreCode: code,
                        pickupStoreName: name,
                      }))
                    }}
                  />
                </dd>
              </div>
              <div>
                <FieldLabel>서비스 기술자</FieldLabel>
                <dd>
                  <TechnicianSearchSelect
                    value={form.technicianId}
                    onChange={(id, name) => setForm(p => ({ ...p, technicianId: id, technicianName: name }))}
                  />
                </dd>
              </div>
              <div>
                <FieldLabel>수령 유형</FieldLabel>
                <dd className="space-y-2">
                  <div className="flex gap-2">
                    {(['HOME', 'STORE'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        disabled={!form.phone}
                        onClick={() => {
                          resetAddressEditor()
                          const defaultId = type === 'HOME' ? (customerAddresses.find(a => a.isDefault)?.id ?? '') : ''
                          setForm(p => ({
                            ...p,
                            receptionType: type,
                            deliveryAddressId: defaultId,
                            pickupStoreCode: type === 'STORE' ? p.receptionStoreCode : '',
                            pickupStoreName: type === 'STORE' ? p.receptionStoreName : '',
                          }))
                        }}
                        className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                          !form.phone
                            ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                            : form.receptionType === type
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type === 'HOME' ? '자택 픽업' : '매장 Drop-Off'}
                      </button>
                    ))}
                  </div>
                  {form.receptionType === 'HOME' && (
                    isNewCustomer
                      ? (
                        <div className="space-y-2">
                          <input type="text" value={form.newAddressLine1}
                            onChange={e => set('newAddressLine1', e.target.value)}
                            placeholder="주소" className={inputCls} />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={form.newAddressZipCode}
                              onChange={e => set('newAddressZipCode', e.target.value)}
                              placeholder="우편번호" className={inputCls} />
                            <input type="text" value={form.newAddressLine2}
                              onChange={e => set('newAddressLine2', e.target.value)}
                              placeholder="상세주소" className={inputCls} />
                          </div>
                          {isNewCustomerAddressOverseas && (
                            <input type="text" value={form.newAddressCity}
                              onChange={e => set('newAddressCity', e.target.value)}
                              placeholder="City *" className={inputCls} />
                          )}
                        </div>
                      )
                      : customerAddresses.length === 0
                        ? (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-400 px-1">등록된 주소가 없습니다. 아래에서 주소를 추가해 주세요.</p>
                            {!addressEditMode && (
                              <button
                                type="button"
                                onClick={openAddressAdd}
                                className="w-full px-3 py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                              >
                                주소 추가
                              </button>
                            )}
                            <AddressEditor
                              mode={addressEditMode}
                              form={addressForm}
                              onChange={setAddressForm}
                              onSave={saveAddressForm}
                              onCancel={resetAddressEditor}
                            />
                          </div>
                        )
                        : (
                          <div className="space-y-2">
                            <AddressSelect addresses={customerAddresses} value={form.deliveryAddressId} onChange={id => { set('deliveryAddressId', id); resetAddressEditor() }} />
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={openAddressAdd}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                              >
                                주소 추가
                              </button>
                              <button
                                type="button"
                                disabled={!form.deliveryAddressId}
                                onClick={openAddressEdit}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                disabled={!form.deliveryAddressId}
                                onClick={deleteSelectedAddress}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                삭제
                              </button>
                              <button
                                type="button"
                                disabled={!form.deliveryAddressId || !!customerAddresses.find(address => address.id === form.deliveryAddressId)?.isDefault}
                                onClick={setSelectedAddressDefault}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                기본 설정
                              </button>
                            </div>
                            <AddressEditor
                              mode={addressEditMode}
                              form={addressForm}
                              onChange={setAddressForm}
                              onSave={saveAddressForm}
                              onCancel={resetAddressEditor}
                            />
                          </div>
                        )
                  )}
                  {form.receptionType === 'STORE' && (
                    <StoreSearchSelect
                      stores={branchStores}
                      value={form.pickupStoreCode}
                      onChange={(code, name) => setForm(p => ({ ...p, pickupStoreCode: code, pickupStoreName: name }))}
                    />
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* 고객 정보 */}
          <SectionCard title="1. 고객 정보" className="order-1">
            <dl className="space-y-5">
              <div>
                <FieldLabel>고객 검색</FieldLabel>
                <dd>
                  <CustomerSearchCombo
                    customers={customers}
                    onSelect={c => {
                      const { lastName, firstName } = splitName(c.name)
                      const addrs = c.addresses ?? []
                      setIsNewCustomer(false)
                      setIsFromDotCom(false)
                      setCustomerAddresses(addrs)
                      resetAddressEditor()
                      setForm(p => ({
                        ...p,
                        customerId: c.id,
                        customerLastName: lastName,
                        customerFirstName: firstName,
                        country: c.country,
                        phone: c.phone,
                        email: c.email,
                        marketingAgree: c.marketingAgree === 'Y',
                        deliveryAddressId: p.receptionType === 'HOME'
                          ? (addrs.find(a => a.isDefault)?.id ?? '')
                          : '',
                        newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '', newAddressCity: '',
                      }))
                    }}
                    onNotFound={q => {
                      setIsNewCustomer(true)
                      setIsFromDotCom(true)
                      setCustomerAddresses([])
                      resetAddressEditor()
                      const isEmail = q.includes('@')
                      setForm(p => ({
                        ...p,
                        customerId: '',
                        phone: isEmail ? '' : q,
                        email: isEmail ? q : '',
                        customerLastName: '', customerFirstName: '',
                        country: defaultCountryForBranch(p.branchCode), marketingAgree: false,
                        receptionType: '', deliveryAddressId: '',
                        pickupStoreCode: '', pickupStoreName: '',
                        newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '', newAddressCity: '',
                      }))
                    }}
                    onClear={resetCustomerFields}
                  />
                </dd>
                {/* 고객 관리에 등록된 회원 기준으로 검색. 검색되지 않는 경우 gentlemonster.com에서 회원 조회 후 등록해주세요. */}
              </div>
              <div>
                <FieldLabel>이름</FieldLabel>
                <dd className="grid grid-cols-2 gap-2">
                  <input type="text"
                    readOnly={!isNewCustomer}
                    value={form.customerLastName}
                    onChange={e => set('customerLastName', e.target.value)}
                    placeholder="성 (Last Name)"
                    className={isNewCustomer ? inputCls : `${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                  <input type="text"
                    readOnly={!isNewCustomer}
                    value={form.customerFirstName}
                    onChange={e => set('customerFirstName', e.target.value)}
                    placeholder="이름 (First Name)"
                    className={isNewCustomer ? inputCls : `${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </dd>
              </div>
              <div>
                <FieldLabel>국가</FieldLabel>
                <dd>
                  <CountrySearchSelect
                    value={form.country}
                    onChange={country => setForm(p => ({ ...p, country, newAddressCity: !country || country === 'KR' ? '' : p.newAddressCity }))}
                  />
                </dd>
              </div>
              <div>
                <FieldLabel>전화번호</FieldLabel>
                <dd>
                  <input type="tel"
                    readOnly={!isNewCustomer}
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="010-0000-0000"
                    className={isNewCustomer ? inputCls : `${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </dd>
              </div>
              <div>
                <FieldLabel>이메일</FieldLabel>
                <dd>
                  <input type="email"
                    readOnly={!isNewCustomer}
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="example@email.com"
                    className={isNewCustomer ? inputCls : `${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </dd>
              </div>
              <div>
                <FieldLabel>마케팅 동의</FieldLabel>
                {/* 고객 DB 검색 고객은 기존 동의 값만 표시하고, .com 신규 고객은 저장 시 고객 DB에 신규 등록 */}
                <dd>
                  <label className={`flex items-center gap-2.5 cursor-${isFromDotCom ? 'pointer' : 'not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={form.marketingAgree}
                      disabled={!isFromDotCom}
                      onChange={e => setForm(p => ({ ...p, marketingAgree: e.target.checked }))}
                      className="w-4 h-4 rounded accent-gray-900 disabled:opacity-40"
                    />
                    <span className={`text-sm ${isFromDotCom ? 'text-gray-700' : 'text-gray-400'}`}>
                      마케팅 수신 동의
                    </span>
                    {/* .com 신규 고객일 때만 마케팅 동의 체크 가능 */}
                  </label>
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* 제품 정보 */}
          <SectionCard title="3. 제품 정보" className="order-3">
            <dl className="space-y-5">
              <div>
                <FieldLabel>제품명</FieldLabel>
                <dd>
                  <ProductSearchCombo
                    value={form.productName}
                    onChange={(name, year) => setForm(p => ({ ...p, productName: name, discontinuedYear: year }))}
                  />
                </dd>
              </div>
              <div>
                <FieldLabel>단종년도 (SAP)</FieldLabel>
                <dd>
                  <input type="text" readOnly value={form.discontinuedYear} placeholder="-"
                    className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </dd>
              </div>
            </dl>
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
