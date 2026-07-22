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
  | 'SERVICE_UNAVAILABLE'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_DONE'
  | 'PARTNER_SENT'
  | 'PARTNER_RECEIVED'
  | 'REPAIRING'
  | 'REPAIR_DONE'
  | 'READY_TO_SHIP'
  | 'SHIPPING'
  | 'SHIPPED'
  | 'SERVICE_DONE'
  | 'CLOSED'
  | 'CANCELED'
  | 'PICKUP_WAITING'
  | 'STORE_ARRIVED'
  | 'PICKUP_COMPLETED'
  | 'PRODUCT_MOVING'
  | 'PICKUP_DONE'
  | 'PARTS_READY'

export type PaymentCompleted = 'Y' | 'N' | 'C'
export type TicketReceptionTag = 'RETURN_COMPONENTS' | 'MODIFIED' | 'PRE_RECEPTION'
export type RepairChargeType = 'PAID' | 'FREE'
export type NoRepairReason = 'FAKE' | 'PURCHASE_PROOF_UNAVAILABLE' | 'PRODUCT_CONDITION' | 'OTHER'
export type SapSendFlag = 'Y' | 'N'

export type TicketPricingItem = {
  id: string
  itemName: string
  repairDetail: string
  price: number
  externalPricingYn?: 'Y' | 'N'
  note?: string | null
}

export type TicketPartRequestItem = {
  id: string
  partName: string
  quantity: number
  unit?: string
}

export type TicketAttachment = string | {
  id: string
  name: string
  url: string
  uploadedAt?: string
  purpose?: 'CUSTOMER_IMAGE' | 'PURCHASE_PROOF' | 'CUSTOMER_NOTICE'
  readOnly?: boolean
}

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
  pickupTrackingNo?: string | null
  serviceCoupon?: string | null
  urgentRepairYn?: 'Y' | 'N'
  purchaseProofType?: '-' | 'MEMBERSHIP' | 'WARRANTY_CARD' | 'RECEIPT' | 'OTHER'
  purchaseInfoSource?: 'ORDER_HISTORY' | 'ADMIN'
  componentType?: string | null
  customerRequest?: string | null
  attachments?: TicketAttachment[]
  receptionMethod?: 'store' | 'house' | null
  receptionStoreCode?: string | null
  receptionStoreName?: string | null
  deliveryCountry?: string | null
  deliveryZipCode?: string | null
  deliveryAddress1?: string | null
  deliveryAddress2?: string | null
  deliveryCity?: string | null
  deliveryState?: string | null
  judgementManagerId?: string
  judgementManagerName?: string
  judgementCompletedAt?: string | null
  productCode?: string | null
  productSerialNumber?: string | null
  serialNumber?: string | null
  productName: string
  productFactory?: string | null
  productFactory1?: string | null
  productFactory2?: string | null
  productFactory3?: string | null
  productMidCategory?: string | null
  productSubCategory?: string | null
  productLaunchDate?: string | null
  productStockAvailableYn?: 'Y' | 'N'
  productRestorationRepairYn?: 'Y' | 'N'
  productDecorationYn?: 'Y' | 'N'
  purchaseDate?: string | null
  purchasePlace?: string | null
  symptom?: string | null
  repairPartTags?: string[]
  repairIssueAreaTags?: string[]
  repairIssueTypeTags?: string[]
  partRequestItems?: TicketPartRequestItem[]
  careRequest?: string | null
  lensType?: string | null
  repairDepartment: string
  repairDetail: string
  replacementProductCode?: string | null
  replacementProductName?: string | null
  replacementProductRetailPrice?: number | null
  noRepairReason?: NoRepairReason | null
  repairChargeType?: RepairChargeType
  repairCost?: number | null
  productRetailPrice?: number | null
  repairTypeTags?: string[]
  repairPricingCurrency?: string | null
  serviceChargeAmount?: number | null
  repairOtherAmount?: number | null
  customsDutyAmount?: number | null
  pickupFreightAmount?: number | null
  externalPricingYn?: 'Y' | 'N'
  externalPricingVendor?: string | null
  externalPricingCost?: number | null
  externalPricingCheckedAt?: string | null
  externalPricingMemo?: string | null
  pricingItems?: TicketPricingItem[]
  repairReference?: string | null
  repairBeginDate?: string | null
  repairCompletedAt?: string | null
  factoryForwardingDate?: string | null
  factoryReceivingDate?: string | null
  repairAgainReason?: string | null
  productProblemYn?: 'Y' | 'N'
  repairSpecialNote?: string | null
  customerNotice?: string | null
  customerNoticeImages?: TicketAttachment[]
  technicianId?: string
  technicianName?: string
  trackingNo: string | null
  shipmentCompletedYn?: 'Y' | 'N'
  shipmentCompletedAt?: string | null
  deliveryCompletedYn?: 'Y' | 'N'
  deliveredAt?: string | null
  outboundCarrier?: string | null
  storePickupCompletedYn?: 'Y' | 'N'
  storePickupCompletedAt?: string | null
  hqTrackingNo?: string | null
  hqInvoiceNo?: string | null
  corporateShippedAt?: string | null
  corporateTrackingNo?: string | null
  corporateInvoiceNo?: string | null
  paymentCompleted: PaymentCompleted
  paymentDate: string | null
  paymentExpiresAt?: string | null
  paymentApprovalNo?: string | null
  reexportCondition: 'Y' | 'N'
  b2cYn?: 'Y' | 'N'
  shippingMethod: string
  shippedAt: string | null
  soDocumentNo: string | null
  sapSendFlag?: SapSendFlag
  sapSentAt?: string | null
  consultationRequestedYn?: 'Y' | 'N'
  outboundType?: string | null
  consultationManager?: string | null
  consultationStatus?: string | null
  consultationCompletedAt?: string | null
  consultationTicketNo?: string | null
  consultationExceptionCategory?: string | null
  consultationRepairMemo?: string | null
}

export type ComponentType =
  | 'NONE'
  | 'CASE'
  | 'WARRANTY_CARD'
  | 'LENS'
  | 'CLOTH'
  | 'CHARGING_CASE'
  | 'OTHER'

export type ComponentReturnStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'

export type ComponentReturn = {
  id: string
  sourceTicketNo: string
  branchCode: string
  customerName: string
  phone: string
  email: string
  productName: string
  componentType: ComponentType
  courier: string
  trackingNo: string | null
  status: ComponentReturnStatus
  createdAt: string
  returnedAt: string | null
  alimtalkSentYn: 'Y' | 'N'
}

export type StockRequestStatus = 'REQUESTED' | 'COMPLETED' | 'OUT_OF_STOCK' | 'HOLD' | 'CANCELED'

export type StockRequestReason =
  | '긴급 건'
  | '분배 누락'
  | '분배 오류'
  | '접수 오류'
  | '수리내용 변경'
  | '수리 중 손상'
  | '제품 불량'
  | '재수리'
  | '타제품교환'
  | '공장수리(코팅)'
  | '개인픽업'
  | '기타'

export type StockRequest = {
  id: string
  requestNo: string
  ticketNo: string
  requestedAt: string
  status: StockRequestStatus
  requester: string
  requesterId?: string
  productCode: string
  productName: string
  reason: StockRequestReason
  reasonLargeCategory: string
  reasonMiddleCategory: string
  processedAt: string | null
  processor: string | null
  processorId?: string | null
}

export type PartOrderRequestStatus = 'REQUESTED' | 'COMPLETED' | 'OUT_OF_STOCK' | 'HOLD' | 'CANCELED'

export type PartOrderStoreType =
  | 'Flagship Store'
  | '백화점'
  | 'Mall'
  | '면세점'
  | '안경원'
  | '편집샵'
  | '온라인 자사몰'
  | '해외법인(자회사)'
  | '해외법인(Joint Venture)'
  | 'PS'
  | '기타'

export type PartOrderRequest = {
  id: string
  requestNo: string
  requestedAt: string
  status: PartOrderRequestStatus
  requester: string
  requesterId?: string
  storeType: PartOrderStoreType
  storeCode?: string | null
  storeName: string
  productCode: string
  productName: string
  partCode: string
  partName: string
  partStorageLocation: string
  color: string
  quantityPairs: number
  requestMemo?: string | null
  processedAt: string | null
  processor: string | null
  processorId?: string | null
}

export type StockLedgerEventType =
  | '입고'
  | '출고'
  | '출고요청'
  | '출고완료'
  | '입고완료'
  | '조정대기'
  | '조정반영'
  | '재고예약'
  | '예약해제'

export type StockLedgerStatus = '완료' | '대기' | '취소'
export type StockLedgerSourceType = '티켓' | '재고출고' | '재고조정' | '수기'

export type StockLedgerEntry = {
  id: string
  occurredAt: string
  eventType: StockLedgerEventType
  status: StockLedgerStatus
  sourceType: StockLedgerSourceType
  sourceNo: string
  branchCode: string
  branchName: string
  fromLocation: string | null
  toLocation: string | null
  productCode: string
  productName: string
  barcode: string
  quantity: number
  beforeQty: number | null
  afterQty: number | null
  handler: string
  memo?: string | null
}

export type StockTransferStatus = 'REQUESTED' | 'SHIPPED' | 'RECEIVED' | 'FAILED' | 'CANCELED'

export type StockTransferLine = {
  id: string
  productCode: string
  productName: string
  barcode: string
  quantity: number
}

export type StockTransfer = {
  id: string
  transferNo: string
  requestedAt: string
  status: StockTransferStatus
  requester: string
  requesterId?: string | null
  fromLocation: '3PL'
  toLocation: 'PS Office'
  shippedAt: string | null
  receivedAt: string | null
  trackingNo?: string | null
  failedAt?: string | null
  erpResultCode?: string | null
  erpResultMessage?: string | null
  receiver: string | null
  memo?: string | null
  items: StockTransferLine[]
}

export type StockAdjustmentType = '일반' | '리턴' | '타부서요청' | '폐기' | '기타'
export type StockAdjustmentStatus = 'REQUESTED' | 'APPLIED' | 'REJECTED'
export type StockAdjustmentLocation = string

export type StockAdjustment = {
  id: string
  adjustmentNo: string
  requestedAt: string
  status: StockAdjustmentStatus
  type: StockAdjustmentType
  requester: string
  requesterId?: string | null
  branchCode?: string | null
  branchName?: string | null
  storeCode?: string | null
  storeName?: string | null
  locationCode?: string | null
  locationName?: string | null
  productCode: string
  productName: string
  barcode: string
  location: StockAdjustmentLocation
  quantityDelta: number
  reason: string
  erpSendRequired?: boolean
  appliedAt: string | null
  processor: string | null
  memo?: string | null
}

export type StockSnapshotRow = {
  id: string
  saveDate: string
  branchCode: string
  branchName: string
  storeCode: string
  storeName: string
  locationCode: string
  locationName: string
  productCode: string
  productName: string
  barcode: string
  midCategory: string
  subCategory: string
  onHandQty: number
  outboundWaitingQty: number
  adjustmentWaitingQty: number
  availableQty: number
  erpQty?: number
  stockDiffQty?: number
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

export type TicketChangeType =
  | 'STATUS'
  | 'ASSIGNEE'
  | 'RECEPTION'
  | 'CUSTOMER'
  | 'PRODUCT'
  | 'REPAIR'
  | 'PAYMENT'
  | 'CONSULTATION'
  | 'SHIPPING'
  | 'SYSTEM'

export type TicketChangeLog = {
  id: string
  ticketNo: string
  changedAt: string
  changeType?: TicketChangeType
  fieldKey?: string
  fieldLabel: string
  beforeValue: string
  afterValue: string
  channel?: string
  memo?: string
  changedById?: string
  changedByName: string
  changedByLoginId: string
  changedByRoleId?: string
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
  netWeight?: string           // 제품 순중량 값
  netWeightUnit?: string       // 제품 순중량 단위
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
  partCode: string          // 부품 ID (PS 자동 생성, 영문 포함 8자리)
  name: string              // 부품명
  specification: string     // 규격
  color: string             // 컬러
  storageLocation: string   // 부품 보관위치
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
