import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, Lock, X } from 'lucide-react'
import { addDownloadLog } from '@/lib/download-logs'

type SimpleProps = {
  simple: true
  onDownload?: () => void
}

type PersonalProps = {
  simple?: false
  target: string
  count: number
  onMasked?: () => void
  onOriginal?: (password: string, reason: string) => void
}

type ExcelDownloadButtonProps = SimpleProps | PersonalProps

const CURRENT_ADMIN = {
  adminName: '한혜지',
  adminId: 'monster563',
  ip: '10.0.1.42',
}

export function ExcelDownloadButton(props: ExcelDownloadButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const closeModal = useCallback(() => {
    setShowModal(false)
    setPassword('')
    setReason('')
  }, [])

  useEffect(() => {
    if (!showMenu) return
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  useEffect(() => {
    if (!showModal) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showModal, closeModal])

  if (props.simple) {
    return (
      <button
        onClick={props.onDownload}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Excel 다운로드
      </button>
    )
  }

  const { target, count, onMasked, onOriginal } = props

  function handleMasked() {
    addDownloadLog({
      ...CURRENT_ADMIN,
      target,
      downloadType: '마스킹',
      count,
      reason: '-',
    })
    onMasked?.()
    setShowMenu(false)
  }

  function handleOriginalConfirm() {
    if (!password || !reason.trim()) return
    addDownloadLog({
      ...CURRENT_ADMIN,
      target,
      downloadType: '원본',
      count,
      reason: reason.trim(),
    })
    onOriginal?.(password, reason.trim())
    closeModal()
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Excel 다운로드
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg shadow-black/[0.08] z-20 overflow-hidden">
            <button
              onClick={handleMasked}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <Download className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <div className="font-medium">마스킹 다운로드</div>
                <div className="text-xs text-gray-400 mt-0.5">개인정보 가림 처리</div>
              </div>
            </button>
            <div className="h-px bg-gray-100 mx-3" />
            <button
              onClick={() => {
                setShowMenu(false)
                setShowModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <div className="font-medium">원본 다운로드</div>
                <div className="text-xs text-gray-400 mt-0.5">비밀번호 설정 + 로그 기록</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 w-10 h-10 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">원본 다운로드</h3>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 ml-[52px]">
                개인정보가 포함된 파일입니다. 다운로드 이력이 기록됩니다.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">파일 비밀번호 설정</label>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="다운로드할 파일에 설정할 비밀번호"
                  className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  다운로드 사유 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="원본 다운로드 사유를 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-[24px] flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleOriginalConfirm}
                disabled={!password || !reason.trim()}
                className="px-5 py-2.5 bg-black text-white rounded-2xl hover:bg-gray-900 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
