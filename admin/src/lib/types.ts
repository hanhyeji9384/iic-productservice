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
  address1?: string
  address2?: string
  zipCode?: string | null
  oldZipCode?: string | null
  tel1?: string
  tel2?: string
  telFx?: string | null
  active?: 'Y' | 'N' | null
}

export type CustomerAddress = {
  id: string
  isDefault?: boolean
  address1: string
  address2?: string
  zipCode?: string
  country: string
  city?: string
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  branchCode: string
  ticketYn: 'Y' | 'N'
  marketingAgree: 'Y' | 'N'
  registeredAt: string
  addresses?: CustomerAddress[]
}

export type TicketStatus =
  | 'RECEIVED'
  | 'JUDGEMENT_PENDING'
  | 'JUDGEMENT_DONE'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_DONE'
  | 'PARTNER_SENT'
  | 'REPAIRING'
  | 'REPAIR_DONE'
  | 'READY_TO_SHIP'
  | 'SHIPPING'
  | 'SHIPPED'
  | 'CLOSED'
  | 'CANCELED'
  | 'PICKUP_WAITING'

export type PaymentCompleted = 'Y' | 'N' | 'C'
export type TicketReceptionTag = 'RETURN_COMPONENTS' | 'MODIFIED' | 'PRE_RECEPTION'
export type RepairChargeType = 'PAID' | 'FREE'
export type SapSendFlag = 'Y' | 'N'

export type Ticket = {
  id: string
  ticketNo: string
  branchCode: string
  receivedAt: string
  status: TicketStatus
  hqReceivedAt: string | null
  expectedShipAt: string | null
  receptionPlace: string
  customerName: string
  phone: string
  email: string
  receptionTitle?: string
  receptionTags?: TicketReceptionTag[]
  originalTicketNo?: string
  reRepairYn?: 'Y' | 'N'
  productName: string
  repairDepartment: string
  repairDetail: string
  repairChargeType?: RepairChargeType
  repairCost?: number | null
  technicianId?: string
  technicianName?: string
  trackingNo: string | null
  paymentCompleted: PaymentCompleted
  paymentDate: string | null
  paymentApprovalNo?: string | null
  reexportCondition: 'Y' | 'N'
  b2cYn?: 'Y' | 'N'
  shippingMethod: string
  shippedAt: string | null
  soDocumentNo: string | null
  sapSendFlag?: SapSendFlag
  sapSentAt?: string | null
}

export type Member = {
  id: string
  loginId: string
  name: string
  email: string
  tel?: string
  country: string
  roleId: string
  isTechnician?: boolean
  status: Status
  expiresAt: string | null
  createdAt: string
  lastLoginAt: string | null
  managedBranches: string[]  // ['*'] = 전체, 그 외 = branch_code 배열
  assignedStores: string[]   // 담당 스토어 코드 배열 (주로 STORE_RECEIVE)
}

export type MemberChangeType = 'CREATE' | 'UPDATE' | 'DELETE'

export type MemberChangeLog = {
  id: string
  changedAt: string
  changeType: MemberChangeType
  targetName: string
  targetLoginId: string
  summary: string
  changedByName: string
  changedById: string
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
  discontinuedYear?: string    // 단종년도 (SAP 제공, 없을 수 있음)
  stockLocation: string        // 재고보관위치
  isSafetyStock: boolean       // 안전재고여부
  quantity: number             // 기본 수량
  psQuantity?: number          // PS 보유 수량
  threePlQuantity?: number     // 3PL 보유 수량
  hasDecoration?: boolean      // 장식보유여부
  isRestorationRepair?: boolean // 복원수리 여부
  dataSource: 'SAP' | 'PS'     // 데이터 출처
  registeredBy: string | null  // 등록자 (PS 출처일 때만)
  registeredAt: string | null  // 등록일시 (PS 출처일 때만)
  branchCode?: string          // 법인 코드 (BRANCHES.code)
}

export type ProductChangeType = 'update'

export type ProductChangeLog = {
  id: string
  productId: string
  productCode: string
  productName: string
  changedAt: string
  changeType: ProductChangeType
  summary: string
  changedByName: string
  changedById: string
}

export type Part = {
  id: string
  productCode: string       // 연결된 제품 SAP/PS 코드
  partCode: string          // 부속품 ID (PS 자동 생성, PT-XXXXX)
  name: string              // 부속품명
  specification: string     // 규격
  color: string             // 컬러
  storageLocation: string   // 부속품 보관위치
  registeredBy: string
  registeredAt: string
  updatedAt?: string
}

export type PartChangeType = 'update' | 'delete'

export type PartChangeLog = {
  id: string
  partId: string
  productCode: string
  partCode: string
  partName: string
  changedAt: string
  changeType: PartChangeType
  summary: string
  changedByName: string
  changedById: string
}

export type MemberHistory = {
  id: string
  memberId: string
  eventType: 'UPDATE' | 'DEACTIVATE' | 'DELETE' | 'PASSWORD_CHANGE'
  changedBy: string
  changedAt: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}
