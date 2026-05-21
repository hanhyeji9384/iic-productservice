import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { BRANCHES, STORES } from '@/lib/mock-data'

export const HQ_ROLES = ['SUPER_ADMIN', 'HQ_OPS', 'HQ_RECEIVE']
export const FRANCHISE_ROLE = 'FRANCHISE_OWNER'
export const OPTICAL_STORES = STORES.filter(s => s.storeGroup === 140)

export function getBranchName(code: string) {
  return BRANCHES.find(b => b.code === code)?.name ?? code
}

export function getStoreName(code: string) {
  return STORES.find(s => s.code === code)?.name ?? code
}

export function BranchMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isAll = value.includes('*')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleAll() { onChange(isAll ? [] : ['*']) }
  function toggleBranch(code: string) {
    if (isAll) return
    onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code])
  }

  const label = isAll ? '전체' : value.length === 0 ? '법인 선택' : value.map(getBranchName).join(', ')

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400 transition-colors text-left hover:border-gray-300"
      >
        <span className={value.length === 0 && !isAll ? 'text-gray-400' : 'text-gray-900 truncate pr-2'}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <label className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <input type="checkbox" checked={isAll} onChange={toggleAll} className="w-4 h-4 rounded accent-gray-900" />
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-500" />전체
            </span>
          </label>
          <div className="max-h-48 overflow-y-auto">
            {BRANCHES.map(b => (
              <label key={b.code} className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer ${isAll ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={value.includes(b.code)} onChange={() => toggleBranch(b.code)} disabled={isAll} className="w-4 h-4 rounded accent-gray-900" />
                <span className="text-sm text-gray-700"><span className="font-bold text-gray-500 mr-1.5">{b.code}</span>{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StoreMultiSelect({ value, onChange, branchCodes }: { value: string[]; onChange: (v: string[]) => void; branchCodes: string[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const grouped = useMemo(() => {
    const filteredStores = branchCodes.includes('*') || branchCodes.length === 0
      ? STORES
      : STORES.filter(s => branchCodes.includes(s.branchCode))
    const map = new Map<string, typeof STORES>()
    for (const s of filteredStores) {
      if (!map.has(s.branchCode)) map.set(s.branchCode, [])
      map.get(s.branchCode)!.push(s)
    }
    return map
  }, [branchCodes])

  const totalStores = useMemo(() => [...grouped.values()].flat(), [grouped])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code])
  }

  const label = value.length === 0 ? '스토어 선택' : value.map(getStoreName).join(', ')

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400 transition-colors text-left hover:border-gray-300"
      >
        <span className={value.length === 0 ? 'text-gray-400 truncate pr-2' : 'text-gray-900 truncate pr-2'}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          {totalStores.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">법인을 먼저 선택해 주세요</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {[...grouped.entries()].map(([branchCode, stores]) => (
                <div key={branchCode}>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {getBranchName(branchCode)}
                    </span>
                  </div>
                  {stores.map(s => (
                    <label key={s.code} className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={value.includes(s.code)} onChange={() => toggle(s.code)} className="w-4 h-4 rounded accent-gray-900" />
                      <span className="text-sm text-gray-700">
                        <span className="font-bold text-gray-500 mr-1.5">{s.code}</span>{s.name}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
