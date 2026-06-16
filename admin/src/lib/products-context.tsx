import { createContext, useContext, useState, type ReactNode } from 'react'
import { PRODUCTS as INITIAL_PRODUCTS, PRODUCT_CHANGE_LOGS as INITIAL_PRODUCT_CHANGE_LOGS } from './mock-data'
import type { Product, ProductChangeLog } from './types'

type StockPatch = Partial<Pick<Product,
  | 'name'
  | 'brandCategory'
  | 'midCategory'
  | 'subCategory'
  | 'factory1'
  | 'factory2'
  | 'factory3'
  | 'releaseDate'
  | 'partsRetentionPeriod'
  | 'quantity'
  | 'psQuantity'
  | 'threePlQuantity'
  | 'isSafetyStock'
  | 'hasDecoration'
  | 'isRestorationRepair'
>>

type ProductManagementUpdate = {
  productCode: string
  name?: string
  brandCategory?: string
  midCategory?: string
  subCategory?: string
  factory1?: string
  factory2?: string | null
  factory3?: string | null
  releaseDate?: string
  partsRetentionPeriod?: string
  isSafetyStock?: boolean
  psQuantity?: number
  threePlQuantity?: number
  isRestorationRepair?: boolean
}

type ProductsContextValue = {
  products: Product[]
  productChangeLogs: ProductChangeLog[]
  addProduct: (product: Product) => void
  updateProduct: (updated: Product) => void
  updateStockFields: (id: string, patch: StockPatch) => void
  updateProductManagementFields: (updates: ProductManagementUpdate[]) => number
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

const CURRENT_ADMIN = {
  name: '한혜지',
  id: 'monster563',
}

function nowString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function logId(type: ProductChangeLog['changeType'], productId: string) {
  return `${type}-${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
}

function yn(value: boolean) {
  return value ? 'Y' : 'N'
}

function num(value: number | undefined, fallback = 0) {
  return value ?? fallback
}

function buildProductLog(product: Product, changeType: ProductChangeLog['changeType'], summary: string, changedAt = nowString()): ProductChangeLog {
  return {
    id: logId(changeType, product.id),
    productId: product.id,
    productCode: product.productCode,
    productName: product.name,
    changedAt,
    changeType,
    summary,
    changedByName: CURRENT_ADMIN.name,
    changedById: CURRENT_ADMIN.id,
  }
}

function buildProductManagementDiff(current: Product, updated: Product) {
  const diffs: string[] = []
  if (current.name !== updated.name) diffs.push(`제품명: ${current.name} → ${updated.name}`)
  if (current.brandCategory !== updated.brandCategory || current.midCategory !== updated.midCategory || current.subCategory !== updated.subCategory) {
    diffs.push(`제품범주: ${current.brandCategory}/${current.midCategory}/${current.subCategory} → ${updated.brandCategory}/${updated.midCategory}/${updated.subCategory}`)
  }
  if (current.factory1 !== updated.factory1) diffs.push(`생산공장1: ${current.factory1} → ${updated.factory1}`)
  if ((current.factory2 ?? '') !== (updated.factory2 ?? '')) diffs.push(`생산공장2: ${current.factory2 ?? '-'} → ${updated.factory2 ?? '-'}`)
  if ((current.factory3 ?? '') !== (updated.factory3 ?? '')) diffs.push(`생산공장3: ${current.factory3 ?? '-'} → ${updated.factory3 ?? '-'}`)
  if (current.releaseDate !== updated.releaseDate) diffs.push(`출시일: ${current.releaseDate} → ${updated.releaseDate}`)
  if (current.partsRetentionPeriod !== updated.partsRetentionPeriod) diffs.push(`부품보유기한: ${current.partsRetentionPeriod || '-'} → ${updated.partsRetentionPeriod || '-'}`)
  if (current.isSafetyStock !== updated.isSafetyStock) diffs.push(`안전재고여부: ${yn(current.isSafetyStock)} → ${yn(updated.isSafetyStock)}`)
  if (num(current.psQuantity, current.quantity) !== num(updated.psQuantity, updated.quantity)) diffs.push(`PS수량: ${num(current.psQuantity, current.quantity)} → ${num(updated.psQuantity, updated.quantity)}`)
  if (num(current.threePlQuantity) !== num(updated.threePlQuantity)) diffs.push(`3PL수량: ${num(current.threePlQuantity)} → ${num(updated.threePlQuantity)}`)
  if (isRestorationRepairProduct(current) !== isRestorationRepairProduct(updated)) diffs.push(`복원 가능 여부: ${yn(isRestorationRepairProduct(current))} → ${yn(isRestorationRepairProduct(updated))}`)
  return diffs.join(' / ') || '변경 없음'
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>(INITIAL_PRODUCT_CHANGE_LOGS)

  function addProduct(product: Product) {
    setProducts(prev => [product, ...prev])
  }

  function updateProduct(updated: Product) {
    const current = products.find(product => product.id === updated.id)
    if (current) {
      const summary = buildProductManagementDiff(current, updated)
      if (summary !== '변경 없음') {
        setProductChangeLogs(prev => [
          buildProductLog(current, 'update', summary),
          ...prev,
        ])
      }
    }
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function updateStockFields(id: string, patch: StockPatch) {
    const current = products.find(product => product.id === id)
    if (current) {
      const updated = { ...current, ...patch }
      const summary = buildProductManagementDiff(current, updated)
      if (summary !== '변경 없음') {
        setProductChangeLogs(prev => [
          buildProductLog(current, 'update', summary),
          ...prev,
        ])
      }
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function updateProductManagementFields(updates: ProductManagementUpdate[]) {
    const productByCode = new Map(products.map(product => [product.productCode, product]))
    const nextById = new Map<string, Product>()
    const changedAt = nowString()
    const logs: ProductChangeLog[] = []

    updates.forEach(update => {
      const current = productByCode.get(update.productCode)
      if (!current) return

      const patch: StockPatch = {}
      if (typeof update.name === 'string') patch.name = update.name
      if (typeof update.brandCategory === 'string') patch.brandCategory = update.brandCategory
      if (typeof update.midCategory === 'string') patch.midCategory = update.midCategory
      if (typeof update.subCategory === 'string') patch.subCategory = update.subCategory
      if (typeof update.factory1 === 'string') patch.factory1 = update.factory1
      if (update.factory2 !== undefined) patch.factory2 = update.factory2
      if (update.factory3 !== undefined) patch.factory3 = update.factory3
      if (typeof update.releaseDate === 'string') patch.releaseDate = update.releaseDate
      if (typeof update.partsRetentionPeriod === 'string') patch.partsRetentionPeriod = update.partsRetentionPeriod
      if (typeof update.isSafetyStock === 'boolean') patch.isSafetyStock = update.isSafetyStock
      if (typeof update.psQuantity === 'number') {
        patch.psQuantity = update.psQuantity
        patch.quantity = update.psQuantity
      }
      if (typeof update.threePlQuantity === 'number') patch.threePlQuantity = update.threePlQuantity
      if (typeof update.isRestorationRepair === 'boolean') patch.isRestorationRepair = update.isRestorationRepair
      if (Object.keys(patch).length === 0) return

      const updated = { ...current, ...patch }
      const summary = buildProductManagementDiff(current, updated)
      if (summary === '변경 없음') return

      nextById.set(current.id, updated)
      logs.push(buildProductLog(current, 'update', summary, changedAt))
    })

    if (nextById.size === 0) return 0

    setProducts(prev => prev.map(product => nextById.get(product.id) ?? product))
    setProductChangeLogs(prev => [...logs, ...prev])
    return nextById.size
  }

  return (
    <ProductsContext.Provider value={{ products, productChangeLogs, addProduct, updateProduct, updateStockFields, updateProductManagementFields }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
