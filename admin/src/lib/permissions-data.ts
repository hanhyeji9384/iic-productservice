export interface PermissionMenu {
  id: string
  label: string
  parentLabel: string
}

export interface PermissionEntry {
  menuId: string
  read: boolean
  write: boolean
  delete: boolean
}

export interface PermissionRole {
  id: number
  name: string
  description: string
  permissions: PermissionEntry[]
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface PermissionChangeLog {
  id: number
  roleId: number
  roleName: string
  changedAt: string
  changeType: 'create' | 'update' | 'delete'
  summary: string
  changedByName: string
  changedById: string
  memo?: string
}

export const PERMISSION_MENUS: PermissionMenu[] = [
  // 회원/권한 관리
  { id: 'members',        label: '회원',           parentLabel: '회원/권한 관리' },
  { id: 'roles',          label: '권한',           parentLabel: '회원/권한 관리' },
  { id: 'download-logs',  label: '다운로드 로그',  parentLabel: '로그 관리' },
  { id: 'privacy-logs',   label: '개인정보 처리 로그', parentLabel: '로그 관리' },
  // 마스터 관리
  { id: 'product-list',   label: '제품 리스트',    parentLabel: '마스터 관리' },
  { id: 'products',       label: '제품 관리',      parentLabel: '마스터 관리' },
  { id: 'parts',          label: '부품',           parentLabel: '마스터 관리' },
  { id: 'stores',         label: '매장/거래처',    parentLabel: '마스터 관리' },
  // 재고 관리
  { id: 'stock',          label: '재고 현황',      parentLabel: '재고 관리' },
  // 고객 관리
  { id: 'customers',      label: '고객',           parentLabel: '고객 관리' },
  // 티켓 관리
  { id: 'tickets',         label: '티켓',               parentLabel: '티켓 관리' },
  { id: 'component-returns', label: '구성품 반송',       parentLabel: '티켓 관리' },
  { id: 'invoice-packing', label: '인보이스/패킹리스트', parentLabel: '티켓 관리' },
  { id: 'global-tickets',  label: '국가별 티켓 관리',    parentLabel: '티켓 관리' },
]

export const PARENT_LABELS = [...new Set(PERMISSION_MENUS.map(m => m.parentLabel))]

function full(): PermissionEntry[] {
  return PERMISSION_MENUS.map(m => ({ menuId: m.id, read: true, write: true, delete: true }))
}
function readonly(): PermissionEntry[] {
  return PERMISSION_MENUS.map(m => ({ menuId: m.id, read: true, write: false, delete: false }))
}
function custom(allow: Record<string, Partial<PermissionEntry>>): PermissionEntry[] {
  return PERMISSION_MENUS.map(m => ({
    menuId: m.id,
    read: allow[m.id]?.read ?? false,
    write: allow[m.id]?.write ?? false,
    delete: allow[m.id]?.delete ?? false,
  }))
}

export const INITIAL_ROLES: PermissionRole[] = [
  {
    id: 0,
    name: '슈퍼 관리자',
    description: '모든 메뉴 전체 권한',
    permissions: full(),
    memberCount: 1,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2025-01-01 00:00:00',
  },
  {
    id: 1,
    name: '본사 운영팀',
    description: '티켓·고객·제품 CRUD, 회원 조회',
    permissions: custom({
      members:          { read: true },
      'product-list':   { read: true },
      products:         { read: true, write: true },
      parts:            { read: true, write: true },
      stores:           { read: true, write: true },
      stock:            { read: true, write: true },
      customers:        { read: true, write: true, delete: true },
      tickets:          { read: true, write: true, delete: true },
      'invoice-packing': { read: true, write: true },
      'global-tickets': { read: true, write: true },
    }),
    memberCount: 3,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2026-04-10 11:20:00',
  },
  {
    id: 2,
    name: '본사 접수 담당',
    description: '티켓 등록·수정, 고객 조회',
    permissions: custom({
      customers:        { read: true },
      tickets:          { read: true, write: true },
      'invoice-packing': { read: true, write: true },
      'global-tickets': { read: true },
    }),
    memberCount: 3,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2026-03-22 16:45:00',
  },
  {
    id: 3,
    name: '매장 접수 담당',
    description: '티켓 등록·수정만 가능',
    permissions: custom({
      tickets: { read: true, write: true },
    }),
    memberCount: 2,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2025-06-01 09:00:00',
  },
  {
    id: 4,
    name: '조회 전용',
    description: '전 메뉴 읽기 전용',
    permissions: readonly(),
    memberCount: 1,
    createdAt: '2025-01-01 00:00:00',
    updatedAt: '2025-06-01 09:00:00',
  },
  {
    id: 5,
    name: '가맹점주',
    description: '가맹 매장 접수 전용 (한국)',
    permissions: custom({
      customers: { read: true },
      tickets:   { read: true, write: true },
    }),
    memberCount: 0,
    createdAt: '2026-05-21 00:00:00',
    updatedAt: '2026-05-21 00:00:00',
  },
  {
    id: 8,
    name: '심플리페어 가맹점주',
    description: '심플리페어 가맹 매장 접수 전용 (한국)',
    permissions: custom({
      customers: { read: true },
      tickets:   { read: true, write: true },
    }),
    memberCount: 0,
    createdAt: '2026-06-10 00:00:00',
    updatedAt: '2026-06-10 00:00:00',
  },
]

export const INITIAL_CHANGE_LOGS: PermissionChangeLog[] = [
  { id: 9, roleId: 8, roleName: '심플리페어 가맹점주', changedAt: '2026-06-10 00:00:00', changeType: 'create', summary: '권한등록', changedByName: '한혜지', changedById: 'monster563' },
  { id: 1, roleId: 1, roleName: 'PS 운영팀',      changedAt: '2026-04-10 11:20:00', changeType: 'update', summary: '국가별 티켓 관리 등록·수정 추가 / 국가별 티켓 관리 삭제 추가',                                             changedByName: '김민준', changedById: 'monster001', memo: '업무 범위 확대' },
  { id: 6, roleId: 1, roleName: 'PS 운영팀',      changedAt: '2026-04-08 09:30:00', changeType: 'update', summary: '역할명: "본사 운영팀" → "PS 운영팀" / 설명: "본사 운영 담당" → "PS 파트 수리 운영 전담"',                    changedByName: '한혜지', changedById: 'monster563' },
  { id: 2, roleId: 2, roleName: '본사 접수 담당', changedAt: '2026-03-22 16:45:00', changeType: 'update', summary: '고객 등록·수정 제거 / 고객 삭제 제거',                                                                         changedByName: '김민준', changedById: 'monster001' },
  { id: 8, roleId: 3, roleName: '매장 접수 담당', changedAt: '2026-03-10 13:55:00', changeType: 'update', summary: '티켓 조회 추가 / 티켓 등록·수정 추가 / 고객 조회 추가 / 제품 조회 추가 / 재고 등록·수정 제거 / 재고 삭제 제거', changedByName: '한혜지', changedById: 'monster563', memo: '매장 접수 담당 권한 재정비' },
  { id: 7, roleId: 4, roleName: '조회 전용',      changedAt: '2026-03-05 14:10:00', changeType: 'update', summary: '설명: "읽기 전용 계정" → "조회 전용 (수정 권한 없음)"',                                                       changedByName: '김민준', changedById: 'monster001' },
  { id: 4, roleId: 6, roleName: '임시 운영자',    changedAt: '2026-02-14 10:00:00', changeType: 'delete', summary: '역할명: "임시 운영자" / 설명: "단기 운영 지원"',                                                               changedByName: '한혜지', changedById: 'monster563' },
  { id: 5, roleId: 7, roleName: '해외 CS 담당',   changedAt: '2026-01-08 15:30:00', changeType: 'delete', summary: '역할명: "해외 CS 담당" / 설명: "해외 고객 서비스 전담"',                                                      changedByName: '김민준', changedById: 'monster001' },
  { id: 3, roleId: 3, roleName: '매장 접수 담당', changedAt: '2025-06-01 09:00:00', changeType: 'create', summary: '권한등록',                                                                                                     changedByName: '시스템',  changedById: 'system' },
]
