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

export type SalesStatus = '사용중' | '종료 예정' | '판매 종료 (P)' | '판매 종료 (C)'

export type Product = {
  id: string
  productCode: string          // SAP 8자리 코드
  barcode: string              // 바코드 (13자리)
  name: string
  brandCategory: string        // 카테고리 대분류 (브랜드)
  midCategory: string          // 카테고리 중분류
  subCategory: string          // 카테고리 소분류
  factory1: string             // 생산공장1
  factory2: string | null      // 생산공장2
  factory3: string | null      // 생산공장3
  releaseDate: string          // 출시일
  partsRetentionPeriod: string // 부품보유기간 만료일 (YYYY-MM-DD)
  salesStatus: SalesStatus    // 판매 상태
  stockLocation: string        // 재고보관위치
  isSafetyStock: boolean       // 안전재고여부
  quantity: number             // 수량
  hasDecoration?: boolean      // 장식보유여부
  isRestorationRequest: boolean // 복원의뢰여부
  dataSource: 'SAP' | 'PS'     // 데이터 출처
  registeredBy: string | null  // 등록자 (PS 출처일 때만)
  registeredAt: string | null  // 등록일시 (PS 출처일 때만)
  branchCode?: string          // 법인 코드 (BRANCHES.code)
}

export type PartCategory = '렌즈' | '힌지' | '노즈패드' | '나사' | '템플' | '기타'

export type Part = {
  id: string
  productCode: string     // 연결된 제품 SAP/PS 코드
  partCode: string        // 부품 관리 코드 (PT-XXXXX)
  name: string            // 부품명
  category: PartCategory
  quantity: number
  status: Status
  note: string
  registeredBy: string
  registeredAt: string
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
