import { useNavigate } from 'react-router-dom'
import { SearchX, ArrowLeft } from 'lucide-react'

export function Error404Page() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-6">
      <div className="animate-in fade-in duration-500 flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-24 h-24 rounded-[40px] bg-white shadow-sm flex items-center justify-center mb-8">
          <SearchX className="w-10 h-10 text-neutral-400" strokeWidth={1.5} />
        </div>
        <p className="text-[72px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
          404
        </p>
        <h1 className="text-xl font-bold text-neutral-800 mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-10">
          요청하신 페이지가 존재하지 않거나<br />
          주소가 잘못 입력되었습니다.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-bold rounded-[32px] shadow-sm hover:bg-neutral-700 active:scale-95 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}
