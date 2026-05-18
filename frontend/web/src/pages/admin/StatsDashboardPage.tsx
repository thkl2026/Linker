import { useQuery } from '@tanstack/react-query'
import { systemAdminApi } from '@/shared/api/systemAdminApi'

export function StatsDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['system-admin', 'stats'],
    queryFn: () => systemAdminApi.getStats().then(r => r.data),
  })

  const items = stats
    ? [
        { label: '시스템 관리자', value: stats.systemAdmins },
        { label: '서비스 관리자', value: stats.serviceAdmins },
        { label: 'PM 계정',       value: stats.pm },
        { label: '구매담당 계정', value: stats.procurement },
        { label: '등록 전문가',   value: stats.talents },
        { label: '전체 사용자',   value: stats.systemAdmins + stats.serviceAdmins + stats.pm + stats.procurement },
      ]
    : []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-primary mb-2">통계</h1>
      <p className="text-sm text-primary/50 mb-8">플랫폼 사용 현황 수치</p>
      {isLoading ? (
        <p className="text-primary/30 text-sm">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-border/50 p-6">
              <p className="text-3xl font-bold text-primary">{item.value}</p>
              <p className="text-sm text-primary/50 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
