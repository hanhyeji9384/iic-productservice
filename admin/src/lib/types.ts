export type Status = 'active' | 'inactive'

export type Branch = {
  code: string
  name: string
  country: string
  currency: string
}

export type Store = {
  code: string
  name: string
  country: string
  currency: string
  branchCode: string
  storeGroup: number  // 100: Flagship, 110: 백화점, 120: Mall, 130: 면세점, 140: 안경원, 150: 편집샵, ...
}

export type Member = {
  id: string
  loginId: string
  name: string
  email: string
  tel?: string
  country: string
  roleId: string
  department?: string
  status: Status
  expiresAt: string | null
  createdAt: string
  lastLoginAt: string | null
  managedBranches: string[]  // ['*'] = 전체, 그 외 = branch_code 배열
  assignedStores: string[]   // 담당 스토어 코드 배열 (주로 STORE_RECEIVE)
}

export type Department = {
  id: string
  name: string
  description?: string
}

export type Role = {
  id: string
  name: string
  description: string
  memberCount: number
}

export type Permission = {
  menuId: string
  menuName: string
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export type MemberHistory = {
  id: string
  memberId: string
  eventType: 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'DELETE' | 'PASSWORD_CHANGE'
  changedBy: string
  changedAt: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}
