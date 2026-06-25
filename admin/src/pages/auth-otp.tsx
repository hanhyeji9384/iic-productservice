import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { I18nText } from '@/lib/i18n-inspector'

const MOCK_OTP = '123456'

export function AuthOtpPage() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpHasError, setOtpHasError] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean; i18nKey?: string } | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 50)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string, ok = true, i18nKey?: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, ok, i18nKey })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setOtpHasError(false)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...otp]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? ''
    setOtp(next)
    setOtpHasError(false)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setOtpHasError(true)
      showToast('6자리 코드를 모두 입력해주세요.', false, 'auth.otp.toast.required')
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
    if (code !== MOCK_OTP) {
      setOtpHasError(true)
      showToast('인증 코드가 올바르지 않습니다.', false, 'auth.otp.toast.invalid')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
    setOtpHasError(false)
    navigate('/ko')
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[10000] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.i18nKey ? (
            <I18nText i18nKey={toast.i18nKey} className="text-white">
              {toast.message}
            </I18nText>
          ) : (
            toast.message
          )}
        </div>
      )}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm px-8 py-10">
        {/* 목업 힌트 배지 */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowHint(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-semibold hover:bg-amber-100 transition-colors"
          >
            목업
            <ChevronDown className={`w-3 h-3 transition-transform ${showHint ? 'rotate-180' : ''}`} />
          </button>
          {showHint && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-amber-100 rounded-xl shadow-lg px-3 py-2.5 z-10 w-40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-600 font-medium">OTP 코드</span>
                <span className="text-[12px] font-mono font-bold text-amber-700 tracking-[0.2em]">{MOCK_OTP}</span>
              </div>
            </div>
          )}
        </div>

        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-[11px] font-bold text-white tracking-wider">PS</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] leading-tight">Product Service</div>
            <div className="text-[10px] text-gray-400 tracking-[0.06em] uppercase mt-0.5">Admin</div>
          </div>
        </div>

        <button
          onClick={() => {}}
          className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-5 cursor-default"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <I18nText i18nKey="common.button.back">
            돌아가기
          </I18nText>
        </button>

        <h1 className="text-[18px] font-semibold text-gray-900 mb-1">
          <I18nText i18nKey="auth.otp.title">
            2단계 인증
          </I18nText>
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          <I18nText i18nKey="auth.otp.description">
            6자리 인증 코드를 입력해주세요.
          </I18nText>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className={`w-10 h-12 text-center text-lg font-bold border rounded-xl outline-none transition-colors ${
                  otpHasError
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : digit
                    ? 'border-gray-400 bg-white text-gray-900'
                    : 'border-gray-200 bg-[#f8f9fb] text-gray-900 focus:border-gray-400 focus:bg-white'
                }`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <I18nText i18nKey="common.button.confirm">
              확인
            </I18nText>
          </button>
        </form>

      </div>
    </div>
  )
}
