import { createContext, useContext, useState, type ReactNode } from 'react'
import { PRODUCTS as INITIAL_PRODUCTS, PRODUCT_CHANGE_LOGS as INITIAL_PRODUCT_CHANGE_LOGS } from './mock-data'
import type { Product, ProductChangeLog } from './types'

type StockPatch = {
  stockLocation?: string
  quantity?: number
  hasDecoration?: boolean
  isRestorationRepair?: boolean
}

type ProductManagementUpdate = {
  productCode: string
  hasDecoration?: boolean
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

const DEFAULT_DECORATION_PRODUCT_IDS = new Set(['P01', 'P02', 'P06', 'P08', 'P10', 'P11', 'P12', 'P14', 'P20', 'P21', 'P22'])

function nowString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function logId(type: ProductChangeLog['changeType'], productId: string) {
  return `${type}-${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function hasDecorationProduct(product: Product) {
  return product.hasDecoration ?? DEFAULT_DECORATION_PRODUCT_IDS.has(product.id)
}

function isRestorationRepairProduct(product: Product) {
  return product.isRestorationRepair ?? /METAL|COMBI/.test(product.subCategory)
}

function yn(value: boolean) {
  return value ? 'Y' : 'N'
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
  if (hasDecorationProduct(current) !== hasDecorationProduct(updated)) diffs.push(`장식보유여부: ${yn(hasDecorationProduct(current))} → ${yn(hasDecorationProduct(updated))}`)
  if (isRestorationRepairProduct(current) !== isRestorationRepairProduct(updated)) diffs.push(`복원수리: ${yn(isRestorationRepairProduct(current))} → ${yn(isRestorationRepairProduct(updated))}`)
  return diffs.join(' / ') || '변경 없음'
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>(INITIAL_PRODUCT_CHANGE_LOGS)

  function addProduct(product: Product) {
    setProducts(prev => [product, ...prev])
  }

  function updateProduct(updated: Product) {
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
      if (typeof update.hasDecoration === 'boolean') patch.hasDecoration = update.hasDecoration
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
