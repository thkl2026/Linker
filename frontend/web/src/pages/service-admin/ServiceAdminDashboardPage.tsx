import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceAdminApi, type TalentAdmin, type AvailabilityStatus, type LabelCount } from '@/shared/api/serviceAdminApi'
import { notificationApi } from '@/shared/api/notificationApi'
import { displayName } from '@/shared/utils/nameUtils'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpServiceAdminDashboard } from '@/shared/help/helpContent'

const EVAL_COLORS: Record<string, string> = {
  '우수':    '#10b981',
  '양호':    '#f59e0b',
  '주의':    '#f87171',
  '투입불가': '#9ca3af',
  '평가없음': '#d1d5db',
}

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

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, unit, onClick, valueColor, iconBg,
}: {
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
    <svg viewBox="0 0 200 200" className="w-full h-full max-h-[286px]">
      <circle cx="100" cy="100" r={r} fill="none" stroke="#f5ede0" strokeWidth={sw} />
      {arcs.map((a, i) => (
        <circle key={i} cx="100" cy="100" r={r} fill="none"
          stroke={a.color} strokeWidth={sw}
          strokeDasharray={`${a.dash} ${circ - a.dash}`}
          strokeDashoffset={circ / 4 - a.cumOffset}
        />
      ))}
      {/* Segment value labels */}
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

// ─── Recent talent row ───────────────────────────────────────────────────────
function RecentTalentRow({ talent }: { talent: TalentAdmin }) {
  return (
    <div className="p-5 flex items-center justify-between hover:bg-primary/[0.02] transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-xl">👨‍💻</div>
        <div>
          <h4 className="text-sm font-black">
            {displayName(talent.name, talent.nameEn)}
            {talent.category && (
              <span className="text-[10px] font-bold text-primary/40 ml-2">{talent.category}</span>
            )}
          </h4>
          {talent.skills.length > 0 && (
            <p className="text-xs text-primary/40 mt-0.5">{talent.skills.slice(0, 3).join(', ')}</p>
          )}
        </div>
      </div>
      <p className={`text-[10px] font-bold ${AVAILABILITY_COLOR[talent.availabilityStatus]}`}>
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

const NOTIFICATION_ICON: Record<string, string> = {
  TALENT_REGISTERED: '👤',
  TALENT_UPDATED:    '✏️',
  TALENT_DELETED:    '🗑️',
  PROJECT_CREATED:   '🚀',
  MEMBER_ASSIGNED:   '📋',
  EVAL_COMPLETED:    '⭐',
}

function formatNotifTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function ServiceAdminDashboardPage() {
  const [showHelp, setShowHelp] = useState(false)
  const navigate = useNavigate()
  const { data: talentsPage } = useQuery({
    queryKey: ['service-admin', 'dashboard', 'recent'],
    queryFn: () => serviceAdminApi.listTalents({ page: 0, size: 5, sort: 'createdAt,desc' }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['service-admin', 'dashboard', 'stats'],
    queryFn: () => serviceAdminApi.getDashboardStats().then(r => r.data),
  })

  const qc = useQueryClient()
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationApi.getRecent().then(r => r.data),
    refetchInterval: 30_000,
  })
  const { mutate: markAllRead } = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const unreadCount = notifications.filter(n => !n.isRead).length

  const totalTalents = stats?.totalTalents ?? talentsPage?.totalElements ?? 0
  const activeProjects = stats?.activeProjects ?? 0
  const recentTalents = talentsPage?.content ?? []

  const categoryDist = stats?.categoryDist ?? []
  const gradeDist = stats?.gradeDist ?? []
  const evalDist = stats?.evalDist ?? []

  const CATEGORY_DOUGHNUT_COLORS = ['#B45309', '#D97706', '#FBBF24', '#92400e', '#a0855a', '#e0cdb0']
  const categorySegs = toSegs(categoryDist, undefined, CATEGORY_DOUGHNUT_COLORS)
  const gradeSegs    = toSegs(gradeDist,    undefined, GRADE_COLORS)
  const evalSegs     = toSegs(evalDist,     EVAL_COLORS)

  const categoryTotal = categoryDist.reduce((s, d) => s + d.count, 0)
  const gradeTotal    = gradeDist.reduce((s, d) => s + d.count, 0)
  const evalTotal     = evalDist.reduce((s, d) => s + d.count, 0)

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="p-10 space-y-8">
      {/* Greeting header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">안녕하세요, 서비스 운영 현황입니다. 👋</h2>
          <p className="text-xs text-primary/40 mt-0.5">
            {today} · <span className="text-secondary font-bold">운영 중인 서버: 정상</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => setShowHelp(true)} />
          <Link to="/app/service-admin/talents"
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            + 전문가 등록
          </Link>
          <Link to="/app/service-admin/projects/create"
            className="px-5 py-2.5 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all">
            + 프로젝트 등록
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard icon="💼" label="총 전문가 수" value={totalTalents} unit="명"
          onClick={() => navigate('/app/service-admin/talents')} />
        <StatCard icon="🚀" label="활성 프로젝트" value={activeProjects} unit="건"
          iconBg="bg-blue-50"
          onClick={() => navigate('/app/service-admin/projects')} />
      </div>

      {/* Charts row: 3 doughnuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 직무별 인력 구성 */}
        <div className="bg-white p-8 rounded-3xl border border-border/30 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-black tracking-tight">직무별 인력 구성</h3>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[275px]">
            {categorySegs.length > 0
              ? <Doughnut segs={categorySegs} centerValue={categoryTotal} centerLabel="직무" />
              : <p className="text-xs text-primary/30">데이터가 없습니다.</p>
            }
          </div>
        </div>

        {/* 기술 등급별 분포 */}
        <div className="bg-white p-8 rounded-3xl border border-border/30 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-black tracking-tight">기술 등급별 분포</h3>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[275px]">
            {gradeSegs.length > 0
              ? <Doughnut segs={gradeSegs} centerValue={gradeTotal} centerLabel="등급" />
              : <p className="text-xs text-primary/30">데이터가 없습니다.</p>
            }
          </div>
        </div>

        {/* 전문가 평가 분포 */}
        <div className="bg-white p-8 rounded-3xl border border-border/30 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-black tracking-tight">전문가 평가 분포</h3>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[275px]">
            {evalSegs.length > 0
              ? <Doughnut segs={evalSegs} centerValue={evalTotal} centerLabel="평가" />
              : <p className="text-xs text-primary/30">평가 데이터가 없습니다.</p>
            }
          </div>
        </div>

      </div>

      {/* Bottom row: recent talents + urgent projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-border/30 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-border/10 flex justify-between items-center">
            <h3 className="text-lg font-black tracking-tight">최근 등록된 전문가</h3>
            <Link to="/app/service-admin/talents" className="text-xs font-bold text-secondary hover:underline">
              전체보기 ➔
            </Link>
          </div>
          <div className="divide-y divide-border/10">
            {recentTalents.length === 0 ? (
              <p className="text-center text-xs text-primary/30 py-12">등록된 전문가가 없습니다.</p>
            ) : (
              recentTalents.map(t => <RecentTalentRow key={t.id} talent={t} />)
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-border/30 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-border/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight">최근 알림</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-danger text-white text-[10px] font-black rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs font-bold text-primary/40 hover:text-secondary transition-colors">
                전체 읽음
              </button>
            )}
          </div>
          <div className="divide-y divide-border/10">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-primary/30 py-12">알림이 없습니다.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-4 px-8 py-5 transition-colors ${n.isRead ? '' : 'bg-secondary/[0.03]'}`}>
                  <span className="text-lg shrink-0 mt-0.5">{NOTIFICATION_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-bold truncate ${n.isRead ? 'text-primary/60' : 'text-primary'}`}>{n.title}</p>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />}
                    </div>
                    <p className="text-xs text-primary/50 truncate">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-primary/30 shrink-0 mt-1">{formatNotifTime(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpServiceAdminDashboard} />
    </div>
  )
}
