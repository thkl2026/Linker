import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi, ProjectResponse, ProjectStatus } from '@/shared/api/projectApi'
import { useUiStore } from '@/store/uiStore'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  OPEN:        '모집 중',
  IN_PROGRESS: '진행 중',
  CLOSED:      '완료',
  CANCELLED:   '취소됨',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  OPEN:        'bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  CLOSED:      'bg-gray-100 text-gray-500',
  CANCELLED:   'bg-red-50 text-red-600',
}

const WORK_TYPE_LABEL = { REMOTE: '원격', ONSITE: '상주', HYBRID: '혼합' }

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return '—'
  const fmt = (n: number) => `${(n / 10000).toFixed(0)}만원/월`
  if (min && max) return `${fmt(min)} ~ ${fmt(max)}`
  return min ? `${fmt(min)} 이상` : `${fmt(max!)} 이하`
}

export function ProjectListPage() {
  const queryClient = useQueryClient()
  const addToast = useUiStore(s => s.addToast)
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['pm', 'projects', page],
    queryFn: () => projectApi.listMyProjects({ page, size: 20 }).then(r => r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => projectApi.cancelProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm', 'projects'] })
      addToast('프로젝트가 취소되었습니다.', 'success')
    },
    onError: () => addToast('취소에 실패했습니다.', 'error'),
  })

  const handleCancel = (p: ProjectResponse) => {
    if (window.confirm(`"${p.title}" 프로젝트를 취소하시겠습니까?`)) {
      cancelMutation.mutate(p.id)
    }
  }

  const projects = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">내 프로젝트</h1>
          <p className="text-sm text-primary/50 mt-0.5">총 {data?.totalElements ?? 0}건</p>
        </div>
        <Link to="/app/projects/register"
          className="px-5 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold hover:bg-secondary/90 transition-colors">
          + 프로젝트 등록
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-primary/30 text-sm">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-primary/30 text-sm mb-4">등록된 프로젝트가 없습니다.</p>
            <Link to="/app/projects/register"
              className="text-sm text-secondary font-semibold hover:underline">
              첫 번째 프로젝트 등록하기 →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border/50">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-primary/60">제목</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">상태</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">근무 형태</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">예산</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">등록일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-primary">{p.title}</p>
                    {p.description && (
                      <p className="text-xs text-primary/40 mt-0.5 line-clamp-1">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-primary/60">
                    {p.workType ? WORK_TYPE_LABEL[p.workType] : '—'}
                  </td>
                  <td className="px-4 py-4 text-primary/60">{formatBudget(p.budgetMin, p.budgetMax)}</td>
                  <td className="px-4 py-4 text-primary/50">
                    {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-4">
                    {(p.status === 'OPEN' || p.status === 'IN_PROGRESS') && (
                      <button onClick={() => handleCancel(p)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors text-red-500">
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">이전</button>
          <span className="text-sm text-primary/60">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">다음</button>
        </div>
      )}
    </div>
  )
}
