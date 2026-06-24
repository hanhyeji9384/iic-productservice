import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Package, Search, Send } from 'lucide-react'
import { BRANCHES } from '@/lib/mock-data'
import { getComponentReturns, localTimestamp, updateComponentReturn } from '@/lib/prototype-storage'
import { maskEmail, maskName, maskPhone } from '@/lib/masking'
import type { ComponentReturn, ComponentReturnStatus, ComponentType } from '@/lib/types'

const COMPONENT_TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: 'CASE', label: '케이스' },
  { value: 'WARRANTY_CARD', label: '보증카드' },
  { value: 'LENS', label: '렌즈' },
  { value: 'CLOTH', label: '안경닦이' },
  { value: 'CHARGING_CASE', label: '충전 케이스' },
  { value: 'OTHER', label: '기타 구성품' },
]

const STATUS_OPTIONS: { value: ComponentReturnStatus; label: string; className: string }[] = [
  { value: 'WAITING', label: '반송대기', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'IN_PROGRESS', label: '송장등록', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: '반송완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

function componentTypeLabel(value: ComponentType) {
  return COMPONENT_TYPE_OPTIONS.find(option => option.value === value)?.label ?? value
}

function statusMeta(value: ComponentReturnStatus) {
  return STATUS_OPTIONS.find(option => option.value === value) ?? STATUS_OPTIONS[0]
}

function branchLabel(branchCode: string) {
  const branch = BRANCHES.find(item => item.code === branchCode)
  return branch ? `${branch.code} ${branch.name}` : branchCode
}

function matchesKeyword(record: ComponentReturn, keyword: string) {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  return [
    record.sourceTicketNo,
    record.customerName,
    record.phone,
    record.email,
    record.productName,
    record.trackingNo ?? '',
  ].some(value => value.toLowerCase().includes(q))
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-1">{label}</dt>
      <dd className="text-sm text-gray-800">{value || '-'}</dd>
    </div>
  )
}

export function ComponentReturnsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { langCode = 'ko' } = useParams()
  const locationState = location.state as { componentReturnId?: string } | null
  const [records, setRecords] = useState<ComponentReturn[]>(() => getComponentReturns())
  const [branch, setBranch] = useState('all')
  const [status, setStatus] = useState<'all' | ComponentReturnStatus>('all')
  const [componentType, setComponentType] = useState<'all' | ComponentType>('all')
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState(locationState?.componentReturnId ?? '')
  const [draft, setDraft] = useState<ComponentReturn | null>(null)

  const filtered = useMemo(() => {
    return records.filter(record => {
      if (branch !== 'all' && record.branchCode !== branch) return false
      if (status !== 'all' && record.status !== status) return false
      if (componentType !== 'all' && record.componentType !== componentType) return false
      return matchesKeyword(record, keyword)
    })
  }, [branch, componentType, keyword, records, status])

  const selected = records.find(record => record.id === selectedId) ?? filtered[0] ?? records[0]

  useEffect(() => {
    if (!selected) return
    setSelectedId(selected.id)
    setDraft(selected)
  }, [selected?.id])

  function saveDraft() {
    if (!draft) return
    const next: ComponentReturn = {
      ...draft,
      returnedAt: draft.status === 'COMPLETED'
        ? draft.returnedAt || localTimestamp()
        : null,
    }
    updateComponentReturn(next)
    setRecords(getComponentReturns())
    setDraft(next)
  }

  function sendAlimtalk() {
    if (!draft) return
    if (!draft.trackingNo?.trim()) {
      window.alert('운송장 번호를 입력한 뒤 알림톡을 발송해 주세요.')
      return
    }
    const next: ComponentReturn = { ...draft, alimtalkSentYn: 'Y' }
    updateComponentReturn(next)
    setRecords(getComponentReturns())
    setDraft(next)
    window.alert('[안내] 구성품 반송 알림톡 발송 처리되었습니다.')
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">구성품 반송</h1>
            <p className="mt-1 text-sm text-gray-400">운송장 정보와 반송 상태를 관리합니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-1 md:grid-cols-[180px_160px_180px_minmax(220px,1fr)] gap-2">
              <select
                value={branch}
                onChange={event => setBranch(event.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
              >
                <option value="all">전체 법인</option>
                <option value="1110">1110 GM 본사</option>
                <option value="C1002">C1002 GM_미국법인</option>
              </select>
              <select
                value={status}
                onChange={event => setStatus(event.target.value as 'all' | ComponentReturnStatus)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
              >
                <option value="all">전체 상태</option>
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={componentType}
                onChange={event => setComponentType(event.target.value as 'all' | ComponentType)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
              >
                <option value="all">전체 구성품</option>
                {COMPONENT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-300" />
                <input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder="티켓번호, 고객명, 연락처, 운송장 번호 검색"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">원본 티켓번호</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">고객명</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">연락처</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">구성품 유형</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">상태</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">운송장 번호</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">생성일시</th>
                    <th className="bg-gray-50/50 px-4 py-3 text-left text-[10px] font-medium leading-none text-gray-500">알림톡</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-xs text-gray-400">구성품 반송 건이 없습니다.</td>
                    </tr>
                  ) : filtered.map(record => {
                    const meta = statusMeta(record.status)
                    const active = selected?.id === record.id
                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedId(record.id)}
                        className={`cursor-pointer transition-colors hover:bg-gray-50/70 ${active ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              navigate(`/${langCode}/tickets/${record.sourceTicketNo}`)
                            }}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-900 underline-offset-4 hover:underline"
                          >
                            {record.sourceTicketNo}
                            <ExternalLink className="h-3 w-3 text-gray-300" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{maskName(record.customerName)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{maskPhone(record.phone)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{componentTypeLabel(record.componentType)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{record.trackingNo || '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{record.createdAt} <span className="font-sans text-gray-400">(KST)</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{record.alimtalkSentYn}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
            {draft ? (
              <>
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-gray-400">반송 관리</p>
                    <h2 className="mt-1 text-base font-bold text-gray-900">{componentTypeLabel(draft.componentType)}</h2>
                    <p className="mt-1 text-xs text-gray-400">{draft.sourceTicketNo}</p>
                  </div>
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta(draft.status).className}`}>
                    {statusMeta(draft.status).label}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  <section>
                    <h3 className="mb-3 text-xs font-semibold text-gray-700">고객 정보</h3>
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                      <Field label="고객명" value={draft.customerName} />
                      <Field label="법인" value={branchLabel(draft.branchCode)} />
                      <Field label="전화번호" value={draft.phone} />
                      <Field label="이메일" value={maskEmail(draft.email)} />
                      <div className="col-span-2">
                        <Field label="제품명" value={draft.productName} />
                      </div>
                    </dl>
                  </section>

                  <section className="border-t border-gray-100 pt-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-700">반송 정보</h3>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-gray-400">상태</span>
                      <select
                        value={draft.status}
                        onChange={event => setDraft(prev => prev ? { ...prev, status: event.target.value as ComponentReturnStatus } : prev)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-gray-400">택배사</span>
                      <input
                        value={draft.courier}
                        onChange={event => setDraft(prev => prev ? { ...prev, courier: event.target.value } : prev)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-gray-400">운송장 번호</span>
                      <input
                        value={draft.trackingNo ?? ''}
                        onChange={event => setDraft(prev => prev ? { ...prev, trackingNo: event.target.value } : prev)}
                        placeholder="운송장 번호 입력"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
                      />
                    </label>
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 pt-1">
                      <Field label="생성일시" value={`${draft.createdAt} (KST)`} />
                      <Field label="반송일시" value={draft.returnedAt ? `${draft.returnedAt} (KST)` : '-'} />
                    </dl>
                  </section>

                  <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={sendAlimtalk}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      알림톡 발송
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-400">선택된 반송 건이 없습니다.</p>
              </div>
            )}
          </aside>
        </div>

      </div>
    </div>
  )
}
