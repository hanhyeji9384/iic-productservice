import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'
import { useSession, type ExpiryReason } from '@/lib/session-context'

const MESSAGES: Record<ExpiryReason, string> = {
  idle: '장시간 활동이 없어 자동 로그아웃되었습니다.',
  absolute: '장시간 활동이 없어 자동 로그아웃되었습니다.',
  password_change: '비밀번호가 변경되어 다시 로그인이 필요합니다.',
  duplicate: '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.',
}

export function SessionExpiredModal() {
  const { isExpired, expiryReason, clearExpiry } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  // 8시간 절대 만료 → 로그인 화면으로 바로 이동 (인앱 모달 없음)
  useEffect(() => {
    if (isExpired && expiryReason === 'absolute') {
      clearExpiry()
      navigate('/login?expired=true')
    }
  }, [isExpired, expiryReason])

  if (!isExpired || expiryReason === 'absolute') return null

  function handleConfirm() {
    clearExpiry()
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
  }

  const message = MESSAGES[expiryReason ?? 'idle']

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">세션이 만료되었습니다</h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
