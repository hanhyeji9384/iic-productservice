import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Globe, Building2 } from 'lucide-react'
import { ROLES, DEPARTMENTS } from '@/lib/mock-data'
import { OPTICAL_STORES, HQ_ROLES, FRANCHISE_ROLE, getBranchName, BranchMultiSelect, StoreMultiSelect } from '@/components/members/branch-store-select'
import { useMembers } from '@/lib/members-context'
import { inputCls } from '@/lib/utils'

type NewForm = {
  name: string
  loginId: string
  email: string
  password: string
  tel: string
  department: string
  roleId: string
  status: 'active' | 'inactive'
  expiresAt: string
  managedBranches: string[]
  assignedStores: string[]
}

export function MemberNewPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const { addMember } = useMembers()

  const defaultRoleId = ROLES[0]?.id ?? ''
  const [form, setForm] = useState<NewForm>({
    name: '', loginId: '', email: '', password: '', tel: '',
    department: '', roleId: defaultRoleId, status: 'active', expiresAt: '',
    managedBranches: HQ_ROLES.includes(defaultRoleId) ? ['*'] : [],
    assignedStores: [],
  })

  function handleSave() {
    addMember({
      id: String(Date.now()),
      loginId: form.loginId,
      name: form.name,
      email: form.email,
      tel: form.tel || undefined,
      country: 'KR',
      roleId: form.roleId,
      department: form.department || undefined,
      status: form.status,
      expiresAt: form.expiresAt || null,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: null,
      managedBranches: form.managedBranches,
      assignedStores: form.assignedStores,
    })
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
        <span className="text-sm text-gray-700 font-medium">회원 등록</span>
        <div className="ml-auto">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            등록
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
              <p className="text-xs text-gray-400 mb-1.5">이름 <span className="text-red-400">*</span></p>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="홍길동" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">로그인 ID <span className="text-red-400">*</span></p>
              <input value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))} className={inputCls} placeholder="monster001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">역할 <span className="text-red-400">*</span></p>
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
            <p className="text-xs text-gray-400 mb-1.5">이메일 <span className="text-red-400">*</span></p>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="name@gentlemonster.com" />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">초기 비밀번호 <span className="text-red-400">*</span></p>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="8자 이상, 특수문자 포함" />
            <p className="mt-1 text-[11px] text-gray-400">최초 로그인 시 비밀번호 변경을 권장합니다.</p>
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
              <p className="text-xs text-gray-400 mb-1.5">연락처</p>
              <input value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} className={inputCls} placeholder="010-0000-0000" />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">계정 만료일</p>
            <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
            <p className="mt-1 text-[11px] text-gray-400">비워두면 무기한 적용됩니다.</p>
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
                  <p className="text-xs text-gray-400">담당 매장 <span className="text-red-400">*</span></p>
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
                    className={inputCls + ' appearance-none pr-8 cursor-pointer'}
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
                  <p className="text-xs text-gray-400">담당 법인 <span className="text-red-400">*</span></p>
                </div>
                <BranchMultiSelect
                  value={form.managedBranches}
                  onChange={v => setForm(f => ({ ...f, managedBranches: v }))}
                />
                <p className="mt-1 text-[11px] text-gray-400">HQ 역할은 기본으로 전체가 설정됩니다.</p>
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
                <p className="mt-1 text-[11px] text-gray-400">담당 법인에 속한 스토어만 표시됩니다.</p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
