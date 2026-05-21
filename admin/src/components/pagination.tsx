import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  total: number
  perPage: number
  current: number
  onChange: (page: number) => void
}

export function Pagination({ total, perPage, current, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">
        {(current - 1) * perPage + 1}–{Math.min(current * perPage, total)} / 전체 {total}건
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-7 h-7 text-xs rounded-lg transition-colors ${
              p === current
                ? 'bg-gray-900 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
