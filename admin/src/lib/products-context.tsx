import { createContext, useContext, useState, type ReactNode } from 'react'
import { PRODUCTS as INITIAL_PRODUCTS } from './mock-data'
import type { Product } from './types'

type StockPatch = {
  stockLocation?: string
  quantity?: number
  hasDecoration?: boolean
  isRestorationRequest?: boolean
}

type ProductsContextValue = {
  products: Product[]
  addProduct: (product: Product) => void
  updateProduct: (updated: Product) => void
  deleteProduct: (id: string) => void
  updateStockFields: (id: string, patch: StockPatch) => void
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)

  function addProduct(product: Product) {
    setProducts(prev => [product, ...prev])
  }

  function updateProduct(updated: Product) {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function deleteProduct(id: string) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function updateStockFields(id: string, patch: StockPatch) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, updateStockFields }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
