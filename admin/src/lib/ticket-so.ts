import type { RepairChargeType, Ticket } from './types'

export type SoConditionKey =
  | 'paidRepair'
  | 'priceDetermined'
  | 'paymentCompleted'
  | 'paymentApprovalNo'
  | 'serviceClosed'
  | 'b2cNo'
  | 'shipmentCompleted'
  | 'soNotIssued'

export type SoStatus = 'ISSUED' | 'READY_TO_SEND' | 'NOT_READY' | 'CANCEL_REVIEW'

export type SoCondition = {
  key: SoConditionKey
  label: string
  required: string
  value: string
  met: boolean
}

export type SoDocumentInfo = {
  status: SoStatus
  label: string
  className: string
  repairChargeType: RepairChargeType
  repairCost: number
  paymentApprovalNo: string | null
  b2cYn: 'Y' | 'N'
  sapSendFlag: 'Y' | 'N'
  conditions: SoCondition[]
  cancelReviewNeeded: boolean
}

export function formatRepairChargeType(value: RepairChargeType) {
  return value === 'PAID' ? '유상' : '무상'
}

export function formatCurrency(value: number) {
  return value > 0 ? `${value.toLocaleString()}원` : '0원'
}

function getRepairChargeType(ticket: Ticket): RepairChargeType {
  if (ticket.repairChargeType) return ticket.repairChargeType
  return ticket.paymentCompleted === 'Y' || !!ticket.soDocumentNo ? 'PAID' : 'FREE'
}

function getRepairCost(ticket: Ticket, repairChargeType: RepairChargeType) {
  if (typeof ticket.repairCost === 'number') return ticket.repairCost
  return repairChargeType === 'PAID' ? 45000 : 0
}

function getPaymentApprovalNo(ticket: Ticket) {
  if (ticket.paymentApprovalNo) return ticket.paymentApprovalNo
  if (ticket.paymentCompleted !== 'Y' || !ticket.paymentDate) return null
  return `AP${ticket.ticketNo.replace(/\D/g, '').slice(-10).padStart(10, '0')}`
}

function getB2cYn(ticket: Ticket): 'Y' | 'N' {
  return ticket.b2cYn ?? 'N'
}

function getSapSendFlag(ticket: Ticket): 'Y' | 'N' {
  if (ticket.sapSendFlag) return ticket.sapSendFlag
  return ticket.soDocumentNo ? 'Y' : 'N'
}

export function getSoDocumentInfo(ticket: Ticket): SoDocumentInfo {
  const repairChargeType = getRepairChargeType(ticket)
  const repairCost = getRepairCost(ticket, repairChargeType)
  const paymentApprovalNo = getPaymentApprovalNo(ticket)
  const b2cYn = getB2cYn(ticket)
  const sapSendFlag = getSapSendFlag(ticket)
  const serviceClosed = ticket.status === 'SERVICE_DONE' || ticket.status === 'CANCELED' || ticket.status === 'CLOSED'
  const shipmentCompleted = ticket.status === 'SERVICE_DONE' || ticket.status === 'CLOSED' || !!ticket.shippedAt
  const cancelReviewNeeded = ticket.status === 'CANCELED' || ticket.paymentCompleted === 'C'

  const conditions: SoCondition[] = [
    {
      key: 'paidRepair',
      label: '수리 비용 결정',
      required: '유상',
      value: formatRepairChargeType(repairChargeType),
      met: repairChargeType === 'PAID',
    },
    {
      key: 'priceDetermined',
      label: '가격 결정',
      required: '수리비 있음',
      value: formatCurrency(repairCost),
      met: repairCost > 0,
    },
    {
      key: 'paymentCompleted',
      label: '결제 완료 여부',
      required: 'Y',
      value: ticket.paymentCompleted,
      met: ticket.paymentCompleted === 'Y',
    },
    {
      key: 'paymentApprovalNo',
      label: '결제 승인 번호',
      required: '있음',
      value: paymentApprovalNo ?? '-',
      met: !!paymentApprovalNo,
    },
    {
      key: 'serviceClosed',
      label: '상태',
      required: '서비스 완료 또는 취소',
      value: ticket.status === 'CANCELED' ? '취소' : serviceClosed ? '서비스 완료' : '진행 중',
      met: serviceClosed,
    },
    {
      key: 'b2cNo',
      label: 'B2C 여부',
      required: 'N',
      value: b2cYn,
      met: b2cYn === 'N',
    },
    {
      key: 'shipmentCompleted',
      label: '출고 완료 여부',
      required: 'Y',
      value: shipmentCompleted ? 'Y' : 'N',
      met: shipmentCompleted,
    },
    {
      key: 'soNotIssued',
      label: 'SO 문서번호',
      required: '미발행',
      value: ticket.soDocumentNo ? ticket.soDocumentNo : '미발행',
      met: !ticket.soDocumentNo,
    },
  ]

  const baseConditionsMet = conditions.every(condition => condition.met)
  let status: SoStatus = 'NOT_READY'

  if (cancelReviewNeeded) status = 'CANCEL_REVIEW'
  else if (ticket.soDocumentNo || sapSendFlag === 'Y') status = 'ISSUED'
  else if (baseConditionsMet) status = 'READY_TO_SEND'

  const statusMeta: Record<SoStatus, { label: string; className: string }> = {
    ISSUED: {
      label: '발행 완료',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    READY_TO_SEND: {
      label: '전송 대상',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    NOT_READY: {
      label: '조건 미충족',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    CANCEL_REVIEW: {
      label: '취소 확인 필요',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  }

  return {
    status,
    label: statusMeta[status].label,
    className: statusMeta[status].className,
    repairChargeType,
    repairCost,
    paymentApprovalNo,
    b2cYn,
    sapSendFlag,
    conditions,
    cancelReviewNeeded,
  }
}
