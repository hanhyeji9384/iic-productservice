import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  RiDashboardLine, RiFileListLine, RiUserLine, RiUserSettingsLine,
  RiStore2Line, RiSettings3Line, RiHistoryLine, RiShieldCheckLine,
  RiBox3Line,
} from '@remixicon/react'

const NAV_MAIN = [
  { to: '/dashboard', label: '대시보드', icon: RiDashboardLine },
  { to: '/tickets', label: '티켓', icon: RiFileListLine },
  { to: '/customers', label: '고객', icon: RiUserLine },
  { to: '/products', label: '제품', icon: RiBox3Line },
  { to: '/stores', label: '매장', icon: RiStore2Line },
]

const NAV_SYSTEM = [
  { to: '/members', label: '회원', icon: RiUserSettingsLine },
  { to: '/roles', label: '권한', icon: RiShieldCheckLine },
  { to: '/logs', label: '로그', icon: RiHistoryLine },
  { to: '/settings', label: '설정', icon: RiSettings3Line },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            PS
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-foreground uppercase">
              Product Service
            </p>
            <p className="text-[10px] text-muted-foreground">Admin</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>서비스</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_MAIN.map(({ to, label, icon: Icon }) => (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  render={<NavLink to={to} />}
                  isActive={location.pathname.startsWith(to)}
                  tooltip={label}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>시스템</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_SYSTEM.map(({ to, label, icon: Icon }) => (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  render={<NavLink to={to} />}
                  isActive={location.pathname.startsWith(to)}
                  tooltip={label}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px]">KM</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">김민준</p>
            <p className="truncate text-[10px] text-muted-foreground">슈퍼 관리자</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
