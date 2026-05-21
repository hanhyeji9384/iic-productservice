import { createContext, useContext, useState, type ReactNode } from 'react'

export type WarningType = 'idle' | 'absolute'
export type ExpiryReason = 'idle' | 'absolute' | 'password_change' | 'duplicate'

type SessionContextValue = {
  warning: { active: boolean; type: WarningType | null }
  triggerWarning: (type: WarningType) => void
  dismissWarning: () => void
  isExpired: boolean
  expiryReason: ExpiryReason | null
  triggerExpiry: (reason?: ExpiryReason) => void
  clearExpiry: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [warning, setWarning] = useState<{ active: boolean; type: WarningType | null }>({ active: false, type: null })
  const [isExpired, setIsExpired] = useState(false)
  const [expiryReason, setExpiryReason] = useState<ExpiryReason | null>(null)

  function triggerWarning(type: WarningType) {
    if (isExpired) return
    setWarning({ active: true, type })
  }

  function dismissWarning() {
    setWarning({ active: false, type: null })
  }

  function triggerExpiry(reason: ExpiryReason = 'idle') {
    if (isExpired) return
    setWarning({ active: false, type: null })
    setExpiryReason(reason)
    setIsExpired(true)
  }

  function clearExpiry() {
    setIsExpired(false)
    setExpiryReason(null)
  }

  return (
    <SessionContext.Provider value={{ warning, triggerWarning, dismissWarning, isExpired, expiryReason, triggerExpiry, clearExpiry }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
