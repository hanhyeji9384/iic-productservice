const PART_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomToken(length: number) {
  const crypto = globalThis.crypto

  if (crypto?.getRandomValues) {
    const values = new Uint32Array(length)
    crypto.getRandomValues(values)
    return Array.from(values, value => PART_CODE_ALPHABET[value % PART_CODE_ALPHABET.length]).join('')
  }

  return Array.from({ length }, () => (
    PART_CODE_ALPHABET[Math.floor(Math.random() * PART_CODE_ALPHABET.length)]
  )).join('')
}

export function generatePartCode(existingCodes: Iterable<string>, reservedCodes: Iterable<string> = []) {
  const used = new Set([...existingCodes, ...reservedCodes])

  for (let i = 0; i < 20; i += 1) {
    const code = `PT-${randomToken(10)}`
    if (!used.has(code)) return code
  }

  return `PT-${Date.now().toString(36).toUpperCase()}${randomToken(4)}`
}
