import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Shield, Check, ChevronDown, Globe, Building2, Mail, Calendar, Clock, Briefcase, User } from 'lucide-react'
import { MEMBERS as INITIAL_MEMBERS, ROLES, BRANCHES, STORES, DEPARTMENTS } from '@/lib/mock-data'
import type { Member } from '@/lib/types'

const HQ_ROLES = ['SUPER_ADMIN', 'HQ_OPS', 'HQ_RECEIVE']
const FRANCHISE_ROLE = 'FRANCHISE_OWNER'
const OPTICAL_STORES = STORES.filter(s => s.storeGroup === 140)

function getRoleName(roleId: string) {
  return ROLES.find(r => r.id === roleId)?.name ?? roleId
}

function getBranchName(code: string) {
  return BRANCHES.find(b => b.code === code)?.name ?? code
}

function getStoreName(code: string) {
  return STORES.find(s => s.code === code)?.name ?? code
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return iso.slice(0, 10)
}

function BranchMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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

function StoreMultiSelect({ value, onChange, branchCodes }: { value: string[]; onChange: (v: string[]) => void; branchCodes: string[] }) {
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

type EditForm = {
  name: string
  email: string
  department: string
  roleId: string
  status: 'active' | 'inactive'
  expiresAt: string
  managedBranches: string[]
  assignedStores: string[]
}

function formFromMember(m: Member): EditForm {
  return {
    name: m.name,
    email: m.email,
    department: m.department ?? '',
    roleId: m.roleId,
    status: m.status,
    expiresAt: m.expiresAt ?? '',
    managedBranches: m.managedBranches ?? [],
    assignedStores: m.assignedStores ?? [],
  }
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300'

export function MemberDetailPage() {
  const { id, countryCode, langCode } = useParams<{ id: string; countryCode: string; langCode: string }>()
  const pfx = `/${countryCode}/${langCode}`
  const navigate = useNavigate()

  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [form, setForm] = useState<EditForm>({
    name: '', email: '', department: '', roleId: '', status: 'active',
    expiresAt: '', managedBranches: [], assignedStores: [],
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  const member = members.find(m => m.id === id)

  useEffect(() => {
    if (member) setForm(formFromMember(member))
  }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-sm text-gray-400">존재하지 않는 회원입니다.</p>
        <button onClick={() => navigate(`${pfx}/members`)} className="text-sm text-gray-600 underline">목록으로 돌아가기</button>
      </div>
    )
  }

  function handleSave() {
    setMembers(prev => prev.map(m => m.id === id ? {
      ...m,
      name: form.name,
      email: form.email,
      department: form.department || undefined,
      roleId: form.roleId,
      status: form.status,
      expiresAt: form.expiresAt || null,
      managedBranches: form.managedBranches,
      assignedStores: form.assignedStores,
    } : m))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDelete() {
    setMembers(prev => prev.filter(m => m.id !== id))
    navigate(`${pfx}/members`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* 상단 네비 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm text-gray-400">회원 관리</span>
        <span className="text-sm text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{member.name}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />삭제
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-colors text-sm font-medium ${
              saved ? 'bg-emerald-600 text-white' : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            <Check className="w-4 h-4" />
            {saved ? '저장됨' : '수정'}
          </button>
        </div>
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-6">

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">기본 정보</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">이름</p>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">로그인 ID</p>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-500">{member.loginId}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">역할</p>
              <div className="relative">
                <select
                  value={form.roleId}
                  onChange={e => {
                    const r = e.target.value
                    setForm(f => ({
                      ...f, roleId: r,
                      managedBranches: HQ_ROLES.includes(r) ? ['*'] : r === FRANCHISE_ROLE ? ['1110'] : f.managedBranches,
                      assignedStores: (HQ_ROLES.includes(r) || r === FRANCHISE_ROLE) ? [] : f.assignedStores,
                    }))
                  }}
                  className={inputCls + ' appearance-none pr-8 cursor-pointer'}
                >
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">상태</p>
              <div className="relative">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))} className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">이메일</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">부서</p>
              <div className="relative">
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                  <option value="">미지정</option>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">계정 만료일</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400">가입일</p>
              </div>
              <p className="text-sm text-gray-600">{formatDate(member.createdAt)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400">마지막 로그인</p>
              </div>
              <p className="text-sm font-mono text-gray-600">{formatDateTime(member.lastLoginAt)}{member.lastLoginAt ? ' (KST)' : ''}</p>
            </div>
          </div>
        </div>

        {/* 담당 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">담당 정보</h2>

          {form.roleId === FRANCHISE_ROLE ? (
            <>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">법인</p>
                </div>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                  {form.managedBranches[0] ? getBranchName(form.managedBranches[0]) : '—'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">담당 매장</p>
                </div>
                <div className="relative">
                  <select
                    value={form.assignedStores[0] ?? ''}
                    onChange={e => {
                      const code = e.target.value
                      const store = OPTICAL_STORES.find(s => s.code === code)
                      setForm(f => ({
                        ...f,
                        assignedStores: code ? [code] : [],
                        managedBranches: store ? [store.branchCode] : [],
                      }))
                    }}
                    className="w-full appearance-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="">매장 선택</option>
                    {OPTICAL_STORES.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">담당 법인</p>
                </div>
                <BranchMultiSelect
                  value={form.managedBranches}
                  onChange={v => setForm(f => ({ ...f, managedBranches: v }))}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">담당 스토어</p>
                </div>
                <StoreMultiSelect
                  value={form.assignedStores}
                  onChange={v => setForm(f => ({ ...f, assignedStores: v }))}
                  branchCodes={form.managedBranches}
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">회원 삭제</h3>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{member.name}</span>({member.loginId}) 계정을 삭제하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">취소</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
