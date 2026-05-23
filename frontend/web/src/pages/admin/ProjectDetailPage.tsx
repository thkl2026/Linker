import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { displayName } from '@/shared/utils/nameUtils'
import { useUiStore } from '@/store/uiStore'
import {
  serviceAdminApi,
  type ProjectStatus,
  type TalentAdmin,
  type ProjectMember,
} from '@/shared/api/serviceAdminApi'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  OPEN: '인력모집중', MATCHED: '모집 완료', CLOSED: '종료', CANCELLED: '취소',
}
const STATUS_BADGE: Record<ProjectStatus, string> = {
  OPEN:      'bg-emerald-50 text-emerald-700 border border-emerald-100',
  MATCHED:   'bg-blue-50 text-blue-700 border border-blue-100',
  CLOSED:    'bg-slate-100 text-slate-600 border border-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-100',
}
const AVAIL_LABELS: Record<string, string> = {
  AVAILABLE: '가능', BUSY: '진행중', REST: '휴식중',
}
const AVAIL_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  BUSY:      'bg-amber-50 text-amber-700',
  REST:      'bg-slate-100 text-slate-500',
}
const CAT_LABELS: Record<string, string> = {
  DEVELOPER: '개발자', ARCHITECT: 'AA', DBA: 'DBA',
  PM: 'PM/PL', ANALYST: 'DA', DESIGNER: '디자이너',
}

type SkillRow = { role: string; headcount: number; mm?: number; techStack?: string; roleStart?: string; roleEnd?: string }

function fmt(d: string | null | undefined) {
  return d ? d.slice(0, 10).replace(/-/g, '.') : '-'
}

function parseSkills(json: string | null): SkillRow[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

// ── Add Member Modal ─────────────────────────────────────────────────────────

interface AddMemberModalProps {
  projectId: string
  initialRole: string
  assignedIds: Set<string>
  onClose: () => void
}

function AddMemberModal({ projectId, initialRole, assignedIds, onClose }: AddMemberModalProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(initialRole)
  const [confirming, setConfirming] = useState<TalentAdmin | null>(null)
  const qc = useQueryClient()
  const { addToast } = useUiStore()

  const { data: talentPage } = useQuery({
    queryKey: ['talent-picker', search],
    queryFn: () =>
      serviceAdminApi.listTalents({ keyword: search || undefined, size: 20 }).then(r => r.data),
  })
  const talents = talentPage?.content ?? []

  const assign = useMutation({
    mutationFn: (t: TalentAdmin) => serviceAdminApi.assignMember(projectId, t.id, role || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
      qc.invalidateQueries({ queryKey: ['admin-talents'] })
      addToast('전문가가 배정되었습니다.', 'success')
      setConfirming(null)
      onClose()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? '배정에 실패했습니다.'
      addToast(msg, 'error')
      setConfirming(null)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="px-8 py-6 border-b border-border/30 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-primary">전문가 배정</h3>
            {initialRole && <p className="text-xs text-primary/40 mt-0.5">역할: {initialRole}</p>}
          </div>
          <button onClick={onClose} className="text-primary/30 hover:text-primary text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="이름, 기술스택으로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 border border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
            <input
              type="text"
              placeholder="역할"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-36 border border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {talents.length === 0 ? (
              <p className="text-sm text-primary/40 text-center py-8">검색 결과가 없습니다.</p>
            ) : talents.map(t => {
              const isAssigned = assignedIds.has(t.id)
              const isBusy = t.availabilityStatus === 'BUSY'
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all
                    ${isAssigned ? 'border-border/20 bg-surface/30 opacity-50' :
                      isBusy ? 'border-amber-100 bg-amber-50/30' :
                      'border-border/30 hover:border-secondary/50 hover:bg-secondary/5'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                    {displayName(t.name).slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary">{displayName(t.name)}</p>
                    <p className="text-xs text-primary/50 truncate">
                      {t.category ? CAT_LABELS[t.category] ?? t.category : '-'} · {t.skills.slice(0, 3).join(', ') || '-'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isAssigned ? 'bg-slate-100 text-slate-400' : AVAIL_BADGE[t.availabilityStatus] ?? 'bg-slate-100 text-slate-500'
                  }`}>
                    {isAssigned ? '배정됨' : AVAIL_LABELS[t.availabilityStatus] ?? t.availabilityStatus}
                  </span>
                  {!isAssigned && (
                    <button
                      onClick={() => setConfirming(t)}
                      disabled={assign.isPending}
                      className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shrink-0 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                    >
                      배정
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirming && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 space-y-5">
            <h4 className="text-base font-black text-primary">배정 확정</h4>
            <p className="text-sm text-primary/70 leading-relaxed">
              <span className="font-bold text-primary">{displayName(confirming.name)}</span> 전문가를
              {role && <> <span className="font-bold text-secondary">{role}</span> 역할로</>} 배정합니다.<br />
              <span className="text-amber-600 font-bold text-xs mt-1 block">배정 후 해당 전문가의 가용 상태가 '진행중'으로 변경됩니다.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 border border-border/50 rounded-2xl text-sm font-bold text-primary/50 hover:bg-surface transition-all"
              >
                취소
              </button>
              <button
                onClick={() => assign.mutate(confirming)}
                disabled={assign.isPending}
                className="flex-1 py-2.5 bg-secondary text-white rounded-2xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {assign.isPending ? '처리 중...' : '확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member, projectId }: { member: ProjectMember; projectId: string }) {
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: () => serviceAdminApi.removeMember(projectId, member.memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-detail', projectId] }),
  })

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/20 hover:border-border/50 bg-surface/30 transition-all">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
        {member.talentName.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary">{member.talentName}</p>
        <p className="text-xs text-primary/50 truncate">
          {member.role || (member.category ? CAT_LABELS[member.category] ?? member.category : '-')}
          {member.skills ? ` · ${member.skills.split(', ').slice(0, 3).join(', ')}` : ''}
        </p>
      </div>
      {member.availabilityStatus && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${AVAIL_BADGE[member.availabilityStatus] ?? 'bg-slate-100 text-slate-500'}`}>
          {AVAIL_LABELS[member.availabilityStatus] ?? member.availabilityStatus}
        </span>
      )}
      <button
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className="text-primary/20 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
        title="배정 해제"
      >
        ✕
      </button>
    </div>
  )
}

// ── Skill Edit Modal ─────────────────────────────────────────────────────────

const EMPTY_SKILL: SkillRow = { role: '', headcount: 1 }

function SkillEditModal({ initial, onSave, onClose }: {
  initial: SkillRow
  onSave: (row: SkillRow) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<SkillRow>({ ...initial })
  const set = (k: keyof SkillRow, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 space-y-5">
        <h3 className="text-base font-black text-primary">
          {initial.role ? '역할 수정' : '역할 추가'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">역할명 *</label>
            <input value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" placeholder="예: 보안 엔지니어" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">인원</label>
              <input type="number" min={1} value={form.headcount} onChange={e => set('headcount', Number(e.target.value))}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">MM</label>
              <input type="number" min={0} step={0.5} value={form.mm ?? ''} onChange={e => set('mm', e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">기술스택</label>
            <input value={form.techStack ?? ''} onChange={e => set('techStack', e.target.value)}
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" placeholder="예: Fortinet, Juniper" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">시작일</label>
              <input type="date" value={form.roleStart ?? ''} onChange={e => set('roleStart', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">종료일</label>
              <input type="date" value={form.roleEnd ?? ''} onChange={e => set('roleEnd', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border/50 rounded-2xl text-sm font-bold text-primary/50 hover:bg-surface transition-all">
            취소
          </button>
          <button onClick={() => { if (form.role.trim()) onSave(form) }}
            disabled={!form.role.trim()}
            className="flex-1 py-2.5 bg-secondary text-white rounded-2xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skill Row with Assign/Edit/Delete ─────────────────────────────────────────

function SkillRowItem({ skill, onAssign, onEdit, onDelete }: {
  skill: SkillRow
  onAssign: (role: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface/50 border border-border/20 hover:border-border/40 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-primary">{skill.role}</span>
          <span className="text-xs text-primary/50">{skill.headcount}명</span>
          {skill.mm != null && skill.mm > 0 && <span className="text-xs text-primary/40">{skill.mm} MM</span>}
          {skill.roleStart && (
            <span className="text-xs text-primary/30">{fmt(skill.roleStart)} ~ {fmt(skill.roleEnd ?? null)}</span>
          )}
        </div>
        {skill.techStack && (
          <p className="text-xs text-primary/40 mt-1">{skill.techStack}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onEdit}
          className="p-1.5 text-primary/20 hover:text-secondary transition-colors opacity-0 group-hover:opacity-100"
          title="수정">
          ✎
        </button>
        <button onClick={onDelete}
          className="p-1.5 text-primary/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="삭제">
          ✕
        </button>
        <button
          onClick={() => onAssign(skill.role)}
          className="px-3 py-1.5 bg-primary/5 hover:bg-secondary hover:text-white text-primary text-xs font-black rounded-xl border border-border/30 hover:border-secondary transition-all"
        >
          배정
        </button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const STATUS_FLOW: Record<ProjectStatus, ProjectStatus[]> = {
  OPEN:      ['MATCHED', 'CANCELLED'],
  MATCHED:   ['CLOSED', 'OPEN'],
  CLOSED:    [],
  CANCELLED: ['OPEN'],
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [modalRole, setModalRole] = useState<string | null>(null)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  // null = 닫힘, -1 = 신규 추가, 0+ = 편집 대상 인덱스
  const [skillEditIndex, setSkillEditIndex] = useState<number | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node))
        setStatusMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const changeStatus = useMutation({
    mutationFn: (status: ProjectStatus) => serviceAdminApi.changeProjectStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      setStatusMenuOpen(false)
    },
  })

  const saveSkills = useMutation({
    mutationFn: (skills: SkillRow[]) =>
      serviceAdminApi.updateProjectSkills(id!, JSON.stringify(skills)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', id] })
      addToast('필요 역할이 저장되었습니다.', 'success')
      setSkillEditIndex(null)
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => serviceAdminApi.getProjectDetail(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center min-h-96"><p className="text-sm text-primary/40">불러오는 중...</p></div>
  }
  if (!project) {
    return <div className="p-8 flex items-center justify-center min-h-96"><p className="text-sm text-primary/40">프로젝트를 찾을 수 없습니다.</p></div>
  }

  const skills = parseSkills(project.requiredSkills)
  const assignedIds = new Set(project.members.map(m => m.talentId))

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-primary/40 font-bold">
        <button onClick={() => navigate('/app/service-admin/projects')} className="hover:text-primary transition-colors">
          프로젝트 관리
        </button>
        <span>/</span>
        <span className="text-primary">{project.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/service-admin/projects')}
            className="w-10 h-10 rounded-2xl border border-border/50 flex items-center justify-center hover:bg-surface transition-all text-primary/50 hover:text-primary"
          >
            ←
          </button>
          <div>
            <h2 className="text-xl font-black text-primary">{project.title}</h2>
            <p className="text-xs text-primary/40 mt-0.5">
              등록일 {fmt(project.createdAt)} · PM {project.pmName ?? '-'}
            </p>
          </div>
        </div>
        <div className="relative shrink-0" ref={statusMenuRef}>
          <button
            onClick={() => setStatusMenuOpen(o => !o)}
            disabled={STATUS_FLOW[project.status].length === 0}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${STATUS_BADGE[project.status]}
              ${STATUS_FLOW[project.status].length > 0 ? 'hover:ring-2 hover:ring-offset-1 hover:ring-current cursor-pointer' : 'cursor-default'}`}
          >
            {STATUS_LABELS[project.status]}
            {STATUS_FLOW[project.status].length > 0 && <span className="ml-1 opacity-50 text-xs">▾</span>}
          </button>
          {statusMenuOpen && STATUS_FLOW[project.status].length > 0 && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-border/30 overflow-hidden z-20">
              {STATUS_FLOW[project.status].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (window.confirm(`상태를 "${STATUS_LABELS[s]}"(으)로 변경하시겠습니까?`))
                      changeStatus.mutate(s)
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface transition-colors"
                >
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs mr-2 ${STATUS_BADGE[s]}`}>
                    {STATUS_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Left: project info (2/3) */}
        <div className="col-span-2 space-y-5">

          {/* Basic info */}
          <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-5">
            <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">기본 정보</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="고객사" value={project.clientCompany} />
              <InfoRow label="주사업자" value={project.mainContractor} />
              <InfoRow label="시작일" value={fmt(project.startDate)} />
              <InfoRow label="종료일" value={fmt(project.endDate)} />
              <InfoRow label="필요 인원" value={`${project.requiredHeadcount}명`} />
              <InfoRow label="근무 형태" value={project.workType ?? '-'} />
              {project.budgetMin != null && (
                <InfoRow label="예산" value={`${project.budgetMin?.toLocaleString()}원/월 ~ ${project.budgetMax?.toLocaleString()}원/월`} />
              )}
            </div>
            {project.description && (
              <div className="pt-2 border-t border-border/20">
                <p className="text-[11px] font-bold text-primary/30 uppercase mb-1">설명</p>
                <p className="text-sm text-primary/70 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
          </div>

          {/* Required roles */}
          <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">필요 역할</h3>
              <button
                onClick={() => setSkillEditIndex(-1)}
                className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shadow-md shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
              >
                + 역할 추가
              </button>
            </div>
            {skills.length === 0 ? (
              <p className="text-xs text-primary/30 text-center py-4">등록된 역할이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {skills.map((s, i) => (
                  <SkillRowItem
                    key={i}
                    skill={s}
                    onAssign={setModalRole}
                    onEdit={() => setSkillEditIndex(i)}
                    onDelete={() => {
                      const next = skills.filter((_, idx) => idx !== i)
                      saveSkills.mutate(next)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: members (1/3) */}
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">
                배정 멤버 <span className="text-secondary">{project.members.length}</span>
              </h3>
              <button
                onClick={() => setModalRole('')}
                className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shadow-md shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
              >
                + 추가
              </button>
            </div>

            {project.members.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">👤</p>
                <p className="text-xs text-primary/30 font-bold">배정된 멤버가 없습니다</p>
                <p className="text-[11px] text-primary/20 mt-1">역할 행의 배정 버튼을 이용하세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {project.members.map(m => (
                  <MemberRow key={m.memberId} member={m} projectId={id!} />
                ))}
              </div>
            )}
          </div>

          {project.evaluationScore != null && (
            <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-6 space-y-3">
              <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">평가</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">{project.evaluationScore}</span>
                <span className="text-xs text-primary/40 font-bold">/ 10</span>
              </div>
              {project.evaluationNote && (
                <p className="text-xs text-primary/60 whitespace-pre-wrap">{project.evaluationNote}</p>
              )}
              {project.evaluatedAt && (
                <p className="text-[11px] text-primary/30">평가일 {fmt(project.evaluatedAt)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modalRole !== null && (
        <AddMemberModal
          projectId={id!}
          initialRole={modalRole}
          assignedIds={assignedIds}
          onClose={() => setModalRole(null)}
        />
      )}

      {skillEditIndex !== null && (
        <SkillEditModal
          initial={skillEditIndex === -1 ? EMPTY_SKILL : skills[skillEditIndex]}
          onSave={row => {
            const next = skillEditIndex === -1
              ? [...skills, row]
              : skills.map((s, i) => i === skillEditIndex ? row : s)
            saveSkills.mutate(next)
          }}
          onClose={() => setSkillEditIndex(null)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-primary/30 uppercase mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-primary">{value ?? '-'}</p>
    </div>
  )
}
