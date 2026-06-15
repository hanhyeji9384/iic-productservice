import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Check, ChevronDown, Globe, Building2, Mail, Calendar, Clock, User } from 'lucide-react'
import { ROLES } from '@/lib/mock-data'
import { OPTICAL_STORES, HQ_ROLES, FRANCHISE_ROLES, getBranchName, BranchMultiSelect, StoreMultiSelect } from '@/components/members/branch-store-select'
import { useMembers } from '@/lib/members-context'
import { formatDateTime, formatDate, inputCls } from '@/lib/utils'
import type { Member } from '@/lib/types'

type EditForm = {
  name: string
  email: string
  isTechnician: boolean
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
    isTechnician: !!m.isTechnician,
    roleId: m.roleId,
    status: m.status,
    expiresAt: m.expiresAt ?? '',
    managedBranches: m.managedBranches ?? [],
    assignedStores: m.assignedStores ?? [],
  }
}

export function MemberDetailPage() {
  const { id, langCode } = useParams<{ id: string; langCode: string }>()
  const pfx = `/${langCode}`
  const navigate = useNavigate()

  const { members, updateMember, deleteMember } = useMembers()
  const member = members.find(m => m.id === id)
  const isStoreOwnerRole = (roleId: string) => FRANCHISE_ROLES.includes(roleId)

  const [form, setForm] = useState<EditForm>({
    name: '', email: '', isTechnician: false, roleId: '', status: 'active',
    expiresAt: '', managedBranches: [], assignedStores: [],
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (member) setForm(formFromMember(member))
  }, [member])

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-sm text-gray-400">존재하지 않는 회원입니다.</p>
        <button onClick={() => navigate(`${pfx}/members`)} className="text-sm text-gray-600 underline">목록으로 돌아가기</button>
      </div>
    )
  }

  function handleSave() {
    updateMember({
      ...member!,
      name: form.name,
      email: form.email,
      isTechnician: form.isTechnician,
      roleId: form.roleId,
      status: form.status,
      expiresAt: form.expiresAt || null,
      managedBranches: form.managedBranches,
      assignedStores: form.assignedStores,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDelete() {
    deleteMember(member!.id)
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
                      managedBranches: HQ_ROLES.includes(r) ? ['*'] : isStoreOwnerRole(r) ? ['1110'] : f.managedBranches,
                      assignedStores: (HQ_ROLES.includes(r) || isStoreOwnerRole(r)) ? [] : f.assignedStores,
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
              <p className="text-xs text-gray-400 mb-1.5">서비스 기술자</p>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isTechnician: !f.isTechnician }))}
                className="flex items-center gap-2.5 mt-1"
              >
                <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${form.isTechnician ? 'bg-gray-900' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${form.isTechnician ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>
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
                <p className="text-xs text-gray-400">생성 일시</p>
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

          {isStoreOwnerRole(form.roleId) ? (
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
