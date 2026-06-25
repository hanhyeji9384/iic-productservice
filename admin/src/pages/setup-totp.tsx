import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Copy, Check, ArrowLeft, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { I18nText } from '@/lib/i18n-inspector'

const MOCK_SECRET = 'JBSWY3DPEHPK3PXP'
const MOCK_OTP = '123456'

// 21×21 QR 코드 패턴 (1=검정, 0=흰색)
const QR: number[][] = [
  [1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1, 0, 1,0,1,0,1, 0, 1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1, 0, 0,1,1,0,0, 0, 1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1, 0, 1,1,0,1,0, 0, 1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1, 0, 0,0,1,0,1, 0, 1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0, 0, 1,0,0,1,0, 0, 0,0,0,0,0,0,0],
  [1,0,1,1,0,1,1, 0, 1,1,0,1,1, 0, 1,0,1,1,0,1,1],
  [0,1,0,0,1,0,0, 1, 0,0,1,0,1, 1, 0,1,0,0,1,0,0],
  [1,1,0,1,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,1,0,1,1],
  [0,0,1,0,1,1,0, 1, 1,0,1,0,1, 1, 0,1,1,0,1,0,0],
  [1,0,0,1,0,0,1, 0, 1,1,0,0,1, 0, 0,1,0,1,1,0,1],
  [0,0,0,0,0,0,0, 0, 0,1,0,1,0, 1, 1,0,0,1,0,1,0],
  [1,1,1,1,1,1,1, 0, 1,0,1,0,0, 0, 1,0,0,1,0,0,1],
  [1,0,0,0,0,0,1, 0, 0,1,0,1,1, 0, 0,1,1,0,1,0,0],
  [1,0,1,1,1,0,1, 0, 1,0,0,1,0, 0, 1,0,0,1,1,0,1],
  [1,0,1,1,1,0,1, 0, 0,1,1,0,0, 1, 0,1,0,0,0,1,0],
  [1,0,1,1,1,0,1, 0, 1,0,1,0,0, 0, 1,0,1,1,0,0,1],
  [1,0,0,0,0,0,1, 0, 0,1,0,0,1, 1, 0,1,0,0,1,0,0],
  [1,1,1,1,1,1,1, 0, 1,0,0,1,0, 0, 1,1,0,1,0,1,1],
]

function MockQrCode() {
  const cell = 8
  const pad = 16
  const total = 21 * cell + pad * 2
  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
      <rect width={total} height={total} fill="white" rx="8"/>
      {QR.flatMap((row, y) =>
        row.map((v, x) =>
          v ? <rect key={`${x}-${y}`} x={x * cell + pad} y={y * cell + pad} width={cell} height={cell} fill="#111827"/> : null
        )
      )}
    </svg>
  )
}

type Step = 'scan' | 'verify' | 'done'

export function SetupTotpPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('scan')
  const [showManual, setShowManual] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [copied, setCopied] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpErrorKey, setOtpErrorKey] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleCopy() {
    navigator.clipboard.writeText(MOCK_SECRET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next); setOtpError(''); setOtpErrorKey('')
    if (digit && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = Array(6).fill('')
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? ''
    setOtp(next)
    setOtpError('')
    setOtpErrorKey('')
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setOtpError('6자리 코드를 모두 입력해주세요.')
      setOtpErrorKey('auth.setup_2fa.error.required')
      return
    }
    if (code !== MOCK_OTP) {
      setOtpError('코드가 올바르지 않습니다. Google Authenticator 앱을 다시 확인해주세요.')
      setOtpErrorKey('auth.setup_2fa.error.invalid')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
    setOtpError('')
    setOtpErrorKey('')
    setStep('done')
  }

  const logo = (
    <div className="flex items-center gap-2.5 mb-8">
      <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-white tracking-wider">PS</span>
      </div>
      <div>
        <div className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] leading-tight">Product Service</div>
        <div className="text-[10px] text-gray-400 tracking-[0.06em] uppercase mt-0.5">Admin</div>
      </div>
    </div>
  )

  // 완료
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm px-8 py-10">
          {logo}
          <div className="text-center py-2">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-[28px] bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" strokeWidth={1.5}/>
              </div>
            </div>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-2">
              <I18nText i18nKey="auth.setup_2fa.done.title">
                2단계 인증 설정 완료
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              <I18nText i18nKey="auth.setup_2fa.done.description">
                다음 로그인부터 Google Authenticator 앱의 코드로 인증합니다.
              </I18nText>
            </p>
            <button
              onClick={() => navigate('/ko')}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            >
              <I18nText i18nKey="auth.setup_2fa.button.start">
                시작하기
              </I18nText>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4 py-10">
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

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-1.5 mb-7">
          {(['scan', 'verify'] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                step === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {idx + 1}
              </div>
              {idx === 0 && <div className="flex-1 h-px bg-gray-100"/>}
            </div>
          ))}
        </div>

        {/* STEP 1 — QR 스캔 */}
        {step === 'scan' && (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400"/>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                <I18nText i18nKey="auth.setup_2fa.eyebrow">
                  2단계 인증 설정
                </I18nText>
              </span>
            </div>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-1.5">
              <I18nText i18nKey="auth.setup_2fa.scan.title">
                QR 코드 스캔
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              <I18nText i18nKey="auth.setup_2fa.scan.description">
                Google Authenticator 앱을 열고 아래 QR 코드를 스캔하세요.
              </I18nText>
            </p>

            {/* QR 코드 */}
            <div className="flex justify-center mb-5">
              <div className="p-2.5 border border-gray-100 rounded-2xl shadow-sm">
                <MockQrCode/>
              </div>
            </div>

            {/* 앱 안내 */}
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3 mb-5">
              <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-blue-600">G</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                <I18nText i18nKey="auth.setup_2fa.scan.app_guide">
                  앱이 없다면 <span className="font-semibold">Google Authenticator</span>를 App Store 또는 Google Play에서 설치하세요.
                </I18nText>
              </p>
            </div>

            {/* 수동 입력 */}
            <button
              onClick={() => setShowManual(v => !v)}
              className="w-full flex items-center justify-between text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-2 py-1"
            >
              <span>
                <I18nText i18nKey="auth.setup_2fa.manual.toggle">
                  QR 코드를 스캔할 수 없나요?
                </I18nText>
              </span>
              {showManual ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
            </button>

            {showManual && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-3 mb-4">
                <p className="text-[11px] text-gray-400 mb-2">
                  <I18nText i18nKey="auth.setup_2fa.manual.description">
                    앱에서 키를 직접 입력하세요
                  </I18nText>
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] font-mono text-gray-700 tracking-[0.1em] break-all leading-relaxed">
                    {MOCK_SECRET}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-emerald-500"/>
                      : <Copy className="w-3.5 h-3.5"/>
                    }
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('verify')}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-1"
            >
              <I18nText i18nKey="auth.setup_2fa.button.scan_complete">
                스캔 완료
              </I18nText>
            </button>
          </>
        )}

        {/* STEP 2 — 코드 확인 */}
        {step === 'verify' && (
          <>
            <button
              onClick={() => setStep('scan')}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-5"
            >
              <ArrowLeft className="w-3.5 h-3.5"/>
              <I18nText i18nKey="common.button.back">
                돌아가기
              </I18nText>
            </button>

            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400"/>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                <I18nText i18nKey="auth.setup_2fa.eyebrow">
                  2단계 인증 설정
                </I18nText>
              </span>
            </div>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-1.5">
              <I18nText i18nKey="auth.setup_2fa.verify.title">
                코드 확인
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              <I18nText i18nKey="auth.setup_2fa.verify.description">
                앱에 등록이 완료되었나요? 앱에 표시된 6자리 코드를 입력해주세요.
              </I18nText>
            </p>

            <form onSubmit={handleVerify} className="space-y-5">
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
                      otpError
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : digit
                        ? 'border-gray-400 bg-white text-gray-900'
                        : 'border-gray-200 bg-[#f8f9fb] text-gray-900 focus:border-gray-400 focus:bg-white'
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-[12px] text-red-500 leading-relaxed">
                  <I18nText i18nKey={otpErrorKey}>
                    {otpError}
                  </I18nText>
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
              >
                <I18nText i18nKey="auth.setup_2fa.button.complete">
                  인증 완료
                </I18nText>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
