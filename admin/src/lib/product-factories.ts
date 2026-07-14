export const PRODUCT_FACTORY_VALUES = ['GD', 'AT', 'AJ', 'SH', 'CO', 'JW', '확인불가'] as const

export const PRODUCT_FACTORY_OPTIONS = PRODUCT_FACTORY_VALUES.map(value => ({ value, label: value }))

export const PRODUCT_FACTORY_SELECT_OPTIONS = [
  { value: '-', label: '-' },
  ...PRODUCT_FACTORY_OPTIONS,
]

export function normalizeProductFactory(value?: string | null) {
  if (value === '-') return '-'
  if (!value) return '확인불가'
  return (PRODUCT_FACTORY_VALUES as readonly string[]).includes(value) ? value : '확인불가'
}

export function displayProductFactory(value?: string | null) {
  return normalizeProductFactory(value)
}
