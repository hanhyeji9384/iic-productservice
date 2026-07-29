export function maskName(name: string) {
  if (name.length <= 1) return name
  if (name.length === 2) return `${name[0]}*`
  return `${name[0]}*${name[name.length - 1]}`
}

export function maskPhone(phone: string) {
  if (!phone) return '-'
  const parts = phone.split('-')
  if (parts.length === 3) {
    return [parts[0], '*'.repeat(Math.max(parts[1].length, 3)), parts[2]].join('-')
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  const head = digits.length > 10 ? digits.slice(0, 3) : digits.slice(0, Math.max(digits.length - 7, 2))
  const tail = digits.slice(-4)
  const middle = '*'.repeat(Math.max(digits.length - head.length - tail.length, 3))
  return `${head}-${middle}-${tail}`
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.length <= 2 ? 1 : 2
  return `${local.slice(0, visible)}${'*'.repeat(Math.max(local.length - visible, 3))}@${domain}`
}
