import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type I18nInspectorMode = 'text' | 'key' | 'both'

type I18nInspectorContextValue = {
  mode: I18nInspectorMode
  setMode: (mode: I18nInspectorMode) => void
  labelFor: (key: string, text: string) => string
}

type I18nTextDisplay = 'badge' | 'tooltip'

const STORAGE_KEY = 'ps-admin-i18n-mode'
const I18nInspectorContext = createContext<I18nInspectorContextValue | null>(null)
const AUTO_CONTROL_ATTR = 'data-i18n-auto-control'
const PLACEHOLDER_CAPTION_ATTR = 'data-i18n-placeholder-caption'

const TEXT_TOKEN_MAP: Record<string, string> = {
  조회: 'search',
  검색: 'search',
  초기화: 'reset',
  저장: 'save',
  취소: 'cancel',
  삭제: 'delete',
  등록: 'create',
  수정: 'edit',
  추가: 'add',
  생성: 'create',
  다운로드: 'download',
  업로드: 'upload',
  새로고침: 'refresh',
  다음: 'next',
  이전: 'previous',
  목록: 'list',
  확인: 'confirm',
  닫기: 'close',
  전송: 'send',
  로그인: 'login',
  로그아웃: 'logout',
  이름: 'name',
  상태: 'status',
  유형: 'type',
  국가: 'country',
  고객명: 'customer-name',
  연락처: 'phone',
  이메일: 'email',
  제품명: 'product-name',
  제품코드: 'product-code',
  처리자: 'operator',
  처리일시: 'processed-at',
  생성일시: 'created-at',
  발송일시: 'sent-at',
  검색어: 'keyword',
  '검색 기준': 'search-criteria',
}

function readInitialMode(): I18nInspectorMode {
  if (typeof window === 'undefined') return 'text'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'key' || stored === 'both' ? stored : 'text'
}

function toKebab(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hashText(value: string) {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function routeNamespace() {
  if (typeof window === 'undefined') return 'home'
  const parts = window.location.pathname.split('/').filter(Boolean)
  const normalized = parts[0] === 'admin' ? parts.slice(1) : parts
  const withoutLang = /^[a-z]{2}$/i.test(normalized[0] ?? '') ? normalized.slice(1) : normalized
  return withoutLang.map(toKebab).filter(Boolean).join('::') || 'home'
}

function tokenFromText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (TEXT_TOKEN_MAP[normalized]) return TEXT_TOKEN_MAP[normalized]
  const ascii = toKebab(normalized)
  if (ascii && /[a-z]/.test(ascii) && ascii.length <= 40) return ascii
  return `text-${hashText(normalized)}`
}

function autoKey(kind: string, text: string) {
  return `admin::${routeNamespace()}::${kind}::${tokenFromText(text)}`
}

function cleanedText(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll(`[${PLACEHOLDER_CAPTION_ATTR}], [${AUTO_CONTROL_ATTR}], [data-i18n-managed]`).forEach(node => node.remove())
  return clone.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function autoKind(element: HTMLElement) {
  const tag = element.tagName.toLowerCase()
  if (tag === 'button' || tag === 'th' || tag === 'a' || element.getAttribute('role') === 'tab') return 'tooltip'
  return 'badge'
}

function isAutoTarget(element: HTMLElement) {
  if (element.closest('[data-i18n-managed], [data-i18n-skip], tbody td, input, textarea, select, svg')) return false
  if (element.closest(`[${AUTO_CONTROL_ATTR}]`)) return false
  if (element.children.length > 4 && !['button', 'th'].includes(element.tagName.toLowerCase())) return false
  const text = cleanedText(element)
  return text.length > 0 && text.length <= 140
}

function restorePlaceholder(element: HTMLInputElement | HTMLTextAreaElement) {
  const original = element.dataset.i18nOriginalPlaceholder
  if (original !== undefined) {
    element.placeholder = original
    delete element.dataset.i18nOriginalPlaceholder
  }
  element.removeAttribute('data-i18n-placeholder-key')
}

function removePlaceholderCaptions(root: ParentNode = document) {
  root.querySelectorAll(`[${PLACEHOLDER_CAPTION_ATTR}]`).forEach(node => node.remove())
}

function applyAutoInspector(mode: I18nInspectorMode) {
  if (typeof document === 'undefined') return
  document.body.dataset.i18nMode = mode

  const textTargets = Array.from(
    document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,label,button,th,legend,caption,p,a,[role="tab"]')
  )

  textTargets.forEach(element => {
    if (!isAutoTarget(element)) return
    const text = cleanedText(element)
    const key = autoKey(element.tagName.toLowerCase(), text)
    const kind = autoKind(element)
    element.dataset.i18nAutoKey = key
    element.dataset.i18nAutoKind = kind
    if (!element.dataset.i18nOriginalTitle && element.title) element.dataset.i18nOriginalTitle = element.title
    element.title = mode === 'text' ? (element.dataset.i18nOriginalTitle ?? '') : key
  })

  document.querySelectorAll<HTMLElement>('[data-i18n-auto-key]').forEach(element => {
    if (!isAutoTarget(element)) {
      delete element.dataset.i18nAutoKey
      delete element.dataset.i18nAutoKind
      if (element.dataset.i18nOriginalTitle !== undefined) {
        element.title = element.dataset.i18nOriginalTitle
        delete element.dataset.i18nOriginalTitle
      } else {
        element.removeAttribute('title')
      }
    }
  })

  if (mode !== 'both') removePlaceholderCaptions()

  const placeholders = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]'))
  placeholders.forEach(element => {
    if (element.closest('[data-i18n-managed], [data-i18n-skip]')) return
    const original = element.dataset.i18nOriginalPlaceholder ?? element.placeholder
    if (!element.dataset.i18nOriginalPlaceholder) element.dataset.i18nOriginalPlaceholder = original
    const key = autoKey('placeholder', original)
    element.dataset.i18nPlaceholderKey = key
    element.title = mode === 'text' ? '' : key
    element.placeholder = mode === 'key' ? key : original

    if (mode === 'both') {
      const existing = element.nextElementSibling
      if (existing?.hasAttribute(PLACEHOLDER_CAPTION_ATTR)) {
        if (existing.textContent !== key) existing.textContent = key
      } else {
        const caption = document.createElement('p')
        caption.setAttribute(PLACEHOLDER_CAPTION_ATTR, 'true')
        caption.setAttribute(AUTO_CONTROL_ATTR, 'true')
        caption.className = 'mt-1 truncate font-mono text-[10px] text-blue-500'
        caption.textContent = key
        element.insertAdjacentElement('afterend', caption)
      }
    }
  })

  if (mode === 'text') {
    placeholders.forEach(restorePlaceholder)
    removePlaceholderCaptions()
  }
}

export function I18nInspectorProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<I18nInspectorMode>(readInitialMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    let scanTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleScan = () => {
      if (scanTimer) clearTimeout(scanTimer)
      scanTimer = setTimeout(() => applyAutoInspector(mode), 40)
    }

    applyAutoInspector(mode)
    const observer = new MutationObserver(scheduleScan)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (scanTimer) clearTimeout(scanTimer)
      observer.disconnect()
    }
  }, [mode])

  const value = useMemo<I18nInspectorContextValue>(() => ({
    mode,
    setMode: setModeState,
    labelFor: (key, text) => mode === 'key' ? key : text,
  }), [mode])

  return (
    <I18nInspectorContext.Provider value={value}>
      {children}
    </I18nInspectorContext.Provider>
  )
}

export function useI18nInspector() {
  const context = useContext(I18nInspectorContext)
  if (!context) throw new Error('useI18nInspector must be used within I18nInspectorProvider')
  return context
}

export function useI18nLabel() {
  return useI18nInspector().labelFor
}

export function I18nText({
  i18nKey,
  children,
  display = 'badge',
  className = '',
}: {
  i18nKey: string
  children: React.ReactNode
  display?: I18nTextDisplay
  className?: string
}) {
  const { mode } = useI18nInspector()

  if (mode === 'key') {
    return (
      <span data-i18n-managed="true" className={`font-mono text-[11px] text-blue-700 ${className}`} title={i18nKey}>
        {i18nKey}
      </span>
    )
  }

  if (mode === 'both' && display === 'badge') {
    return (
      <span data-i18n-managed="true" className={`inline-flex min-w-0 flex-wrap items-center gap-1.5 ${className}`} title={i18nKey}>
        <span>{children}</span>
        <span className="inline-flex max-w-full rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-blue-600">
          {i18nKey}
        </span>
      </span>
    )
  }

  return (
    <span data-i18n-managed="true" className={className} title={mode === 'both' ? i18nKey : undefined}>
      {children}
    </span>
  )
}

export function I18nKeyCaption({ i18nKey }: { i18nKey: string }) {
  const { mode } = useI18nInspector()
  if (mode !== 'both') return null
  return (
    <p data-i18n-managed="true" className="mt-1 truncate font-mono text-[10px] text-blue-500" title={i18nKey}>
      {i18nKey}
    </p>
  )
}

export function I18nModeToggle() {
  const { mode, setMode } = useI18nInspector()
  const options: { value: I18nInspectorMode; label: string }[] = [
    { value: 'text', label: '문구' },
    { value: 'key', label: 'Key' },
    { value: 'both', label: '둘 다' },
  ]

  return (
    <div data-i18n-managed="true" className="flex items-center gap-1 rounded-xl bg-gray-100 p-1" title="로컬라이즈 점검 모드">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMode(option.value)}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
