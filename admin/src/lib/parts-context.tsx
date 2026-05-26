import { createContext, useContext, useState, type ReactNode } from 'react'
import { PARTS as INITIAL_PARTS } from './mock-data'
import type { Part } from './types'

type PartsContextValue = {
  parts: Part[]
  addPart: (part: Part) => void
  updatePart: (updated: Part) => void
  deletePart: (id: string) => void
}

const PartsContext = createContext<PartsContextValue | null>(null)

export function PartsProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS)

  function addPart(part: Part) {
    setParts(prev => [part, ...prev])
  }

  function updatePart(updated: Part) {
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function deletePart(id: string) {
    setParts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <PartsContext.Provider value={{ parts, addPart, updatePart, deletePart }}>
      {children}
    </PartsContext.Provider>
  )
}

export function useParts() {
  const ctx = useContext(PartsContext)
  if (!ctx) throw new Error('useParts must be used within PartsProvider')
  return ctx
}
