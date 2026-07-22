import type {
  Product,
  StockAdjustment,
  StockAdjustmentStatus,
  StockAdjustmentType,
  StockLedgerStatus,
  StockTransferStatus,
} from './types'
import { BRANCHES, STORES } from './mock-data'

export const STOCK_TRANSFER_STATUS_OPTIONS: {
  value: StockTransferStatus
  label: string
  className: string
}[] = [
  { value: 'REQUESTED', label: '출고요청', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'SHIPPED', label: '출고완료', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'RECEIVED', label: '입고완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'FAILED', label: '출고실패', className: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'CANCELED', label: '취소', className: 'bg-gray-100 text-gray-600 border-gray-200' },
]

export const STOCK_ADJUSTMENT_TYPES: StockAdjustmentType[] = ['일반', '리턴', '타부서요청', '폐기', '기타']

export const STOCK_ADJUSTMENT_STATUS_OPTIONS: {
  value: StockAdjustmentStatus
  label: string
  className: string
}[] = [
  { value: 'REQUESTED', label: '요청완료', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'APPLIED', label: '확정완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'REJECTED', label: '반려', className: 'bg-red-50 text-red-600 border-red-200' },
]

export const STOCK_LEDGER_STATUS_CLASS: Record<StockLedgerStatus, string> = {
  완료: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  대기: 'bg-blue-50 text-blue-700 border-blue-200',
  취소: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function getStockTransferStatusMeta(status: StockTransferStatus) {
  return STOCK_TRANSFER_STATUS_OPTIONS.find(option => option.value === status) ?? STOCK_TRANSFER_STATUS_OPTIONS[0]
}

export function getStockAdjustmentStatusMeta(status: StockAdjustmentStatus) {
  return STOCK_ADJUSTMENT_STATUS_OPTIONS.find(option => option.value === status) ?? STOCK_ADJUSTMENT_STATUS_OPTIONS[0]
}

export type StockInventoryRow = {
  saveDate?: string
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
  erpQty: number
  stockDiffQty: number
}

type StockInventoryOptions = {
  saveDate?: string
  adjustmentPendingByProduct?: Record<string, number>
}

export function formatStockNumber(value: number) {
  return value.toLocaleString('ko-KR')
}

function getStockSeed(product: Product, index: number) {
  return product.productCode
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), index)
}

function getStore(product: Product, index: number) {
  const branchStores = STORES.filter(store => store.branchCode === product.branchCode)
  if (branchStores.length === 0) return null
  return branchStores[index % branchStores.length]
}

function getWarehouse(product: Product) {
  if (product.branchCode === '1110') {
    return { code: '1110', name: '가용창고' }
  }
  if (product.branchCode === '1100') {
    return { code: '1120', name: 'PS창고' }
  }
  return {
    code: product.branchCode ? `${product.branchCode}-PS` : '-',
    name: 'PS창고',
  }
}

function getOutboundWaitingQty(product: Product, index: number) {
  return Math.min(product.quantity, getStockSeed(product, index) % 9)
}

function getErpQty(product: Product, index: number, onHandQty: number) {
  const seed = getStockSeed(product, index)
  const diff = seed % 11 === 0 ? 3 : seed % 7 === 0 ? -2 : seed % 5 === 0 ? 1 : 0
  return Math.max(onHandQty - diff, 0)
}

export function buildAdjustmentPendingMap(adjustments: StockAdjustment[]) {
  return adjustments.reduce<Record<string, number>>((acc, adjustment) => {
    if (adjustment.status !== 'REQUESTED') return acc
    const qty = Math.abs(adjustment.quantityDelta)
    acc[adjustment.productCode] = (acc[adjustment.productCode] ?? 0) + qty
    acc[adjustment.barcode] = (acc[adjustment.barcode] ?? 0) + qty
    return acc
  }, {})
}

export function createStockInventoryRow(
  product: Product,
  index: number,
  options: StockInventoryOptions = {},
): StockInventoryRow {
  const branch = BRANCHES.find(item => item.code === product.branchCode)
  const store = getStore(product, index)
  const onHandQty = product.quantity
  const outboundWaitingQty = getOutboundWaitingQty(product, index)
  const adjustmentWaitingQty = options.adjustmentPendingByProduct?.[product.productCode]
    ?? options.adjustmentPendingByProduct?.[product.barcode]
    ?? 0
  const erpQty = getErpQty(product, index, onHandQty)
  const warehouse = getWarehouse(product)

  return {
    saveDate: options.saveDate,
    branchCode: product.branchCode ?? '-',
    branchName: branch?.name ?? '-',
    storeCode: store?.code ?? '-',
    storeName: store?.name ?? '-',
    locationCode: warehouse.code,
    locationName: warehouse.name,
    productCode: product.productCode,
    productName: product.name,
    barcode: product.barcode,
    midCategory: product.midCategory,
    subCategory: product.subCategory,
    onHandQty,
    outboundWaitingQty,
    adjustmentWaitingQty,
    availableQty: Math.max(onHandQty - outboundWaitingQty - adjustmentWaitingQty, 0),
    erpQty,
    stockDiffQty: onHandQty - erpQty,
  }
}

export function createStockInventoryRows(
  products: Product[],
  options: StockInventoryOptions = {},
) {
  return products.map((product, index) => createStockInventoryRow(product, index, options))
}
