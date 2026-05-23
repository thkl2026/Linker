import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import linkerLogo from '@/statics/linker_bi_logo.png'
import { ToastContainer } from '@/shared/components/ToastContainer'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

interface NavItem {
  to: string
  label: string
  icon: string
  isSystem?: boolean
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  SYSTEM_ADMIN: [
    { to: '/app/system-admin',          label: '대시보드',     icon: '📊' },
    { to: '/app/system-admin/users',    label: '사용자 관리',  icon: '👥' },
    { to: '/app/system-admin/stats',    label: '통계',         icon: '📈' },
    { to: '/app/system-admin/settings', label: '시스템 설정',  icon: '⚙️', isSystem: true },
  ],
  SERVICE_ADMIN: [
    { to: '/app/service-admin',              label: '대시보드',       icon: '📊' },
    { to: '/app/service-admin/talents',      label: '전문가 관리',    icon: '👥' },
    { to: '/app/service-admin/projects',     label: '프로젝트 관리',  icon: '📁' },
    { to: '/app/service-admin/evaluations',  label: '평가/리뷰 관리', icon: '⭐' },
    { to: '/app/service-admin/reports',      label: '통계 및 보고서', icon: '📈' },
    { to: '/app/service-admin/notices',      label: '공지사항',       icon: '📢' },
    { to: '/app/service-admin/settings',     label: '설정',           icon: '⚙️', isSystem: true },
  ],
  PM: [
    { to: '/app',                    label: '대시보드',     icon: '📊' },
    { to: '/app/projects',           label: '내 프로젝트',  icon: '📁' },
    { to: '/app/projects/register',  label: '프로젝트 등록', icon: '➕' },
    { to: '/app/matching',           label: 'AI 매칭',      icon: '🤝' },
  ],
  PROCUREMENT: [
    { to: '/app',                 label: '대시보드',    icon: '📊' },
    { to: '/app/experts/search',  label: '전문가 검색', icon: '🔍' },
    { to: '/app/matching',        label: '매칭 관리',   icon: '🤝' },
    { to: '/app/contracts',       label: '계약 관리',   icon: '📋' },
    { to: '/app/settlements',     label: '정산',        icon: '💴' },
    { to: '/app/evaluations',     label: '평가 관리',   icon: '⭐' },
  ],
}

const ROLE_LABEL: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  SERVICE_ADMIN: 'Service Admin',
  PM:           'Project Manager',
  PROCUREMENT:  'Procurement',
}

export function RootLayout() {
  const accessToken = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const { isSidebarOpen, toggleSidebar } = useUiStore()
  const navigate = useNavigate()

  if (!accessToken) return <Navigate to="/auth/login" replace />

  const role = user?.role ?? ''
  const navItems = NAV_ITEMS[role] ?? []

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-background font-sans text-primary">
      <aside className={`bg-white border-r border-border/30 flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-52' : 'w-14'}`}>
        <div className="px-3 py-5 flex items-center justify-center relative">
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <img src={linkerLogo} alt="Linker" className="h-[26px] object-contain mx-auto" />
          </div>
          <button onClick={toggleSidebar}
            className="absolute right-2 p-1 rounded-lg hover:bg-primary/5 text-primary/60 transition-colors shrink-0" aria-label="사이드바 토글">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isSidebarOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const showSystemDivider = item.isSystem && (!index || !navItems[index-1].isSystem);
            return (
              <div key={item.to}>
                {showSystemDivider && isSidebarOpen && (
                  <div className="pt-4 pb-2 px-4 mt-4 border-t border-border/10">
                    <p className="text-[10px] font-bold text-primary/30 tracking-widest uppercase">System</p>
                  </div>
                )}
                {showSystemDivider && !isSidebarOpen && (
                   <div className="my-4 border-t border-border/10"></div>
                )}
                <NavLink to={item.to}
                  end={item.to === '/app' || item.to === '/app/system-admin' || item.to === '/app/service-admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-secondary text-white font-bold shadow-lg shadow-secondary/20' 
                        : 'text-primary/60 font-medium hover:bg-secondary/5 hover:text-secondary'
                    } ${!isSidebarOpen ? 'justify-center px-0' : ''}`
                  }
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <span className="text-xl shrink-0 leading-none flex items-center justify-center w-6">{item.icon}</span>
                  {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              </div>
            )
          })}
        </nav>

        <div className="p-4">
          {isSidebarOpen ? (
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                  {user?.email?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">관리자님</p>
                  <p className="text-[10px] text-primary/50 truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full py-2 bg-white border border-border/50 rounded-lg text-[11px] font-bold text-primary/60 hover:bg-primary hover:text-white transition-all">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                  {user?.email?.[0]?.toUpperCase() ?? 'A'}
               </div>
               <button onClick={handleLogout} className="p-2 rounded-lg text-primary/60 hover:bg-primary/10 transition-colors" title="로그아웃">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
               </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b border-border/20 px-6 py-3 flex items-center justify-end h-12">
          {user && (
            <span className="text-xs text-primary/40 font-medium">
              {ROLE_LABEL[role] ?? role} · {user.email}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
