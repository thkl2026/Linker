import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import axiosInstance from '@/shared/api/axiosInstance'
import { useUiStore } from '@/store/uiStore'

interface Evaluation {
  id: string
  contractId: string
  evaluatorId: string
  overallScore: number
  communicationScore: number
  technicalScore: number
  timelinessScore: number
  trustScore: number
  trustLevel: string
  summary: string
  strengths: string[]
  improvements: string[]
  createdAt: string
}

interface CreateEvaluationRequest {
  contractId: string
  talentId: string
  feedbackText: string
}

const evaluationApi = {
  listByContract: (contractId: string) =>
    axiosInstance.get<Evaluation[]>(`/api/v1/evaluations/by-contract/${contractId}`).then(r => r.data),
  create: (req: CreateEvaluationRequest) =>
    axiosInstance.post<Evaluation>('/api/v1/evaluations', req).then(r => r.data),
}

/**
 * 평가 목록 페이지 — AI 평가 생성 및 조회 (Phase 5)
 */
export function EvaluationListPage() {
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [contractId, setContractId] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [form, setForm] = useState({ talentId: '', feedbackText: '' })

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ['evaluations', activeId],
    queryFn: () => evaluationApi.listByContract(activeId!),
    enabled: !!activeId,
  })

  const createMutation = useMutation({
    mutationFn: () => evaluationApi.create({ contractId: activeId!, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', activeId] })
      addToast('평가 등록 완료 (AI 분석됨)', 'success')
      setForm({ talentId: '', feedbackText: '' })
    },
    onError: () => addToast('평가 등록 실패', 'error'),
  })

  const TRUST_COLOR: Record<string, string> = {
    HIGH:   'bg-green-50 text-green-700',
    MEDIUM: 'bg-yellow-50 text-yellow-700',
    LOW:    'bg-red-50 text-red-700',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">평가 관리</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="계약 UUID"
          value={contractId}
          onChange={e => setContractId(e.target.value)}
          className="flex-1 max-w-sm border border-amber-200 rounded-xl px-4 py-2 text-sm"
        />
        <button
          onClick={() => contractId.trim() && setActiveId(contractId.trim())}
          className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800"
        >
          조회
        </button>
      </div>

      {activeId && (
        <div className="bg-white border border-amber-100 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            새 평가 등록
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="인력 UUID"
              value={form.talentId}
              onChange={e => setForm(f => ({ ...f, talentId: e.target.value }))}
              className="w-full border border-amber-200 rounded-xl px-4 py-2 text-sm"
            />
            <textarea
              placeholder="피드백 내용을 자유롭게 입력하세요. AI가 구조화합니다."
              value={form.feedbackText}
              onChange={e => setForm(f => ({ ...f, feedbackText: e.target.value }))}
              rows={4}
              className="w-full border border-amber-200 rounded-xl px-4 py-2 text-sm resize-none"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.talentId || !form.feedbackText}
              className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800 disabled:opacity-50"
            >
              {createMutation.isPending ? 'AI 분석 중…' : '평가 등록'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-info/60">로딩 중…</p>}

      <div className="space-y-4">
        {(evaluations ?? []).map(ev => (
          <div key={ev.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-gray-500">{new Date(ev.createdAt).toLocaleDateString('ko-KR')}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRUST_COLOR[ev.trustLevel] ?? 'bg-gray-50 text-gray-600'}`}>
                신뢰도: {ev.trustScore}점
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: '커뮤니케이션', score: ev.communicationScore },
                { label: '기술',         score: ev.technicalScore },
                { label: '일정 준수',    score: ev.timelinessScore },
              ].map(({ label, score }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-lg font-bold text-amber-700">{score}<span className="text-xs font-normal text-gray-400">/5</span></p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">{ev.summary}</p>
            {ev.strengths?.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {ev.strengths.map(s => (
                  <span key={s} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
