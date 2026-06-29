import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { displayName } from '@/shared/utils/nameUtils'
import { useUiStore } from '@/store/uiStore'
import {
  serviceAdminApi,
  type ProjectStatus,
  type ProjectMember,
  type ProjectDetail,
  type UpdateProjectRequest,
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
const AWARD_STATUS_LABELS: Record<string, string> = {
  REVIEWING: '검토중', WON: '수주확정', LOST: '실주', WITHDRAWN: '철회',
}
const AWARD_BADGE: Record<string, string> = {
  REVIEWING: 'bg-amber-50 text-amber-700',
  WON:       'bg-emerald-50 text-emerald-700',
  LOST:      'bg-red-50 text-red-600',
  WITHDRAWN: 'bg-slate-100 text-slate-600 border border-slate-200',
}

type SkillRow = { role: string; headcount: number; mm?: number; techStack?: string; roleStart?: string; roleEnd?: string; workLocation?: string; skillGrade?: string }

function fmt(d: string | null | undefined) {
  return d ? d.slice(0, 10).replace(/-/g, '.') : '-'
}

function parseSkills(json: string | null): SkillRow[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

// ── Add Member Modal (multi-select) ──────────────────────────────────────────

interface AddMemberModalProps {
  projectId: string
  initialRole: string
  techStack?: string
  headcount: number
  positionMembers: ProjectMember[]
  assignedIds: Set<string>
  onClose: () => void
}

function AddMemberModal({ projectId, initialRole, techStack, headcount, positionMembers, assignedIds, onClose }: AddMemberModalProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(initialRole)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [proposedPrice, setProposedPrice] = useState<string>('')
  const [talentSalary, setTalentSalary] = useState<string>('')
  const qc = useQueryClient()
  const { addToast } = useUiStore()

  const { data: talentPage } = useQuery({
    queryKey: ['talent-picker', search],
    queryFn: () => serviceAdminApi.listTalents({ keyword: search || undefined, size: 30 }).then(r => r.data),
  })
  const allTalents = talentPage?.content ?? []
  const remaining = headcount - positionMembers.length

  // 필터링: 역할이 "개발자"이고 techStack이 있으면 기술 매칭만 표시
  const talents = role && role.includes('개발자') && techStack
    ? allTalents.filter(t => {
        const requiredTechs = techStack.split(',').map(s => s.trim().toLowerCase())
        const talentTechs = t.skills.map(s => s.toLowerCase())
        return requiredTechs.some(req => talentTechs.some(tal => tal.includes(req) || req.includes(tal)))
      })
    : allTalents

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    return next
  })

  const handleConfirm = async () => {
    const list = talents.filter(t => selected.has(t.id))
    if (!list.length) return
    setAssigning(true)
    const pp = proposedPrice ? Number(proposedPrice) : null
    const ts = talentSalary ? Number(talentSalary) : null
    const results = await Promise.allSettled(
      list.map(t => serviceAdminApi.assignMember(projectId, t.id, role || undefined, pp, ts))
    )
    const ok = results.filter(r => r.status === 'fulfilled').length
    const fail = results.length - ok
    qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
    qc.invalidateQueries({ queryKey: ['admin-talents'] })
    if (fail === 0) addToast(`${ok}명 후보 추천 완료.`, 'success')
    else addToast(`${ok}명 추천 완료 · ${fail}명 실패 (이미 추천됨)`, 'warning')
    setAssigning(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-8 py-5 border-b border-border/30 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-primary">후보 추천</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {initialRole && <span className="text-xs text-primary/50 font-bold">{initialRole}</span>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                remaining <= 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {positionMembers.length}/{headcount}명 추천 · {remaining > 0 ? `${remaining}자리 남음` : '마감'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-primary/30 hover:text-primary text-xl leading-none">✕</button>
        </div>

        {/* 이미 추천된 멤버 */}
        {positionMembers.length > 0 && (
          <div className="px-6 pt-4 pb-2 shrink-0">
            <p className="text-[10px] font-black text-primary/30 uppercase mb-2">추천된 멤버</p>
            <div className="flex flex-wrap gap-2">
              {positionMembers.map(m => (
                <span key={m.memberId} className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
                  {m.talentName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="px-6 pt-3 pb-2 shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-2.5 gap-2">
              <input
                type="text"
                placeholder="이름, 기술스택으로 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
              />
              <span className="text-gray-400 text-sm">🔍</span>
            </div>
            <input
              type="text"
              placeholder="역할"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-28 border border-border/50 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
          </div>
        </div>

        {/* 후보자 목록 */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
          {talents.length === 0 ? (
            <p className="text-sm text-primary/40 text-center py-8">검색 결과가 없습니다.</p>
          ) : talents.map(t => {
            const isProjectMember = assignedIds.has(t.id)
            const isSelected = selected.has(t.id)
            return (
              <label
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all
                  ${isProjectMember ? 'border-border/20 bg-surface/30 opacity-50 cursor-not-allowed' :
                    isSelected ? 'border-secondary bg-secondary/5' :
                    'border-border/30 hover:border-secondary/40 hover:bg-secondary/[0.03]'}`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-secondary shrink-0"
                  checked={isSelected}
                  disabled={isProjectMember}
                  onChange={() => !isProjectMember && toggle(t.id)}
                />
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                  {displayName(t.name).slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">{displayName(t.name)}</p>
                  <p className="text-xs text-primary/50 truncate">
                    {t.category ? CAT_LABELS[t.category] ?? t.category : '-'} · {t.skills.slice(0, 3).join(', ') || '-'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  isProjectMember ? 'bg-slate-100 text-slate-400' : AVAIL_BADGE[t.availabilityStatus] ?? 'bg-slate-100 text-slate-500'
                }`}>
                  {isProjectMember ? '이미추천' : AVAIL_LABELS[t.availabilityStatus] ?? t.availabilityStatus}
                </span>
              </label>
            )
          })}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border/20 flex items-center justify-between shrink-0 bg-gray-50">
          <span className="text-xs text-primary/50 font-bold">
            {selected.size > 0 ? `${selected.size}명 선택됨` : '후보자를 선택하세요'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 border border-border/50 rounded-xl text-sm font-bold text-primary/50 hover:bg-white transition-all">
              취소
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={selected.size === 0 || assigning}
              className="px-5 py-2 bg-secondary text-white rounded-xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              추천 ({selected.size}명)
            </button>
          </div>
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      {confirming && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 space-y-4">
            <h4 className="text-base font-black text-primary">추천</h4>
            <p className="text-sm text-primary/70 leading-relaxed">
              <span className="font-bold text-secondary">{selected.size}명</span>을
              {role && <> <span className="font-bold text-primary">{role}</span> 역할로</>} 추천합니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">주사업자 제안 가격 (원/월)</label>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={e => setProposedPrice(e.target.value)}
                  placeholder="예: 6000000"
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">후보자 월 급여 (원/월)</label>
                <input
                  type="number"
                  value={talentSalary}
                  onChange={e => setTalentSalary(e.target.value)}
                  placeholder="예: 5000000"
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-xl">
              배정된 전문가의 가용 상태가 '진행중'으로 변경됩니다.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 border border-border/50 rounded-2xl text-sm font-bold text-primary/50 hover:bg-surface transition-all">
                취소
              </button>
              <button onClick={handleConfirm} disabled={assigning}
                className="flex-1 py-2.5 bg-secondary text-white rounded-2xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40">
                {assigning ? '처리 중...' : '추천'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member, projectId, onEdit }: { member: ProjectMember; projectId: string; onEdit: () => void }) {
  const qc = useQueryClient()
  const { addToast } = useUiStore()

  const remove = useMutation({
    mutationFn: () => serviceAdminApi.removeMember(projectId, member.memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-detail', projectId] }),
  })

  const confirm = useMutation({
    mutationFn: () => serviceAdminApi.confirmMember(projectId, member.memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
      addToast(`${member.talentName} 투입 확정되었습니다.`, 'success')
    },
    onError: () => addToast('확정 처리에 실패했습니다.', 'error'),
  })

  const reject = useMutation({
    mutationFn: () => serviceAdminApi.rejectMember(projectId, member.memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
      addToast(`${member.talentName} 탈락 처리되었습니다.`, 'info')
    },
    onError: () => addToast('탈락 처리에 실패했습니다.', 'error'),
  })

  const giveUp = useMutation({
    mutationFn: () => serviceAdminApi.giveUpMember(projectId, member.memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
      addToast(`${member.talentName} 포기 처리되었습니다.`, 'info')
    },
    onError: () => addToast('포기 처리에 실패했습니다.', 'error'),
  })

  const borderStyle = member.confirmed
    ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
    : member.rejected
    ? 'border-red-200 bg-red-50/30 hover:border-red-300'
    : member.givenUp
    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
    : 'border-border/20 bg-surface/30 hover:border-border/50'

  const avatarStyle = member.confirmed
    ? 'bg-emerald-100 text-emerald-700'
    : member.rejected
    ? 'bg-red-100 text-red-500'
    : member.givenUp
    ? 'bg-amber-100 text-amber-600'
    : 'bg-primary/10 text-primary'

  return (
    <div className={`flex h-full flex-col justify-between gap-4 rounded-2xl border p-5 shadow-sm transition-all ${borderStyle}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${avatarStyle}`}>
          {member.talentName.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-primary">{member.talentName}</p>
            {member.confirmed && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">확정</span>
            )}
            {member.rejected && !member.confirmed && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-500">탈락</span>
            )}
            {member.givenUp && !member.confirmed && !member.rejected && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">포기</span>
            )}
          </div>
          <p className="text-xs text-primary/50 truncate">
            {member.role || (member.category ? CAT_LABELS[member.category] ?? member.category : '-')}
          </p>
          <p className="text-[11px] text-primary/40 mt-1 line-clamp-2">
            {member.skills ? member.skills.split(', ').slice(0, 3).join(', ') : '기술 정보 없음'}
          </p>
          {(member.proposedPrice || member.talentSalary) && (
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {member.proposedPrice && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                  제안 {member.proposedPrice.toLocaleString()}원
                </span>
              )}
              {member.talentSalary && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                  급여 {member.talentSalary.toLocaleString()}원
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {member.availabilityStatus ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${AVAIL_BADGE[member.availabilityStatus] ?? 'bg-slate-100 text-slate-500'}`}>
            {AVAIL_LABELS[member.availabilityStatus] ?? member.availabilityStatus}
          </span>
        ) : <div />}
        <div className="flex items-center gap-1.5">
          {!member.confirmed && !member.rejected && !member.givenUp && (
            <>
              <button
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-all"
                title="투입 확정"
              >
                확정
              </button>
              <button
                onClick={() => reject.mutate()}
                disabled={reject.isPending}
                className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-40 transition-all"
                title="탈락 처리 (삭제되지 않음)"
              >
                탈락
              </button>
              <button
                onClick={() => giveUp.mutate()}
                disabled={giveUp.isPending}
                className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-40 transition-all"
                title="포기 처리 (삭제되지 않음)"
              >
                포기
              </button>
            </>
          )}
          <button
            onClick={onEdit}
            className="text-primary/20 hover:text-secondary transition-colors shrink-0 mr-1"
            title="추천 정보 수정"
          >
            ✎
          </button>
          <button
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="text-primary/20 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
            title="추천 취소"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Project Edit Modal ────────────────────────────────────────────────────────

const WORK_TYPE_OPTIONS = [
  { value: 'ONSITE', label: '상주' },
  { value: 'REMOTE', label: '원격' },
  { value: 'HYBRID', label: '혼합' },
]

function ProjectEditModal({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [aiText, setAiText] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [form, setForm] = useState<UpdateProjectRequest>({
    title: project.title,
    clientCompany: project.clientCompany ?? '',
    mainContractor: project.mainContractor ?? '',
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    requiredHeadcount: project.requiredHeadcount,
    workType: project.workType ?? 'ONSITE',
    description: project.description ?? '',
    budgetMin: project.budgetMin ?? null,
    budgetMax: project.budgetMax ?? null,
    awardStatus: project.awardStatus ?? '',
    awardAmount: project.awardAmount ?? null,
    contractDate: project.contractDate ?? '',
    awardNote: project.awardNote ?? '',
    contractorContact: project.contractorContact ?? '',
  })

  const set = <K extends keyof UpdateProjectRequest>(k: K, v: UpdateProjectRequest[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleAiAnalyze = async () => {
    if (!aiText.trim()) return
    setIsAnalyzing(true)
    try {
      const { data } = await serviceAdminApi.analyzeProjectText(aiText)
      if (data.title)          set('title',          data.title)
      if (data.clientCompany)  set('clientCompany',  data.clientCompany)
      if (data.mainContractor) set('mainContractor', data.mainContractor)
      if (data.startDate)      set('startDate',      data.startDate)
      if (data.endDate)        set('endDate',        data.endDate)
      setAiText('')
      setAiOpen(false)
      addToast('AI 분석 완료. 내용을 확인 후 저장하세요.', 'success')
    } catch {
      addToast('AI 분석에 실패했습니다.', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const save = useMutation({
    mutationFn: () => serviceAdminApi.updateProject(project.id, {
      ...form,
      clientCompany: form.clientCompany || null,
      mainContractor: form.mainContractor || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description || null,
      awardStatus: form.awardStatus || null,
      awardAmount: form.awardAmount || null,
      contractDate: form.contractDate || null,
      awardNote: form.awardNote || null,
      contractorContact: form.contractorContact || null,
      budgetMin: form.budgetMin || null,
      budgetMax: form.budgetMax || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', project.id] })
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      addToast('프로젝트 정보가 수정되었습니다.', 'success')
      onClose()
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-base font-black text-primary">프로젝트 정보 수정</h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary text-xl leading-none">✕</button>
        </div>
        <div className="p-8 overflow-y-auto space-y-4">

          {/* AI 추가 분석 */}
          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setAiOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-black text-secondary flex items-center gap-2">
                ✨ AI 추가 분석 — 텍스트 붙여넣기로 자동 입력
              </span>
              <span className="text-secondary text-xs">{aiOpen ? '▲' : '▼'}</span>
            </button>
            {aiOpen && (
              <div className="px-4 pb-4 space-y-2">
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  rows={4}
                  placeholder="메일이나 메신저로 받은 프로젝트 내역을 붙여넣으세요."
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary resize-none bg-white"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAiAnalyze}
                    disabled={isAnalyzing || !aiText.trim()}
                    className="px-5 py-2 bg-secondary text-white rounded-xl text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {isAnalyzing ? 'AI 분석 중...' : 'AI로 정리하기'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">프로젝트명 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
              placeholder="프로젝트명" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">고객사</label>
              <input value={form.clientCompany ?? ''} onChange={e => set('clientCompany', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                placeholder="(주)예시" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">주사업자</label>
              <input value={form.mainContractor ?? ''} onChange={e => set('mainContractor', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                placeholder="(주)예시" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">시작일</label>
              <input type="date" value={form.startDate ?? ''} onChange={e => set('startDate', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">종료일</label>
              <input type="date" value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">필요 인원</label>
              <input type="number" min={1} value={form.requiredHeadcount ?? 1}
                onChange={e => set('requiredHeadcount', Number(e.target.value))}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">근무 형태</label>
              <select value={form.workType ?? 'ONSITE'} onChange={e => set('workType', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary bg-white">
                {WORK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">예산 하한 (원/월)</label>
              <input type="number" min={0} value={form.budgetMin ?? ''}
                onChange={e => set('budgetMin', e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">예산 상한 (원/월)</label>
              <input type="number" min={0} value={form.budgetMax ?? ''}
                onChange={e => set('budgetMax', e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">설명</label>
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
              rows={3} className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary resize-none"
              placeholder="프로젝트 상세 설명" />
          </div>

          {/* 수주 결과 정보 */}
          <div className="pt-4 mt-2 border-t border-border/20">
            <p className="text-xs font-black text-secondary mb-3">수주 결과 정보</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">수주 상태</label>
                <select value={form.awardStatus ?? ''} onChange={e => set('awardStatus', e.target.value)}
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary bg-white">
                  <option value="">미정</option>
                  <option value="REVIEWING">검토중</option>
                  <option value="WON">수주확정</option>
                  <option value="LOST">실주</option>
                  <option value="WITHDRAWN">철회</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">수주 금액 (원)</label>
                <input type="number" min={0} value={form.awardAmount ?? ''}
                  onChange={e => set('awardAmount', e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                  placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">계약일</label>
                <input type="date" value={form.contractDate ?? ''} onChange={e => set('contractDate', e.target.value)}
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">주사업자 담당자</label>
                <input value={form.contractorContact ?? ''} onChange={e => set('contractorContact', e.target.value)}
                  className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
                  placeholder="이름 / 연락처 / 이메일" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">비고</label>
              <textarea value={form.awardNote ?? ''} onChange={e => set('awardNote', e.target.value)}
                rows={2} className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary resize-none"
                placeholder="수주 관련 메모" />
            </div>
          </div>
        </div>
        <div className="px-8 py-5 border-t border-border/30 bg-gray-50 rounded-b-3xl flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 border border-border/50 rounded-2xl text-sm font-bold text-primary/50 hover:bg-white transition-all">
            취소
          </button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()}
            className="px-8 py-2.5 bg-secondary text-white rounded-2xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40">
            {save.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
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
          <div className="flex gap-3">
            <div className="flex-[2]">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">역할명 *</label>
              <input value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" placeholder="예: 보안 엔지니어" />
            </div>
            <div className="flex-[1]">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">기술등급</label>
              <select value={form.skillGrade ?? ''} onChange={e => set('skillGrade', e.target.value)}
                className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary bg-white">
                <option value="">선택 안 함</option>
                <option value="초급">초급</option>
                <option value="중급">중급</option>
                <option value="고급">고급</option>
                <option value="특급">특급</option>
              </select>
            </div>
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
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">근무 장소</label>
            <input value={form.workLocation ?? ''} onChange={e => set('workLocation', e.target.value)}
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary" placeholder="예: 서울 강남구 / 재택 / 혼합" />
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

function SkillRowItem({ skill, positionMembers, onAssign, onEdit, onDelete }: {
  skill: SkillRow
  positionMembers: ProjectMember[]
  onAssign: (role: string, techStack: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const confirmedCount = positionMembers.filter(m => m.confirmed).length
  const activeCount = positionMembers.filter(m => !m.rejected && !m.givenUp).length
  const total = skill.headcount
  const isFull = activeCount >= total
  const isAllConfirmed = confirmedCount >= total

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface/50 border border-border/20 hover:border-border/40 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-primary">{skill.role}</span>
          {skill.skillGrade && (
            <span className="px-2 py-0.5 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-[10px] font-semibold">
              {skill.skillGrade}
            </span>
          )}
          {/* 배정 현황 뱃지 */}
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            isAllConfirmed ? 'bg-emerald-50 text-emerald-600' :
            activeCount > 0 ? 'bg-amber-50 text-amber-600' :
            'bg-gray-100 text-gray-400'
          }`}>
            {confirmedCount}/{total}명 확정{activeCount > confirmedCount && ` (대기 ${activeCount - confirmedCount}명)`}
          </span>
          {skill.mm != null && skill.mm > 0 && <span className="text-xs text-primary/40">{skill.mm} MM</span>}
          {skill.roleStart && (
            <span className="text-xs text-primary/30">{fmt(skill.roleStart)} ~ {fmt(skill.roleEnd ?? null)}</span>
          )}
        </div>
        {skill.techStack && (
          <p className="text-xs text-primary/40 mt-1">{skill.techStack}</p>
        )}
        {skill.workLocation && (
          <p className="text-xs text-primary/40 mt-0.5">📍 {skill.workLocation}</p>
        )}

        {/* 배정된 멤버 미니 목록 */}
        {positionMembers.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {positionMembers.map(m => (
              <span key={m.memberId}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  m.confirmed ? 'bg-emerald-100 text-emerald-700' :
                  m.rejected ? 'bg-red-100 text-red-500 line-through' :
                  m.givenUp ? 'bg-amber-100 text-amber-600 line-through' :
                  'bg-secondary/10 text-secondary'
                }`}>
                {m.talentName}
              </span>
            ))}
          </div>
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
          onClick={() => onAssign(skill.role, skill.techStack || '')}
          disabled={isAllConfirmed}
          className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${
            isAllConfirmed
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 opacity-40 cursor-not-allowed'
              : isFull
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-secondary hover:text-white hover:border-secondary'
                : 'bg-primary/5 hover:bg-secondary hover:text-white text-primary border-border/30 hover:border-secondary'
          }`}
        >
          {isFull ? '후보 추천' : '+ 후보 추천'}
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
  const [modalTechStack, setModalTechStack] = useState<string>('')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const [awardMenuOpen, setAwardMenuOpen] = useState(false)
  const awardMenuRef = useRef<HTMLDivElement>(null)
  // null = 닫힘, -1 = 신규 추가, 0+ = 편집 대상 인덱스
  const [skillEditIndex, setSkillEditIndex] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editMember, setEditMember] = useState<ProjectMember | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node))
        setStatusMenuOpen(false)
      if (awardMenuRef.current && !awardMenuRef.current.contains(e.target as Node))
        setAwardMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => serviceAdminApi.getProjectDetail(id!).then(r => r.data),
    enabled: !!id,
  })

  const changeStatus = useMutation({
    mutationFn: (status: ProjectStatus) => serviceAdminApi.changeProjectStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      setStatusMenuOpen(false)
    },
  })

  const updateAwardStatus = useMutation({
    mutationFn: (newStatus: string | null) =>
      serviceAdminApi.updateProject(id!, {
        title: project!.title,
        clientCompany: project!.clientCompany,
        mainContractor: project!.mainContractor,
        startDate: project!.startDate,
        endDate: project!.endDate,
        requiredHeadcount: project!.requiredHeadcount,
        workType: project!.workType ?? 'ONSITE',
        description: project!.description,
        budgetMin: project!.budgetMin,
        budgetMax: project!.budgetMax,
        awardAmount: project!.awardAmount,
        contractDate: project!.contractDate,
        awardNote: project!.awardNote,
        contractorContact: project!.contractorContact,
        awardStatus: newStatus || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      addToast('수주 상태가 변경되었습니다.', 'success')
      setAwardMenuOpen(false)
    },
    onError: () => addToast('수주 상태 변경에 실패했습니다.', 'error'),
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

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center min-h-96"><p className="text-sm text-primary/40">불러오는 중...</p></div>
  }
  if (!project) {
    return <div className="p-8 flex items-center justify-center min-h-96"><p className="text-sm text-primary/40">프로젝트를 찾을 수 없습니다.</p></div>
  }

  const skills = parseSkills(project.requiredSkills)
  const assignedIds = new Set(project.members.map(m => m.talentId))
  const membersByRole = project.members.reduce<Record<string, ProjectMember[]>>((acc, m) => {
    const key = m.role ?? ''
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

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

      {/* ── 전체 가로 밴드 섹션 ── */}
      <div className="space-y-6">

        {/* 기본 정보 */}
        <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">기본 정보</h3>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shadow-md shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
              수정
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
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

        {/* 수주 결과 정보 */}
        <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">수주 결과 정보</h3>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shadow-md shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
              수정
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
            <div className="relative" ref={awardMenuRef}>
              <p className="text-[11px] font-bold text-primary/30 uppercase mb-0.5">수주 상태</p>
              <button
                onClick={() => setAwardMenuOpen(o => !o)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current cursor-pointer ${
                  project.awardStatus ? AWARD_BADGE[project.awardStatus] ?? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-50 text-slate-500 border border-dashed border-slate-200'
                }`}
              >
                {project.awardStatus ? AWARD_STATUS_LABELS[project.awardStatus] ?? project.awardStatus : '미정'}
                <span className="opacity-50 text-[10px]">▾</span>
              </button>
              {awardMenuOpen && (
                <div className="absolute left-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-border/30 overflow-hidden z-20">
                  {([['', '미정'], ...Object.entries(AWARD_STATUS_LABELS)] as [string, string][]).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => {
                        if (code !== (project.awardStatus ?? '')) {
                          updateAwardStatus.mutate(code || null)
                        } else {
                          setAwardMenuOpen(false)
                        }
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-surface transition-colors flex items-center justify-between ${
                        (project.awardStatus ?? '') === code ? 'text-secondary bg-secondary/5' : 'text-primary'
                      }`}
                    >
                      {label}
                      {(project.awardStatus ?? '') === code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <InfoRow label="수주 금액" value={project.awardAmount != null ? `${project.awardAmount.toLocaleString()}원` : '-'} />
            <InfoRow label="계약일" value={fmt(project.contractDate)} />
            <InfoRow label="주사업자 담당자" value={project.contractorContact} />
          </div>
          {project.awardNote && (
            <div className="pt-2 border-t border-border/20">
              <p className="text-[11px] font-bold text-primary/30 uppercase mb-1">비고</p>
              <p className="text-sm text-primary/70 whitespace-pre-wrap">{project.awardNote}</p>
            </div>
          )}
        </div>

        {/* 필요 역할 */}
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
                  positionMembers={membersByRole[s.role] ?? []}
                  onAssign={(role, techStack) => {
                    setModalRole(role)
                    setModalTechStack(techStack)
                  }}
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

        {/* 추천 멤버 */}
        <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary/40 uppercase tracking-wider">
              추천 멤버 <span className="text-secondary">{project.members.length}</span>
            </h3>
            <button
              onClick={() => setModalRole('')}
              className="px-3 py-1.5 bg-secondary text-white text-xs font-black rounded-xl shadow-md shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
              + 추천 추가
            </button>
          </div>

          {project.members.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-xs text-primary/30 font-bold">추천된 멤버가 없습니다</p>
              <p className="text-[11px] text-primary/20 mt-1">역할 행의 추천 버튼을 이용하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.members.map(m => (
                <MemberRow key={m.memberId} member={m} projectId={id!} onEdit={() => setEditMember(m)} />
              ))}
            </div>
          )}
        </div>

        {/* 평가 */}
        {project.evaluationScore != null && (
          <div className="bg-white rounded-3xl border border-border/30 shadow-sm p-7 space-y-3">
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

      {modalRole !== null && (
        <AddMemberModal
          projectId={id!}
          initialRole={modalRole}
          techStack={modalTechStack}
          headcount={skills.find(s => s.role === modalRole)?.headcount ?? 1}
          positionMembers={membersByRole[modalRole] ?? []}
          assignedIds={assignedIds}
          onClose={() => {
            setModalRole(null)
            setModalTechStack('')
          }}
        />
      )}

      {showEditModal && (
        <ProjectEditModal project={project} onClose={() => setShowEditModal(false)} />
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

      {editMember !== null && (
        <EditMemberModal
          projectId={id!}
          member={editMember}
          onClose={() => setEditMember(null)}
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

// ── Edit Member Modal ─────────────────────────────────────────────────────────

interface EditMemberModalProps {
  projectId: string
  member: ProjectMember
  onClose: () => void
}

function EditMemberModal({ projectId, member, onClose }: EditMemberModalProps) {
  const [role, setRole] = useState(member.role || '')
  const [proposedPrice, setProposedPrice] = useState<string>(member.proposedPrice?.toString() || '')
  const [talentSalary, setTalentSalary] = useState<string>(member.talentSalary?.toString() || '')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()
  const { addToast } = useUiStore()

  const handleSave = async () => {
    if (!role.trim()) {
      addToast('역할을 입력해주세요.', 'warning')
      return
    }
    setSaving(true)
    try {
      await serviceAdminApi.updateMember(projectId, member.memberId, {
        role: role.trim(),
        proposedPrice: proposedPrice ? Number(proposedPrice) : null,
        talentSalary: talentSalary ? Number(talentSalary) : null,
      })
      qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
      qc.invalidateQueries({ queryKey: ['admin-talents'] })
      addToast('추천 멤버 정보가 수정되었습니다.', 'success')
      onClose()
    } catch {
      addToast('정보 수정에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-primary">추천 정보 수정</h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary text-xl leading-none">✕</button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">역할 *</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="예: 백엔드 개발자"
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">주사업자 제안 가격 (원/월)</label>
            <input
              type="number"
              value={proposedPrice}
              onChange={e => setProposedPrice(e.target.value)}
              placeholder="예: 6000000"
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1">후보자 월 급여 (원/월)</label>
            <input
              type="number"
              value={talentSalary}
              onChange={e => setTalentSalary(e.target.value)}
              placeholder="예: 5000000"
              className="w-full border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border/50 rounded-2xl text-sm font-bold text-primary/50 hover:bg-surface transition-all">
            취소
          </button>
          <button onClick={handleSave} disabled={saving || !role.trim()}
            className="flex-1 py-2.5 bg-secondary text-white rounded-2xl text-sm font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
