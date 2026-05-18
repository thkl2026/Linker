import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { systemAdminApi } from '@/shared/api/systemAdminApi'

const QUICK_LINKS = [
  { label: '사용자 관리',   to: '/app/system-admin/users',    icon: '👥' },
  { label: '통계',         to: '/app/system-admin/stats',    icon: '📊' },
  { label: '시스템 설정',  to: '/app/system-admin/settings', icon: '⚙️' },
]

export function SystemAdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['system-admin', 'stats'],
    queryFn: () => systemAdminApi.getStats().then(r => r.data),
  })

  const statCards = [
    { label: '시스템 관리자', value: stats?.systemAdmins  ?? '—', icon: '🔑', to: '/app/system-admin/users' },
    { label: '서비스 관리자', value: stats?.serviceAdmins ?? '—', icon: '🛠', to: '/app/system-admin/users' },
    { label: 'PM',           value: stats?.pm            ?? '—', icon: '📋', to: '/app/system-admin/users' },
    { label: '구매담당',     value: stats?.procurement   ?? '—', icon: '🏢', to: '/app/system-admin/users' },
    { label: '등록 전문가',  value: stats?.talents       ?? '—', icon: '🧑‍💻', to: '/app/system-admin/stats' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">시스템 관리자 대시보드</h1>
        <p className="text-sm text-primary/50 mt-1">계정·권한·시스템 설정을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(c => (
          <Link key={c.label} to={c.to}
            className="bg-white rounded-2xl border border-border/50 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="text-2xl mb-3">{c.icon}</div>
            <p className="text-2xl font-bold text-primary">{c.value}</p>
            <p className="text-sm text-primary/50 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-base font-bold text-primary mb-4">바로 가기</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map(l => (
            <Link key={l.label} to={l.to}
              className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-border/50 hover:border-secondary hover:shadow-md transition-all text-center">
              <span className="text-2xl">{l.icon}</span>
              <span className="text-sm font-semibold text-primary">{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
