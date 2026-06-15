import { createContext, useContext, useState, type ReactNode } from 'react'
import { PARTS as INITIAL_PARTS, PART_CHANGE_LOGS as INITIAL_PART_CHANGE_LOGS } from './mock-data'
import type { Part, PartChangeLog } from './types'

type PartsContextValue = {
  parts: Part[]
  partChangeLogs: PartChangeLog[]
  addPart: (part: Part) => void
  addParts: (newParts: Part[]) => void
  updatePart: (updated: Part) => void
  updatePartStorageLocations: (updates: { partCode: string; storageLocation: string }[]) => number
  deletePart: (id: string) => void
}

const PartsContext = createContext<PartsContextValue | null>(null)

const CURRENT_ADMIN = {
  name: '한혜지',
  id: 'monster563',
}

function nowString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function logId(type: PartChangeLog['changeType'], partId: string) {
  return `${type}-${partId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildPartLog(part: Part, changeType: PartChangeLog['changeType'], summary: string, changedAt = nowString()): PartChangeLog {
  return {
    id: logId(changeType, part.id),
    partId: part.id,
    productCode: part.productCode,
    partCode: part.partCode,
    partName: part.name,
    changedAt,
    changeType,
    summary,
    changedByName: CURRENT_ADMIN.name,
    changedById: CURRENT_ADMIN.id,
  }
}

export function PartsProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS)
  const [partChangeLogs, setPartChangeLogs] = useState<PartChangeLog[]>(INITIAL_PART_CHANGE_LOGS)

  function addPart(part: Part) {
    setParts(prev => [part, ...prev])
  }

  function addParts(newParts: Part[]) {
    setParts(prev => [...newParts, ...prev])
  }

  function updatePart(updated: Part) {
    const current = parts.find(part => part.id === updated.id)
    if (current && current.storageLocation !== updated.storageLocation) {
      setPartChangeLogs(prev => [
        buildPartLog(current, 'update', `부속품 보관위치: ${current.storageLocation || '(없음)'} → ${updated.storageLocation || '(없음)'}`),
        ...prev,
      ])
    }
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function updatePartStorageLocations(updates: { partCode: string; storageLocation: string }[]) {
    const updateMap = new Map(
      updates
        .map(update => [update.partCode.trim(), update.storageLocation.trim()] as const)
        .filter(([partCode, storageLocation]) => partCode && storageLocation)
    )
    const changedAt = nowString()
    const changedParts = parts
      .map(part => ({ part, storageLocation: updateMap.get(part.partCode) }))
      .filter((item): item is { part: Part; storageLocation: string } =>
        !!item.storageLocation && item.storageLocation !== item.part.storageLocation
      )
    if (changedParts.length > 0) {
      setPartChangeLogs(prev => [
        ...changedParts.map(({ part, storageLocation }) =>
          buildPartLog(part, 'update', `부속품 보관위치: ${part.storageLocation || '(없음)'} → ${storageLocation || '(없음)'}`, changedAt)
        ),
        ...prev,
      ])
    }
    setParts(prev => prev.map(part => {
      const storageLocation = updateMap.get(part.partCode)
      if (!storageLocation || storageLocation === part.storageLocation) return part
      return { ...part, storageLocation, updatedAt: new Date().toISOString().slice(0, 19) }
    }))
    return changedParts.length
  }

  function deletePart(id: string) {
    const current = parts.find(part => part.id === id)
    if (current) {
      setPartChangeLogs(prev => [
        buildPartLog(current, 'delete', `부속품 삭제: ${current.partCode} / ${current.name}`),
        ...prev,
      ])
    }
    setParts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <PartsContext.Provider value={{ parts, partChangeLogs, addPart, addParts, updatePart, updatePartStorageLocations, deletePart }}>
      {children}
    </PartsContext.Provider>
  )
}

export function useParts() {
  const ctx = useContext(PartsContext)
  if (!ctx) throw new Error('useParts must be used within PartsProvider')
  return ctx
}
