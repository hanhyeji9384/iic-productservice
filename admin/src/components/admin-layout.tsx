import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  UserCog, Shield, Package, Wrench, ArchiveX,
  Store, Users, Ticket, PanelLeftClose, PanelLeftOpen, LogOut, ChevronRight,
  AlertTriangle, KeyRound, CalendarDays, Download, ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { SessionWarningModal } from '@/components/session-warning-modal'
import { SessionExpiredModal } from '@/components/session-expired-modal'

interface NavChild {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: NavChild[]
}

const NAV: NavGroup[] = [
  {
    label: '시스템 관리',
    icon: UserCog,
    children: [
      { to: '/members',                  label: '회원 관리',      icon: UserCog },
      { to: '/roles',                    label: '권한 관리',      icon: Shield },
      { to: '/settings/reception-slots', label: '접수 슬롯 설정', icon: CalendarDays },
    ],
  },
  {
    label: '마스터 관리',
    icon: Package,
    children: [
      { to: '/products', label: '제품 관리',        icon: Package },
      { to: '/parts',    label: '부품 관리',        icon: Wrench },
      { to: '/stores',   label: '매장/거래처 관리', icon: Store },
    ],
  },
  {
    label: '재고 관리',
    icon: ArchiveX,
    children: [
      { to: '/stock', label: '재고 현황', icon: ArchiveX },
    ],
  },
  {
    label: '고객 관리',
    icon: Users,
    children: [
      { to: '/customers', label: '고객', icon: Users },
    ],
  },
  {
    label: '티켓 관리',
    icon: Ticket,
    children: [
      { to: '/tickets', label: '티켓', icon: Ticket },
    ],
  },
  {
    label: '로그 관리',
    icon: Download,
    children: [
      { to: '/download-logs', label: '다운로드 로그', icon: Download },
      { to: '/privacy-logs',  label: '개인정보 처리 로그', icon: ShieldCheck },
    ],
  },
  {
    label: '에러 페이지',
    icon: AlertTriangle,
    children: [
      { to: '/errors/404',     label: '404 Not Found',    icon: AlertTriangle },
      { to: '/errors/403',     label: '403 Forbidden',    icon: AlertTriangle },
      { to: '/errors/500',     label: '500 Server Error', icon: AlertTriangle },
      { to: '/errors/offline', label: 'Offline',          icon: AlertTriangle },
    ],
  },
  {
    label: '인증 페이지',
    icon: KeyRound,
    children: [
      { to: '/auth/login',           label: '로그인',       icon: KeyRound },
      { to: '/auth/otp',             label: 'OTP 인증',     icon: KeyRound },
      { to: '/auth/forgot-password', label: '비밀번호 찾기', icon: KeyRound },
      { to: '/auth/reset-password',      label: '비밀번호 변경',      icon: KeyRound },
      { to: '/auth/reset-password/done', label: '비밀번호 변경 완료', icon: KeyRound },
      { to: '/auth/setup-2fa',           label: 'Google Auth 등록',  icon: KeyRound },
    ],
  },
]

export function AdminLayout() {
  const { triggerWarning, triggerExpiry } = useSession()
  const [collapsed, setSidebarCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openFlyout(label: string, top: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setFlyoutGroup(label)
    setFlyoutTop(top)
  }

  function closeFlyout() {
    hideTimer.current = setTimeout(() => setFlyoutGroup(null), 80)
  }
  const location = useLocation()
  const navigate = useNavigate()
  const { langCode } = useParams()
  const pfx = `/${langCode}`

  const LANGS = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
  ]

  function switchLang(next: string) {
    const rest = location.pathname.replace(/^\/[^/]+/, '')
    navigate(`/${next}${rest}`)
  }

  // 현재 경로에 맞는 그룹을 자동 열기
  useEffect(() => {
    const active = NAV.filter(g =>
      g.children.some(c => location.pathname.startsWith(`${pfx}${c.to}`))
    ).map(g => g.label)
    setExpanded(prev => {
      const merged = Array.from(new Set([...prev, ...active]))
      return merged
    })
  }, [location.pathname])

  function toggleGroup(label: string) {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      {/* 사이드바 */}
      <aside
        className={`bg-white border-r border-gray-200 min-h-screen sticky top-0 flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-[60px] overflow-visible' : 'w-64 overflow-hidden'
        }`}
      >
        {/* 로고 */}
        <div className={`py-5 border-b border-gray-100 ${collapsed ? 'px-3' : 'px-5'}`}>
          <button
            onClick={() => navigate(pfx)}
            className={`hover:opacity-70 transition-opacity ${collapsed ? 'flex justify-center w-full' : 'flex items-center gap-2.5'}`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white tracking-wider">PS</span>
            </div>
            {!collapsed && (
              <div className="text-left">
                <div className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] leading-tight">
                  Product Service
                </div>
                <div className="text-[10px] text-gray-400 tracking-[0.06em] uppercase mt-0.5">Admin</div>
              </div>
            )}
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className={`py-3 pb-6 ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV.map(group => {
            const GroupIcon = group.icon

            if (collapsed) {
              const isGroupActive = group.children.some(c =>
                location.pathname.startsWith(`${pfx}${c.to}`)
              )
              return (
                <div
                  key={group.label}
                  className="mb-0.5"
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    openFlyout(group.label, rect.top)
                  }}
                  onMouseLeave={closeFlyout}
                >
                  <button
                    className={`w-full flex justify-center py-2.5 rounded-xl transition-colors ${
                      isGroupActive
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <GroupIcon className="w-5 h-5" />
                  </button>
                </div>
              )
            }

            const isExpanded = expanded.includes(group.label)
            return (
              <div key={group.label} className="mb-0.5">
                {/* 그룹 헤더 */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl transition-colors flex items-center justify-between text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-4 h-4" />
                    <span>{group.label}</span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* 하위 메뉴 */}
                <div
                  className="overflow-hidden transition-all duration-250 ease-in-out"
                  style={{
                    maxHeight: isExpanded ? `${group.children.length * 44}px` : '0px',
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {group.children.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={`${pfx}${to}`}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-colors ${
                            isActive
                              ? 'text-gray-900 bg-gray-100 font-medium'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`
                        }
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* 오른쪽 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 h-[72px] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!collapsed)}
              aria-label={collapsed ? '좌측 메뉴 열기' : '좌측 메뉴 접기'}
              title={collapsed ? '좌측 메뉴 열기' : '좌측 메뉴 접기'}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {collapsed
                ? <PanelLeftOpen className="w-5 h-5" />
                : <PanelLeftClose className="w-5 h-5" />
              }
            </button>
            <div className="flex items-center gap-3">
              {/* 세션 테스트 (프로토타입 전용) */}
              <div className="relative">
                <select
                  value=""
                  onChange={e => {
                    const v = e.target.value
                    if (v === 'warn-idle') triggerWarning('idle')
                    if (v === 'expire-absolute') triggerExpiry('absolute')
                    e.target.value = ''
                  }}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-amber-50 border border-amber-200 rounded-xl text-amber-700 hover:bg-amber-100 focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="" disabled>🧪 세션 테스트</option>
                  <option value="warn-idle">경고 (유휴)</option>
                  <option value="expire-absolute">만료 (절대)</option>
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 pointer-events-none rotate-90" />
              </div>

              {/* 언어 선택 */}
              <div className="relative">
                <select
                  value={langCode}
                  onChange={e => switchLang(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium bg-gray-100 border-0 rounded-xl text-gray-700 hover:bg-gray-200 focus:outline-none cursor-pointer transition-colors"
                >
                  {LANGS.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none rotate-90" />
              </div>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 text-xs font-medium bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </button>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 min-w-0 p-8">
          <Outlet />
        </main>
      </div>

      <SessionWarningModal />
      <SessionExpiredModal />

      {/* 사이드바 축소 flyout 포털 */}
      {collapsed && flyoutGroup && createPortal(
        (() => {
          const group = NAV.find(g => g.label === flyoutGroup)
          if (!group) return null
          return (
            <div
              className="fixed z-[9999]"
              style={{ top: flyoutTop, left: 60 }}
              onMouseEnter={() => {
                if (hideTimer.current) clearTimeout(hideTimer.current)
              }}
              onMouseLeave={closeFlyout}
            >
              <div className="ml-1.5 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/[0.08] py-1.5 min-w-[180px]">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
                {group.children.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={`${pfx}${to}`}
                    end
                    onClick={() => setFlyoutGroup(null)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 mx-1.5 px-2.5 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'text-gray-900 bg-gray-100 font-medium'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })(),
        document.body
      )}
    </div>
  )
}
