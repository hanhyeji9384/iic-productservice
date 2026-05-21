import { createContext, useContext, useState, type ReactNode } from 'react'
import { MEMBERS as INITIAL_MEMBERS } from './mock-data'
import type { Member } from './types'

type MembersContextValue = {
  members: Member[]
  updateMember: (updated: Member) => void
  addMember: (member: Member) => void
  deleteMember: (id: string) => void
}

const MembersContext = createContext<MembersContextValue | null>(null)

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)

  function updateMember(updated: Member) {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function addMember(member: Member) {
    setMembers(prev => [...prev, member])
  }

  function deleteMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <MembersContext.Provider value={{ members, updateMember, addMember, deleteMember }}>
      {children}
    </MembersContext.Provider>
  )
}

export function useMembers() {
  const ctx = useContext(MembersContext)
  if (!ctx) throw new Error('useMembers must be used within MembersProvider')
  return ctx
}
