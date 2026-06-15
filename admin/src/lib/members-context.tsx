import { createContext, useContext, useState, type ReactNode } from 'react'
import { BRANCHES, MEMBERS as INITIAL_MEMBERS, ROLES, STORES } from './mock-data'
import type { Member, MemberChangeLog, MemberChangeType } from './types'

type MembersContextValue = {
  members: Member[]
  memberChangeLogs: MemberChangeLog[]
  updateMember: (updated: Member) => void
  addMember: (member: Member) => void
  deleteMember: (id: string) => void
}

const MembersContext = createContext<MembersContextValue | null>(null)

const CURRENT_ADMIN = {
  name: '한혜지',
  id: 'monster563',
}

const INITIAL_MEMBER_CHANGE_LOGS: MemberChangeLog[] = [
  {
    id: 'member-log-001',
    changedAt: '2026-05-10 14:30:00',
    changeType: 'UPDATE',
    targetName: '정태양',
    targetLoginId: 'monster155',
    summary: '상태: 활성 → 비활성',
    changedByName: '김민준',
    changedById: 'monster001',
  },
  {
    id: 'member-log-002',
    changedAt: '2026-04-22 09:15:00',
    changeType: 'UPDATE',
    targetName: '이수진',
    targetLoginId: 'monster042',
    summary: '역할: 매장 접수 담당 → 본사 운영팀',
    changedByName: '김민준',
    changedById: 'monster001',
  },
  {
    id: 'member-log-003',
    changedAt: '2026-03-18 16:00:00',
    changeType: 'DELETE',
    targetName: '박지현',
    targetLoginId: 'monster088',
    summary: '계정 삭제',
    changedByName: '한혜지',
    changedById: 'monster563',
  },
  {
    id: 'member-log-004',
    changedAt: '2026-03-01 10:00:00',
    changeType: 'CREATE',
    targetName: '김가맹',
    targetLoginId: 'franchise01',
    summary: '회원등록',
    changedByName: '한혜지',
    changedById: 'monster563',
  },
]

function nowString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function roleName(roleId: string) {
  return ROLES.find(role => role.id === roleId)?.name ?? roleId
}


function branchNames(codes: string[]) {
  if (codes.includes('*')) return '전체'
  if (codes.length === 0) return '(없음)'
  return codes.map(code => BRANCHES.find(branch => branch.code === code)?.name ?? code).join(', ')
}

function storeNames(codes: string[]) {
  if (codes.length === 0) return '(없음)'
  return codes.map(code => STORES.find(store => store.code === code)?.name ?? code).join(', ')
}

function statusName(status: Member['status']) {
  return status === 'active' ? '활성' : '비활성'
}

function emptyText(value: string | null | undefined) {
  return value ? value : '(없음)'
}

function listEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function buildMemberDiff(current: Member, updated: Member) {
  const diffs: string[] = []
  if (current.name !== updated.name) diffs.push(`이름: ${current.name} → ${updated.name}`)
  if (current.email !== updated.email) diffs.push(`이메일: ${current.email} → ${updated.email}`)
  if ((current.tel ?? '') !== (updated.tel ?? '')) diffs.push(`연락처: ${emptyText(current.tel)} → ${emptyText(updated.tel)}`)
  if (!!current.isTechnician !== !!updated.isTechnician) diffs.push(`기술자: ${current.isTechnician ? 'O' : 'X'} → ${updated.isTechnician ? 'O' : 'X'}`)
  if (current.roleId !== updated.roleId) diffs.push(`역할: ${roleName(current.roleId)} → ${roleName(updated.roleId)}`)
  if (current.status !== updated.status) diffs.push(`상태: ${statusName(current.status)} → ${statusName(updated.status)}`)
  if ((current.expiresAt ?? '') !== (updated.expiresAt ?? '')) diffs.push(`계정 만료일: ${emptyText(current.expiresAt)} → ${emptyText(updated.expiresAt)}`)
  if (!listEqual(current.managedBranches ?? [], updated.managedBranches ?? [])) diffs.push(`담당 법인: ${branchNames(current.managedBranches ?? [])} → ${branchNames(updated.managedBranches ?? [])}`)
  if (!listEqual(current.assignedStores ?? [], updated.assignedStores ?? [])) diffs.push(`담당 스토어: ${storeNames(current.assignedStores ?? [])} → ${storeNames(updated.assignedStores ?? [])}`)
  return diffs.join(' / ') || '변경 없음'
}

function buildCreateSummary() {
  return '회원등록'
}

function buildDeleteSummary(member: Member) {
  return [
    '계정 삭제',
    `역할: ${roleName(member.roleId)}`,
    `상태: ${statusName(member.status)}`,
  ].join(' / ')
}

function buildMemberLog(member: Member, changeType: MemberChangeType, summary: string): MemberChangeLog {
  return {
    id: `${changeType}-${member.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    changedAt: nowString(),
    changeType,
    targetName: member.name,
    targetLoginId: member.loginId,
    summary,
    changedByName: CURRENT_ADMIN.name,
    changedById: CURRENT_ADMIN.id,
  }
}

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [memberChangeLogs, setMemberChangeLogs] = useState<MemberChangeLog[]>(INITIAL_MEMBER_CHANGE_LOGS)

  function updateMember(updated: Member) {
    const current = members.find(member => member.id === updated.id)
    if (current) {
      setMemberChangeLogs(prev => [
        buildMemberLog(updated, 'UPDATE', buildMemberDiff(current, updated)),
        ...prev,
      ])
    }
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function addMember(member: Member) {
    setMemberChangeLogs(prev => [
      buildMemberLog(member, 'CREATE', buildCreateSummary()),
      ...prev,
    ])
    setMembers(prev => [...prev, member])
  }

  function deleteMember(id: string) {
    const current = members.find(member => member.id === id)
    if (current) {
      setMemberChangeLogs(prev => [
        buildMemberLog(current, 'DELETE', buildDeleteSummary(current)),
        ...prev,
      ])
    }
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <MembersContext.Provider value={{ members, memberChangeLogs, updateMember, addMember, deleteMember }}>
      {children}
    </MembersContext.Provider>
  )
}

export function useMembers() {
  const ctx = useContext(MembersContext)
  if (!ctx) throw new Error('useMembers must be used within MembersProvider')
  return ctx
}
