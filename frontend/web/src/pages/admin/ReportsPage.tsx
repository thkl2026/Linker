import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { serviceAdminApi, type TalentReport, type ProjectReport, type RevenueReport, type EvalReport } from '@/shared/api/serviceAdminApi'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpReports } from '@/shared/help/helpContent'

// ── 색상 팔레트 ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  '개발자': 'bg-blue-500', 'PM': 'bg-violet-500', 'DBA': 'bg-emerald-500',
  'DA': 'bg-amber-500',    'AA': 'bg-rose-500',   '디자이너': 'bg-pink-400',
  '기획자': 'bg-slate-400',
}
const GRADE_COLORS: Record<string, string> = {
  '특급': 'bg-red-500', '고급': 'bg-orange-500', '중급': 'bg-yellow-500',
  '초급': 'bg-green-500', '입문': 'bg-blue-400',
}
const WORKTYPE_COLORS: Record<string, string> = {
  '상주': 'bg-blue-500', '재택': 'bg-emerald-500', '혼합': 'bg-amber-500',
}
const RATEBAND_COLORS: Record<string, string> = {
  '300만 미만': 'bg-slate-400', '300~500만': 'bg-blue-400',
  '500~700만': 'bg-blue-600',   '700~900만': 'bg-violet-500',
  '900만 이상': 'bg-rose-500',
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
    <div className="bg-white rounded-2xl border border-border/30 shadow-sm p-5 h-full flex flex-col">
      <h3 className="text-sm font-bold text-primary mb-4 border-l-4 border-secondary pl-3">{title}</h3>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </div>
  )
}

// ── 탭별 콘텐츠 ───────────────────────────────────────────────────────────────

function TalentStatsTab({ data }: { data: TalentReport }) {
  const { total, available, busy, rest, avgRate, byCategory, byGrade, monthlyNew, topSkills } = data
  const coloredCategory = byCategory.map(d => ({ ...d, color: CATEGORY_COLORS[d.label] ?? 'bg-slate-400' }))
  const coloredGrade    = byGrade.map(d => ({ ...d, color: GRADE_COLORS[d.label] ?? 'bg-slate-400' }))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 등록 전문가" value={total} unit="명" />
        <KpiCard label="투입 가능" value={available} unit="명" color="text-emerald-600"
          sub={total ? `전체의 ${Math.round(available/total*100)}%` : '-'} />
        <KpiCard label="현재 수행 중" value={busy} unit="명" color="text-amber-600"
          sub={total ? `전체의 ${Math.round(busy/total*100)}%` : '-'} />
        <KpiCard label="평균 희망 단가" value={Math.round(avgRate)} unit="만원/월" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Section title="직군별 인원 분포">
          <HBarChart data={coloredCategory} />
          <p className="text-xs text-primary/30 text-right mt-3">총 {total}명</p>
        </Section>
        <Section title="기술 등급별 분포">
          <HBarChart data={coloredGrade} />
          <div className="flex gap-3 mt-4 flex-wrap justify-center">
            {coloredGrade.map(g => (
              <div key={g.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
                <span className="text-[11px] text-primary/50">{g.label} {total ? Math.round(g.count/total*100) : 0}%</span>
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
                  style={{ width: `${topSkills[0]?.count ? (s.count / topSkills[0].count) * 100 : 0}%` }} />
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
                strokeDasharray={`${total ? (available/total)*100 : 0} 100`} strokeLinecap="round" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3.8"
                strokeDasharray={`${total ? (busy/total)*100 : 0} 100`}
                strokeDashoffset={`${total ? -(available/total)*100 : 0}`} strokeLinecap="round" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#94a3b8" strokeWidth="3.8"
                strokeDasharray={`${total ? (rest/total)*100 : 0} 100`}
                strokeDashoffset={`${total ? -((available+busy)/total)*100 : 0}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-black text-primary">{total}</p>
              <p className="text-[9px] text-primary/30">명</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {[
              { label: '투입 가능', count: available, color: 'bg-emerald-500' },
              { label: '수행 중',   count: busy,      color: 'bg-amber-500' },
              { label: '투입 대기', count: rest,      color: 'bg-slate-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${s.color}`} />
                  <span className="text-sm text-primary/60">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-surface rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`}
                      style={{ width: `${total ? (s.count/total)*100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary/70 w-16 text-right">
                    {s.count}명 ({total ? Math.round(s.count/total*100) : 0}%)
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

function ProjectStatsTab({ data }: { data: ProjectReport }) {
  const { total, open, matched, closed, cancelled, byMonth, topClients, byWorkType } = data
  const coloredWorkType = byWorkType.map(d => ({ ...d, color: WORKTYPE_COLORS[d.label] ?? 'bg-slate-400' }))
  const maxBar = Math.max(...byMonth.map(d => d.open + d.closed), 1)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 프로젝트" value={total} unit="건" />
        <KpiCard label="모집 중" value={open} unit="건" color="text-blue-600" />
        <KpiCard label="매칭 완료" value={matched} unit="건" color="text-emerald-600"
          sub={total ? `완료율 ${Math.round((closed+matched)/total*100)}%` : '-'} />
        <KpiCard label="종료/취소" value={closed + cancelled} unit="건" color="text-red-500" />
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
          <HBarChart data={coloredWorkType} />
          <div className="mt-4 space-y-1.5">
            {byWorkType.map(w => (
              <div key={w.label} className="flex justify-between text-xs">
                <span className="text-primary/60">{w.label}</span>
                <span className="font-bold text-primary/70">{total ? Math.round(w.count/total*100) : 0}%</span>
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

function RevenueStatsTab({ data }: { data: RevenueReport }) {
  const { totalMonthly, avgRate, byMonth, byRateBand, byReferral } = data
  const coloredBand = byRateBand.map(d => ({ ...d, color: RATEBAND_COLORS[d.label] ?? 'bg-blue-500' }))
  const maxAmount = Math.max(...byMonth.map(d => d.amount), 1)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="이번 달 예상 매출" value={totalMonthly.toLocaleString()} unit="만원"
          color="text-secondary" />
        <KpiCard label="평균 단가" value={Math.round(avgRate)} unit="만원/월"
          sub="투입 인력 기준" />
        <KpiCard label="투입 인원 기준 수익" value={Math.round(totalMonthly * 0.18).toLocaleString()}
          unit="만원" sub="마진율 18% 기준" color="text-emerald-600" />
        <KpiCard label="단가 구간 분포" value={coloredBand.length} unit="개 구간" />
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
          {coloredBand.map(b => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-primary/60">{b.count}명</span>
              <div className="w-full flex flex-col justify-end h-20">
                <div className={`${b.color} rounded-t-lg w-full transition-all`}
                  style={{ height: `${(b.count / Math.max(...coloredBand.map(x => x.count), 1)) * 100}%` }} />
              </div>
              <span className="text-[10px] text-primary/40 text-center leading-tight">{b.label}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function EvalStatsTab({ data }: { data: EvalReport }) {
  const { avgScore, totalReviews, highPerformers, avgCollab, avgTech, avgReliable, byMonth, topTalents, distribution } = data
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="전체 평균 평점" value={avgScore.toFixed(1)} unit="/ 5.0"
          color="text-amber-600" />
        <KpiCard label="누적 평가 수" value={totalReviews} unit="건" sub="전체 전문가 기준" />
        <KpiCard label="우수 인재" value={highPerformers} unit="명"
          sub="4.5점 이상" color="text-emerald-600" />
        <KpiCard label="협업·기술·신뢰 평균" value={avgCollab.toFixed(1)} unit="/ 5.0" />
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

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-primary/30">
      <svg className="animate-spin w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <span className="text-sm font-medium">데이터를 불러오는 중...</span>
    </div>
  )
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('talent')
  const [period, setPeriod] = useState('6m')
  const [showHelp, setShowHelp] = useState(false)

  const { data: talentData, isLoading: talentLoading } = useQuery({
    queryKey: ['reports', 'talent', period],
    queryFn: () => serviceAdminApi.getTalentReport(period).then(r => r.data),
  })
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['reports', 'project', period],
    queryFn: () => serviceAdminApi.getProjectReport(period).then(r => r.data),
  })
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports', 'revenue', period],
    queryFn: () => serviceAdminApi.getRevenueReport(period).then(r => r.data),
  })
  const { data: evalData, isLoading: evalLoading } = useQuery({
    queryKey: ['reports', 'evaluation', period],
    queryFn: () => serviceAdminApi.getEvalReport(period).then(r => r.data),
  })

  const currentLoading =
    (tab === 'talent' && talentLoading) ||
    (tab === 'project' && projectLoading) ||
    (tab === 'revenue' && revenueLoading) ||
    (tab === 'evaluation' && evalLoading)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-primary">통계 및 보고서</h1>
          <p className="text-sm text-primary/40 mt-0.5">인력·프로젝트·매출·평가 현황을 한눈에 확인합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => setShowHelp(true)} />
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
        </div>
      </div>

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

      <div>
        {currentLoading && <LoadingState />}
        {!currentLoading && tab === 'talent'     && talentData  && <TalentStatsTab  data={talentData} />}
        {!currentLoading && tab === 'project'    && projectData && <ProjectStatsTab data={projectData} />}
        {!currentLoading && tab === 'revenue'    && revenueData && <RevenueStatsTab data={revenueData} />}
        {!currentLoading && tab === 'evaluation' && evalData    && <EvalStatsTab    data={evalData} />}
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpReports} />
    </div>
  )
}
