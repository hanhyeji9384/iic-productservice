import React, { useState } from 'react'
import {
  Shield, Plus, Edit, Trash2, X, Save,
  Users, Clock, Check, Minus, ChevronRight,
} from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import {
  PERMISSION_MENUS, PARENT_LABELS,
  INITIAL_ROLES, INITIAL_CHANGE_LOGS,
  type PermissionRole, type PermissionEntry, type PermissionChangeLog,
} from '@/lib/permissions-data'

type Tab = 'roles' | 'history'

const ITEMS_PER_PAGE = 10

const CHANGE_TYPE_STYLE = {
  update: { bg: 'bg-blue-50 text-blue-700',  label: '수정' },
  delete: { bg: 'bg-red-50 text-red-700',    label: '삭제' },
  create: { bg: 'bg-gray-100 text-gray-500', label: '생성' },
}

const CURRENT_ADMIN = {
  name: '한혜지',
  id: 'monster563',
}

function emptyPerms(): PermissionEntry[] {
  return PERMISSION_MENUS.map(m => ({ menuId: m.id, read: false, write: false, delete: false }))
}

function buildPermDiff(oldPerms: PermissionEntry[], newPerms: PermissionEntry[]): string {
  const FIELD_LABELS: Record<string, string> = { read: '조회', write: '등록·수정', delete: '삭제' }
  const diffs: string[] = []
  for (const newP of newPerms) {
    const oldP = oldPerms.find(p => p.menuId === newP.menuId)
    if (!oldP) continue
    const label = PERMISSION_MENUS.find(m => m.id === newP.menuId)?.label ?? newP.menuId
    const added: string[] = []
    const removed: string[] = []
    for (const field of ['read', 'write', 'delete'] as const) {
      if (!oldP[field] && newP[field]) added.push(FIELD_LABELS[field])
      if (oldP[field] && !newP[field]) removed.push(FIELD_LABELS[field])
    }
    if (added.length > 0) diffs.push(`${label} ${added.join('·')} 추가`)
    if (removed.length > 0) diffs.push(`${label} ${removed.join('·')} 제거`)
  }
  return diffs.join(' / ')
}

function nowString() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function RolesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('roles')
  const [roles, setRoles] = useState<PermissionRole[]>(INITIAL_ROLES)
  const [logs, setLogs] = useState<PermissionChangeLog[]>(INITIAL_CHANGE_LOGS)
  const [rolesPage, setRolesPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  // 편집 모달
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<PermissionRole | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPerms, setFormPerms] = useState<PermissionEntry[]>([])
  const [formMemo, setFormMemo] = useState('')
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set(PARENT_LABELS))

  function openModal(role?: PermissionRole) {
    if (role) {
      setEditingRole(role)
      setFormName(role.name)
      setFormDesc(role.description)
      setFormPerms(JSON.parse(JSON.stringify(role.permissions)))
    } else {
      setEditingRole(null)
      setFormName('')
      setFormDesc('')
      setFormPerms(emptyPerms())
    }
    setFormMemo('')
    setExpandedParents(new Set(PARENT_LABELS))
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditingRole(null) }

  function togglePerm(menuId: string, field: 'read' | 'write' | 'delete') {
    setFormPerms(prev => prev.map(p => {
      if (p.menuId !== menuId) return p
      const next = { ...p, [field]: !p[field] }
      if (field !== 'read' && next[field]) next.read = true
      if (field === 'read' && !next.read) { next.write = false; next.delete = false }
      return next
    }))
  }

  type PermField = 'read' | 'write' | 'delete'

  function getParentState(parentLabel: string, field: PermField): 'all' | 'some' | 'none' {
    const ids = PERMISSION_MENUS.filter(m => m.parentLabel === parentLabel).map(m => m.id)
    const checked = ids.filter(id => formPerms.find(p => p.menuId === id)?.[field])
    if (checked.length === ids.length) return 'all'
    if (checked.length > 0) return 'some'
    return 'none'
  }

  function toggleParent(parentLabel: string, field: PermField) {
    const ids = PERMISSION_MENUS.filter(m => m.parentLabel === parentLabel).map(m => m.id)
    const allChecked = ids.every(id => formPerms.find(p => p.menuId === id)?.[field])
    setFormPerms(prev => prev.map(p => {
      if (!ids.includes(p.menuId)) return p
      const next = { ...p, [field]: !allChecked }
      if (field !== 'read' && next[field]) next.read = true
      if (field === 'read' && !next.read) { next.write = false; next.delete = false }
      return next
    }))
  }

  function toggleAll(value: boolean) {
    setFormPerms(prev => prev.map(p => ({ ...p, read: value, write: value, delete: value })))
  }

  function handleSave() {
    if (!formName.trim()) { alert('역할 이름을 입력해주세요.'); return }
    const now = nowString()
    if (editingRole) {
      setRoles(prev => prev.map(r => r.id === editingRole.id
        ? { ...r, name: formName, description: formDesc, permissions: formPerms, updatedAt: now }
        : r
      ))
      const metaDiffs: string[] = []
      if (editingRole.name !== formName)
        metaDiffs.push(`역할명: "${editingRole.name}" → "${formName}"`)
      if (editingRole.description !== formDesc)
        metaDiffs.push(`설명: "${editingRole.description || '(없음)'}" → "${formDesc || '(없음)'}"`)
      const permDiff = buildPermDiff(editingRole.permissions, formPerms)
      if (permDiff) metaDiffs.push(permDiff)
      const autoSummary = metaDiffs.length > 0 ? metaDiffs.join(' / ') : '변경 없음'
      setLogs(prev => [{
        id: Math.max(0, ...prev.map(l => l.id)) + 1,
        roleId: editingRole.id, roleName: formName,
        changedAt: now, changeType: 'update',
        summary: autoSummary,
        changedByName: CURRENT_ADMIN.name, changedById: CURRENT_ADMIN.id, memo: formMemo,
      }, ...prev])
    } else {
      const newRole: PermissionRole = {
        id: Math.max(...roles.map(r => r.id)) + 1,
        name: formName, description: formDesc, permissions: formPerms,
        memberCount: 0, createdAt: now, updatedAt: now,
      }
      setRoles(prev => [...prev, newRole])
      setLogs(prev => [{
        id: Math.max(0, ...prev.map(l => l.id)) + 1,
        roleId: newRole.id, roleName: newRole.name,
        changedAt: now, changeType: 'create',
        summary: '권한등록',
        changedByName: CURRENT_ADMIN.name, changedById: CURRENT_ADMIN.id, memo: formMemo,
      }, ...prev])
    }
    closeModal()
  }

  function handleDelete(role: PermissionRole) {
    if (!confirm(`"${role.name}" 역할을 삭제하시겠습니까?`)) return
    setRoles(prev => prev.filter(r => r.id !== role.id))
    setLogs(prev => [{
      id: Math.max(0, ...prev.map(l => l.id)) + 1,
      roleId: role.id, roleName: role.name,
      changedAt: nowString(), changeType: 'delete',
      summary: `${role.name} 역할 삭제`,
      changedByName: CURRENT_ADMIN.name, changedById: CURRENT_ADMIN.id,
    }, ...prev])
  }

  const paginatedRoles = roles.slice((rolesPage - 1) * ITEMS_PER_PAGE, rolesPage * ITEMS_PER_PAGE)
  const filteredLogs = logs
  const paginatedLogs = filteredLogs.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)
  const isReadOnly = !!editingRole && editingRole.id === 0

  const TABS: { key: Tab; label: string; Icon: typeof Shield }[] = [
    { key: 'roles',   label: '권한 역할', Icon: Shield },
    { key: 'history', label: '변경 이력', Icon: Clock  },
  ]

  const PERM_FIELDS: { field: PermField; label: string }[] = [
    { field: 'read',   label: '조회' },
    { field: 'write',  label: '등록·수정' },
    { field: 'delete', label: '삭제' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">권한 관리</h1>
          <p className="text-sm text-gray-500 mt-1">메뉴별 CRUD 권한을 역할 단위로 관리합니다.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          역할 추가
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── 탭 1: 역할 목록 ── */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['역할', '설명', '회원 수', '최종 수정', '작업'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRoles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{role.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{role.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{role.memberCount}명</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{role.updatedAt} <span className="text-gray-400">(KST)</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openModal(role)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        {role.id !== 0 && (
                          <button onClick={() => handleDelete(role)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={roles.length} perPage={ITEMS_PER_PAGE} current={rolesPage} onChange={setRolesPage} />
        </div>
      )}

      {/* ── 탭 2: 변경 이력 ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['처리 일시', '유형', '대상 역할', '변경 내용', '처리자'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">변경 이력이 없습니다.</td></tr>
                ) : paginatedLogs.map(log => {
                  const style = CHANGE_TYPE_STYLE[log.changeType]
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.changedAt} <span className="text-gray-400">(KST)</span></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg}`}>{style.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{log.roleName}</td>
                      <td className="px-6 py-4">
                        <SummaryCell summary={log.summary} changeType={log.changeType === 'delete' ? undefined : log.changeType} />
                        {log.memo && <div className="text-xs text-gray-400 mt-1.5">사유: {log.memo}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{log.changedById}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredLogs.length} perPage={ITEMS_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
        </div>
      )}

      {/* ── 역할 편집 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* 모달 헤더 */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isReadOnly ? '권한 역할 조회' : editingRole ? '권한 역할 수정' : '권한 역할 추가'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isReadOnly ? '슈퍼 관리자 권한은 수정할 수 없습니다.' : '메뉴별 CRUD 권한을 설정합니다.'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">역할 이름 *</label>
                  <input
                    value={formName} onChange={e => setFormName(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="예: 본사 운영팀"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                  <input
                    value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="역할이 담당하는 업무"
                  />
                </div>
              </div>

              {/* 전체 선택/해제 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  권한 설정
                  <span className="text-gray-400 font-normal ml-1">
                    ({formPerms.filter(p => p.read).length}개 메뉴 활성)
                  </span>
                </span>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <button onClick={() => toggleAll(true)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">전체 선택</button>
                    <button onClick={() => toggleAll(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">전체 해제</button>
                  </div>
                )}
              </div>

              {/* 권한 테이블 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">메뉴</th>
                      {PERM_FIELDS.map(({ label }) => (
                        <th key={label} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PARENT_LABELS.map(parentLabel => {
                      const menus = PERMISSION_MENUS.filter(m => m.parentLabel === parentLabel)
                      const isExpanded = expandedParents.has(parentLabel)
                      return (
                        <React.Fragment key={parentLabel}>
                          <tr className="bg-gray-50/60 border-t border-gray-100">
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setExpandedParents(prev => {
                                  const next = new Set(prev)
                                  if (next.has(parentLabel)) next.delete(parentLabel); else next.add(parentLabel)
                                  return next
                                })}
                                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                {parentLabel}
                                <span className="text-xs text-gray-400 font-normal">{menus.length}개</span>
                              </button>
                            </td>
                            {PERM_FIELDS.map(({ field }) => {
                              const state = getParentState(parentLabel, field)
                              return (
                                <td key={field} className="px-4 py-2.5 text-center">
                                  <button
                                    onClick={() => !isReadOnly && toggleParent(parentLabel, field)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${isReadOnly ? 'cursor-default' : ''} ${
                                      state === 'all' ? 'bg-gray-900 border-gray-900'
                                      : state === 'some' ? 'bg-gray-400 border-gray-400'
                                      : 'border-gray-300'
                                    }`}
                                  >
                                    {state === 'all' && <Check className="w-3 h-3 text-white" />}
                                    {state === 'some' && <Minus className="w-3 h-3 text-white" />}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                          {isExpanded && menus.map(menu => {
                            const perm = formPerms.find(p => p.menuId === menu.id)
                            if (!perm) return null
                            return (
                              <tr key={menu.id} className="border-t border-gray-50 hover:bg-gray-50/30">
                                <td className="px-4 py-2 pl-10 text-[13px] text-gray-600">{menu.label}</td>
                                {PERM_FIELDS.map(({ field }) => (
                                  <td key={field} className="px-4 py-2 text-center">
                                    <button
                                      onClick={() => !isReadOnly && togglePerm(menu.id, field)}
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${isReadOnly ? 'cursor-default' : ''} ${
                                        perm[field] ? 'bg-gray-900 border-gray-900' : `border-gray-300 ${isReadOnly ? '' : 'hover:border-gray-400'}`
                                      }`}
                                    >
                                      {perm[field] && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {editingRole && !isReadOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">변경 사유 (선택)</label>
                  <input
                    value={formMemo} onChange={e => setFormMemo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                    placeholder="변경 이력에 남길 메모를 입력하세요"
                  />
                </div>
              )}
            </div>

            {/* 모달 하단 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              {isReadOnly ? (
                <button onClick={closeModal} className="px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium">닫기</button>
              ) : (
                <>
                  <button onClick={closeModal} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">취소</button>
                  <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium">
                    <Save className="w-4 h-4" />
                    {editingRole ? '수정' : '추가'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
