export type DownloadType = '마스킹' | '원본'
export type PrivacyActionType = '조회' | '생성' | '수정' | '삭제'
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
  subjectType: '고객' | '티켓'
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
  { id: 1, downloadedAt: '2026-07-28 09:14:22', adminName: '한혜지', adminId: 'monster563', target: '티켓', downloadType: '원본', count: 42, ip: '10.0.1.42', reason: '수리 현황 보고용' },
  { id: 2, downloadedAt: '2026-07-25 14:30:05', adminName: '김민준', adminId: 'monster001', target: '티켓', downloadType: '마스킹', count: 15, ip: '10.0.1.21', reason: '-' },
  { id: 3, downloadedAt: '2026-07-22 11:05:47', adminName: '이서연', adminId: 'monster042', target: '티켓', downloadType: '마스킹', count: 28, ip: '10.0.1.33', reason: '-' },
  { id: 4, downloadedAt: '2026-07-18 16:42:11', adminName: '박지훈', adminId: 'monster087', target: '티켓', downloadType: '원본', count: 7, ip: '10.0.1.55', reason: '클레임 대응' },
]

const initialPrivacyLogs: PrivacyProcessingLog[] = [
  { id: 1, processedAt: '2026-07-28 14:52:10', adminName: '한혜지', adminId: 'monster563', subjectType: '고객', subjectNo: '10001844', actionType: '조회', processedFields: ['고객 전체정보'], ip: '10.0.1.42', reason: '고객 문의 처리', status: '완료' },
  { id: 2, processedAt: '2026-07-28 14:31:05', adminName: '김민준', adminId: 'monster001', subjectType: '티켓', subjectNo: 'PS240100099', actionType: '수정', processedFields: ['수리진행처', '수리내용', '상태'], ip: '10.0.1.21', reason: '수리 결과 업데이트', status: '완료' },
  { id: 3, processedAt: '2026-07-28 11:05:47', adminName: '이서연', adminId: 'monster042', subjectType: '티켓', subjectNo: 'PS240100100', actionType: '생성', processedFields: ['티켓 전체정보'], ip: '10.0.1.33', reason: '신규 접수', status: '완료' },
  { id: 4, processedAt: '2026-07-27 16:44:22', adminName: '한혜지', adminId: 'monster563', subjectType: '티켓', subjectNo: 'PS240100098', actionType: '조회', processedFields: ['티켓 전체정보'], ip: '10.0.1.42', reason: '진행 상태 확인', status: '완료' },
  { id: 5, processedAt: '2026-07-27 10:18:34', adminName: '한혜지', adminId: 'monster563', subjectType: '고객', subjectNo: '10000877', actionType: '수정', processedFields: ['마케팅 동의'], ip: '10.0.1.42', reason: '고객 마케팅 동의 변경', status: '완료' },
  { id: 6, processedAt: '2026-07-26 15:22:09', adminName: '박지훈', adminId: 'monster087', subjectType: '고객', subjectNo: '10001200', actionType: '수정', processedFields: ['전화번호', '이메일'], ip: '10.0.1.55', reason: '고객 요청', status: '완료' },
  { id: 7, processedAt: '2026-07-26 09:33:44', adminName: '이서연', adminId: 'monster042', subjectType: '티켓', subjectNo: 'PS240100095', actionType: '수정', processedFields: ['배송방식', '출고예정일'], ip: '10.0.1.33', reason: '배송 일정 변경', status: '완료' },
  { id: 8, processedAt: '2026-07-25 17:05:11', adminName: '최윤아', adminId: 'monster201', subjectType: '고객', subjectNo: '10000877', actionType: '조회', processedFields: ['고객 전체정보'], ip: '10.0.1.71', reason: '수리 접수 전 고객 확인', status: '완료' },
  { id: 9, processedAt: '2026-07-25 14:19:38', adminName: '김민준', adminId: 'monster001', subjectType: '티켓', subjectNo: 'PS240100088', actionType: '삭제', processedFields: ['티켓 전체정보'], ip: '10.0.1.21', reason: '중복 접수 삭제', status: '완료' },
  { id: 10, processedAt: '2026-07-25 11:47:03', adminName: '한혜지', adminId: 'monster563', subjectType: '티켓', subjectNo: 'PS240100090', actionType: '생성', processedFields: ['티켓 전체정보'], ip: '10.0.1.42', reason: '신규 접수', status: '완료' },
  { id: 11, processedAt: '2026-07-24 16:55:29', adminName: '박지훈', adminId: 'monster087', subjectType: '티켓', subjectNo: 'PS240100085', actionType: '수정', processedFields: ['결제 완료 여부', '결제일자'], ip: '10.0.1.55', reason: '결제 확인 후 업데이트', status: '완료' },
  { id: 12, processedAt: '2026-07-24 10:30:18', adminName: '최윤아', adminId: 'monster201', subjectType: '티켓', subjectNo: 'PS240100078', actionType: '조회', processedFields: ['티켓 전체정보'], ip: '10.0.1.71', reason: '접수 이력 확인', status: '완료' },
  { id: 13, processedAt: '2026-07-23 14:02:55', adminName: '이서연', adminId: 'monster042', subjectType: '고객', subjectNo: '10001500', actionType: '조회', processedFields: ['고객 전체정보'], ip: '10.0.1.33', reason: 'VIP 고객 접수 이력 확인', status: '완료' },
  { id: 14, processedAt: '2026-07-23 09:14:42', adminName: '한혜지', adminId: 'monster563', subjectType: '티켓', subjectNo: 'PS240100080', actionType: '수정', processedFields: ['상태', '수리진행처'], ip: '10.0.1.42', reason: '협력업체 배정', status: '완료' },
  { id: 15, processedAt: '2026-07-22 16:38:07', adminName: '김민준', adminId: 'monster001', subjectType: '고객', subjectNo: '10000311', actionType: '수정', processedFields: ['마케팅 동의'], ip: '10.0.1.21', reason: '고객 마케팅 동의 변경', status: '완료' },
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
