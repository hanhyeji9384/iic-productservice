import type { PartOrderRequestStatus, PartOrderStoreType, Store } from './types'

export const PART_ORDER_STATUS_OPTIONS: { value: PartOrderRequestStatus; label: string }[] = [
  { value: 'REQUESTED', label: '요청완료' },
  { value: 'COMPLETED', label: '처리완료' },
  { value: 'OUT_OF_STOCK', label: '재고부족' },
  { value: 'HOLD', label: '보류' },
  { value: 'CANCELED', label: '취소' },
]

export const PART_ORDER_STORE_TYPES: PartOrderStoreType[] = [
  'Flagship Store',
  '백화점',
  'Mall',
  '면세점',
  '안경원',
  '편집샵',
  '온라인 자사몰',
  '해외법인(자회사)',
  '해외법인(Joint Venture)',
  'PS',
  '기타',
]

export function getPartOrderStatusMeta(status: PartOrderRequestStatus) {
  const label = PART_ORDER_STATUS_OPTIONS.find(option => option.value === status)?.label ?? status
  const className =
    status === 'COMPLETED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'OUT_OF_STOCK'
        ? 'border-red-200 bg-red-50 text-red-700'
        : status === 'HOLD'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : status === 'CANCELED'
            ? 'border-gray-200 bg-gray-100 text-gray-500'
            : 'border-blue-200 bg-blue-50 text-blue-700'
  return { label, className }
}

export function getPartOrderStoreTypeFromStore(store?: Store | null): PartOrderStoreType {
  if (!store) return '기타'
  if (store.storeGroup === 100) return 'Flagship Store'
  if (store.storeGroup === 110) return '백화점'
  if (store.storeGroup === 120) return 'Mall'
  if (store.storeGroup === 130) return '면세점'
  if (store.storeGroup === 140) return '안경원'
  if (store.storeGroup === 150) return '편집샵'
  if (store.storeGroup === 160) return '온라인 자사몰'
  if (store.storeGroup === 170) return 'PS'
  if (store.storeGroup === 180) return '해외법인(자회사)'
  if (store.storeGroup === 200) return '해외법인(Joint Venture)'
  return '기타'
}

export function getPartOrderQuantityOptions(storeType: PartOrderStoreType) {
  if (['Flagship Store', '백화점', 'Mall', '면세점'].includes(storeType)) return [1, 3, 5, 10, 30, 50]
  if (['안경원', '편집샵', '온라인 자사몰'].includes(storeType)) return [1, 3, 5]
  return [1, 3, 5, 10]
}
