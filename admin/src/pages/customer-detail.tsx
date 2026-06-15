import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { BRANCHES } from '@/lib/mock-data'
import { getCustomerById, getTicketsWithExtras, saveCustomerAddresses } from '@/lib/prototype-storage'
import type { CustomerAddress, TicketStatus } from '@/lib/types'

const COUNTRY_NAMES: Record<string, string> = {
  KR: '한국', US: '미국', CN: '중국', JP: '일본', GB: '영국',
  SG: '싱가포르', HK: '홍콩', TW: '대만', AU: '호주', FR: '프랑스',
  IT: '이탈리아', CA: '캐나다', AE: '아랍에미리트', MY: '말레이시아', TH: '태국',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  RECEIVED: '접수',
  JUDGEMENT_PENDING: '심사중',
  JUDGEMENT_DONE: '심사완료',
  PAYMENT_REQUESTED: '결제요청',
  PAYMENT_DONE: '결제완료',
  PARTNER_SENT: '협력사발송',
  REPAIRING: '수리중',
  REPAIR_DONE: '수리완료',
  READY_TO_SHIP: '발송준비',
  SHIPPING: '발송중',
  SHIPPED: '발송완료',
  CLOSED: '완료',
  CANCELED: '취소',
  PICKUP_WAITING: '픽업대기',
}

const STATUS_COLOR: Record<TicketStatus, string> = {
  RECEIVED:           'bg-blue-50 text-blue-700',
  JUDGEMENT_PENDING:  'bg-yellow-50 text-yellow-700',
  JUDGEMENT_DONE:     'bg-orange-50 text-orange-700',
  PAYMENT_REQUESTED:  'bg-purple-50 text-purple-700',
  PAYMENT_DONE:       'bg-indigo-50 text-indigo-700',
  PARTNER_SENT:       'bg-cyan-50 text-cyan-700',
  REPAIRING:          'bg-blue-50 text-blue-700',
  REPAIR_DONE:        'bg-teal-50 text-teal-700',
  READY_TO_SHIP:      'bg-green-50 text-green-700',
  SHIPPING:           'bg-emerald-50 text-emerald-700',
  SHIPPED:            'bg-emerald-50 text-emerald-700',
  CLOSED:             'bg-gray-100 text-gray-600',
  CANCELED:           'bg-red-50 text-red-600',
  PICKUP_WAITING:     'bg-amber-50 text-amber-700',
}

type AddressForm = { address1: string; address2: string; zipCode: string; country: string }
const EMPTY_FORM: AddressForm = { address1: '', address2: '', zipCode: '', country: 'KR' }

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()

  const base = getCustomerById(customerId)

  const [addresses, setAddresses] = useState<CustomerAddress[]>(base?.addresses ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddressForm>(EMPTY_FORM)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<AddressForm>(EMPTY_FORM)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  if (!base) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-400 text-sm">고객을 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="text-xs text-gray-500 underline">뒤로가기</button>
      </div>
    )
  }

  const customer = base
  const branchName = BRANCHES.find(b => b.code === customer.branchCode)?.name ?? customer.branchCode
  const defaultAddr = addresses.find(a => a.isDefault)
  const otherAddresses = addresses.filter(a => !a.isDefault)
  const customerTickets = getTicketsWithExtras().filter(t =>
    t.phone === customer.phone || t.email === customer.email
  )

  function commitAddresses(next: CustomerAddress[]) {
    setAddresses(next)
    saveCustomerAddresses(customer.id, next)
  }

  function setDefault(id: string) {
    commitAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })))
  }

  function startEdit(addr: CustomerAddress) {
    setEditingId(addr.id)
    setEditForm({ address1: addr.address1, address2: addr.address2 ?? '', zipCode: addr.zipCode ?? '', country: addr.country })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  function saveEdit(id: string) {
    if (!editForm.address1.trim()) return
    commitAddresses(addresses.map(a =>
      a.id === id
        ? { ...a, address1: editForm.address1.trim(), address2: editForm.address2.trim() || undefined, zipCode: editForm.zipCode.trim() || undefined, country: editForm.country }
        : a
    ))
    cancelEdit()
  }

  function handleAdd() {
    if (!addForm.address1.trim()) return
    const isFirst = addresses.length === 0
    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      isDefault: isFirst,
      address1: addForm.address1.trim(),
      address2: addForm.address2.trim() || undefined,
      zipCode: addForm.zipCode.trim() || undefined,
      country: addForm.country,
    }
    commitAddresses([...addresses, newAddr])
    setAddForm(EMPTY_FORM)
    setShowAddForm(false)
  }

  function handleDelete(id: string) {
    const next = addresses.filter(a => a.id !== id)
    if (next.length > 0 && !next.some(a => a.isDefault)) {
      next[0] = { ...next[0], isDefault: true }
    }
    commitAddresses(next)
    setDeleteTargetId(null)
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
        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">기본 정보</h3>
            <span className="text-[11px] font-mono text-gray-400">{base.id}</span>
          </div>
          <div className="p-5">
            <dl className="grid grid-cols-3 gap-x-8 gap-y-4">
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">이름</dt>
                <dd className="text-sm text-gray-900 font-semibold">{base.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">전화번호</dt>
                <dd className="text-sm text-gray-900 font-mono">{base.phone}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">이메일</dt>
                <dd className="text-sm text-gray-900 truncate">{base.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">국가</dt>
                <dd className="text-sm text-gray-900">{COUNTRY_NAMES[base.country] ?? base.country}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">법인</dt>
                <dd className="text-sm text-gray-900">{branchName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">마케팅 동의</dt>
                <dd>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                    base.marketingAgree === 'Y' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {base.marketingAgree === 'Y' ? '동의' : '미동의'}
                  </span>
                </dd>
              </div>
              <div className="col-span-3">
                <dt className="text-[11px] font-medium text-gray-400 mb-0.5">등록일</dt>
                <dd className="text-sm text-gray-600 font-mono">{base.registeredAt}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 주소 관리 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">주소 관리</h3>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />추가
              </button>
            )}
          </div>

          {/* 기본 주소 */}
          <div className="p-5 space-y-3">
            {defaultAddr ? (
              editingId === defaultAddr.id ? (
                <AddressEditForm
                  form={editForm}
                  onChange={setEditForm}
                  onSave={() => saveEdit(defaultAddr.id)}
                  onCancel={cancelEdit}
                />
              ) : (
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-amber-600 mb-1">기본 주소</p>
                        <p className="text-sm text-gray-800 font-medium">{defaultAddr.address1}</p>
                        {defaultAddr.address2 && <p className="text-xs text-gray-500 mt-0.5">{defaultAddr.address2}</p>}
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          {[defaultAddr.zipCode, COUNTRY_NAMES[defaultAddr.country] ?? defaultAddr.country].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <IconBtn icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(defaultAddr)} />
                      <IconBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteTargetId(defaultAddr.id)} danger />
                    </div>
                  </div>
                </div>
              )
            ) : !showAddForm ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
                <MapPin className="w-5 h-5 text-gray-200 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">등록된 주소가 없습니다.</p>
              </div>
            ) : null}

            {/* 추가 주소 목록 */}
            {otherAddresses.length > 0 && (
              <div className="space-y-2">
                {otherAddresses.map(addr => (
                  editingId === addr.id ? (
                    <AddressEditForm
                      key={addr.id}
                      form={editForm}
                      onChange={setEditForm}
                      onSave={() => saveEdit(addr.id)}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <div key={addr.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-700">{addr.address1}</p>
                            {addr.address2 && <p className="text-xs text-gray-500 mt-0.5">{addr.address2}</p>}
                            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                              {[addr.zipCode, COUNTRY_NAMES[addr.country] ?? addr.country].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setDefault(addr.id)}
                            className="px-2 py-1 rounded-lg text-[11px] text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors"
                          >기본으로</button>
                          <IconBtn icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(addr)} />
                          <IconBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteTargetId(addr.id)} danger />
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* 새 주소 추가 폼 */}
            {showAddForm && (
              <AddressEditForm
                form={addForm}
                onChange={setAddForm}
                onSave={handleAdd}
                onCancel={() => { setShowAddForm(false); setAddForm(EMPTY_FORM) }}
                isNew
              />
            )}
          </div>
        </div>

        {/* 티켓 이력 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700">
              접수 티켓
              {customerTickets.length > 0 && (
                <span className="ml-1.5 text-gray-400 font-normal">{customerTickets.length}건</span>
              )}
            </h3>
          </div>
          {customerTickets.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">접수 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[480px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50">티켓 번호</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50">상태</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50">제품</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50">접수일</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 bg-gray-50">수리 부서</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerTickets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-gray-700">{t.ticketNo}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLOR[t.status]}`}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-700">{t.productName}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">{t.receivedAt.slice(0, 10)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{t.repairDepartment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">주소 삭제</h3>
            <p className="text-sm text-gray-500">이 주소를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={() => handleDelete(deleteTargetId)}
                className="px-4 py-2 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IconBtn({ icon, onClick, danger }: { icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? 'text-gray-300 hover:text-red-400 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
    </button>
  )
}

function AddressEditForm({
  form,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  form: { address1: string; address2: string; zipCode: string; country: string }
  onChange: (f: { address1: string; address2: string; zipCode: string; country: string }) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-600">{isNew ? '새 주소 추가' : '주소 수정'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-400 mb-1">주소1 <span className="text-red-400">*</span></label>
        <input type="text" value={form.address1} onChange={e => onChange({ ...form, address1: e.target.value })}
          placeholder="시/도, 구/군, 도로명 주소"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-400 mb-1">주소2</label>
        <input type="text" value={form.address2} onChange={e => onChange({ ...form, address2: e.target.value })}
          placeholder="동/호수, 층 등 상세주소"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">우편번호</label>
          <input type="text" value={form.zipCode} onChange={e => onChange({ ...form, zipCode: e.target.value })}
            placeholder="12345"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">국가</label>
          <select value={form.country} onChange={e => onChange({ ...form, country: e.target.value })}
            className="w-full appearance-none px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors">
            {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onSave} disabled={!form.address1.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Check className="w-3.5 h-3.5" />저장
        </button>
      </div>
    </div>
  )
}
