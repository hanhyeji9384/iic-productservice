import { createContext, useContext, useState, type ReactNode } from 'react'
import { PARTS as INITIAL_PARTS, PART_CHANGE_LOGS as INITIAL_PART_CHANGE_LOGS } from './mock-data'
import type { Part, PartChangeLog } from './types'

type PartsContextValue = {
  parts: Part[]
  partChangeLogs: PartChangeLog[]
  addPart: (part: Part) => void
  addParts: (newParts: Part[]) => void
  updatePart: (updated: Part) => void
  updatePartManagementFields: (updates: PartManagementUpdate[]) => number
  deletePart: (id: string) => void
}

type PartManagementUpdate = {
  partCode: string
  specification?: string
  color?: string
  storageLocation?: string
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

function buildPartManagementDiff(current: Part, updated: Part) {
  const diffs: string[] = []
  if (current.specification !== updated.specification) diffs.push(`규격: ${current.specification || '(없음)'} → ${updated.specification || '(없음)'}`)
  if (current.color !== updated.color) diffs.push(`컬러: ${current.color || '(없음)'} → ${updated.color || '(없음)'}`)
  if (current.storageLocation !== updated.storageLocation) diffs.push(`부속품 보관위치: ${current.storageLocation || '(없음)'} → ${updated.storageLocation || '(없음)'}`)
  return diffs.join(' / ') || '변경 없음'
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
    if (current) {
      const summary = buildPartManagementDiff(current, updated)
      if (summary !== '변경 없음') {
        setPartChangeLogs(prev => [
          buildPartLog(current, 'update', summary),
          ...prev,
        ])
      }
    }
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function updatePartManagementFields(updates: PartManagementUpdate[]) {
    const updatesByCode = new Map(
      updates
        .map(update => [update.partCode.trim(), update] as const)
        .filter(([partCode]) => Boolean(partCode))
    )
    const changedAt = nowString()
    const updatedAt = new Date().toISOString().slice(0, 19)
    const nextById = new Map<string, Part>()
    const logs: PartChangeLog[] = []

    parts.forEach(part => {
      const update = updatesByCode.get(part.partCode)
      if (!update) return
      const next: Part = {
        ...part,
        specification: update.specification ?? part.specification,
        color: update.color ?? part.color,
        storageLocation: update.storageLocation ?? part.storageLocation,
        updatedAt,
      }
      const summary = buildPartManagementDiff(part, next)
      if (summary === '변경 없음') return
      nextById.set(part.id, next)
      logs.push(buildPartLog(part, 'update', summary, changedAt))
    })

    if (nextById.size === 0) return 0

    setPartChangeLogs(prev => [...logs, ...prev])
    setParts(prev => prev.map(part => nextById.get(part.id) ?? part))
    return nextById.size
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
    <PartsContext.Provider value={{ parts, partChangeLogs, addPart, addParts, updatePart, updatePartManagementFields, deletePart }}>
      {children}
    </PartsContext.Provider>
  )
}

export function useParts() {
  const ctx = useContext(PartsContext)
  if (!ctx) throw new Error('useParts must be used within PartsProvider')
  return ctx
}
