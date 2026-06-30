import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle, LogIn, ChevronDown } from 'lucide-react'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'

const MOCK_PASSWORD = '123456'
const MOCK_OTP = '123456'
const MOCK_FIRST_LOGIN_ID = 'new_user' // 2FA 미등록 계정 (최초 로그인 시뮬레이션)

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const i18nLabel = useI18nLabel()
  const isExpiredNotice = searchParams.get('expired') === 'true'

  function dismissExpiredNotice() {
    searchParams.delete('expired')
    setSearchParams(searchParams, { replace: true })
  }

  // step: 'credentials' | 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')

  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [credError, setCredError] = useState('')
  const [credErrorKey, setCredErrorKey] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean; i18nKey?: string } | null>(null)

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpHasError, setOtpHasError] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const toastTimerRef = useRef<number | null>(null)

  // OTP 화면으로 전환 시 첫 번째 박스에 포커스
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    }
  }, [step])

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

  function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !password) {
      setCredError('아이디와 비밀번호를 입력해주세요.')
      setCredErrorKey('login.error.required')
      return
    }
    if (password !== MOCK_PASSWORD) {
      setCredError('')
      setCredErrorKey('')
      showToast('아이디 또는 비밀번호가 올바르지 않습니다.', false, 'login.toast.invalid_credentials')
      return
    }
    // 최초 로그인 (2FA 미등록) → QR 등록 화면으로 이동
    if (id === MOCK_FIRST_LOGIN_ID) {
      navigate('/setup-2fa')
      return
    }
    // 일반 로그인 (2FA 등록됨) → TOTP 입력
    setOtp(['', '', '', '', '', ''])
    setOtpHasError(false)
    setToast(null)
    setStep('otp')
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setOtpHasError(false)
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
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

  function handleOtpSubmit(e: React.FormEvent) {
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

  const logo = (
    <div className="flex items-center gap-2.5 mb-8">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
        <span className="text-[11px] font-bold text-white tracking-wider">PS</span>
      </div>
      <div>
        <div className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] leading-tight">Product Service</div>
        <div className="text-[10px] text-gray-400 tracking-[0.06em] uppercase mt-0.5">Admin</div>
      </div>
    </div>
  )

  const toastNode = toast && (
    <div
      className={`fixed bottom-6 right-6 z-[10000] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
        toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
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
  )

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        {toastNode}
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

          {logo}

          <button
            onClick={() => setStep('credentials')}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-5"
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

          <form onSubmit={handleOtpSubmit} className="space-y-5">
            {/* 6자리 입력 박스 */}
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

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      {/* 세션 만료 알림 모달 */}
      {isExpiredNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  <I18nText i18nKey="login.expired.title">
                    자동 로그아웃
                  </I18nText>
                </h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                <I18nText i18nKey="login.expired.description">
                  장시간 활동이 없어 자동 로그아웃되었습니다.
                </I18nText>
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={dismissExpiredNotice}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <I18nText i18nKey="common.button.confirm">
                  확인
                </I18nText>
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}

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
            <div className="absolute right-0 top-full mt-1 bg-white border border-amber-100 rounded-xl shadow-lg px-3 py-2.5 space-y-1.5 z-10 w-48">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-600 font-medium">비밀번호</span>
                <span className="text-[12px] font-mono font-bold text-amber-700 tracking-[0.2em]">{MOCK_PASSWORD}</span>
              </div>
              <div className="border-t border-amber-100"/>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-600 font-medium">최초 로그인 ID</span>
                <span className="text-[12px] font-mono font-bold text-amber-700 tracking-[0.1em]">{MOCK_FIRST_LOGIN_ID}</span>
              </div>
            </div>
          )}
        </div>

        {logo}

        <h1 className="text-[18px] font-semibold text-gray-900 mb-4">
          <I18nText i18nKey="login.title">
            로그인
          </I18nText>
        </h1>

        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
              <I18nText i18nKey="login.field.id">
                아이디
              </I18nText>
            </label>
            <input
              type="text"
              value={id}
              onChange={e => {
                setId(e.target.value)
                setCredError('')
                setCredErrorKey('')
              }}
              placeholder={i18nLabel('login.placeholder.id', '아이디를 입력하세요')}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
              <I18nText i18nKey="login.field.password">
                비밀번호
              </I18nText>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setCredError('')
                setCredErrorKey('')
              }}
              placeholder={i18nLabel('login.placeholder.password', '비밀번호를 입력하세요')}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
            />
          </div>

          {credError && (
            <p className="text-[12px] text-red-500">
              <I18nText i18nKey={credErrorKey}>
                {credError}
              </I18nText>
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-2"
          >
            <I18nText i18nKey="common.button.login">
              로그인
            </I18nText>
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            <I18nText i18nKey="login.link.forgot_password">
              비밀번호를 잊으셨나요?
            </I18nText>
          </Link>
        </div>
      </div>
    </div>
  )
}
