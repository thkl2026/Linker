import { useState } from 'react'

// ── Mock 데이터 ────────────────────────────────────────────────────────────────

const TALENT_MOCK = {
  total: 142,
  available: 58,
  busy: 71,
  rest: 13,
  newThisMonth: 7,
  avgRate: 620,
  byCategory: [
    { label: '개발자',  count: 84, color: 'bg-blue-500' },
    { label: 'PM',     count: 18, color: 'bg-violet-500' },
    { label: 'DBA',    count: 12, color: 'bg-emerald-500' },
    { label: 'DA',     count: 11, color: 'bg-amber-500' },
    { label: 'AA',     count: 9,  color: 'bg-rose-500' },
    { label: '디자이너', count: 5, color: 'bg-pink-400' },
    { label: '기획자',  count: 3,  color: 'bg-slate-400' },
  ],
  byGrade: [
    { label: '특급', count: 19, color: 'bg-red-500' },
    { label: '고급', count: 38, color: 'bg-orange-500' },
    { label: '중급', count: 52, color: 'bg-yellow-500' },
    { label: '초급', count: 27, color: 'bg-green-500' },
    { label: '입문', count: 6,  color: 'bg-blue-400' },
  ],
  monthlyNew: [
    { month: '11월', count: 4 }, { month: '12월', count: 6 },
    { month: '1월',  count: 3 }, { month: '2월',  count: 8 },
    { month: '3월',  count: 5 }, { month: '4월',  count: 11 },
    { month: '5월',  count: 7 },
  ],
  topSkills: [
    { skill: 'Java',        count: 61 },
    { skill: 'Spring Boot', count: 54 },
    { skill: 'React',       count: 48 },
    { skill: 'Python',      count: 39 },
    { skill: 'SQL',         count: 37 },
    { skill: 'AWS',         count: 31 },
    { skill: 'Docker',      count: 28 },
    { skill: 'Kubernetes',  count: 19 },
  ],
}

const PROJECT_MOCK = {
  total: 47,
  open: 14,
  matched: 21,
  closed: 9,
  cancelled: 3,
  avgHeadcount: 4.2,
  byMonth: [
    { month: '11월', open: 3, closed: 2 }, { month: '12월', open: 4, closed: 1 },
    { month: '1월',  open: 5, closed: 3 }, { month: '2월',  open: 6, closed: 4 },
    { month: '3월',  open: 8, closed: 5 }, { month: '4월',  open: 7, closed: 6 },
    { month: '5월',  open: 14, closed: 9 },
  ],
  topClients: [
    { name: 'SKT',        count: 8, rate: 93 },
    { name: 'LG CNS',     count: 6, rate: 87 },
    { name: 'KB금융',     count: 5, rate: 91 },
    { name: '삼성SDS',    count: 5, rate: 89 },
    { name: '현대오토에버', count: 4, rate: 85 },
    { name: '신한금융',   count: 3, rate: 96 },
  ],
  byWorkType: [
    { label: '상주', count: 29, color: 'bg-blue-500' },
    { label: '재택', count: 11, color: 'bg-emerald-500' },
    { label: '혼합', count: 7,  color: 'bg-amber-500' },
  ],
}

const REVENUE_MOCK = {
  totalMonthly: 4_230,
  avgRate: 620,
  yoy: +12.4,
  byMonth: [
    { month: '11월', amount: 3_180 }, { month: '12월', amount: 3_420 },
    { month: '1월',  amount: 2_950 }, { month: '2월',  amount: 3_560 },
    { month: '3월',  amount: 3_910 }, { month: '4월',  amount: 4_080 },
    { month: '5월',  amount: 4_230 },
  ],
  byRateBand: [
    { label: '300만 미만',   count: 12, color: 'bg-slate-400' },
    { label: '300~500만',    count: 38, color: 'bg-blue-400' },
    { label: '500~700만',    count: 57, color: 'bg-blue-600' },
    { label: '700~900만',    count: 28, color: 'bg-violet-500' },
    { label: '900만 이상',   count: 7,  color: 'bg-rose-500' },
  ],
  byReferral: [
    { name: '직접 발굴',   count: 61, pct: 43 },
    { name: '지인 추천',   count: 38, pct: 27 },
    { name: '헤드헌팅',    count: 24, pct: 17 },
    { name: '공고',        count: 12, pct: 8 },
    { name: '기타',        count: 7,  pct: 5 },
  ],
}

const EVAL_MOCK = {
  avgScore: 4.1,
  totalReviews: 89,
  highPerformers: 31,
  avgCollab: 4.2,
  avgTech: 3.9,
  avgReliable: 4.3,
  byMonth: [
    { month: '11월', avg: 3.8 }, { month: '12월', avg: 3.9 },
    { month: '1월',  avg: 4.0 }, { month: '2월',  avg: 4.1 },
    { month: '3월',  avg: 4.0 }, { month: '4월',  avg: 4.2 },
    { month: '5월',  avg: 4.1 },
  ],
  topTalents: [
    { name: '김**', category: '개발자', grade: '특급', score: 4.9, reviews: 7 },
    { name: '이**', category: 'PM',     grade: '고급', score: 4.8, reviews: 5 },
    { name: '박**', category: '개발자', grade: '특급', score: 4.7, reviews: 9 },
    { name: '최**', category: 'DBA',    grade: '고급', score: 4.6, reviews: 4 },
    { name: '정**', category: 'DA',     grade: '중급', score: 4.5, reviews: 6 },
  ],
  distribution: [
    { label: '5점',    count: 18 }, { label: '4~5점', count: 34 },
    { label: '3~4점',  count: 28 }, { label: '3점 미만', count: 9 },
  ],
}

// ── 공용 컴포넌트 ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, unit = '', sub, trend, color = 'text-primary' }: {
  label: string; value: string | number; unit?: string; sub?: string
  trend?: { value: number; label: string }; color?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/30 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-primary/40 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-semibold text-primary/40 ml-1">{unit}</span>}
      </p>
      {trend && (
        <p className={`text-xs mt-1 font-semibold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
      {sub && !trend && <p className="text-xs text-primary/40 mt-1">{sub}</p>}
    </div>
  )
}

function HBarChart({ data, max }: { data: { label: string; count: number; color: string }[]; max?: number }) {
  const total = max ?? Math.max(...data.map(d => d.count))
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-primary/60 w-20 shrink-0 text-right">{d.label}</span>
          <div className="flex-1 bg-surface rounded-full h-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${d.color}`}
              style={{ width: `${(d.count / total) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-primary/70 w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

function MiniBarChart({ data, color = 'bg-secondary' }: {
  data: { month: string; count: number }[]; color?: string
}) {
  const max = Math.max(...data.map(d => d.count))
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end h-20">
            <div className={`${color} rounded-t-md w-full transition-all`}
              style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="text-[9px] text-primary/30 leading-none">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

function LineSparkline({ data, color = '#6366f1' }: { data: { month: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.count))
  const min = Math.min(...data.map(d => d.count))
  const range = max - min || 1
  const w = 280; const h = 60
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d.count - min) / range) * (h - 10) - 5
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((d.count - min) / range) * (h - 10) - 5
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />
      })}
    </svg>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border/30 shadow-sm p-5">
      <h3 className="text-sm font-bold text-primary mb-4 border-l-4 border-secondary pl-3">{title}</h3>
      {children}
    </div>
  )
}

// ── 탭별 콘텐츠 ───────────────────────────────────────────────────────────────

function TalentStatsTab() {
  const { total, available, busy, rest, avgRate, byCategory, byGrade, monthlyNew, topSkills } = TALENT_MOCK
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 등록 전문가" value={total} unit="명" trend={{ value: 5.2, label: '전월 대비' }} />
        <KpiCard label="투입 가능" value={available} unit="명" color="text-emerald-600"
          sub={`전체의 ${Math.round(available/total*100)}%`} />
        <KpiCard label="현재 수행 중" value={busy} unit="명" color="text-amber-600"
          sub={`전체의 ${Math.round(busy/total*100)}%`} />
        <KpiCard label="평균 희망 단가" value={avgRate} unit="만원/월" trend={{ value: 2.1, label: '전월 대비' }} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Section title="직군별 인원 분포">
          <HBarChart data={byCategory} />
          <p className="text-xs text-primary/30 text-right mt-3">총 {total}명</p>
        </Section>
        <Section title="기술 등급별 분포">
          <HBarChart data={byGrade} />
          <div className="flex gap-3 mt-4 flex-wrap">
            {byGrade.map(g => (
              <div key={g.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
                <span className="text-[11px] text-primary/50">{g.label} {Math.round(g.count/total*100)}%</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="월별 신규 등록 추이">
          <LineSparkline data={monthlyNew} color="#6366f1" />
          <div className="flex justify-between mt-2">
            {monthlyNew.map(d => (
              <div key={d.month} className="text-center">
                <p className="text-[10px] text-primary/30">{d.month}</p>
                <p className="text-xs font-bold text-primary/70">{d.count}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="보유 기술 스택 Top 8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {topSkills.map(s => (
            <div key={s.skill} className="flex items-center gap-3">
              <span className="text-xs text-primary/60 w-24 shrink-0">{s.skill}</span>
              <div className="flex-1 bg-surface rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-secondary rounded-full"
                  style={{ width: `${(s.count / topSkills[0].count) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-primary/60 w-8 text-right">{s.count}명</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="가용 상태 요약">
        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.8" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.8"
                strokeDasharray={`${(available/total)*100} 100`} strokeLinecap="round" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3.8"
                strokeDasharray={`${(busy/total)*100} 100`}
                strokeDashoffset={`${-(available/total)*100}`} strokeLinecap="round" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#94a3b8" strokeWidth="3.8"
                strokeDasharray={`${(rest/total)*100} 100`}
                strokeDashoffset={`${-((available+busy)/total)*100}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-black text-primary">{total}</p>
              <p className="text-[9px] text-primary/30">명</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {[
              { label: '투입 가능', count: available, color: 'bg-emerald-500 text-emerald-700 bg-emerald-50' },
              { label: '수행 중',   count: busy,      color: 'bg-amber-500 text-amber-700 bg-amber-50' },
              { label: '투입 대기', count: rest,      color: 'bg-slate-400 text-slate-600 bg-slate-100' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${s.color.split(' ')[0]}`} />
                  <span className="text-sm text-primary/60">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-surface rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color.split(' ')[0]}`}
                      style={{ width: `${(s.count/total)*100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary/70 w-12 text-right">
                    {s.count}명 ({Math.round(s.count/total*100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

function ProjectStatsTab() {
  const { total, open, matched, closed, cancelled, byMonth, topClients, byWorkType } = PROJECT_MOCK
  const maxBar = Math.max(...byMonth.map(d => d.open + d.closed))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 프로젝트" value={total} unit="건" trend={{ value: 8.3, label: '전월 대비' }} />
        <KpiCard label="진행 중" value={open} unit="건" color="text-blue-600" sub="모집/수행 포함" />
        <KpiCard label="완료" value={closed} unit="건" color="text-emerald-600"
          sub={`완료율 ${Math.round(closed/total*100)}%`} />
        <KpiCard label="취소" value={cancelled} unit="건" color="text-red-500"
          sub={`취소율 ${Math.round(cancelled/total*100)}%`} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Section title="월별 프로젝트 수주·완료 현황">
            <div className="flex items-end gap-2 h-36 mt-2">
              {byMonth.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex flex-col justify-end h-28 gap-0.5">
                    <div className="bg-emerald-400 rounded-t-sm w-full transition-all"
                      style={{ height: `${(d.closed / maxBar) * 100}%` }} />
                    <div className="bg-blue-500 rounded-t-sm w-full transition-all"
                      style={{ height: `${(d.open / maxBar) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-primary/30">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-xs text-primary/50">수주</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-primary/50">완료</span></div>
            </div>
          </Section>
        </div>
        <Section title="근무 형태별 분포">
          <HBarChart data={byWorkType} />
          <div className="mt-4 space-y-1.5">
            {byWorkType.map(w => (
              <div key={w.label} className="flex justify-between text-xs">
                <span className="text-primary/60">{w.label}</span>
                <span className="font-bold text-primary/70">{Math.round(w.count/total*100)}%</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="고객사별 프로젝트 현황">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">고객사</th>
                <th className="text-center py-2 px-3 text-xs font-bold text-primary/40">프로젝트 수</th>
                <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">수주율</th>
                <th className="text-right py-2 px-3 text-xs font-bold text-primary/40">만족도</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((c, i) => (
                <tr key={c.name} className="border-b border-border/10 hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 px-3 flex items-center gap-2">
                    <span className="text-[11px] font-black text-primary/20 w-5">{i + 1}</span>
                    <span className="font-semibold text-primary">{c.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-secondary/10 text-secondary text-xs font-black rounded-full">
                      {c.count}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden max-w-[80px]">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${c.rate}%` }} />
                      </div>
                      <span className="text-xs text-primary/50">{c.rate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-amber-500 text-sm">{'★'.repeat(Math.round(c.rate / 20))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function RevenueStatsTab() {
  const { totalMonthly, avgRate, yoy, byMonth, byRateBand, byReferral } = REVENUE_MOCK
  const maxAmount = Math.max(...byMonth.map(d => d.amount))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="이번 달 예상 매출" value={`${(totalMonthly/1000).toFixed(1)}억`}
          trend={{ value: yoy, label: '전년 동기 대비' }} color="text-secondary" />
        <KpiCard label="평균 단가" value={avgRate} unit="만원/월"
          sub="투입 인력 기준" />
        <KpiCard label="투입 인원 기준 수익" value={`${Math.round(totalMonthly * 0.18 / 100)}백만`}
          unit="원" sub="마진율 18% 기준" color="text-emerald-600" />
        <KpiCard label="누적 정산 완료" value={38} unit="건"
          trend={{ value: 14.2, label: '전월 대비' }} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Section title="월별 예상 매출 추이 (만원)">
            <div className="flex items-end gap-2 h-36 mt-2">
              {byMonth.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end h-28">
                    <div className="bg-gradient-to-t from-secondary to-secondary/60 rounded-t-md w-full transition-all"
                      style={{ height: `${(d.amount / maxAmount) * 100}%` }} />
                  </div>
                  <p className="text-[9px] text-primary/30">{d.month}</p>
                  <p className="text-[10px] font-bold text-primary/50">{(d.amount/1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <Section title="인력 유입 경로">
          <div className="space-y-3 mt-1">
            {byReferral.map(r => (
              <div key={r.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-primary/60">{r.name}</span>
                  <span className="text-xs font-bold text-primary/70">{r.pct}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-secondary/70 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="단가 구간별 인력 분포">
        <div className="flex items-end gap-3 h-32 mt-2">
          {byRateBand.map(b => {
            const max = Math.max(...byRateBand.map(x => x.count))
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-primary/60">{b.count}명</span>
                <div className="w-full flex flex-col justify-end h-20">
                  <div className={`${b.color} rounded-t-lg w-full transition-all`}
                    style={{ height: `${(b.count / max) * 100}%` }} />
                </div>
                <span className="text-[10px] text-primary/40 text-center leading-tight">{b.label}</span>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function EvalStatsTab() {
  const { avgScore, totalReviews, highPerformers, avgCollab, avgTech, avgReliable, byMonth, topTalents, distribution } = EVAL_MOCK
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="전체 평균 평점" value={avgScore.toFixed(1)} unit="/ 5.0"
          color="text-amber-600" trend={{ value: 2.5, label: '전월 대비' }} />
        <KpiCard label="누적 평가 수" value={totalReviews} unit="건" sub="전체 전문가 기준" />
        <KpiCard label="우수 인재" value={highPerformers} unit="명"
          sub="4.5점 이상" color="text-emerald-600" />
        <KpiCard label="이번 달 평가" value={12} unit="건"
          trend={{ value: 20.0, label: '전월 대비' }} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Section title="항목별 평균 점수">
          <div className="space-y-4 mt-2">
            {[
              { label: '협업 능력', sub: '소통·팀워크', val: avgCollab, color: 'bg-blue-500' },
              { label: '기술 역량', sub: '전문성·문제해결', val: avgTech,    color: 'bg-violet-500' },
              { label: '신뢰도',   sub: '일정준수·책임감', val: avgReliable, color: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-bold text-primary">{item.label}</span>
                    <span className="text-xs text-primary/30 ml-2">{item.sub}</span>
                  </div>
                  <span className="text-lg font-black text-amber-500">{item.val.toFixed(1)}</span>
                </div>
                <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${(item.val / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="월별 평균 평점 추이">
          <div className="mt-1">
            <LineSparkline data={byMonth.map(d => ({ month: d.month, count: d.avg * 10 }))} color="#f59e0b" />
            <div className="flex justify-between mt-2">
              {byMonth.map(d => (
                <div key={d.month} className="text-center">
                  <p className="text-[10px] text-primary/30">{d.month}</p>
                  <p className="text-xs font-bold text-amber-600">{d.avg}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="평점 분포">
          <HBarChart
            data={distribution.map((d, i) => ({
              label: d.label, count: d.count,
              color: ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-400'][i]
            }))}
          />
          <p className="text-xs text-primary/30 mt-3 text-right">총 {totalReviews}건</p>
        </Section>
      </div>

      <Section title="우수 인재 Top 5 (평균 평점 기준)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">순위</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">이름</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">직군</th>
              <th className="text-left py-2 px-3 text-xs font-bold text-primary/40">기술등급</th>
              <th className="text-center py-2 px-3 text-xs font-bold text-primary/40">평가 수</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-primary/40">평균 평점</th>
            </tr>
          </thead>
          <tbody>
            {topTalents.map((t, i) => (
              <tr key={t.name} className="border-b border-border/10 hover:bg-surface/50 transition-colors">
                <td className="py-3 px-3">
                  {i === 0 && <span className="text-amber-500 font-black text-base">🥇</span>}
                  {i === 1 && <span className="text-slate-400 font-black text-base">🥈</span>}
                  {i === 2 && <span className="text-amber-700 font-black text-base">🥉</span>}
                  {i > 2 && <span className="text-xs font-bold text-primary/30 pl-1">{i + 1}</span>}
                </td>
                <td className="py-3 px-3 font-bold text-primary">{t.name}</td>
                <td className="py-3 px-3 text-primary/60">{t.category}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {t.grade}
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-primary/50">{t.reviews}건</td>
                <td className="py-3 px-3 text-right">
                  <span className="text-amber-500 font-black text-base">{t.score.toFixed(1)}</span>
                  <span className="text-primary/30 text-xs"> / 5.0</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

type ReportTab = 'talent' | 'project' | 'revenue' | 'evaluation'

const REPORT_TABS: { id: ReportTab; label: string; icon: string }[] = [
  { id: 'talent',     label: '인력 현황',   icon: '👥' },
  { id: 'project',    label: '프로젝트 현황', icon: '📁' },
  { id: 'revenue',    label: '매출 분석',   icon: '💰' },
  { id: 'evaluation', label: '평가 분석',   icon: '⭐' },
]

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('talent')
  const [period, setPeriod] = useState('6m')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-primary">통계 및 보고서</h1>
          <p className="text-sm text-primary/40 mt-0.5">인력·프로젝트·매출·평가 현황을 한눈에 확인합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface rounded-xl border border-border/30 overflow-hidden">
            {[
              { id: '1m', label: '1개월' },
              { id: '3m', label: '3개월' },
              { id: '6m', label: '6개월' },
              { id: '1y', label: '1년' },
            ].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  period === p.id ? 'bg-secondary text-white' : 'text-primary/50 hover:text-primary'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border/50 rounded-xl text-sm font-semibold text-primary/60 hover:border-secondary hover:text-secondary transition-colors shadow-sm">
            <span>⬇</span> 보고서 다운로드
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-white border border-border/30 rounded-2xl p-1.5 mb-6 shadow-sm w-fit">
        {REPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.id
                ? 'bg-secondary text-white shadow-lg shadow-secondary/25'
                : 'text-primary/50 hover:text-primary hover:bg-surface'
            }`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div>
        {tab === 'talent'     && <TalentStatsTab />}
        {tab === 'project'    && <ProjectStatsTab />}
        {tab === 'revenue'    && <RevenueStatsTab />}
        {tab === 'evaluation' && <EvalStatsTab />}
      </div>

      <p className="text-center text-xs text-primary/20 mt-8">
        * 현재 Mock 데이터로 표시됩니다. 실제 데이터 연동 예정.
      </p>
    </div>
  )
}
