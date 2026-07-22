import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { MembersProvider } from '@/lib/members-context'
import { SessionProvider } from '@/lib/session-context'
import { AdminLayout } from '@/components/admin-layout'
import { HomePage } from '@/pages/home'
import { MembersPage } from '@/pages/members'
import { MemberDetailPage } from '@/pages/member-detail'
import { MemberNewPage } from '@/pages/member-new'
import { RolesPage } from '@/pages/roles'
import { RolesTbdPage } from '@/pages/roles-tbd'
import { PlaceholderPage } from '@/pages/placeholder'
import { ProductsPage } from '@/pages/products'
import { PartsPage } from '@/pages/parts'
import { PartNewPage } from '@/pages/part-new'
import { StockPage } from '@/pages/stock'
import { StockSnapshotsPage } from '@/pages/stock-snapshots'
import { StockLedgerPage } from '@/pages/stock-ledger'
import { StockTransferDetailPage, StockTransferNewPage, StockTransfersPage } from '@/pages/stock-transfers'
import { StockAdjustmentNewPage, StockAdjustmentsPage } from '@/pages/stock-adjustments'
import { StockRequestsPage } from '@/pages/stock-requests'
import { PartOrderRequestsPage } from '@/pages/part-order-requests'
import { StoresPage } from '@/pages/stores'
import { StoreDetailPage } from '@/pages/store-detail'
import { CustomersPage } from '@/pages/customers'
import { CustomerDetailPage } from '@/pages/customer-detail'
import { TicketsPage } from '@/pages/tickets'
import { TicketDetailPage } from '@/pages/ticket-detail'
import { TicketNewPage } from '@/pages/ticket-new'
import { ShippingPage } from '@/pages/shipping'
import { ComponentReturnsPage } from '@/pages/component-returns'
import { InvoicePackingPage } from '@/pages/invoice-packing'
import { DownloadLogsPage } from '@/pages/download-logs'
import { PrivacyLogsPage } from '@/pages/privacy-logs'
import { ProductsProvider } from '@/lib/products-context'
import { PartsProvider } from '@/lib/parts-context'
import { I18nInspectorProvider } from '@/lib/i18n-inspector'
import { ReceptionSlotsPage } from '@/pages/reception-slots'
import { LoginPage } from '@/pages/login'
import { ForgotPasswordPage } from '@/pages/forgot-password'
import { ResetPasswordPage } from '@/pages/reset-password'
import { AuthOtpPage } from '@/pages/auth-otp'
import { Error404Page } from '@/pages/error-404'
import { Error403Page } from '@/pages/error-403'
import { Error500Page } from '@/pages/error-500'
import { ErrorOfflinePage } from '@/pages/error-offline'
import { SetupTotpPage } from '@/pages/setup-totp'

function PartsEditRedirect() {
  const { langCode } = useParams()
  return <Navigate to={`/${langCode}/parts`} replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        {/* 인증 — 프리픽스 없음 */}
        <Route path="/login" element={<I18nInspectorProvider><LoginPage /></I18nInspectorProvider>} />
        <Route path="/forgot-password" element={<I18nInspectorProvider><ForgotPasswordPage /></I18nInspectorProvider>} />
        <Route path="/reset-password" element={<I18nInspectorProvider><ResetPasswordPage /></I18nInspectorProvider>} />
        <Route path="/setup-2fa" element={<I18nInspectorProvider><SetupTotpPage /></I18nInspectorProvider>} />

        {/* 기본 리다이렉트 */}
        <Route path="/" element={<Navigate to="/ko" replace />} />
        <Route path="*" element={<Navigate to="/ko" replace />} />

        {/* 어드민 — /:langCode 프리픽스 */}
        <Route path="/:langCode" element={<SessionProvider><MembersProvider><ProductsProvider><PartsProvider><I18nInspectorProvider><AdminLayout /></I18nInspectorProvider></PartsProvider></ProductsProvider></MembersProvider></SessionProvider>}>
          <Route index element={<HomePage />} />

          {/* 회원/권한 관리 */}
          <Route path="members" element={<MembersPage />} />
          <Route path="members/new" element={<MemberNewPage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="roles" element={<RolesTbdPage />} />
          <Route path="roles/to-be" element={<RolesPage />} />

          {/* 시스템 관리 */}
          <Route path="settings/reception-slots" element={<ReceptionSlotsPage />} />
          <Route path="download-logs" element={<DownloadLogsPage />} />
          <Route path="privacy-logs" element={<PrivacyLogsPage />} />

          {/* 마스터 관리 */}
          <Route path="products" element={<ProductsPage mode="list" />} />
          <Route path="product-management" element={<ProductsPage mode="management" />} />
          <Route path="parts" element={<PartsPage />} />
          <Route path="parts/new" element={<PartNewPage />} />
          <Route path="parts/:id/edit" element={<PartsEditRedirect />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="stores/:code" element={<StoreDetailPage />} />

          {/* 재고 관리 */}
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/snapshots" element={<StockSnapshotsPage />} />
          <Route path="stock/ledger" element={<StockLedgerPage />} />
          <Route path="stock/transfers" element={<StockTransfersPage />} />
          <Route path="stock/transfers/new" element={<StockTransferNewPage />} />
          <Route path="stock/transfers/:transferNo" element={<StockTransferDetailPage />} />
          <Route path="stock/adjustments" element={<StockAdjustmentsPage />} />
          <Route path="stock/adjustments/new" element={<StockAdjustmentNewPage />} />
          <Route path="stock/requests" element={<StockRequestsPage />} />
          <Route path="stock/requests/:requestNo" element={<StockRequestsPage />} />
          <Route path="stock/part-requests" element={<PartOrderRequestsPage mode="requester" />} />
          <Route path="stock/part-requests/new" element={<PartOrderRequestsPage mode="requester" />} />
          <Route path="stock/part-requests/:requestNo" element={<PartOrderRequestsPage mode="requester" />} />
          <Route path="stock/part-request-management" element={<PartOrderRequestsPage mode="management" />} />
          <Route path="stock/part-request-management/:requestNo" element={<PartOrderRequestsPage mode="management" />} />

          {/* 고객 관리 */}
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />

          {/* 티켓 관리 */}
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/new" element={<TicketNewPage />} />
          <Route path="tickets/:ticketNo" element={<TicketDetailPage />} />
          <Route path="shipping" element={<ShippingPage />} />
          <Route path="shipping/component-returns" element={<ComponentReturnsPage />} />
          <Route path="invoice-packing" element={<InvoicePackingPage />} />
          <Route path="global-tickets" element={<PlaceholderPage title="국가별 티켓 관리" />} />

          {/* 에러 페이지 */}
          <Route path="errors/404" element={<Error404Page />} />
          <Route path="errors/403" element={<Error403Page />} />
          <Route path="errors/500" element={<Error500Page />} />
          <Route path="errors/offline" element={<ErrorOfflinePage />} />

          {/* 인증 페이지 (데모용 — 사이드바와 함께 확인) */}
          <Route path="auth/login" element={<LoginPage />} />
          <Route path="auth/otp" element={<AuthOtpPage />} />
          <Route path="auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="auth/reset-password" element={<ResetPasswordPage key="reset" />} />
          <Route path="auth/reset-password/done" element={<ResetPasswordPage key="reset-done" done />} />
          <Route path="auth/setup-2fa" element={<SetupTotpPage key="setup-2fa" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
