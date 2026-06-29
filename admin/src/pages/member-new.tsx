import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Globe, Building2 } from 'lucide-react'
import { ROLES } from '@/lib/mock-data'
import { OPTICAL_STORES, HQ_ROLES, FRANCHISE_ROLES, getBranchName, BranchMultiSelect, StoreMultiSelect } from '@/components/members/branch-store-select'
import { useMembers } from '@/lib/members-context'
import { cn, inputCls } from '@/lib/utils'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'

type NewForm = {
  name: string
  loginId: string
  email: string
  tel: string
  isTechnician: boolean
  roleId: string
  status: 'active' | 'inactive'
  expiresAt: string
  managedBranches: string[]
  assignedStores: string[]
}

function localTimestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function MemberNewPage() {
  const navigate = useNavigate()
  const i18nLabel = useI18nLabel()
  const { langCode } = useParams()
  const pfx = `/${langCode}`
  const { members, addMember } = useMembers()

  const defaultRoleId = ROLES[0]?.id ?? ''
  const isStoreOwnerRole = (roleId: string) => FRANCHISE_ROLES.includes(roleId)
  const [form, setForm] = useState<NewForm>({
    name: '', loginId: '', email: '', tel: '',
    isTechnician: false, roleId: defaultRoleId, status: 'active', expiresAt: '',
    managedBranches: HQ_ROLES.includes(defaultRoleId) ? ['*'] : [],
    assignedStores: [],
  })
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [toast, setToast] = useState<{ title: string; titleKey: string; message: string; messageKey: string } | null>(null)

  const normalizedLoginId = form.loginId.trim().toLowerCase()
  const normalizedEmail = form.email.trim().toLowerCase()
  const isDuplicateLoginId = Boolean(normalizedLoginId) && members.some(member =>
    member.loginId.trim().toLowerCase() === normalizedLoginId
  )
  const isDuplicateEmail = Boolean(normalizedEmail) && members.some(member =>
    member.email.trim().toLowerCase() === normalizedEmail
  )
  const nameError = attemptedSave && !form.name.trim() ? '이름을 입력해주세요.' : ''
  const loginIdError = isDuplicateLoginId
    ? '이미 등록된 로그인 ID입니다.'
    : attemptedSave && !normalizedLoginId
      ? '로그인 ID를 입력해주세요.'
      : ''
  const emailError = isDuplicateEmail
    ? '이미 등록된 이메일입니다.'
    : attemptedSave && !normalizedEmail
      ? '이메일을 입력해주세요.'
      : ''

  function handleSave() {
    setAttemptedSave(true)
    if (nameError || loginIdError || emailError || !form.name.trim() || !normalizedLoginId || !normalizedEmail) return

    addMember({
      id: String(Date.now()),
      loginId: form.loginId.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      tel: form.tel.trim() || undefined,
      country: 'KR',
      roleId: form.roleId,
      isTechnician: form.isTechnician,
      status: form.status,
      expiresAt: form.expiresAt || null,
      createdAt: localTimestamp(),
      lastLoginAt: null,
      managedBranches: form.managedBranches,
      assignedStores: form.assignedStores,
    })
    setToast({
      title: '저장 완료',
      titleKey: 'common.toast.saved.title',
      message: '저장이 완료되었습니다.',
      messageKey: 'common.toast.saved.description',
    })
    window.setTimeout(() => navigate(`${pfx}/members`), 700)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* 상단 네비 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm text-gray-400">
          <I18nText i18nKey="nav.system_management.members" display="tooltip">
            회원 관리
          </I18nText>
        </span>
        <span className="text-sm text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">
          <I18nText i18nKey="members.create.title" display="tooltip">
            회원 등록
          </I18nText>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`${pfx}/members`)}
            className="px-5 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <I18nText i18nKey="common.button.cancel" display="tooltip">
              취소
            </I18nText>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            <I18nText i18nKey="common.label.saved" display="tooltip">
              저장
            </I18nText>
          </button>
        </div>
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-6">

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            <I18nText i18nKey="members.section.basic" display="tooltip">
              기본 정보
            </I18nText>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                <I18nText i18nKey="common.label.name" display="tooltip">
                  이름
                </I18nText>
                <span className="text-red-400"> *</span>
              </p>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={cn(inputCls, nameError && 'border-red-300 bg-red-50 focus:border-red-400')}
                placeholder={i18nLabel('members.placeholder.name', '홍길동')}
              />
              {nameError && <p className="mt-1 text-[11px] text-red-500">{nameError}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">ID <span className="text-red-400">*</span></p>
              <input
                value={form.loginId}
                onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                className={cn(inputCls, loginIdError && 'border-red-300 bg-red-50 focus:border-red-400')}
                placeholder={i18nLabel('members.placeholder.login_id', 'monster001')}
              />
              {loginIdError && <p className="mt-1 text-[11px] text-red-500">{loginIdError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                <I18nText i18nKey="common.label.role" display="tooltip">
                  역할
                </I18nText>
                <span className="text-red-400"> *</span>
              </p>
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
              <p className="text-xs text-gray-400 mb-1.5">
                <I18nText i18nKey="common.label.status" display="tooltip">
                  상태
                </I18nText>
              </p>
              <div className="relative">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))} className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                  <option value="active">{i18nLabel('common.label.active', '활성')}</option>
                  <option value="inactive">{i18nLabel('common.label.inactive', '비활성')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">email <span className="text-red-400">*</span></p>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={cn(inputCls, emailError && 'border-red-300 bg-red-50 focus:border-red-400')}
              placeholder={i18nLabel('members.placeholder.email', 'name@gentlemonster.com')}
            />
            {emailError && <p className="mt-1 text-[11px] text-red-500">{emailError}</p>}
          </div>

          <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-500">
            <I18nText i18nKey="members.create.password_notice">
              등록 완료 시 비밀번호 설정 링크가 이메일로 발송됩니다.
            </I18nText>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                <I18nText i18nKey="common.label.service_technician" display="tooltip">
                  서비스 기술자
                </I18nText>
              </p>
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
              <p className="text-xs text-gray-400 mb-1.5">
                <I18nText i18nKey="common.label.account_expires_at" display="tooltip">
                  계정 만료일
                </I18nText>
              </p>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
              <p className="mt-1 text-[11px] text-gray-400">
                <I18nText i18nKey="members.create.expires_hint">
                  비워두면 무기한 적용됩니다.
                </I18nText>
              </p>
            </div>
          </div>
        </div>

        {/* 담당 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            <I18nText i18nKey="members.section.assignment" display="tooltip">
              담당 정보
            </I18nText>
          </h2>

          {isStoreOwnerRole(form.roleId) ? (
            <>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">
                    <I18nText i18nKey="common.label.branch" display="tooltip">
                      법인
                    </I18nText>
                  </p>
                </div>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                  {form.managedBranches[0] ? getBranchName(form.managedBranches[0]) : '—'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">
                    <I18nText i18nKey="common.label.assigned_store" display="tooltip">
                      담당 매장
                    </I18nText>
                    <span className="text-red-400"> *</span>
                  </p>
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
                  <p className="text-xs text-gray-400">
                    <I18nText i18nKey="common.label.assigned_branch" display="tooltip">
                      담당 법인
                    </I18nText>
                    <span className="text-red-400"> *</span>
                  </p>
                </div>
                <BranchMultiSelect
                  value={form.managedBranches}
                  onChange={v => setForm(f => ({ ...f, managedBranches: v }))}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">
                    <I18nText i18nKey="common.label.assigned_store" display="tooltip">
                      담당 스토어
                    </I18nText>
                  </p>
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3 text-white shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
          <p className="text-sm font-semibold">
            <I18nText i18nKey={toast.titleKey}>{toast.title}</I18nText>
          </p>
          <p className="mt-0.5 text-xs text-white/75">
            <I18nText i18nKey={toast.messageKey}>{toast.message}</I18nText>
          </p>
        </div>
      )}
    </div>
  )
}
