import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpEvaluationManagement } from '@/shared/help/helpContent'
import { displayName } from '@/shared/utils/nameUtils'
import {
  serviceAdminApi,
  type TalentEvalSummary,
  type AdminReviewRequest,
} from '@/shared/api/serviceAdminApi'
import { TALENT_CATEGORY_LABELS, TALENT_FIELD_LABELS } from '@/shared/types/talent'

// ─── helpers ─────────────────────────────────────────────────────────────────


function ScoreDisplay({ value }: { value: number | null }) {
  if (value == null) return (
    <span className="text-xs text-primary/20 font-bold">미평가</span>
  )
  const color = value >= 4.5 ? 'text-emerald-600' : value >= 3.5 ? 'text-amber-600' : 'text-red-500'
  const stars = Math.round(value)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-lg font-black ${color}`}>{value.toFixed(1)}</span>
      <span className="text-[10px] tracking-tight" style={{ color: '#f59e0b' }}>
        {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </span>
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span style={{ color: n <= (hover || value) ? '#f59e0b' : '#e5e7eb' }}>★</span>
        </button>
      ))}
    </div>
  )
}

// ─── Review History ───────────────────────────────────────────────────────────

function ReviewHistory({ talentId }: { talentId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['talent-review-history', talentId],
    queryFn: () => serviceAdminApi.getTalentReviewHistory(talentId).then(r => r.data),
  })

  if (isLoading) return <p className="text-xs text-primary/30 py-4 text-center">불러오는 중...</p>
  if (!history?.length) return <p className="text-xs text-primary/30 py-4 text-center">평가 이력이 없습니다.</p>

  return (
    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
      {history.map(h => (
        <div key={h.id} className="bg-surface/50 rounded-2xl p-4 border border-border/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-3">
              {[
                { label: '협업', val: h.collaborationScore },
                { label: '기술', val: h.technicalScore },
                { label: '신뢰', val: h.reliabilityScore },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-[9px] font-bold text-primary/30 uppercase mb-0.5">{label}</p>
                  <p className="text-sm font-black text-primary">{val}</p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-amber-600">{h.avgScore.toFixed(1)}</p>
              <p className="text-[10px] text-primary/30">{h.createdAt}</p>
            </div>
          </div>
          {h.comment && <p className="text-xs text-primary/60 leading-relaxed border-t border-border/20 pt-2 mt-1">{h.comment}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Evaluation Modal ─────────────────────────────────────────────────────────

function EvaluationModal({ talent, onClose }: { talent: TalentEvalSummary; onClose: () => void }) {
  const qc = useQueryClient()
  const [collab,   setCollab]   = useState(0)
  const [tech,     setTech]     = useState(0)
  const [reliable, setReliable] = useState(0)
  const [comment,  setComment]  = useState('')
  const [tab, setTab] = useState<'write' | 'history'>('write')

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const req: AdminReviewRequest = {
        collaborationScore: collab,
        technicalScore:     tech,
        reliabilityScore:   reliable,
        comment:            comment || undefined,
      }
      return serviceAdminApi.submitTalentReview(talent.id, req)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['talent-eval-list'] })
      qc.invalidateQueries({ queryKey: ['talent-eval-stats'] })
      qc.invalidateQueries({ queryKey: ['talent-review-history', talent.id] })
      onClose()
    },
  })

  const canSubmit = collab > 0 && tech > 0 && reliable > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-border/30 bg-surface/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest mb-1">평가 / 리뷰</p>
              <h3 className="text-lg font-black text-primary">{displayName(talent.name)}</h3>
              <p className="text-xs text-primary/40 mt-0.5">
                {talent.category ? TALENT_CATEGORY_LABELS[talent.category as keyof typeof TALENT_CATEGORY_LABELS] ?? talent.category : '—'}
                {talent.field ? ` · ${TALENT_FIELD_LABELS[talent.field as keyof typeof TALENT_FIELD_LABELS] ?? talent.field}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-primary/30 hover:text-primary text-xl leading-none mt-1">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-background rounded-xl p-1">
            {(['write', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${tab === t ? 'bg-white shadow text-primary' : 'text-primary/40 hover:text-primary'}`}>
                {t === 'write' ? '✍️ 평가 작성' : '📋 평가 이력'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          {tab === 'history' ? (
            <ReviewHistory talentId={talent.id} />
          ) : (
            <>
              {/* 3-criteria scoring */}
              {[
                { label: '협업 능력', sub: '소통·팀워크·협조 자세', val: collab,   set: setCollab   },
                { label: '기술 역량', sub: '전문 지식·문제 해결력',  val: tech,     set: setTech     },
                { label: '신뢰도',   sub: '일정 준수·책임감',       val: reliable, set: setReliable },
              ].map(({ label, sub, val, set }) => (
                <div key={label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-black text-primary">{label}</span>
                      <span className="text-xs text-primary/40 ml-2">{sub}</span>
                    </div>
                    <span className="text-xs font-black text-primary/30">{val > 0 ? `${val}점` : '—'}</span>
                  </div>
                  <StarInput value={val} onChange={set} />
                </div>
              ))}

              {/* Comment */}
              <div>
                <label className="block text-[10px] font-black text-primary/40 uppercase mb-2">평가 코멘트 (선택)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="해당 전문가에 대한 종합 의견을 자유롭게 작성하세요..."
                  rows={3}
                  className="w-full bg-background border border-border/50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-secondary transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-border/50 text-sm font-bold text-primary/50 hover:bg-surface transition-all">
                  취소
                </button>
                <button
                  onClick={() => mutate()}
                  disabled={!canSubmit || isPending}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100">
                  {isPending ? '등록 중...' : '평가 등록'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EvaluationManagementPage() {
  const [keyword,    setKeyword]    = useState('')
  const [searchKw,   setSearchKw]   = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [page,       setPage]       = useState(0)
  const [selected,   setSelected]   = useState<TalentEvalSummary | null>(null)
  const [showHelp,   setShowHelp]   = useState(false)
  const SIZE = 15

  const { data: stats } = useQuery({
    queryKey: ['talent-eval-stats'],
    queryFn: () => serviceAdminApi.getTalentEvalStats().then(r => r.data),
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['talent-eval-list', searchKw, catFilter, page],
    queryFn: () => serviceAdminApi.listTalentsForEvaluation({
      keyword:  searchKw  || undefined,
      category: catFilter || undefined,
      page, size: SIZE,
    }).then(r => r.data),
  })

  const items      = listData?.content      ?? []
  const totalPages = listData?.totalPages   ?? 0
  const total      = listData?.totalElements ?? 0

  function doSearch() { setSearchKw(keyword); setPage(0) }

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">평가 / 리뷰 관리</h2>
          <p className="text-xs text-primary/40 font-medium mt-0.5">
            전문가를 선택하여 협업·기술·신뢰도를 평가합니다.
          </p>
        </div>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: '플랫폼 평균 점수', value: stats?.avgScore?.toFixed(1) ?? '—', sub: '전체 리뷰 기준', icon: '⭐', color: 'text-amber-600' },
          { label: '평가 완료 전문가', value: stats != null ? String(stats.totalReviewed) : '—', sub: '1건 이상 리뷰', icon: '✅', color: 'text-emerald-600' },
          { label: '우수 전문가', value: stats != null ? String(stats.highPerformerCount) : '—', sub: '평균 4.5점 이상', icon: '🏆', color: 'text-blue-600' },
          { label: '이번 달 평가', value: stats != null ? String(stats.monthlyCount) : '—', sub: '이번 달 누적', icon: '📋', color: 'text-purple-600' },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white p-6 rounded-3xl border border-border/30 shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{icon}</span>
              <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest">{sub}</span>
            </div>
            <p className="text-[10px] font-bold text-primary/40 mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white p-6 rounded-[32px] border border-border/30 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1">전문가 검색</label>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="이름으로 검색..."
              className="w-full bg-background border border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all"
            />
          </div>
          <div className="w-40">
            <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1">분류</label>
            <select
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value); setPage(0) }}
              className="w-full bg-background border border-border/50 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all"
            >
              <option value="">전체</option>
              {Object.entries(TALENT_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button onClick={doSearch}
            className="px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-black shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all mb-0.5">
            검색
          </button>
          <button onClick={() => { setKeyword(''); setSearchKw(''); setCatFilter(''); setPage(0) }}
            className="p-2.5 text-primary/30 hover:text-primary transition-all mb-0.5">
            🔄
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] border border-border/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-surface/50 border-b border-border/30">
                <th className="px-8 py-4 text-xs font-black text-primary/40 uppercase tracking-wider w-8"></th>
                <th className="px-4 py-4 text-xs font-black text-primary/40 uppercase tracking-wider">이름</th>
                <th className="px-6 py-4 text-xs font-black text-primary/40 uppercase tracking-wider">분류 / 분야</th>
                <th className="px-6 py-4 text-xs font-black text-primary/40 uppercase tracking-wider text-center">평가 점수</th>
                <th className="px-6 py-4 text-xs font-black text-primary/40 uppercase tracking-wider text-center">평가 수</th>
                <th className="px-8 py-4 text-xs font-black text-primary/40 uppercase tracking-wider text-right">평가하기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-primary/30">불러오는 중...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-primary/30">전문가가 없습니다.</td></tr>
              ) : items.map((t, idx) => (
                <tr key={t.id} className="hover:bg-primary/[0.015] transition-all group">
                  <td className="px-8 py-4 text-xs font-bold text-primary/20">
                    {String(idx + 1 + page * SIZE).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center text-sm font-black text-primary shrink-0">
                        {displayName(t.name).slice(0, 1)}
                      </div>
                      <p className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">{displayName(t.name)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-primary/70">
                        {t.category ? TALENT_CATEGORY_LABELS[t.category as keyof typeof TALENT_CATEGORY_LABELS] ?? t.category : '—'}
                      </span>
                      {t.field && (
                        <span className="text-xs text-primary/40">
                          {TALENT_FIELD_LABELS[t.field as keyof typeof TALENT_FIELD_LABELS] ?? t.field}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ScoreDisplay value={t.avgScore} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-black ${t.reviewCount > 0 ? 'text-primary' : 'text-primary/20'}`}>
                      {t.reviewCount > 0 ? `${t.reviewCount}건` : '—'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button
                      onClick={() => setSelected(t)}
                      className="px-4 py-2 bg-primary text-white text-xs font-black rounded-xl shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      평가하기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-surface/30 px-8 py-4 border-t border-border/30 flex items-center justify-between">
          <p className="text-xs text-primary/40 font-bold">
            {total > 0 ? `Showing ${page * SIZE + 1}–${Math.min((page + 1) * SIZE, total)} of ${total} 전문가` : '결과 없음'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="px-4 py-2 bg-white border border-border/50 rounded-xl text-xs font-bold text-primary/40 disabled:opacity-30 hover:enabled:bg-primary hover:enabled:text-white transition-all">
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const n = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${n === page ? 'bg-primary text-white shadow-md' : 'bg-white border border-border/50 hover:bg-surface'}`}>
                  {n + 1}
                </button>
              )
            })}
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-white border border-border/50 rounded-xl text-xs font-bold text-primary/40 disabled:opacity-30 hover:enabled:bg-primary hover:enabled:text-white transition-all">
              Next
            </button>
          </div>
        </div>
      </div>

      {selected && <EvaluationModal talent={selected} onClose={() => setSelected(null)} />}
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpEvaluationManagement} />
    </div>
  )
}
