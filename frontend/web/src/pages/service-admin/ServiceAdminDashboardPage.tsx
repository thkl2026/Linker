import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { serviceAdminApi, type TalentAdmin, type AvailabilityStatus, type LabelCount } from '@/shared/api/serviceAdminApi'
import { displayName } from '@/shared/utils/nameUtils'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpServiceAdminDashboard } from '@/shared/help/helpContent'

const GRADE_COLORS = ['#D97706', '#B45309', '#FBBF24', '#92400e', '#e0cdb0', '#a8a29e']

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  AVAILABLE: '투입 가능',
  BUSY:      '수행 중',
  REST:      '투입대기중',
}
const AVAILABILITY_COLOR: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'text-success',
  BUSY:      'text-warning',
  REST:      'text-primary/40',
}

// ─── StatCard (compact horizontal) ───────────────────────────────────────────
function StatCard({
  icon, label, value, unit, onClick, iconBg,
}: {
  icon: string; label: string; value: string | number; unit: string
  onClick?: () => void; iconBg?: string
}) {
  return (
    <div className="bg-white px-5 py-4 rounded-2xl border border-border/30 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
      <div className={`w-10 h-10 ${iconBg ?? 'bg-secondary/10'} rounded-xl flex items-center justify-center text-xl shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-primary/40 mb-0.5">{label}</p>
        <button
          onClick={onClick}
          className={`text-2xl font-black text-primary leading-none ${onClick ? 'hover:text-secondary transition-colors cursor-pointer' : ''}`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
          <span className="text-xs font-normal text-primary/30 ml-1">{unit}</span>
        </button>
      </div>
    </div>
  )
}

// ─── SVG Doughnut ────────────────────────────────────────────────────────────
type DoughnutSeg = { label: string; pct: number; color: string; value: number }

function Doughnut({ segs, centerValue, centerLabel }: {
  segs: DoughnutSeg[]
  centerValue?: number
  centerLabel?: string
}) {
  const r = 72
  const sw = 30
  const circ = 2 * Math.PI * r

  const arcs = segs.reduce<(DoughnutSeg & { dash: number; cumOffset: number })[]>((acc, s) => {
    const prev = acc[acc.length - 1]
    const cumOffset = prev ? prev.cumOffset + prev.dash : 0
    acc.push({ ...s, dash: (s.pct / 100) * circ, cumOffset })
    return acc
  }, [])

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full max-h-[200px]">
      <circle cx="100" cy="100" r={r} fill="none" stroke="#f5ede0" strokeWidth={sw} />
      {arcs.map((a, i) => (
        <circle key={i} cx="100" cy="100" r={r} fill="none"
          stroke={a.color} strokeWidth={sw}
          strokeDasharray={`${a.dash} ${circ - a.dash}`}
          strokeDashoffset={circ / 4 - a.cumOffset}
        />
      ))}
      {arcs.map((a, i) => {
        if (a.pct < 6) return null
        const midAngle = -Math.PI / 2 + ((a.cumOffset + a.dash / 2) / circ) * 2 * Math.PI
        const tx = 100 + r * Math.cos(midAngle)
        const ty = 100 + r * Math.sin(midAngle)
        return (
          <g key={`lbl-${i}`}>
            <text x={tx} y={ty - 3} textAnchor="middle" fontSize="9" fontWeight="600" fill="rgba(255,255,255,0.85)">
              {a.label}
            </text>
            <text x={tx} y={ty + 10} textAnchor="middle" fontSize="11" fontWeight="900" fill="white">
              {a.value}명
            </text>
          </g>
        )
      })}
      {centerValue != null && <>
        <text x="100" y="82" textAnchor="middle" fontSize="9" fontWeight="700" fill="#a0855a" letterSpacing="0.5">
          {centerLabel ?? '전체'}
        </text>
        <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="900" fill="#451A03">
          {centerValue.toLocaleString()}
        </text>
        <text x="100" y="118" textAnchor="middle" fontSize="11" fontWeight="700" fill="#B45309">명</text>
      </>}
    </svg>
  )
}

// ─── Recent talent row (compact) ─────────────────────────────────────────────
function RecentTalentRow({ talent }: { talent: TalentAdmin }) {
  return (
    <div className="py-2 px-5 flex items-center justify-between hover:bg-primary/[0.02] transition-all">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-xl bg-secondary/5 flex items-center justify-center text-sm shrink-0">👤</div>
        <div>
          <span className="text-sm font-black">
            {displayName(talent.name, talent.nameEn)}
          </span>
          {talent.category && (
            <span className="text-[10px] font-bold text-primary/40 ml-2">{talent.category}</span>
          )}
          {talent.skills.length > 0 && (
            <p className="text-[11px] text-primary/40 leading-tight">{talent.skills.slice(0, 3).join(', ')}</p>
          )}
        </div>
      </div>
      <p className={`text-[10px] font-bold shrink-0 ${AVAILABILITY_COLOR[talent.availabilityStatus]}`}>
        {AVAILABILITY_LABEL[talent.availabilityStatus]}
      </p>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function toSegs(dist: LabelCount[], colorMap?: Record<string, string>, fallbackColors?: string[]): DoughnutSeg[] {
  const total = dist.reduce((s, d) => s + d.count, 0)
  if (total === 0) return []
  return dist.map((d, i) => ({
    label: d.label,
    pct: Math.round((d.count / total) * 100),
    color: colorMap?.[d.label] ?? fallbackColors?.[i % (fallbackColors?.length ?? 1)] ?? '#B45309',
    value: d.count,
  }))
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function ServiceAdminDashboardPage() {
  const [showHelp, setShowHelp] = useState(false)
  const navigate = useNavigate()

  const { data: talentsPage } = useQuery({
    queryKey: ['service-admin', 'dashboard', 'recent'],
    queryFn: () => serviceAdminApi.listTalents({ page: 0, size: 6, sort: 'createdAt,desc' }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['service-admin', 'dashboard', 'stats'],
    queryFn: () => serviceAdminApi.getDashboardStats().then(r => r.data),
  })

  const totalTalents  = stats?.totalTalents ?? talentsPage?.totalElements ?? 0
  const activeProjects = stats?.activeProjects ?? 0
  const recentTalents  = talentsPage?.content ?? []

  const categoryDist = stats?.categoryDist ?? []
  const gradeDist    = stats?.gradeDist    ?? []

  const CATEGORY_DOUGHNUT_COLORS = ['#B45309', '#D97706', '#FBBF24', '#92400e', '#a0855a', '#e0cdb0']
  const categorySegs = toSegs(categoryDist, undefined, CATEGORY_DOUGHNUT_COLORS)
  const gradeSegs    = toSegs(gradeDist,    undefined, GRADE_COLORS)

  const categoryTotal = categoryDist.reduce((s, d) => s + d.count, 0)
  const gradeTotal    = gradeDist.reduce((s, d) => s + d.count, 0)

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="p-6 space-y-4 h-full">
      {/* Greeting + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">안녕하세요, 서비스 운영 현황입니다. 👋</h2>
          <p className="text-[11px] text-primary/40 mt-0.5">
            {today} · <span className="text-secondary font-bold">운영 중인 서버: 정상</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => setShowHelp(true)} />
          <Link to="/app/service-admin/talents"
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            + 전문가 등록
          </Link>
          <Link to="/app/service-admin/projects/create"
            className="px-4 py-2 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all">
            + 프로젝트 등록
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <StatCard icon="💼" label="총 전문가 수" value={totalTalents} unit="명"
          onClick={() => navigate('/app/service-admin/talents')} />
        <StatCard icon="🚀" label="활성 프로젝트" value={activeProjects} unit="건"
          iconBg="bg-blue-50"
          onClick={() => navigate('/app/service-admin/projects')} />
      </div>

      {/* Charts + Recent talents */}
      <div className="grid grid-cols-3 gap-5 flex-1">

        {/* 직무별 인력 구성 */}
        <div className="bg-white p-6 rounded-2xl border border-border/30 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-black text-primary tracking-tight">직무별 인력 구성</h3>
          <div className="flex items-center justify-center min-h-[220px]">
            {categorySegs.length > 0
              ? <Doughnut segs={categorySegs} centerValue={categoryTotal} centerLabel="직무" />
              : <p className="text-xs text-primary/30">데이터 없음</p>
            }
          </div>
          {categorySegs.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-border/10">
              {categorySegs.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-primary/60 font-medium">{s.label} <span className="font-bold text-primary">{s.value}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기술 등급별 분포 */}
        <div className="bg-white p-6 rounded-2xl border border-border/30 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-black text-primary tracking-tight">기술 등급별 분포</h3>
          <div className="flex items-center justify-center min-h-[220px]">
            {gradeSegs.length > 0
              ? <Doughnut segs={gradeSegs} centerValue={gradeTotal} centerLabel="등급" />
              : <p className="text-xs text-primary/30">데이터 없음</p>
            }
          </div>
          {gradeSegs.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-border/10">
              {gradeSegs.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-primary/60 font-medium">{s.label} <span className="font-bold text-primary">{s.value}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 등록된 전문가 */}
        <div className="bg-white rounded-2xl border border-border/30 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/10 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-black tracking-tight">최근 등록된 전문가</h3>
            <Link to="/app/service-admin/talents" className="text-[11px] font-bold text-secondary hover:underline">
              전체보기 ➔
            </Link>
          </div>
          <div className="divide-y divide-border/10 overflow-y-auto flex-1">
            {recentTalents.length === 0 ? (
              <p className="text-center text-xs text-primary/30 py-8">등록된 전문가가 없습니다.</p>
            ) : (
              recentTalents.map(t => <RecentTalentRow key={t.id} talent={t} />)
            )}
          </div>
        </div>

      </div>

      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpServiceAdminDashboard} />
    </div>
  )
}
