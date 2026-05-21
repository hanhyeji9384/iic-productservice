import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, ArrowLeft, CheckCircle } from 'lucide-react'
import { MEMBERS } from '@/lib/mock-data'

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  const masked = local.slice(0, 2) + '***'
  return `${masked}@${domain}`
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [sent, setSent] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loginId.trim()) {
      setError('아이디를 입력해주세요.')
      return
    }
    const member = MEMBERS.find(m => m.loginId === loginId.trim())
    if (!member) {
      setError('등록된 아이디가 없습니다.')
      return
    }
    setMaskedEmail(maskEmail(member.email))
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
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
            <h1 className="text-[18px] font-semibold text-gray-900 mb-2">이메일을 발송했습니다</h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              등록된 이메일 주소<br />
              <span className="font-medium text-gray-600">{maskedEmail}</span>으로<br />
              비밀번호 변경 링크를 전송했습니다.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              메일이 오지 않는다면 스팸함을 확인하거나<br />
              아래 버튼을 눌러 다시 시도해 주세요.
            </p>
            <button
              onClick={() => { setSent(false); setLoginId('') }}
              className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors mb-3"
            >
              다시 전송하기
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          /* ID 입력 상태 */
          <>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-1">비밀번호 찾기</h1>
            <p className="text-sm text-gray-400 mb-6">
              아이디를 입력하면 등록된 이메일로 비밀번호 변경 링크를 전송합니다.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">아이디</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => { setLoginId(e.target.value); setError('') }}
                    placeholder="아이디를 입력하세요"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                  />
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-red-500">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-2"
              >
                변경 링크 전송
              </button>
            </form>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1 mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              로그인으로 돌아가기
            </button>
          </>
        )}

      </div>
    </div>
  )
}
