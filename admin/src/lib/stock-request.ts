import type { StockRequestReason, StockRequestStatus } from './types'

export const STOCK_REQUEST_REASONS: StockRequestReason[] = [
  '긴급 건',
  '분배 누락',
  '분배 오류',
  '접수 오류',
  '수리내용 변경',
  '수리 중 손상',
  '제품 불량',
  '재수리',
  '타제품교환',
  '공장수리(코팅)',
  '개인픽업',
  '기타',
]

export const STOCK_REQUEST_REASON_META: Record<StockRequestReason, { large: string; middle: string }> = {
  '긴급 건': { large: '긴급 대응', middle: '고객 납기 대응' },
  '분배 누락': { large: '분배 이슈', middle: '출고 누락' },
  '분배 오류': { large: '분배 이슈', middle: '오출고/오분배' },
  '접수 오류': { large: '접수 이슈', middle: '제품 정보 오류' },
  '수리내용 변경': { large: '수리 변경', middle: '판정/작업 변경' },
  '수리 중 손상': { large: '수리 이슈', middle: '작업 중 손상' },
  '제품 불량': { large: '품질 이슈', middle: '제품 불량' },
  '재수리': { large: '재수리', middle: '재입고/재작업' },
  '타제품교환': { large: '교환', middle: '타제품 교환' },
  '공장수리(코팅)': { large: '공장 수리', middle: '코팅 수리' },
  '개인픽업': { large: '출고 이슈', middle: '개인 픽업' },
  '기타': { large: '기타', middle: '기타 요청' },
}

export const STOCK_REQUEST_STATUS_OPTIONS: {
  value: StockRequestStatus
  label: string
  className: string
}[] = [
  { value: 'REQUESTED', label: '요청완료', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: '처리완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'OUT_OF_STOCK', label: '재고부족', className: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'HOLD', label: '보류', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'CANCELED', label: '취소', className: 'bg-gray-100 text-gray-600 border-gray-200' },
]

export function getStockRequestReasonMeta(reason: StockRequestReason) {
  return STOCK_REQUEST_REASON_META[reason] ?? STOCK_REQUEST_REASON_META['기타']
}

export function getStockRequestStatusMeta(status: StockRequestStatus) {
  return STOCK_REQUEST_STATUS_OPTIONS.find(option => option.value === status) ?? STOCK_REQUEST_STATUS_OPTIONS[0]
}

export function getStockRequestStatusActions(status: StockRequestStatus): StockRequestStatus[] {
  if (status === 'REQUESTED') return ['COMPLETED', 'OUT_OF_STOCK', 'HOLD', 'CANCELED']
  if (status === 'HOLD') return ['REQUESTED', 'OUT_OF_STOCK', 'CANCELED']
  return []
}
