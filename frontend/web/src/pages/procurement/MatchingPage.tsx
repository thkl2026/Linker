import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi, ProjectResponse } from '@/shared/api/projectApi'
import { matchingApi, MatchProposal } from '@/shared/api/matchingApi'
import { useUiStore } from '@/store/uiStore'

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  PENDING: '검토 중', ACCEPTED: '수락됨', REJECTED: '거절됨',
}
const PROPOSAL_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
}

function ProposalCard({ proposal, onRespond }: {
  proposal: MatchProposal
  onRespond: (id: string, accept: boolean) => void
}) {
  const score = Math.round(proposal.similarityScore * 100)
  return (
    <div className="bg-white rounded-2xl border border-border/50 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-primary">{proposal.talentName ?? '전문가'}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-20 bg-border/40 rounded-full h-1.5">
                <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${score}%` }} />
              </div>
              <span className="text-xs text-primary/60">{score}점</span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PROPOSAL_STATUS_COLOR[proposal.status]}`}>
          {PROPOSAL_STATUS_LABEL[proposal.status]}
        </span>
      </div>

      {proposal.matchReason && (
        <p className="text-sm text-primary/70 mb-3 leading-relaxed">{proposal.matchReason}</p>
      )}

      {proposal.strengths.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-emerald-700 mb-1">강점</p>
          <ul className="space-y-0.5">
            {proposal.strengths.map((s, i) => (
              <li key={i} className="text-xs text-primary/60 flex gap-1.5">
                <span className="text-emerald-500 shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal.concerns.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">유의사항</p>
          <ul className="space-y-0.5">
            {proposal.concerns.map((c, i) => (
              <li key={i} className="text-xs text-primary/60 flex gap-1.5">
                <span className="text-amber-500 shrink-0">△</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal.status === 'PENDING' && (
        <div className="flex gap-2 pt-3 border-t border-border/30">
          <button
            onClick={() => onRespond(proposal.id, true)}
            className="flex-1 py-2 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 transition-colors">
            수락
          </button>
          <button
            onClick={() => onRespond(proposal.id, false)}
            className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
            거절
          </button>
        </div>
      )}
    </div>
  )
}

export function MatchingPage() {
  const qc = useQueryClient()
  const addToast = useUiStore(s => s.addToast)
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null)
  const [proposalPage, setProposalPage] = useState(0)

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['pm', 'projects', 0],
    queryFn: () => projectApi.listMyProjects({ page: 0, size: 50 }).then(r => r.data),
  })

  const { data: proposalsData, isLoading: loadingProposals } = useQuery({
    queryKey: ['matching', 'proposals', selectedProject?.id, proposalPage],
    queryFn: () => matchingApi.listProposals(selectedProject!.id, proposalPage),
    enabled: !!selectedProject,
  })

  const generateMutation = useMutation({
    mutationFn: () => matchingApi.generateProposals(selectedProject!.id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['matching', 'proposals', selectedProject?.id] })
      addToast(`AI 매칭 ${data.created}건 생성되었습니다.`, 'success')
    },
    onError: () => addToast('AI 매칭 생성에 실패했습니다.', 'error'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      matchingApi.respondProposal(id, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matching', 'proposals', selectedProject?.id] })
      addToast('처리되었습니다.', 'success')
    },
    onError: () => addToast('처리에 실패했습니다.', 'error'),
  })

  const projects = (projectsData?.content ?? []).filter(p => p.status === 'OPEN' || p.status === 'IN_PROGRESS')
  const proposals = (proposalsData?.content ?? []) as MatchProposal[]
  const totalPages = proposalsData?.totalElements ? Math.ceil(proposalsData.totalElements / 10) : 1

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">AI 매칭</h1>
        <p className="text-sm text-primary/50 mt-0.5">프로젝트 요건에 맞는 전문가를 AI가 추천합니다.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0">
          <h2 className="text-sm font-semibold text-primary/60 uppercase tracking-wide mb-3">내 프로젝트</h2>
          {loadingProjects ? (
            <div className="text-sm text-primary/30">불러오는 중...</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-primary/30">진행 중인 프로젝트가 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <button key={p.id} onClick={() => { setSelectedProject(p); setProposalPage(0) }}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                    selectedProject?.id === p.id
                      ? 'border-secondary bg-secondary/5'
                      : 'border-border bg-white hover:border-secondary/50'
                  }`}>
                  <p className="font-medium text-primary truncate">{p.title}</p>
                  <p className="text-xs text-primary/40 mt-0.5">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {!selectedProject ? (
            <div className="bg-white rounded-2xl border border-border/50 p-12 flex items-center justify-center">
              <p className="text-primary/30 text-sm">왼쪽에서 프로젝트를 선택하세요.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-primary">{selectedProject.title}</h2>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
                  {generateMutation.isPending ? 'AI 분석 중...' : 'AI 매칭 생성'}
                </button>
              </div>

              {loadingProposals ? (
                <div className="text-center text-primary/30 text-sm py-12">불러오는 중...</div>
              ) : proposals.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border/50 p-12 text-center">
                  <p className="text-primary/30 text-sm">"AI 매칭 생성" 버튼을 눌러 추천을 받아보세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {proposals.map(p => (
                    <ProposalCard key={p.id} proposal={p}
                      onRespond={(id, accept) => respondMutation.mutate({ id, accept })} />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => setProposalPage(p => Math.max(0, p - 1))} disabled={proposalPage === 0}
                    className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40">이전</button>
                  <span className="text-sm text-primary/60">{proposalPage + 1} / {totalPages}</span>
                  <button onClick={() => setProposalPage(p => Math.min(totalPages - 1, p + 1))} disabled={proposalPage >= totalPages - 1}
                    className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40">다음</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
