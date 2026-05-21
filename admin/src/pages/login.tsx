import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const MOCK_PASSWORD = '123456'
const MOCK_OTP = '123456'

export function LoginPage() {
  const navigate = useNavigate()

  // step: 'credentials' | 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')

  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [credError, setCredError] = useState('')

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // OTP 화면으로 전환 시 첫 번째 박스에 포커스
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    }
  }, [step])

  function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !password) {
      setCredError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    if (password !== MOCK_PASSWORD) {
      setCredError('아이디 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    setOtp(['', '', '', '', '', ''])
    setOtpError('')
    setStep('otp')
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setOtpError('')
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
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setOtpError('6자리 코드를 모두 입력해주세요.')
      return
    }
    if (code !== MOCK_OTP) {
      setOtpError('인증 코드가 올바르지 않습니다.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
    navigate('/kr/ko')
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

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm px-8 py-10">
          {logo}

          <button
            onClick={() => setStep('credentials')}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            돌아가기
          </button>

          <h1 className="text-[18px] font-semibold text-gray-900 mb-1">2단계 인증</h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            6자리 인증 코드를 입력해주세요.
          </p>

          {/* 목업 힌트 */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-5 flex items-center gap-2">
            <span className="text-[11px] text-amber-600 font-medium">목업 코드</span>
            <span className="text-[13px] font-mono font-bold text-amber-700 tracking-[0.2em]">{MOCK_OTP}</span>
          </div>

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
              <p className="text-[12px] text-red-500">{otpError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            >
              확인
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm px-8 py-10">
        {logo}

        <h1 className="text-[18px] font-semibold text-gray-900 mb-4">로그인</h1>

        {/* 목업 힌트 */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-3">
          <span className="text-[11px] text-amber-600 font-medium whitespace-nowrap">목업 비밀번호</span>
          <span className="text-[13px] font-mono font-bold text-amber-700 tracking-[0.2em]">{MOCK_PASSWORD}</span>
        </div>

        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">아이디</label>
            <input
              type="text"
              value={id}
              onChange={e => { setId(e.target.value); setCredError('') }}
              placeholder="아이디를 입력하세요"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setCredError('') }}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
            />
          </div>

          {credError && (
            <p className="text-[12px] text-red-500">{credError}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-2"
          >
            로그인
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/forgot-password" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            비밀번호를 잊으셨나요?
          </a>
        </div>
      </div>
    </div>
  )
}
