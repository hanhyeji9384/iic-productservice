import { useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Home, Lock, Mail, Phone, User } from 'lucide-react'
import { STORES } from '@/lib/mock-data'
import type { Store } from '@/lib/types'

const STORE_GROUP_LABELS: Record<number, string> = {
  100: 'Flagship',
  110: '백화점',
  120: 'Mall',
  130: '면세점',
  140: '안경원',
  150: '편집샵',
  180: '해외법인(자회사)',
  200: 'Distributor',
}

type DetailTab = 'address' | 'ticket'

function groupLabel(storeGroup: number) {
  return STORE_GROUP_LABELS[storeGroup] ?? '기타'
}

function textValue(value?: string | null) {
  return value ?? ''
}

function displayValue(value?: string | null) {
  const normalized = textValue(value).trim()
  return normalized || '-'
}

function activeLabel(store: Store) {
  return store.active === 'N' ? 'No Active' : 'Active'
}

function fullAddress(store: Store) {
  return [store.address1, store.address2].filter(Boolean).join(' ')
}

function IconLabel({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
      <h6 className="mb-0 text-sm font-semibold text-gray-900">{label}</h6>
    </div>
  )
}

function SummaryItem({
  icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <IconLabel icon={icon} label={label} />
      <div className="ml-6 text-sm text-gray-700 leading-6">{children}</div>
    </div>
  )
}

function DetailInput({
  label,
  value,
  uppercase,
}: {
  label: string
  value?: string | null
  uppercase?: boolean
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-5 border-b border-gray-100 py-3 last:border-b-0">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`min-h-5 text-sm font-medium text-gray-800 ${uppercase ? 'uppercase' : ''}`}>
        {displayValue(value)}
      </p>
    </div>
  )
}

export function StoreDetailPage() {
  const { code, langCode } = useParams<{ code: string; langCode: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<DetailTab>('address')
  const store = STORES.find(item => item.code === code)
  const pfx = `/${langCode}`

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-sm text-gray-400">존재하지 않는 매장/BP(B2B)입니다.</p>
        <button onClick={() => navigate(`${pfx}/stores`)} className="text-sm text-gray-600 underline">목록으로 돌아가기</button>
      </div>
    )
  }

  const address = fullAddress(store)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-gray-700">고객</span>
      </nav>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">매장/BP(B2B)</h1>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <input type="hidden" value={store.code} readOnly />
          <p className="font-bold text-gray-900 mb-8">{store.name}</p>

          <div className="grid grid-cols-4 gap-x-10 gap-y-8">
            <div className="space-y-8">
              <SummaryItem icon={User} label="계정 아이디">
                <p>{store.code}</p>
              </SummaryItem>
              <SummaryItem icon={Home} label="주소">
                <button
                  type="button"
                  onClick={() => address && window.open(`https://google.co.kr/maps/place/${encodeURIComponent(address)}`, '_blank')}
                  className="text-left text-gray-700 hover:underline"
                >
                  {address}
                </button>
                <p>{textValue(store.zipCode)}</p>
              </SummaryItem>
            </div>

            <div className="space-y-8">
              <div className="h-11" />
              <SummaryItem icon={Lock} label="상태">
                <p>{activeLabel(store)}</p>
              </SummaryItem>
            </div>

            <div className="space-y-8">
              <SummaryItem icon={Mail} label="접수처">
                <p>{groupLabel(store.storeGroup)}</p>
              </SummaryItem>
              <SummaryItem icon={Phone} label="Tel">
                <a href={`tel:${textValue(store.tel1)}`} className="text-gray-700 hover:underline">{textValue(store.tel1)}</a>
              </SummaryItem>
            </div>

            <div className="space-y-8">
              <SummaryItem icon={User} label="이름">
                <p>{store.name}</p>
              </SummaryItem>
              <SummaryItem icon={Phone} label="대표담당자 번호">
                <a href={`tel:${textValue(store.tel2)}`} className="text-gray-700 hover:underline">{textValue(store.tel2)}</a>
              </SummaryItem>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex gap-8 border-b border-gray-200">
            <button
              onClick={() => setTab('address')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'address' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'}`}
            >
              주소
            </button>
            <button
              onClick={() => setTab('ticket')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'ticket' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'}`}
            >
              티켓
            </button>
          </div>

          {tab === 'address' ? (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <h2 className="mb-2 text-base font-semibold text-gray-900">세부사항</h2>
                  <div>
                    <DetailInput label="국가/지역" value={store.country} />
                    <DetailInput label="번지" value={store.oldZipCode} />
                    <DetailInput label="상세 주소" value={store.address2} />
                    <DetailInput label="시" value={store.address1} />
                    <DetailInput label="우편번호" value={store.zipCode} />
                    <DetailInput label="통화" value={store.currency} uppercase />
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 text-base font-semibold text-gray-900">통신</h2>
                  <div>
                    <DetailInput label="전화번호" value={store.tel1} />
                    <DetailInput label="팩스" value={store.telFx} />
                    <DetailInput label="휴대폰" value={store.tel2} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className="flex min-h-40 items-center justify-center border-y border-gray-200 text-sm text-gray-400">
                티켓 리스트 항목 TBD
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
