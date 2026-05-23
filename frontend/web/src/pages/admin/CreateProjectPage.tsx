import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceAdminApi, AdminCreateProjectRequest, PmUser } from '@/shared/api/serviceAdminApi'
import { settingsApi } from '@/shared/api/settingsApi'

const FALLBACK_ROLE_OPTIONS = [
  '프론트엔드 개발자', '백엔드 개발자', '풀스택 개발자',
  'PM/PL', 'TA', 'AA', 'DA', 'DBA',
  'UI/UX 디자이너', 'UI/UX 기획자', '웹 디자이너',
  'QA 엔지니어', 'DevOps 엔지니어', '데이터 엔지니어', 'AI/ML 엔지니어',
  'IT 컨설턴트', '비즈니스 컨설턴트', 'ERP 컨설턴트',
  '시스템 운영 엔지니어', '네트워크 엔지니어', '보안 엔지니어', '클라우드 엔지니어',
  '기타',
]

interface RoleRow {
  id: string
  role: string
  roleDescription: string
  headcount: number
  mm: number
  roleStart: string
  roleEnd: string
  techStack: string
}

function genId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function initRole(): RoleRow {
  return { id: genId(), role: '프론트엔드 개발자', roleDescription: '', headcount: 1, mm: 1, roleStart: '', roleEnd: '', techStack: '' }
}

function initials(name: string | null): string {
  if (!name) return '??'
  const parts = name.trim().split('')
  return parts.length >= 2 ? parts[0] + parts[parts.length - 1] : parts[0]
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.4)))
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-secondary' : 'bg-border/40'}`}
    >
      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${on ? 'right-1' : 'left-1'}`} />
    </button>
  )
}

export function CreateProjectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [mainContractor, setMainContractor] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [recruitmentDeadline, setRecruitmentDeadline] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [selectedPmId, setSelectedPmId] = useState('')
  const [roles, setRoles] = useState<RoleRow[]>([initRole()])
  const [autoMatching, setAutoMatching] = useState(true)
  const [clientNotification, setClientNotification] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')

  const { data: pmUsers = [] } = useQuery<PmUser[]>({
    queryKey: ['pm-users'],
    queryFn: () => serviceAdminApi.listPmUsers().then(r => r.data),
  })

  const { data: roleOptions = FALLBACK_ROLE_OPTIONS } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
    select: data => data.masterData.projectRoles?.length ? data.masterData.projectRoles : FALLBACK_ROLE_OPTIONS,
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: (req: AdminCreateProjectRequest) => serviceAdminApi.adminCreateProject(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      navigate('/app/service-admin/projects')
    },
    onError: () => setError('등록 중 오류가 발생했습니다. 다시 시도해주세요.'),
  })

  const totalHeadcount = roles.reduce((s, r) => s + r.headcount, 0)
  const totalMM = roles.reduce((s, r) => s + r.mm * r.headcount, 0)
  const durationMonths = startDate && endDate ? monthsBetween(startDate, endDate) : null

  function handleSubmit() {
    if (!title.trim()) { setError('프로젝트명을 입력해주세요.'); return }
    setError('')
    const req: AdminCreateProjectRequest = {
      title: title.trim(),
      clientCompany: clientCompany.trim() || undefined,
      mainContractor: mainContractor.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      requiredSkills: roles.length > 0
        ? JSON.stringify(roles.map(r => ({ role: r.role, roleDescription: r.role === '기타' ? r.roleDescription : undefined, headcount: r.headcount, mm: r.mm, roleStart: r.roleStart, roleEnd: r.roleEnd, techStack: r.techStack })))
        : undefined,
      requiredHeadcount: totalHeadcount || undefined,
      pmId: selectedPmId || undefined,
    }
    createMutation.mutate(req)
  }

  function addRole() {
    setRoles(prev => [...prev, { ...initRole(), roleStart: startDate, roleEnd: endDate }])
  }
  function removeRole(id: string) { setRoles(prev => prev.filter(r => r.id !== id)) }
  function updateRole(id: string, patch: Partial<RoleRow>) {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function handleStartDateChange(newDate: string) {
    setRoles(prev => prev.map(r =>
      r.roleStart === startDate || r.roleStart === '' ? { ...r, roleStart: newDate } : r
    ))
    setStartDate(newDate)
  }

  function handleEndDateChange(newDate: string) {
    setRoles(prev => prev.map(r =>
      r.roleEnd === endDate || r.roleEnd === '' ? { ...r, roleEnd: newDate } : r
    ))
    setEndDate(newDate)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border/30 sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/service-admin/projects')}
              className="w-10 h-10 rounded-xl bg-white border border-border/50 flex items-center justify-center hover:bg-surface transition-all text-lg"
            >
              ←
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-primary">신규 프로젝트 등록</h2>
              <p className="text-xs text-primary/40 font-medium">새로운 비즈니스 기회를 정의하고 인력 매칭을 준비합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/service-admin/projects')}
              className="px-6 py-2.5 bg-white border border-border text-primary/60 rounded-xl text-sm font-black hover:bg-surface transition-all"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:scale-100"
            >
              {createMutation.isPending ? '등록 중...' : '등록 완료'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-[1200px] mx-auto px-10 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-5 py-3 rounded-2xl">{error}</div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── Left Column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Section 1: 기본 정보 */}
          <div className="bg-white p-8 rounded-[40px] border border-border/30 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/10">
              <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">1</span>
              <h3 className="text-lg font-black text-primary">기본 정보</h3>
            </div>

            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">프로젝트명 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 차세대 AI 추천 엔진 고도화"
                className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">발주사 (고객사)</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={e => setClientCompany(e.target.value)}
                  placeholder="예: (주)대한상사"
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">주사업자</label>
                <input
                  type="text"
                  value={mainContractor}
                  onChange={e => setMainContractor(e.target.value)}
                  placeholder="예: (주)링크소프트"
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: 수행 기간 및 일정 */}
          <div className="bg-white p-8 rounded-[40px] border border-border/30 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/10">
              <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">2</span>
              <h3 className="text-lg font-black text-primary">수행 기간 및 일정</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">프로젝트 시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">프로젝트 종료일</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <div className="bg-surface/50 p-6 rounded-3xl border border-border/20">
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-3 ml-1">인력 모집 마감일</label>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={recruitmentDeadline}
                  onChange={e => setRecruitmentDeadline(e.target.value)}
                  className="flex-1 bg-white border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={e => setIsUrgent(e.target.checked)}
                    className="w-5 h-5 rounded border-border accent-secondary"
                  />
                  <span className="text-sm font-bold text-danger">긴급 채용</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: 인력 구성 및 PM */}
          <div className="bg-white p-8 rounded-[40px] border border-border/30 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/10">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">3</span>
                <h3 className="text-lg font-black text-primary">인력 구성 및 PM</h3>
              </div>
              <button
                type="button"
                onClick={addRole}
                className="text-xs font-bold text-secondary px-4 py-2 bg-secondary/5 rounded-xl border border-secondary/20 hover:bg-secondary hover:text-white transition-all"
              >
                + 역할 추가
              </button>
            </div>

            {/* PM 지정 */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-primary/40 uppercase ml-1">책임 PM 지정</label>
              {pmUsers.length === 0 ? (
                <p className="text-sm text-primary/30 py-2">등록된 PM이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pmUsers.map(pm => {
                    const selected = selectedPmId === pm.id
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPmId(selected ? '' : pm.id)}
                        className={`p-4 rounded-2xl flex items-center gap-3 relative transition-all text-left border-2 ${
                          selected
                            ? 'border-secondary bg-secondary/5'
                            : 'border-border/50 bg-white hover:border-secondary/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {initials(pm.name)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-black truncate ${selected ? 'text-primary' : 'text-primary/60'}`}>
                            {pm.name ?? 'PM'}
                          </p>
                          {pm.department && (
                            <p className="text-[10px] text-primary/30 truncate">{pm.department}</p>
                          )}
                        </div>
                        {selected && (
                          <span className="absolute top-2 right-3 text-secondary font-black text-sm">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 인력 구성 테이블 */}
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-4 ml-1">상세 인력 구성</label>
              <div className="space-y-3">
                {roles.map(row => (
                  <div key={row.id} className="p-4 bg-surface/30 rounded-2xl border border-border/20 space-y-3">
                    {/* Row 1: 역할 / 인원 / MM / 삭제 */}
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <select
                          value={row.role}
                          onChange={e => updateRole(row.id, { role: e.target.value })}
                          className="w-full bg-white border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
                        >
                          {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center bg-white border border-border/50 rounded-xl px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={row.headcount}
                            onChange={e => updateRole(row.id, { headcount: Math.max(1, Number(e.target.value)) })}
                            className="w-full text-center text-sm font-black focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-primary/30 ml-1 shrink-0">명</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center bg-white border border-border/50 rounded-xl px-3 py-2">
                          <input
                            type="number"
                            min={0.5}
                            max={99}
                            step={0.5}
                            value={row.mm}
                            onChange={e => updateRole(row.id, { mm: Math.max(0.5, Number(e.target.value)) })}
                            className="w-full text-center text-sm font-black focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-primary/30 ml-1 shrink-0">MM</span>
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeRole(row.id)}
                          disabled={roles.length === 1}
                          className="text-primary/20 hover:text-danger transition-all disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {/* 기타 선택 시 역할 설명 입력 */}
                    {row.role === '기타' && (
                      <div>
                        <input
                          type="text"
                          value={row.roleDescription}
                          onChange={e => updateRole(row.id, { roleDescription: e.target.value })}
                          placeholder="역할 설명을 입력하세요 (예: 데이터 분석가, BI 개발자...)"
                          className="w-full bg-white border border-secondary/40 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-secondary transition-all"
                        />
                        <span className="text-[10px] text-primary/30 font-bold px-1">기타 역할 설명</span>
                      </div>
                    )}
                    {/* Row 2: 투입 기간 / 필수 스택 */}
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={row.roleStart}
                          onChange={e => updateRole(row.id, { roleStart: e.target.value })}
                          className="w-full bg-white border border-border/50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={row.roleEnd}
                          min={row.roleStart || undefined}
                          onChange={e => updateRole(row.id, { roleEnd: e.target.value })}
                          className="w-full bg-white border border-border/50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                        />
                      </div>
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={row.techStack}
                          onChange={e => updateRole(row.id, { techStack: e.target.value })}
                          placeholder="필수 스택 (예: React, TypeScript)"
                          className="w-full bg-white border border-border/50 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-secondary transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 px-1">
                      <span className="col-span-6 text-[10px] text-primary/30 font-bold">투입 기간 (시작 → 종료)</span>
                      <span className="col-span-6 text-[10px] text-primary/30 font-bold">필수 스택</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* 등록 요약 카드 */}
          <div className="bg-primary text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6">등록 요약</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase mb-1">인력 규모</p>
                  <p className="text-3xl font-black">
                    총 {totalHeadcount} <span className="text-lg font-normal text-white/40">명</span>
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase mb-1">수행 개월</p>
                    <p className="text-xl font-black">
                      {durationMonths !== null ? durationMonths : '-'}{' '}
                      <span className="text-xs font-normal text-white/40">개월</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase mb-1">총 MM</p>
                    <p className="text-xl font-black text-accent">
                      {totalMM % 1 === 0 ? totalMM : totalMM.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-white/40">MM</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase mb-1">역할 수</p>
                    <p className="text-xl font-black text-accent">
                      {roles.length}개
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/60">발주사</span>
                    <span className="text-sm font-black truncate max-w-[140px] text-right">{clientCompany || '미입력'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/60">주사업자</span>
                    <span className="text-sm font-black truncate max-w-[140px] text-right">{mainContractor || '미입력'}</span>
                  </div>
                  {isUrgent && (
                    <div className="mt-3 px-3 py-1.5 bg-danger/20 rounded-xl text-center">
                      <span className="text-xs font-black text-red-300">🚨 긴급 채용</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* 추가 옵션 */}
          <div className="bg-white p-8 rounded-[40px] border border-border/30 shadow-sm space-y-6">
            <h4 className="text-sm font-black border-b border-border/10 pb-4 text-primary">추가 옵션</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary/60">전문가 자동 매칭 제안</label>
                <Toggle on={autoMatching} onToggle={() => setAutoMatching(v => !v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary/60">발주사 실시간 알림</label>
                <Toggle on={clientNotification} onToggle={() => setClientNotification(v => !v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary/60">비공개 프로젝트</label>
                <Toggle on={isPrivate} onToggle={() => setIsPrivate(v => !v)} />
              </div>
            </div>
          </div>

          {/* 팁 박스 */}
          <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10">
            <p className="text-xs font-bold text-secondary mb-2">💡 빠른 등록 팁</p>
            <p className="text-[11px] leading-relaxed text-secondary/70">
              인력 구성에서 '필수 스택'을 구체적으로 입력할수록 AI 매칭 엔진이 더 적합한 전문가를 자동으로 추천할 확률이 높아집니다.
            </p>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}
