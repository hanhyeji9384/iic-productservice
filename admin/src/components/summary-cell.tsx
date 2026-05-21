type ParsedItem =
  | { type: 'change'; field: string; before: string; after: string }
  | { type: 'info';   field: string; value: string }
  | { type: 'action'; text: string; isAdd: boolean; isRemove: boolean }

function parseItem(raw: string): ParsedItem {
  const colonIdx = raw.indexOf(': ')
  const hasArrow  = raw.includes(' → ')

  if (colonIdx !== -1 && hasArrow) {
    const field = raw.slice(0, colonIdx)
    const rest  = raw.slice(colonIdx + 2)
    const arrow = rest.indexOf(' → ')
    return { type: 'change', field, before: rest.slice(0, arrow), after: rest.slice(arrow + 3) }
  }
  if (colonIdx !== -1) {
    return { type: 'info', field: raw.slice(0, colonIdx), value: raw.slice(colonIdx + 2) }
  }
  return { type: 'action', text: raw, isAdd: raw.endsWith(' 추가'), isRemove: raw.endsWith(' 제거') }
}

export function SummaryCell({ summary, changeType }: { summary: string; changeType?: string }) {
  if (changeType === 'delete') return <span className="text-gray-300">—</span>
  if (!summary || summary === '변경 없음') return <span className="text-gray-400 text-sm">변경 없음</span>

  const items = summary.split(' / ').map(s => s.trim()).filter(Boolean)

  return (
    <div className="space-y-1.5">
      {items.map((raw, i) => {
        const item = parseItem(raw)

        if (item.type === 'change') {
          return (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium mr-0.5">{item.field}</span>
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-mono line-through decoration-red-300">
                {item.before}
              </span>
              <span className="text-gray-300 text-xs">→</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono font-medium">
                {item.after}
              </span>
            </div>
          )
        }

        if (item.type === 'info') {
          return (
            <div key={i}>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-mono">
                {item.value}
              </span>
            </div>
          )
        }

        return (
          <div key={i}>
            <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
              item.isAdd    ? 'bg-emerald-50 text-emerald-700' :
              item.isRemove ? 'bg-red-50 text-red-600 line-through decoration-red-300' :
              'text-gray-700'
            }`}>
              {item.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}
