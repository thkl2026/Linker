import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchingApi, MatchProposal } from '@/shared/api/matchingApi'
import { useUiStore } from '@/store/uiStore'

interface Props {
  projectId: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

/**
 * PM 대시보드 — 매칭 제안 목록 + 승낙/거절 + 인터뷰 일정 등록 (Phase 4)
 */
export function ProposalListPage({ projectId }: Props) {
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [selectedProposal, setSelectedProposal] = useState<MatchProposal | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: '', location: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', projectId],
    queryFn: () => matchingApi.listProposals(projectId),
  })

  const generateMutation = useMutation({
    mutationFn: () => matchingApi.generateProposals(projectId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['proposals', projectId] })
      addToast(`AI 매칭 제안 ${res.created}건 생성 완료`, 'success')
    },
    onError: () => addToast('매칭 생성 실패', 'error'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      matchingApi.respondProposal(id, accept),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['proposals', projectId] })
      addToast(vars.accept ? '제안 수락 완료' : '제안 거절 완료', 'success')
    },
    onError: () => addToast('처리 실패', 'error'),
  })

  const scheduleMutation = useMutation({
    mutationFn: () =>
      matchingApi.scheduleInterview(
        selectedProposal!.id,
        scheduleForm.scheduledAt,
        scheduleForm.location
      ),
    onSuccess: () => {
      addToast('인터뷰 일정 등록 완료', 'success')
      setSelectedProposal(null)
      setScheduleForm({ scheduledAt: '', location: '' })
    },
    onError: () => addToast('인터뷰 등록 실패', 'error'),
  })

  const proposals = data?.content ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">매칭 제안 목록</h1>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-primary px-4 py-2 rounded-lg bg-amber-900 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          {generateMutation.isPending ? 'AI 매칭 중…' : 'AI 매칭 실행'}
        </button>
      </div>

      {isLoading && <p className="text-info/60">로딩 중…</p>}

      <div className="space-y-4">
        {proposals.map((p) => (
          <div key={p.id} className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">유사도: {(p.similarityScore * 100).toFixed(1)}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{p.matchReason}</p>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="font-medium text-green-700">강점: </span>
                    {p.strengths?.join(' · ')}
                  </div>
                  <div>
                    <span className="font-medium text-red-600">우려: </span>
                    {p.concerns?.join(' · ')}
                  </div>
                </div>
              </div>

              {p.status === 'PENDING' && (
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => respondMutation.mutate({ id: p.id, accept: true })}
                    disabled={respondMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => respondMutation.mutate({ id: p.id, accept: false })}
                    disabled={respondMutation.isPending}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => setSelectedProposal(p)}
                    className="px-3 py-1.5 bg-amber-700 text-white text-xs rounded-lg hover:bg-amber-800"
                  >
                    인터뷰
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 인터뷰 일정 등록 모달 */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-primary mb-4">인터뷰 일정 등록</h2>
            <div className="space-y-3">
              <input
                type="datetime-local"
                className="w-full border border-amber-200 rounded-xl px-4 py-2 text-sm"
                value={scheduleForm.scheduledAt}
                onChange={e => setScheduleForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
              <input
                type="text"
                placeholder="장소 또는 화상회의 URL"
                className="w-full border border-amber-200 rounded-xl px-4 py-2 text-sm"
                value={scheduleForm.location}
                onChange={e => setScheduleForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={() => scheduleMutation.mutate()}
                disabled={scheduleMutation.isPending || !scheduleForm.scheduledAt}
                className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800 disabled:opacity-50"
              >
                {scheduleMutation.isPending ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
