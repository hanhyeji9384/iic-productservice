import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { I18nText, useI18nLabel } from '@/lib/i18n-inspector'

const MOCK_LOGIN_ID = 'monster563'

function countPasswordTypes(password: string) {
  let count = 0
  if (/[A-Za-z]/.test(password)) count += 1
  if (/[A-Z]/.test(password)) count += 1
  if (/[a-z]/.test(password)) count += 1
  if (/[0-9]/.test(password)) count += 1
  if (/[^A-Za-z0-9]/.test(password)) count += 1
  return count
}

function hasRepeatedRun(password: string) {
  return /(.)\1{3,}/.test(password)
}

function isAlphaNumericSequence(value: string) {
  if (!/^[a-z0-9]{4}$/i.test(value)) return false
  const chars = value.toLowerCase().split('')
  const allLetters = chars.every(char => /[a-z]/.test(char))
  const allDigits = chars.every(char => /[0-9]/.test(char))
  if (!allLetters && !allDigits) return false

  let forward = true
  let backward = true
  for (let index = 1; index < chars.length; index += 1) {
    const diff = chars[index].charCodeAt(0) - chars[index - 1].charCodeAt(0)
    forward = forward && diff === 1
    backward = backward && diff === -1
  }
  return forward || backward
}

function hasSequentialRun(password: string) {
  for (let index = 0; index <= password.length - 4; index += 1) {
    if (isAlphaNumericSequence(password.slice(index, index + 4))) return true
  }
  return false
}

function hasEasyPattern(password: string) {
  return hasRepeatedRun(password) || hasSequentialRun(password) || /qwer/i.test(password)
}

function getPasswordPolicyError(password: string) {
  if (password.length < 8) {
    return {
      key: 'auth.reset_password.error.min_length',
      message: '새 비밀번호는 8자 이상이어야 합니다.',
    }
  }
  if (password.toLowerCase().includes(MOCK_LOGIN_ID.toLowerCase())) {
    return {
      key: 'auth.reset_password.error.personal_info',
      message: '개인 식별 정보가 포함된 비밀번호는 사용할 수 없습니다.',
    }
  }
  if (hasEasyPattern(password)) {
    return {
      key: 'auth.reset_password.error.easy_pattern',
      message: '쉬운 패턴의 비밀번호는 사용할 수 없습니다.',
    }
  }
  if (countPasswordTypes(password) < 3) {
    return {
      key: 'auth.reset_password.error.composition',
      message: '새 비밀번호는 특수문자, 영문, 숫자, 대문자, 소문자 중 3가지 이상을 조합해야 합니다.',
    }
  }
  return null
}

export function ResetPasswordPage({ done: initialDone = false }: { done?: boolean } = {}) {
  const navigate = useNavigate()
  const i18nLabel = useI18nLabel()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(initialDone)
  const [errorField, setErrorField] = useState<'password' | 'confirm' | 'both' | null>(null)
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

  function clearErrors() {
    setErrorField(null)
    setToast(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !confirm) {
      setErrorField('both')
      showErrorToast('모든 항목을 입력해주세요.', 'auth.reset_password.error.required')
      return
    }
    const policyError = getPasswordPolicyError(password)
    if (policyError) {
      setErrorField('password')
      showErrorToast(policyError.message, policyError.key)
      return
    }
    if (password !== confirm) {
      setErrorField('confirm')
      showErrorToast('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.', 'auth.reset_password.error.mismatch')
      return
    }
    clearErrors()
    setDone(true)
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

        {done ? (
          /* 변경 완료 상태 */
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-2">
              <I18nText i18nKey="auth.reset_password.done.title">
                비밀번호가 변경되었습니다
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              <I18nText i18nKey="auth.reset_password.done.description">
                새 비밀번호로 로그인해 주세요.
              </I18nText>
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            >
              <I18nText i18nKey="auth.common.button.back_to_login">
                로그인하러 가기
              </I18nText>
            </button>
          </div>
        ) : (
          /* 비밀번호 입력 상태 */
          <>
            <h1 className="text-[18px] font-semibold text-gray-900 mb-1">
              <I18nText i18nKey="auth.reset_password.title">
                비밀번호 변경
              </I18nText>
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              <I18nText i18nKey="auth.reset_password.description">
                새로 사용할 비밀번호를 입력해주세요.
              </I18nText>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  <I18nText i18nKey="auth.reset_password.field.new_password">
                    새 비밀번호
                  </I18nText>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      clearErrors()
                    }}
                    placeholder={i18nLabel('auth.reset_password.placeholder.new_password', '8자 이상 입력하세요')}
                    className={`w-full px-3.5 pr-10 py-2.5 text-sm border rounded-xl outline-none transition-colors placeholder:text-gray-300 ${
                      errorField === 'password' || errorField === 'both'
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  <I18nText i18nKey="auth.reset_password.field.confirm_password">
                    비밀번호 확인
                  </I18nText>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => {
                      setConfirm(e.target.value)
                      clearErrors()
                    }}
                    placeholder={i18nLabel('auth.reset_password.placeholder.confirm_password', '비밀번호를 한 번 더 입력하세요')}
                    className={`w-full px-3.5 pr-10 py-2.5 text-sm border rounded-xl outline-none transition-colors placeholder:text-gray-300 ${
                      errorField === 'confirm' || errorField === 'both'
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mt-2"
              >
                <I18nText i18nKey="auth.reset_password.button.submit">
                  비밀번호 변경
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
