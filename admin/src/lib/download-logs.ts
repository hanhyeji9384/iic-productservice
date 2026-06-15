export type DownloadType = '마스킹' | '원본'
export type PrivacyActionType = '고객정보 제거'
export type PrivacyActionStatus = '완료' | '실패'

export type DownloadLog = {
  id: number
  downloadedAt: string
  adminName: string
  adminId: string
  target: string
  downloadType: DownloadType
  count: number
  ip: string
  reason: string
}

export type PrivacyProcessingLog = {
  id: number
  processedAt: string
  adminName: string
  adminId: string
  subjectType: '고객'
  subjectNo: string
  actionType: PrivacyActionType
  processedFields: string[]
  ip: string
  reason: string
  status: PrivacyActionStatus
}

const PRIVACY_LOGS_STORAGE_KEY = 'ps-admin-privacy-processing-logs'
const DOWNLOAD_LOGS_STORAGE_KEY = 'ps-admin-download-logs'

const initialDownloadLogs: DownloadLog[] = [
  { id: 1, downloadedAt: '2026-06-03 09:14:22', adminName: '한혜지', adminId: 'monster563', target: '고객', downloadType: '원본', count: 12, ip: '10.0.1.42', reason: '고객 문의 이력 확인' },
  { id: 2, downloadedAt: '2026-06-04 14:30:05', adminName: '김민준', adminId: 'monster001', target: '고객', downloadType: '마스킹', count: 12, ip: '10.0.1.21', reason: '-' },
  { id: 3, downloadedAt: '2026-06-05 11:05:47', adminName: '이서연', adminId: 'monster042', target: '티켓', downloadType: '마스킹', count: 28, ip: '10.0.1.33', reason: '-' },
]

const initialPrivacyLogs: PrivacyProcessingLog[] = [
  {
    id: 1,
    processedAt: '2026-06-06 10:18:34',
    adminName: '한혜지',
    adminId: 'monster563',
    subjectType: '고객',
    subjectNo: '10000622',
    actionType: '고객정보 제거',
    processedFields: ['이름', 'ID', '전화번호', '마케팅 동의'],
    ip: '10.0.1.42',
    reason: '고객 요청에 따른 개인정보 제거',
    status: '완료',
  },
]

function loadStoredPrivacyLogs() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PRIVACY_LOGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as PrivacyProcessingLog[] : []
  } catch {
    return []
  }
}

function loadStoredDownloadLogs() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DOWNLOAD_LOGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as DownloadLog[] : []
  } catch {
    return []
  }
}

function persistDownloadLogs() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DOWNLOAD_LOGS_STORAGE_KEY, JSON.stringify(mockDownloadLogs))
}

function persistPrivacyLogs() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRIVACY_LOGS_STORAGE_KEY, JSON.stringify(mockPrivacyLogs))
}

const storedDownloadLogs = loadStoredDownloadLogs()
const mockDownloadLogs: DownloadLog[] = storedDownloadLogs.length > 0 ? storedDownloadLogs : initialDownloadLogs
const storedPrivacyLogs = loadStoredPrivacyLogs()
const mockPrivacyLogs: PrivacyProcessingLog[] = storedPrivacyLogs.length > 0 ? storedPrivacyLogs : initialPrivacyLogs

function nowTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function getDownloadLogs() {
  return mockDownloadLogs
}

export function getPrivacyLogs() {
  return mockPrivacyLogs
}

export function addDownloadLog(entry: Omit<DownloadLog, 'id' | 'downloadedAt'>) {
  mockDownloadLogs.unshift({
    id: Math.max(0, ...mockDownloadLogs.map(log => log.id)) + 1,
    downloadedAt: nowTimestamp(),
    ...entry,
  })
  persistDownloadLogs()
}

export function addPrivacyLog(entry: Omit<PrivacyProcessingLog, 'id' | 'processedAt'>) {
  mockPrivacyLogs.unshift({
    id: Math.max(0, ...mockPrivacyLogs.map(log => log.id)) + 1,
    processedAt: nowTimestamp(),
    ...entry,
  })
  persistPrivacyLogs()
}
