import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Search, X, UserCheck } from 'lucide-react'
import { BRANCHES, STORES, PRODUCTS, MEMBERS } from '@/lib/mock-data'
import { addPrototypeTicket, getCustomersWithOverrides, localTimestamp, upsertPrototypeCustomer } from '@/lib/prototype-storage'
import type { Customer, CustomerAddress, Ticket } from '@/lib/types'

const REPAIR_DEPARTMENTS = ['본사', '협력업체', '해외법인']
const REPAIR_DETAILS = ['부품 교체', '도금수리', '용접수리', '젠틀케어', '수리불가', '기타']

const TECHNICIANS = MEMBERS.filter(m => m.isTechnician && m.status === 'active')

// 현재 로그인한 사용자가 기술자인 경우 접수 담당자로 기본 세팅
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
  repairDepartment: string
  repairDetail: string
  memo: string
}

const COUNTRIES = [
  { code: 'KR', name: '대한민국 (Korea)' },
  { code: 'US', name: '미국 (United States)' },
  { code: 'CN', name: '중국 (China)' },
  { code: 'JP', name: '일본 (Japan)' },
  { code: 'HK', name: '홍콩 (Hong Kong)' },
  { code: 'GB', name: '영국 (United Kingdom)' },
  { code: 'FR', name: '프랑스 (France)' },
  { code: 'DE', name: '독일 (Germany)' },
  { code: 'IT', name: '이탈리아 (Italy)' },
  { code: 'AU', name: '호주 (Australia)' },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <dt className="text-[11px] font-medium text-gray-400 mb-1">{children}</dt>
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const selectInnerCls = 'w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300 cursor-pointer'
const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300 placeholder:text-gray-300'

function Select({ value, onChange, children }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={selectInnerCls}>{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

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
            ? `${selected.isDefault ? '[기본] ' : ''}${selected.address1}${selected.address2 ? ` ${selected.address2}` : ''}`
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
                    {a.isDefault ? '[기본] ' : ''}{a.address1}{a.address2 ? ` ${a.address2}` : ''}
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
            className={inputCls}
          />
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
            onClick={() => { onSelect(result); handleClear() }}
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

function buildCustomerId(form: Form) {
  if (form.customerId) return form.customerId
  const seed = (form.email || form.phone || Date.now().toString()).replace(/[^0-9a-z]/gi, '').toUpperCase()
  return `C-${seed}`
}

function shippingMethodLabel(form: Form) {
  if (form.receptionType === 'STORE') return '자체수령'
  if (form.receptionType === 'HOME' && form.branchCode === 'C1002') return '해외택배(DHL)'
  if (form.receptionType === 'HOME') return '택배(HQ)'
  return '-'
}

export function TicketNewPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const location = useLocation()
  const initBranch: string = (location.state as { branchCode?: string })?.branchCode || BRANCHES[0]?.code || ''

  const [form, setForm] = useState<Form>({
    branchCode: initBranch,
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
    repairDepartment: REPAIR_DEPARTMENTS[0],
    repairDetail: REPAIR_DETAILS[0],
    memo: '',
  })

  // isFromDotCom: 신규 고객(미조회) 시 마케팅 동의 체크박스 활성화
  const [isFromDotCom, setIsFromDotCom] = useState(false)
  // isNewCustomer: 고객 조회 결과 없음 → 신규 등록 모드
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([])
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomersWithOverrides())

  function set(key: keyof Form, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const branchStores = STORES.filter(s => s.branchCode === form.branchCode)

  function resetCustomerFields() {
    setIsNewCustomer(false)
    setIsFromDotCom(false)
    setCustomerAddresses([])
    setForm(p => ({
      ...p,
      customerId: '',
      customerLastName: '', customerFirstName: '',
      country: '', phone: '', email: '',
      marketingAgree: false,
      receptionType: '', deliveryAddressId: '',
      pickupStoreCode: '', pickupStoreName: '',
      newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '',
    }))
  }

  function handleSave() {
    const customerName = formatCustomerName(form)
    const customerId = buildCustomerId(form)
    const addresses = [...customerAddresses]

    if (isNewCustomer && form.receptionType === 'HOME' && form.newAddressLine1.trim()) {
      addresses.push({
        id: `addr-${Date.now()}`,
        isDefault: addresses.length === 0,
        address1: form.newAddressLine1.trim(),
        address2: form.newAddressLine2.trim() || undefined,
        zipCode: form.newAddressZipCode.trim() || undefined,
        country: form.country || defaultCountryForBranch(form.branchCode),
      })
    }

    if (isNewCustomer && (form.phone || form.email || customerName)) {
      upsertPrototypeCustomer({
        id: customerId,
        name: customerName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country || defaultCountryForBranch(form.branchCode),
        branchCode: form.branchCode,
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
      branchCode: form.branchCode,
      receivedAt: localTimestamp(),
      status: 'RECEIVED',
      hqReceivedAt: null,
      expectedShipAt: null,
      receptionPlace: form.receptionStoreName || BRANCHES.find(branch => branch.code === form.branchCode)?.name || '-',
      customerName: customerName || '-',
      phone: form.phone.trim(),
      email: form.email.trim(),
      productName: form.productName || '-',
      repairDepartment: form.repairDepartment,
      repairDetail: form.repairDetail,
      trackingNo: null,
      paymentCompleted: 'N',
      paymentDate: null,
      reexportCondition: 'N',
      shippingMethod: shippingMethodLabel(form),
      shippedAt: null,
      soDocumentNo: null,
    }

    addPrototypeTicket(ticket)
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
              <div className="relative">
                <select
                  value={form.branchCode}
                  onChange={e => setForm(p => ({ ...p, branchCode: e.target.value, receptionStoreCode: '', receptionStoreName: '' }))}
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer hover:border-gray-300 transition-colors"
                >
                  {BRANCHES.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />등록
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">

          {/* 접수 정보 */}
          <SectionCard title="접수 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>접수처</FieldLabel>
                <dd>
                  <StoreSearchSelect
                    stores={branchStores}
                    value={form.receptionStoreCode}
                    onChange={(code, name) => setForm(p => ({ ...p, receptionStoreCode: code, receptionStoreName: name }))}
                  />
                </dd>
              </div>
              <div>
                <FieldLabel>접수 담당자</FieldLabel>
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
                          const defaultId = type === 'HOME' ? (customerAddresses.find(a => a.isDefault)?.id ?? '') : ''
                          setForm(p => ({ ...p, receptionType: type, deliveryAddressId: defaultId, pickupStoreCode: '', pickupStoreName: '' }))
                        }}
                        className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                          !form.phone
                            ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                            : form.receptionType === type
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type === 'HOME' ? '자택수령' : '매장수령'}
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
                        </div>
                      )
                      : customerAddresses.length === 0
                        ? <p className="text-xs text-gray-400 px-1">등록된 주소가 없습니다. 고객 상세에서 추가해 주세요.</p>
                        : <AddressSelect addresses={customerAddresses} value={form.deliveryAddressId} onChange={id => set('deliveryAddressId', id)} />
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
          <SectionCard title="고객 정보">
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
                        newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '',
                      }))
                    }}
                    onNotFound={q => {
                      setIsNewCustomer(true)
                      setIsFromDotCom(true)
                      setCustomerAddresses([])
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
                        newAddressLine1: '', newAddressLine2: '', newAddressZipCode: '',
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
                  <CountrySearchSelect value={form.country} onChange={v => set('country', v)} />
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
          <SectionCard title="제품 정보">
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

          {/* 수리 정보 */}
          <SectionCard title="수리 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>수리 부서</FieldLabel>
                <dd>
                  <Select value={form.repairDepartment} onChange={e => set('repairDepartment', e.target.value)}>
                    {REPAIR_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </dd>
              </div>
              <div>
                <FieldLabel>수리 내용</FieldLabel>
                <dd>
                  <Select value={form.repairDetail} onChange={e => set('repairDetail', e.target.value)}>
                    {REPAIR_DETAILS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </dd>
              </div>
              <div>
                <FieldLabel>메모</FieldLabel>
                <dd>
                  <textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={3} placeholder="요청사항 또는 특이사항" className={`${inputCls} resize-none`} />
                </dd>
              </div>
            </dl>
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
