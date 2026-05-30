import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { serviceAdminApi, ProjectAdmin, ProjectStatus } from '@/shared/api/serviceAdminApi'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpProjectManagement } from '@/shared/help/helpContent'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  OPEN: '인력모집중',
  MATCHED: '모집 완료',
  CLOSED: '종료',
  CANCELLED: '취소',
}


function StatCard({ icon, label, value, unit, onClick, valueColor, iconBg }: {
  icon: string; label: string; value: string | number; unit: string
  onClick?: () => void; valueColor?: string; iconBg?: string
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-border/30 shadow-[0_4px_20px_-4px_rgba(69,26,3,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(69,26,3,0.1)] transition-all duration-300 group">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 ${iconBg ?? 'bg-secondary/10'} rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0`}>
          {icon}
        </div>
        <p className="text-sm font-bold text-primary/50">{label}</p>
      </div>
      <button
        onClick={onClick}
        className={`text-3xl font-black tracking-tight ${valueColor ?? 'text-primary'} ${onClick ? 'hover:text-secondary transition-colors cursor-pointer' : ''}`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
        <span className="text-sm font-normal text-primary/30 ml-1">{unit}</span>
      </button>
    </div>
  )
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return d.slice(0, 10).replace(/-/g, '.')
}

function formatPeriod(p: ProjectAdmin): string {
  if (!p.startDate && !p.endDate) return '-'
  return `${formatDate(p.startDate)} ~ ${formatDate(p.endDate)}`
}

export function ProjectManagementPage() {
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const PAGE_SIZE = 10

  const { data: stats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: () => serviceAdminApi.getProjectStats().then(r => r.data),
  })

  const { data: projectPage, isLoading } = useQuery({
    queryKey: ['admin-projects', keyword, statusFilter, page],
    queryFn: () =>
      serviceAdminApi.listProjects({
        keyword: keyword || undefined,
        status: (statusFilter as ProjectStatus) || undefined,
        page,
        size: PAGE_SIZE,
      }).then(r => r.data),
  })

  const projects = projectPage?.content ?? []
  const totalPages = projectPage?.totalPages ?? 1
  const totalElements = projectPage?.totalElements ?? 0

  function handleSearch() {
    setKeyword(searchInput)
    setPage(0)
  }


  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">프로젝트 관리</h2>
          <p className="text-xs text-primary/40 font-medium mt-0.5">
            플랫폼 내의 모든 프로젝트 진행 현황을 통합 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <button
            onClick={() => navigate('/app/service-admin/projects/create')}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            + 신규 프로젝트 등록
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="📁" iconBg="bg-primary/5" label="전체 프로젝트" value={stats?.total ?? '-'} unit="건"
          valueColor="text-primary"
          onClick={() => { setStatusFilter(''); setPage(0) }} />
        <StatCard icon="📢" iconBg="bg-emerald-50" label="인력모집중" value={stats?.open ?? '-'} unit="건"
          valueColor="text-emerald-700"
          onClick={() => { setStatusFilter('OPEN'); setPage(0) }} />
        <StatCard icon="✅" iconBg="bg-blue-50" label="모집 완료" value={stats?.matched ?? '-'} unit="건"
          valueColor="text-blue-700"
          onClick={() => { setStatusFilter('MATCHED'); setPage(0) }} />
      </div>

      {/* Filter */}
      <div className="space-y-3">
        {/* 검색 */}
        <div className="flex items-center bg-gray-100 rounded-2xl px-4 py-3 gap-3 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-secondary/30 transition-all">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="프로젝트명, 고객사, 주사업자를 입력하세요..."
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-gray-400 focus:outline-none"
          />
          <button onClick={handleSearch} className="text-gray-400 hover:text-secondary transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>
        </div>

        {/* 상태 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([['', '전체'], ...Object.entries(STATUS_LABELS)] as [string, string][]).map(([code, label]) => {
            const active = statusFilter === code
            return (
              <button
                key={code}
                onClick={() => { setStatusFilter(code as ProjectStatus | ''); setPage(0) }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-primary/70 border-border/50 hover:border-primary/40 hover:text-primary'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[40px] border border-border/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-surface/50 border-b border-border/30">
                <th className="px-8 py-5 text-xs font-black text-primary/40 uppercase tracking-wider">프로젝트명</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider">고객사</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider">주사업자</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider text-center">상태</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider">PM</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider text-center">인원</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider">수행 기간</th>
                <th className="px-6 py-5 text-xs font-black text-primary/40 uppercase tracking-wider text-center">수주 여부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center text-sm text-primary/30">불러오는 중...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center text-sm text-primary/30">프로젝트가 없습니다.</td>
                </tr>
              ) : projects.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/app/service-admin/projects/${p.id}`)}
                  className="hover:bg-primary/[0.02] transition-all group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-primary/20 shrink-0">
                        {String(page * PAGE_SIZE + idx + 1).padStart(3, '0')}
                      </span>
                      <p className="text-sm font-bold text-primary group-hover:text-secondary transition-colors truncate max-w-[220px]">
                        {p.title}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-primary/60">{p.clientCompany ?? '-'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-primary/60">{p.mainContractor ?? '-'}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm text-primary/60">
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-primary/80">{p.pmName ?? '-'}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <p className="text-sm text-primary/60">{p.requiredHeadcount}명</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-primary/60">{formatPeriod(p)}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {p.awardStatus === 'WON' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">수주</span>
                    )}
                    {p.awardStatus === 'LOST' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">실주</span>
                    )}
                    {p.awardStatus === 'REVIEWING' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">검토중</span>
                    )}
                    {!p.awardStatus && <span className="text-primary/20">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-surface/30 px-8 py-5 border-t border-border/30 flex items-center justify-between">
          <p className="text-xs text-primary/40 font-bold">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} Projects
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-white border border-border/50 rounded-xl text-xs font-bold text-primary/40 disabled:cursor-not-allowed hover:enabled:bg-primary hover:enabled:text-white transition-all"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                    pageNum === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white border border-border/50 hover:bg-surface'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-white border border-border/50 rounded-xl text-xs font-bold text-primary/40 disabled:cursor-not-allowed hover:enabled:bg-primary hover:enabled:text-white transition-all shadow-md"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Insight Banner */}
      <div className="bg-primary text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2">실시간 프로젝트 매칭 인사이트</h3>
          <p className="text-white/60 text-sm mb-8 font-medium">
            현재 총 <span className="text-accent font-black">{stats?.total ?? 0}개</span>의 프로젝트가 등록되어 있으며,{' '}
            <span className="text-accent font-black">{stats?.open ?? 0}개</span>가 인력을 모집 중입니다.
          </p>
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase mb-2">모집중 프로젝트</p>
              <p className="text-xl font-black">{stats?.open ?? 0}건</p>
              <p className="text-xs text-white/60 mt-1">전체의 {stats?.total ? Math.round((stats.open / stats.total) * 100) : 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase mb-2">모집 완료</p>
              <p className="text-xl font-black">{stats?.matched ?? 0}건</p>
              <p className="text-xs text-white/60 mt-1">전체의 {stats?.total ? Math.round((stats.matched / stats.total) * 100) : 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase mb-2">매칭률</p>
              <p className="text-xl font-black">
                {stats?.total ? Math.round(((stats.matched) / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-white/60 mt-1">모집 완료 기준</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpProjectManagement} />
    </div>
  )
}
