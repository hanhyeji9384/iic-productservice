const PART_CODE_LENGTH = 8
const PART_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PART_CODE_ALPHABET = `${PART_CODE_LETTERS}23456789`

function randomIndex(max: number) {
  const crypto = globalThis.crypto

  if (crypto?.getRandomValues) {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] % max
  }

  return Math.floor(Math.random() * max)
}

function randomToken(length: number) {
  const chars = Array.from({ length }, () => PART_CODE_ALPHABET[randomIndex(PART_CODE_ALPHABET.length)])

  if (!chars.some(char => PART_CODE_LETTERS.includes(char))) {
    chars[randomIndex(length)] = PART_CODE_LETTERS[randomIndex(PART_CODE_LETTERS.length)]
  }

  return chars.join('')
}

export function generatePartCode(existingCodes: Iterable<string>, reservedCodes: Iterable<string> = []) {
  const used = new Set([...existingCodes, ...reservedCodes])

  for (let i = 0; i < 100; i += 1) {
    const code = randomToken(PART_CODE_LENGTH)
    if (!used.has(code)) return code
  }

  return randomToken(PART_CODE_LENGTH)
}
