import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import linkerLogo from '@/statics/linker_bi_logo.png'
import { ToastContainer } from '@/shared/components/ToastContainer'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { authApi } from '@/shared/api/authApi'
import { APP_CONSTANTS } from '@/shared/constants/appConstants'

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


export function RootLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const accessToken = useAuthStore(s => s.accessToken)
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const updateUser = useAuthStore(s => s.updateUser)
  const { isSidebarOpen, toggleSidebar, addToast } = useUiStore()
  const navigate = useNavigate()

  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profilePosition, setProfilePosition] = useState('')
  const [profileDepartment, setProfileDepartment] = useState('')

  const openProfile = () => {
    setProfileName(user?.name ?? '')
    setProfilePosition(user?.position ?? '')
    setProfileDepartment(user?.department ?? '')
    setShowProfile(true)
  }

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({
      name: profileName || null,
      position: profilePosition || null,
      department: profileDepartment || null,
    }),
    onSuccess: () => {
      updateUser({
        name: profileName || user?.name ?? '',
        position: profilePosition || undefined,
        department: profileDepartment || undefined,
      })
      addToast('프로필이 저장되었습니다.', 'success')
      setShowProfile(false)
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  // reload 시 accessToken은 사라지지만 isAuthenticated는 localStorage에 남아 있음
  // refresh token으로 조용히 새 access token을 발급받는다
  const [booting, setBooting] = useState(() => isAuthenticated && !accessToken)

  useEffect(() => {
    if (!isAuthenticated || accessToken) { setBooting(false); return }
    const refreshToken = localStorage.getItem(APP_CONSTANTS.REFRESH_TOKEN_KEY)
    if (!refreshToken) { clearAuth(); setBooting(false); return }
    authApi.refresh(refreshToken)
      .then(res => {
        setAccessToken(res.data.accessToken)
        localStorage.setItem(APP_CONSTANTS.REFRESH_TOKEN_KEY, res.data.refreshToken)
      })
      .catch(() => clearAuth())
      .finally(() => setBooting(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (booting) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-primary/40 font-bold">세션 복원 중...</p>
      </div>
    </div>
  )

  const role = user?.role ?? ''
  const navItems = NAV_ITEMS[role] ?? []

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-background font-sans text-primary">
      <aside className={`bg-white border-r border-border/30 flex flex-col shrink-0 transition-all duration-300 h-screen sticky top-0 ${isSidebarOpen ? 'w-52' : 'w-14'}`}>
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
              <button onClick={openProfile} className="flex items-center gap-3 mb-3 w-full text-left hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                  {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{user?.name}</p>
                  <p className="text-[10px] text-primary/50 truncate">{user?.email}</p>
                </div>
              </button>
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
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>

      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-border/30" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black tracking-tight mb-6">프로필 수정</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">이름</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="표시 이름 입력"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">직책</label>
                <input
                  type="text"
                  value={profilePosition}
                  onChange={e => setProfilePosition(e.target.value)}
                  placeholder="예: 선임 개발자"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">부서</label>
                <input
                  type="text"
                  value={profileDepartment}
                  onChange={e => setProfileDepartment(e.target.value)}
                  placeholder="예: 개발팀"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">이메일</label>
                <p className="px-4 py-3 rounded-2xl bg-primary/5 text-sm text-primary/60 font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 py-3 rounded-2xl border border-border/50 text-sm font-bold text-primary/60 hover:bg-primary/5 transition-all"
              >
                취소
              </button>
              <button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-amber-900 transition-all disabled:opacity-50"
              >
                {profileMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
