import type { ComponentType } from './types'

export const COMPONENT_TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: 'NONE', label: '-' },
  { value: 'LENS', label: '사렌즈' },
  { value: 'CASE', label: '케이스' },
  { value: 'CLOTH', label: '안경닦이' },
  { value: 'WARRANTY_CARD', label: '보증카드' },
  { value: 'OTHER', label: '복합/그 외' },
]

export function componentTypeLabel(value?: ComponentType | null) {
  return COMPONENT_TYPE_OPTIONS.find(option => option.value === value)?.label ?? '-'
}
