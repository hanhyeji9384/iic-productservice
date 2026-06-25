import { useNavigate } from 'react-router-dom'
import { ServerCrash, ArrowLeft, RotateCw } from 'lucide-react'
import { I18nText } from '@/lib/i18n-inspector'

export function Error500Page() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-6">
      <div className="animate-in fade-in duration-500 flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-24 h-24 rounded-[40px] bg-white shadow-sm flex items-center justify-center mb-8">
          <ServerCrash className="w-10 h-10 text-neutral-400" strokeWidth={1.5} />
        </div>
        <p className="text-[72px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
          500
        </p>
        <h1 className="text-xl font-bold text-neutral-800 mb-2">
          <I18nText i18nKey="error-500-title">
            일시적인 오류가 발생했습니다
          </I18nText>
        </h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-10">
          <I18nText i18nKey="error-500-description">
            서비스에 일시적인 문제가 발생했습니다.<br />
            잠시 후 다시 시도해주세요.
          </I18nText>
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-bold rounded-[32px] shadow-sm hover:bg-neutral-700 active:scale-95 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <I18nText i18nKey="error-common-button-home">
              홈으로 돌아가기
            </I18nText>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-500 text-sm font-bold rounded-[32px] border border-neutral-100 hover:bg-neutral-50 active:scale-95 transition-all duration-200"
          >
            <RotateCw className="w-4 h-4" />
            <I18nText i18nKey="error-500-button-retry">
              다시 시도
            </I18nText>
          </button>
        </div>
      </div>
    </div>
  )
}
