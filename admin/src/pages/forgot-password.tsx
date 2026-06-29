import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, ArrowLeft, CheckCircle } from 'lucide-react'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const i18nLabel = useI18nLabel()
  const [loginId, setLoginId] = useState('')
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState<{ message: string; i18nKey: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showErrorToast(message: string, i18nKey: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, i18nKey })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loginId.trim()) {
      showErrorToast('로그인 ID를 입력해주세요.', 'auth.forgot_password.error.required')
      return
    }
    setToast(null)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[10000] rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <I18nText i18nKey={toast.i18nKey} className="text-white">
            {toast.message}
          </I18nText>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm px-8 py-10">

        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-[11px] font-bold text-white tracking-wider">PS</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] leading-tight">
              Product Service
            </div>
            <div className="text-[10px] text-gray-400 tracking-[0.06em] uppercase mt-0.5">Admin</div>
          </div>
        </div>

        {sent ? (
          /* 발송 완료 상태 */
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-2">
              <I18nText i18nKey="auth.forgot_password.sent.title">
                재설정 링크가 발송되었습니다
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              <I18nText i18nKey="auth.forgot_password.sent.description">
                입력한 계정에 등록된 이메일로<br />
                비밀번호 재설정 링크를 발송했습니다.
              </I18nText>
            </p>
            <p className="text-xs text-gray-400 mb-6">
              <I18nText i18nKey="auth.forgot_password.sent.help">
                링크는 1회만 사용할 수 있으며<br />
                발송 후 30분 동안 유효합니다.
              </I18nText>
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <I18nText i18nKey="auth.common.button.back_to_login">
                로그인으로 돌아가기
              </I18nText>
            </button>
          </div>
        ) : (
          /* ID 입력 상태 */
          <>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-1">
              <I18nText i18nKey="auth.forgot_password.title">
                비밀번호 찾기
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              <I18nText i18nKey="auth.forgot_password.description">
                로그인 ID를 입력하면 등록된 이메일로 비밀번호 재설정 링크를 발송합니다.
              </I18nText>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  <I18nText i18nKey="auth.common.field.login_id">
                    로그인 ID
                  </I18nText>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder={i18nLabel('auth.common.placeholder.login_id', '로그인 ID를 입력하세요')}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-2"
              >
                <I18nText i18nKey="auth.forgot_password.button.send">
                  재설정 링크 발송
                </I18nText>
              </button>
            </form>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1 mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <I18nText i18nKey="auth.common.button.back_to_login">
                로그인으로 돌아가기
              </I18nText>
            </button>
          </>
        )}

      </div>
    </div>
  )
}
