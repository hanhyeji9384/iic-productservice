import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useSession } from '@/lib/session-context'

const WARNING_SECONDS = 5 * 60 // 5분

function formatTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function SessionWarningModal() {
  const { warning, dismissWarning, triggerExpiry } = useSession()
  const navigate = useNavigate()
  const [remaining, setRemaining] = useState(WARNING_SECONDS)

  useEffect(() => {
    if (!warning.active) return
    setRemaining(WARNING_SECONDS)

    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          triggerExpiry('idle')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [warning.active])

  if (!warning.active) return null

  const isUrgent = remaining <= 60

  function handleExtend() {
    dismissWarning()
    // 실제 구현 시 여기서 토큰 갱신 API 호출
  }

  function handleLogout() {
    dismissWarning()
    navigate('/login')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-50' : 'bg-amber-50'}`}>
              <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">세션 만료 예정</h2>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            잠시 후 자동 로그아웃됩니다. 세션을 연장하시겠습니까?
          </p>

          <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${isUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
            <span className={`text-2xl font-mono font-bold tabular-nums ${isUrgent ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(remaining)}
            </span>
            <span className={`text-xs ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>후 자동 로그아웃</span>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
          <button
            onClick={handleExtend}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            연장하기
          </button>
        </div>
      </div>
    </div>
  )
}
