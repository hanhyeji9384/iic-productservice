import { Hammer } from 'lucide-react'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <div className="text-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 mx-auto">
          <Hammer className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">준비 중입니다.</p>
        </div>
      </div>
    </div>
  )
}
