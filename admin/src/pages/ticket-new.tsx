import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { BRANCHES, STORES, PRODUCTS } from '@/lib/mock-data'

const SHIPPING_METHODS = ['택배(HQ)', '행낭(HQ)', '해외택배(DHL)', '직접수령', '방문수거']
const REPAIR_DEPARTMENTS = ['본사', '협력업체', '해외법인']
const REPAIR_DETAILS = ['부품 교체', '도금수리', '용접수리', '젠틀케어', '수리불가', '기타']

const BRANCH_DEFAULT_RECEPTION: Record<string, string> = {
  '1110':  'GM_PS_국내',
  'C1002': 'GM_PS_USA',
}

type Form = {
  branchCode: string
  receptionPlace: string
  customerName: string
  phone: string
  email: string
  productName: string
  repairDepartment: string
  repairDetail: string
  shippingMethod: string
  memo: string
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <dt className="text-[11px] font-medium text-gray-400 mb-1">{children}</dt>
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const selectInnerCls = 'w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300 cursor-pointer'
const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors hover:border-gray-300 placeholder:text-gray-300'

function Select({ value, onChange, children }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={selectInnerCls}>{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

export function TicketNewPage() {
  const navigate = useNavigate()
  const { langCode } = useParams()
  const location = useLocation()
  const initBranch: string = (location.state as { branchCode?: string })?.branchCode ?? BRANCHES[0]?.code ?? ''

  const [form, setForm] = useState<Form>({
    branchCode: initBranch,
    receptionPlace: BRANCH_DEFAULT_RECEPTION[initBranch] ?? '',
    customerName: '',
    phone: '',
    email: '',
    productName: '',
    repairDepartment: REPAIR_DEPARTMENTS[0],
    repairDetail: REPAIR_DETAILS[0],
    shippingMethod: SHIPPING_METHODS[0],
    memo: '',
  })

  function set(key: keyof Form, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const branchStores = STORES.filter(s => s.branchCode === form.branchCode)
  const defaultReception = BRANCH_DEFAULT_RECEPTION[form.branchCode]

  function handleSave() {
    navigate(`/${langCode}/tickets`)
  }

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />뒤로가기
      </button>

      <div className="space-y-4">

        {/* ── 상단 헤더 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-0.5">티켓 관리</p>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">신규 티켓 생성</h1>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5" />등록
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">

          {/* 접수 정보 */}
          <SectionCard title="접수 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>접수처</FieldLabel>
                <dd>
                  <Select value={form.receptionPlace} onChange={e => set('receptionPlace', e.target.value)}>
                    {defaultReception && (
                      <option value={defaultReception}>{defaultReception}</option>
                    )}
                    {branchStores.map(s => (
                      <option key={s.code} value={s.name}>{s.name}</option>
                    ))}
                    <option value="">직접 입력</option>
                  </Select>
                  {form.receptionPlace === '' && (
                    <input type="text" placeholder="접수처 입력" className={`${inputCls} mt-2`} onChange={e => set('receptionPlace', e.target.value)} />
                  )}
                </dd>
              </div>
              <div>
                <FieldLabel>배송 방법</FieldLabel>
                <dd>
                  <Select value={form.shippingMethod} onChange={e => set('shippingMethod', e.target.value)}>
                    {SHIPPING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* 고객 정보 */}
          <SectionCard title="고객 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>고객명</FieldLabel>
                <dd><input type="text" value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="홍길동" className={inputCls} /></dd>
              </div>
              <div>
                <FieldLabel>전화번호</FieldLabel>
                <dd><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" className={inputCls} /></dd>
              </div>
              <div>
                <FieldLabel>이메일</FieldLabel>
                <dd><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" className={inputCls} /></dd>
              </div>
            </dl>
          </SectionCard>

          {/* 제품 정보 */}
          <SectionCard title="제품 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>제품명</FieldLabel>
                <dd>
                  <Select value={form.productName} onChange={e => set('productName', e.target.value)}>
                    <option value="">선택</option>
                    {PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </Select>
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* 수리 정보 */}
          <SectionCard title="수리 정보">
            <dl className="space-y-5">
              <div>
                <FieldLabel>수리 부서</FieldLabel>
                <dd>
                  <Select value={form.repairDepartment} onChange={e => set('repairDepartment', e.target.value)}>
                    {REPAIR_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </dd>
              </div>
              <div>
                <FieldLabel>수리 내용</FieldLabel>
                <dd>
                  <Select value={form.repairDetail} onChange={e => set('repairDetail', e.target.value)}>
                    {REPAIR_DETAILS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </dd>
              </div>
              <div>
                <FieldLabel>메모</FieldLabel>
                <dd>
                  <textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={3} placeholder="요청사항 또는 특이사항" className={`${inputCls} resize-none`} />
                </dd>
              </div>
            </dl>
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
