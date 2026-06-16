import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Barcode, Copy, History, Package } from 'lucide-react'
import { BRANCHES, MEMBERS } from '@/lib/mock-data'
import { getTicketsWithExtras } from '@/lib/prototype-storage'
import type { PaymentCompleted, TicketStatus } from '@/lib/types'
import { BarcodePrintModal } from '@/components/barcode-print-modal'

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  RECEIVED:          { label: '접수',            className: 'bg-blue-50 text-blue-700 border-blue-200' },
  JUDGEMENT_PENDING: { label: '서비스 판정 대기', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  JUDGEMENT_DONE:    { label: '서비스 판정 완료', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  PAYMENT_REQUESTED: { label: '결제 요청',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
  PAYMENT_DONE:      { label: '결제 완료',        className: 'bg-green-50 text-green-700 border-green-200' },
  PARTNER_SENT:      { label: '협력업체 발송',    className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  REPAIRING:         { label: '수리 진행 중',     className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  REPAIR_DONE:       { label: '수리 완료',        className: 'bg-teal-50 text-teal-700 border-teal-200' },
  READY_TO_SHIP:     { label: '출고 준비',        className: 'bg-lime-50 text-lime-700 border-lime-200' },
  SHIPPING:          { label: '배송 중',          className: 'bg-sky-50 text-sky-700 border-sky-200' },
  SHIPPED:           { label: '출고 완료',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED:            { label: '완료',             className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELED:          { label: '취소',             className: 'bg-red-50 text-red-600 border-red-200' },
  PICKUP_WAITING:    { label: '수령 대기',        className: 'bg-violet-50 text-violet-700 border-violet-200' },
}

const PAYMENT_META: Record<PaymentCompleted, string> = { Y: '완료', N: '미완료', C: '취소' }

type Tab = 'overview' | 'pricing' | 'kakao' | 'email'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value || '-'}</dd>
    </div>
  )
}

function SectionCard({
  title,
  children,
  editLabel = '수정',
}: {
  title: string
  children: React.ReactNode
  editLabel?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
        <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-50">
          {editLabel}
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function PlaceholderTab({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-gray-400">{message}</div>
  )
}

export function TicketDetailPage() {
  const { ticketNo } = useParams<{ ticketNo: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [autoPrintBarcode, setAutoPrintBarcode] = useState(false)
  const ticket = getTicketsWithExtras().find(t => t.ticketNo === ticketNo)

  useEffect(() => {
    if (!ticketNo) return
    const key = `barcode_printed_${ticketNo}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setAutoPrintBarcode(true)
      setShowBarcodeModal(true)
    }
  }, [ticketNo])

  if (!ticket) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-gray-500">
          티켓을 찾을 수 없습니다.{' '}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ticketNo}</code>
        </p>
        <button onClick={() => navigate(-1)} className="text-xs text-blue-600 hover:underline">
          ← 목록으로
        </button>
      </div>
    )
  }

  const statusMeta = STATUS_META[ticket.status]
  const branchLabel = BRANCHES.find(b => b.code === ticket.branchCode)?.name ?? ticket.branchCode
  const receptionManager = ticket.technicianId ? MEMBERS.find(member => member.id === ticket.technicianId) : null
  const receptionManagerName = ticket.technicianName || receptionManager?.name || null
  const receptionManagerLoginId = receptionManager?.loginId || ticket.technicianId || null
  const receptionManagerLabel = receptionManagerName
    ? `${receptionManagerName}${receptionManagerLoginId ? `(${receptionManagerLoginId})` : ''}`
    : '-'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '개요' },
    { id: 'pricing',  label: '가격결정' },
    { id: 'kakao',    label: '알림톡 발송내역' },
    { id: 'email',    label: '메일 발송내역' },
  ]

  return (
    <div className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showBarcodeModal && ticket && (
        <BarcodePrintModal
          ticketNo={ticket.ticketNo}
          productName={ticket.productName}
          customerName={ticket.customerName}
          autoPrint={autoPrintBarcode}
          presentation={autoPrintBarcode ? 'silent' : 'modal'}
          onClose={() => { setShowBarcodeModal(false); setAutoPrintBarcode(false) }}
        />
      )}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />뒤로가기
      </button>

      <div className="space-y-4">

        {/* ── 상단 헤더 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* 1행: 티켓번호 + 액션 버튼 */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-0.5">티켓번호</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-base font-bold text-gray-900 tracking-tight truncate">
                  {ticket.ticketNo}
                </h1>
                <span className="text-xs text-gray-400">
                  {receptionManagerLabel}
                </span>
              </div>
            </div>
            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setAutoPrintBarcode(false)
                  setShowBarcodeModal(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Barcode className="w-3.5 h-3.5" />바코드 출력
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Package className="w-3.5 h-3.5" />재고요청
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Copy className="w-3.5 h-3.5" />티켓 복제
              </button>
            </div>
          </div>

          {/* 2행: 상태 + SO문서번호 + 법인 */}
          <div className="flex flex-wrap items-stretch gap-0 divide-x divide-gray-100">
            <div className="pr-8">
              <p className="text-[11px] text-gray-400 mb-1.5">상태</p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <History className="w-3 h-3" />내역
                </button>
              </div>
            </div>
            <div className="px-8">
              <p className="text-[11px] text-gray-400 mb-1.5">SO 문서번호</p>
              <p className="text-sm text-gray-800">{ticket.soDocumentNo || '-'}</p>
            </div>
            <div className="px-8">
              <p className="text-[11px] text-gray-400 mb-1.5">법인</p>
              <p className="text-sm text-gray-800">{branchLabel}</p>
            </div>
            <div className="pl-8">
              <p className="text-[11px] text-gray-400 mb-1.5">접수일</p>
              <p className="text-sm text-gray-800">{ticket.receivedAt} <span className="text-xs text-gray-400">(KST)</span></p>
            </div>
          </div>
        </div>

        {/* ── 탭 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 탭 바 */}
          <div className="flex border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-5">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                {/* ── 좌측 컬럼 ── */}
                <div className="space-y-4">

                  {/* 접수 정보 카드 */}
                  <SectionCard title="접수 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="접수처" value={ticket.receptionPlace} />
                      <Field label="접수처 유형" value="-" />
                      <Field label="b2c 여부" value="-" />
                      <Field label="재수리 여부" value="-" />
                      <Field label="긴급 수리 여부" value="-" />
                      <Field label="보증서 동봉" value="-" />
                      <Field label="구매 증빙 여부" value="-" />
                      <Field label="구매일" value="-" />
                      <div className="col-span-2">
                        <Field label="구매처" value="-" />
                      </div>
                      <div className="col-span-2">
                        <Field label="고객 요청사항" value="-" />
                      </div>
                    </dl>
                    {/* 첨부파일 */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-[11px] font-medium text-gray-400 mb-2">첨부파일</p>
                      <p className="text-xs text-gray-400">첨부파일이 없습니다.</p>
                    </div>
                  </SectionCard>

                  {/* 상담 카드 */}
                  <SectionCard title="상담">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="상담 희망 여부" value="-" />
                      <Field label="Outbound 유형" value="-" />
                      <Field label="상담 담당자" value="-" />
                      <Field label="상담 상태" value="-" />
                      <Field label="상담 날짜" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 글로벌 접수 정보 카드 */}
                  <SectionCard title="글로벌 접수 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="HQ 운송장 No." value="-" />
                      <Field label="법인 출고완료일" value="-" />
                      <Field label="법인 운송장 No." value="-" />
                      <Field label="법인 Invoice No." value="-" />
                      <Field label="HQ Invoice No." value="-" />
                      <Field label="재수출 이행 조건" value={ticket.reexportCondition} />
                    </dl>
                  </SectionCard>
                </div>

                {/* ── 우측 컬럼 ── */}
                <div className="space-y-4">

                  {/* 고객 정보 카드 */}
                  <SectionCard title="고객 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="고객명" value={ticket.customerName} />
                      <Field label="국가" value="-" />
                      <Field label="전화번호" value={ticket.phone} />
                      <Field label="이메일" value={ticket.email} />
                      <Field label="마케팅 동의" value="-" />
                      <Field label="개인정보 동의" value="-" />
                      <div className="col-span-2">
                        <Field label="수령 유형" value="-" />
                      </div>
                      <div className="col-span-2">
                        <Field label="수령 정보" value="-" />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 제품 정보 카드 */}
                  <SectionCard title="제품 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <div className="col-span-2">
                        <Field label="제품명" value={ticket.productName} />
                      </div>
                      <Field label="제품 ID (SAP 코드)" value="-" />
                      <Field label="범주" value="-" />
                      <Field label="도금수리 가능 여부" value="-" />
                      <Field label="재고 보유 여부" value="-" />
                      <Field label="출시일" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 수리 정보 카드 */}
                  <SectionCard title="수리 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="본사 입고일" value={ticket.hqReceivedAt} />
                      <Field label="출고 예정일" value={ticket.expectedShipAt} />
                      <Field label="수리 진행처" value={ticket.repairDepartment} />
                      <Field label="수리 내용" value={ticket.repairDetail} />
                      <Field label="수리비용 결정" value="-" />
                      <Field label="수리 비용" value="-" />
                      <Field label="서비스 기술자" value="-" />
                      <Field label="수리 진행일" value="-" />
                      <Field label="문제현상" value="-" />
                      <Field label="렌즈 유형" value="-" />
                      <Field label="협력업체 출고일" value="-" />
                      <Field label="협력업체 입고일" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 결제 정보 카드 */}
                  <SectionCard title="결제 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="결제 완료 여부" value={PAYMENT_META[ticket.paymentCompleted]} />
                      <Field label="결제 일자" value={ticket.paymentDate} />
                      <Field label="결제 수단" value="-" />
                      <Field label="대체 승인 번호" value="-" />
                      <Field label="최종 결제 요청" value="-" />
                      <div className="col-span-2">
                        <Field label="결제 URL" value="-" />
                      </div>
                    </dl>
                  </SectionCard>

                  {/* 환불 계좌 카드 */}
                  <SectionCard title="환불 계좌">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="은행" value="-" />
                      <Field label="계좌번호" value="-" />
                      <Field label="예금주" value="-" />
                    </dl>
                  </SectionCard>

                  {/* 출고 정보 카드 */}
                  <SectionCard title="출고 정보">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                      <Field label="출고완료" value={ticket.shippedAt ? 'Y' : 'N'} />
                      <Field label="출고완료일" value={ticket.shippedAt} />
                      <Field label="출고방식" value={ticket.shippingMethod} />
                      <Field label="배송 완료" value="-" />
                      <Field label="배송일자" value="-" />
                      <Field label="등기번호" value={ticket.trackingNo} />
                      <Field label="매장 수령 상태" value="-" />
                      <Field label="수령 일자" value="-" />
                    </dl>
                  </SectionCard>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <PlaceholderTab message="가격결정 — SAP 연동 수리비 산출 테이블" />
            )}
            {activeTab === 'kakao' && (
              <PlaceholderTab message="알림톡 발송내역" />
            )}
            {activeTab === 'email' && (
              <PlaceholderTab message="메일 발송내역" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
