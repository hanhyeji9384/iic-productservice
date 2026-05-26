import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MembersProvider } from '@/lib/members-context'
import { SessionProvider } from '@/lib/session-context'
import { AdminLayout } from '@/components/admin-layout'
import { HomePage } from '@/pages/home'
import { MembersPage } from '@/pages/members'
import { MemberDetailPage } from '@/pages/member-detail'
import { MemberNewPage } from '@/pages/member-new'
import { RolesPage } from '@/pages/roles'
import { DepartmentsPage } from '@/pages/departments'
import { PlaceholderPage } from '@/pages/placeholder'
import { ProductsPage } from '@/pages/products'
import { ProductNewPage } from '@/pages/product-new'
import { PartsPage } from '@/pages/parts'
import { PartNewPage } from '@/pages/part-new'
import { StockPage } from '@/pages/stock'
import { ProductsProvider } from '@/lib/products-context'
import { PartsProvider } from '@/lib/parts-context'
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

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        {/* 인증 — 프리픽스 없음 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/setup-2fa" element={<SetupTotpPage />} />

        {/* 기본 리다이렉트 */}
        <Route path="/" element={<Navigate to="/ko" replace />} />
        <Route path="*" element={<Navigate to="/ko" replace />} />

        {/* 어드민 — /:langCode 프리픽스 */}
        <Route path="/:langCode" element={<SessionProvider><MembersProvider><ProductsProvider><PartsProvider><AdminLayout /></PartsProvider></ProductsProvider></MembersProvider></SessionProvider>}>
          <Route index element={<HomePage />} />

          {/* 회원/권한 관리 */}
          <Route path="members" element={<MembersPage />} />
          <Route path="members/new" element={<MemberNewPage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />

          {/* 시스템 관리 */}
          <Route path="settings/reception-slots" element={<ReceptionSlotsPage />} />

          {/* 제품 관리 */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductNewPage />} />
          <Route path="products/:id/edit" element={<ProductNewPage />} />
          <Route path="parts" element={<PartsPage />} />
          <Route path="parts/new" element={<PartNewPage />} />
          <Route path="parts/:id/edit" element={<PartNewPage />} />
          <Route path="stock" element={<StockPage />} />

          {/* 고객 관리 */}
          <Route path="customers" element={<PlaceholderPage title="고객" />} />

          {/* 티켓 관리 */}
          <Route path="tickets" element={<PlaceholderPage title="티켓" />} />
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
