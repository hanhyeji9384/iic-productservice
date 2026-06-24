import type { TicketStatus } from '@/lib/types'

export function ticketStatusI18nKey(status: TicketStatus) {
  return `ticket_status.${status.toLowerCase()}`
}
