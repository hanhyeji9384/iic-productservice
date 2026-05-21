import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'

const MOCK_OTP = '123456'

export function AuthOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [done, setDone] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 50)
  }, [])

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setOtpError('')
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
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setOtpError('6자리 코드를 모두 입력해주세요.'); return }
    if (code !== MOCK_OTP) {
      setOtpError('인증 코드가 올바르지 않습니다.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
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

        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-gray-900 mb-1">인증 완료</p>
            <p className="text-sm text-gray-400">로그인에 성공했습니다.</p>
            <button
              onClick={() => { setDone(false); setOtp(['', '', '', '', '', '']); setTimeout(() => otpRefs.current[0]?.focus(), 50) }}
              className="mt-6 text-[12px] text-gray-400 hover:text-gray-600 transition-colors underline"
            >
              다시 테스트하기
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-5 cursor-default"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              돌아가기
            </button>

            <h1 className="text-[18px] font-semibold text-gray-900 mb-1">2단계 인증</h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              6자리 인증 코드를 입력해주세요.
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
                      otpError
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : digit
                        ? 'border-gray-400 bg-white text-gray-900'
                        : 'border-gray-200 bg-[#f8f9fb] text-gray-900 focus:border-gray-400 focus:bg-white'
                    }`}
                  />
                ))}
              </div>

              {otpError && <p className="text-[12px] text-red-500">{otpError}</p>}

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
              >
                확인
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
