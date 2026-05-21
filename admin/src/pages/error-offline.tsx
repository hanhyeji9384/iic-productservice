import { useEffect } from 'react'
import { WifiOff, RotateCw } from 'lucide-react'

export function ErrorOfflinePage() {

  useEffect(() => {
    function handleOnline() {
      window.location.reload()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-6">
      <div className="animate-in fade-in duration-500 flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-24 h-24 rounded-[40px] bg-white shadow-sm flex items-center justify-center mb-8">
          <WifiOff className="w-10 h-10 text-neutral-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-neutral-800 mb-2">
          네트워크에 연결할 수 없습니다
        </h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-10">
          인터넷 연결을 확인한 후<br />
          다시 시도해주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-bold rounded-[32px] shadow-sm hover:bg-neutral-700 active:scale-95 transition-all duration-200"
        >
          <RotateCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    </div>
  )
}
