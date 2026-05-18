import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { talentApi, WorkType, AvailabilityStatus, TalentProfileResponse } from '@/shared/api/talentApi'

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  AVAILABLE: '투입 가능',
  BUSY:      '수행 중',
  REST:      '휴식 중',
}
const AVAILABILITY_COLOR: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  BUSY:      'bg-amber-50 text-amber-700',
  REST:      'bg-slate-100 text-slate-600',
}
const WORK_TYPE_LABEL: Record<WorkType, string> = {
  REMOTE: '원격', ONSITE: '상주', HYBRID: '혼합',
}

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-primary/30 text-xs">—</span>
  const pct = Math.min(100, (value / max) * 100)
  const color = value >= 80 ? 'bg-success' : value >= 60 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-border/40 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-primary/60 w-6 text-right">{Math.round(value)}</span>
    </div>
  )
}

function TalentCard({ talent }: { talent: TalentProfileResponse }) {
  return (
    <div className="bg-white rounded-2xl border border-border/50 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-primary">{talent.name}</p>
          {talent.isNewTalent && (
            <span className="text-xs bg-accent/60 text-primary/70 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">신규</span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AVAILABILITY_COLOR[talent.availabilityStatus]}`}>
          {AVAILABILITY_LABEL[talent.availabilityStatus]}
        </span>
      </div>

      <div className="text-xs text-primary/50 mb-3 space-y-1">
        <div className="flex gap-3">
          <span>{WORK_TYPE_LABEL[talent.workType]}</span>
          {talent.desiredRate && <span>{talent.desiredRate.toLocaleString()}원/월</span>}
        </div>
        {talent.availableFrom && talent.availabilityStatus !== 'AVAILABLE' && (
          <div>가용 예정: {new Date(talent.availableFrom).toLocaleDateString('ko-KR')}</div>
        )}
      </div>

      {talent.topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {talent.topSkills.map(s => (
            <span key={s} className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">{s}</span>
          ))}
        </div>
      )}

      <div className="space-y-1.5 border-t border-border/30 pt-3">
        <div className="flex items-center gap-2 text-xs text-primary/50">
          <span className="w-12 shrink-0">종합</span>
          <ScoreBar value={talent.totalScore} />
        </div>
        <div className="flex items-center gap-2 text-xs text-primary/50">
          <span className="w-12 shrink-0">기술</span>
          <ScoreBar value={talent.skillScore} />
        </div>
        <div className="flex items-center gap-2 text-xs text-primary/50">
          <span className="w-12 shrink-0">신뢰도</span>
          <ScoreBar value={talent.reliabilityScore} />
        </div>
      </div>
    </div>
  )
}

export function ExpertSearchPage() {
  const [workType, setWorkType] = useState<WorkType | ''>('')
  const [maxRate, setMaxRate] = useState('')
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<{ workType?: WorkType; maxRate?: number; page: number }>({ page: 0 })

  const { data, isLoading } = useQuery({
    queryKey: ['procurement', 'talents', filters],
    queryFn: () => talentApi.search({
      workType: filters.workType,
      maxRate: filters.maxRate,
      page: filters.page,
      size: 20,
    }).then(r => r.data),
  })

  const handleSearch = () => {
    setFilters({
      workType: workType || undefined,
      maxRate: maxRate ? Number(maxRate) : undefined,
      page: 0,
    })
    setPage(0)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setFilters(f => ({ ...f, page: newPage }))
  }

  const talents = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">전문가 검색</h1>
        <p className="text-sm text-primary/50 mt-0.5">기술·가용 상태·단가 조건으로 전문가를 검색합니다.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/50 p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-primary/60 mb-1.5">근무 형태</label>
          <div className="flex gap-2">
            {(['', 'ONSITE', 'REMOTE', 'HYBRID'] as const).map(wt => (
              <button key={wt} type="button"
                onClick={() => setWorkType(wt as WorkType | '')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  workType === wt
                    ? 'border-secondary bg-secondary text-white'
                    : 'border-border text-primary/60 hover:border-secondary/50'
                }`}>
                {wt === '' ? '전체' : WORK_TYPE_LABEL[wt as WorkType]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-primary/60 mb-1.5">최대 단가 (원/월)</label>
          <input
            type="number"
            value={maxRate}
            onChange={e => setMaxRate(e.target.value)}
            className="w-36 border border-border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            placeholder="예: 7000000"
          />
        </div>

        <button onClick={handleSearch}
          className="px-5 py-2 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors">
          검색
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-primary/30 text-sm py-16">불러오는 중...</div>
      ) : talents.length === 0 ? (
        <div className="text-center text-primary/30 text-sm py-16">검색 결과가 없습니다.</div>
      ) : (
        <>
          <p className="text-sm text-primary/50 mb-4">총 {data?.totalElements ?? 0}명</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {talents.map(t => <TalentCard key={t.id} talent={t} />)}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => handlePageChange(Math.max(0, page - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">이전</button>
          <span className="text-sm text-primary/60">{page + 1} / {totalPages}</span>
          <button onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">다음</button>
        </div>
      )}
    </div>
  )
}
