import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '@/store/uiStore'
import {
  settingsApi,
  type GeneralSettings,
  type EvaluationSettings,
  type NotificationSettings,
  type MasterData,
  type ReferralSource,
  type ReferralAttachment,
  type InvitedUser,
} from '@/shared/api/settingsApi'

type Tab = 'general' | 'users' | 'evaluation' | 'master' | 'notifications'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',       label: '일반 설정' },
  { id: 'users',         label: '사용자 초대 및 관리' },
  { id: 'evaluation',    label: '평가 시스템 설정' },
  { id: 'master',        label: '마스터 데이터 관리' },
  { id: 'notifications', label: '알림 규칙 설정' },
]

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${value ? 'bg-secondary' : 'bg-border/50'}`}
    >
      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${value ? 'right-1' : 'left-1'}`} />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, sub, action, children }: {
  title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white p-10 rounded-[40px] border border-border/30 shadow-sm">
      <div className="flex justify-between items-center pb-6 border-b border-border/10 mb-8">
        <div>
          <h3 className="text-lg font-black">{title}</h3>
          {sub && <p className="text-xs text-primary/40 font-medium mt-1">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Field label ──────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-black text-primary/40 uppercase mb-3 ml-1 tracking-widest">
      {children}
    </label>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all ${props.className ?? ''}`}
    />
  )
}

// ─── Logo uploader ────────────────────────────────────────────────────────────
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB

function LogoUploader({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null | undefined
  placeholder: React.ReactNode
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useUiStore()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      addToast('이미지 크기는 2MB 이하여야 합니다.', 'error')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-surface border border-border/30 overflow-hidden flex items-center justify-center shrink-0">
          {value
            ? <img src={value} alt="logo" className="w-full h-full object-contain" />
            : placeholder}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-5 py-2.5 bg-white border border-border rounded-xl text-xs font-bold hover:bg-surface transition-all"
          >
            이미지 변경
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="block text-[10px] font-bold text-danger/60 hover:text-danger transition-colors"
            >
              삭제
            </button>
          )}
          <p className="text-[10px] text-primary/30 font-medium">PNG · JPG · SVG · 최대 2MB</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── General tab ─────────────────────────────────────────────────────────────
function GeneralTab({ initial }: { initial: GeneralSettings }) {
  const [form, setForm] = useState(initial)
  const { addToast } = useUiStore()

  useEffect(() => { setForm(initial) }, [initial.platformName, initial.logoUrl, initial.companyLogoUrl])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveGeneral(form),
    onSuccess: () => addToast('일반 설정이 저장되었습니다.', 'success'),
    onError:   () => addToast('저장에 실패했습니다.', 'error'),
  })

  return (
    <Section
      title="기본 정보 설정"
      sub="플랫폼의 기본 브랜드 및 정산 정책을 정의합니다."
    >
      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <Label>플랫폼 명칭</Label>
            <Input value={form.platformName} onChange={e => setForm(f => ({ ...f, platformName: e.target.value }))} />
          </div>
          <div>
            <Label>공식 연락처</Label>
            <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
          </div>
          <div>
            <Label>기본 매칭 수수료율</Label>
            <div className="flex items-center gap-4">
              <input
                type="number" min={0} max={100}
                value={form.feeRate}
                onChange={e => setForm(f => ({ ...f, feeRate: Number(e.target.value) }))}
                className="w-32 bg-background border border-border/50 rounded-2xl px-5 py-4 text-xl font-black focus:outline-none focus:border-secondary transition-all text-center"
              />
              <span className="text-xl font-black text-primary/30">%</span>
              <p className="text-xs text-primary/40 leading-tight">프로젝트 총 예산 대비 플랫폼 수수료 기본값입니다.</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <LogoUploader
            label="플랫폼 로고"
            value={form.logoUrl}
            placeholder={<span className="text-3xl font-black text-white bg-primary w-full h-full flex items-center justify-center rounded-2xl">L</span>}
            onChange={dataUrl => setForm(f => ({ ...f, logoUrl: dataUrl || null }))}
          />
          <LogoUploader
            label="회사 로고"
            value={form.companyLogoUrl}
            placeholder={<span className="text-2xl text-primary/20">🏢</span>}
            onChange={dataUrl => setForm(f => ({ ...f, companyLogoUrl: dataUrl || null }))}
          />
        </div>
      </div>
      <div className="pt-8 border-t border-border/10 flex justify-end mt-8">
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </Section>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = { PENDING: '초대 발송됨', ACCEPTED: '가입 완료', EXPIRED: '만료됨' }
const STATUS_DOT: Record<string, string>   = { PENDING: 'bg-warning animate-pulse', ACCEPTED: 'bg-success', EXPIRED: 'bg-border' }
const STATUS_TEXT: Record<string, string>  = { PENDING: 'text-warning', ACCEPTED: 'text-success', EXPIRED: 'text-primary/30' }

function UsersTab() {
  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState('TALENT')
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  const { data: invitations = [] } = useQuery({
    queryKey: ['settings', 'invitations'],
    queryFn: () => settingsApi.listInvitations().then(r => r.data),
  })

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: () => settingsApi.inviteUser(email, role),
    onSuccess: () => {
      addToast(`${email} 으로 초대 링크를 발송했습니다.`, 'success')
      setEmail('')
      qc.invalidateQueries({ queryKey: ['settings', 'invitations'] })
    },
    onError: () => addToast('초대 발송에 실패했습니다.', 'error'),
  })

  const { mutate: resend } = useMutation({
    mutationFn: (id: string) => settingsApi.resendInvitation(id),
    onSuccess: () => {
      addToast('초대를 재발송했습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings', 'invitations'] })
    },
  })

  const { mutate: revoke } = useMutation({
    mutationFn: (id: string) => settingsApi.revokeInvitation(id),
    onSuccess: () => {
      addToast('초대를 취소했습니다.', 'info')
      qc.invalidateQueries({ queryKey: ['settings', 'invitations'] })
    },
  })

  function initials(inv: InvitedUser) {
    if (inv.status === 'ACCEPTED') {
      const parts = inv.email.split('@')[0].slice(0, 2).toUpperCase()
      return parts
    }
    return '📧'
  }

  return (
    <Section
      title="신규 사용자 초대"
      sub="전문가 또는 기업 담당자에게 초대 메일을 발송하여 가입을 진행합니다."
    >
      {/* Invite form */}
      <div className="p-6 bg-surface rounded-3xl border border-border/30 grid grid-cols-12 gap-4 items-end mb-8">
        <div className="col-span-5">
          <Label>초대 이메일 주소</Label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && invite()}
            placeholder="user@company.com"
            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all"
          />
        </div>
        <div className="col-span-4">
          <Label>사용자 유형</Label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all appearance-none font-bold text-secondary"
          >
            <option value="TALENT">전문가 (Expert)</option>
            <option value="PM">PM (Project Manager)</option>
            <option value="PROCUREMENT">기업 담당자 (Client)</option>
          </select>
        </div>
        <div className="col-span-3">
          <button
            onClick={() => email && invite()}
            disabled={!email || inviting}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50">
            {inviting ? '발송 중...' : '초대 링크 발송'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-black text-primary/30 uppercase tracking-widest border-b border-border/10">
              <th className="pb-4 px-2">이메일 (계정 정보)</th>
              <th className="pb-4 px-2">유형</th>
              <th className="pb-4 px-2">가입 상태</th>
              <th className="pb-4 px-2">초대일</th>
              <th className="pb-4 px-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/5">
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-primary/30">초대 내역이 없습니다.</td>
              </tr>
            ) : invitations.map(inv => (
              <tr key={inv.id} className="group">
                <td className="py-5 px-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black
                      ${inv.status === 'ACCEPTED' ? 'bg-primary text-white' : 'bg-white border border-border/30 text-sm'}`}>
                      {initials(inv)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary/80">{inv.email}</p>
                      <p className="text-[10px] text-primary/30 uppercase">
                        {inv.status === 'PENDING' ? 'Invitation Pending' : inv.status === 'ACCEPTED' ? 'Active User' : 'Expired'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-2">
                  <span className={`px-2 py-1 text-[10px] font-black rounded-md border uppercase
                    ${inv.role === 'TALENT' ? 'bg-secondary/5 text-secondary border-secondary/10' : 'bg-primary/5 text-primary border-primary/10'}`}>
                    {inv.role === 'TALENT' ? 'Expert' : inv.role === 'PM' ? 'PM' : 'Client'}
                  </span>
                </td>
                <td className="py-5 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[inv.status] ?? 'bg-border'}`} />
                    <span className={`text-xs font-bold ${STATUS_TEXT[inv.status] ?? 'text-primary/30'}`}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </div>
                </td>
                <td className="py-5 px-2">
                  <p className="text-xs text-primary/40 font-medium">
                    {inv.invitedAt ? inv.invitedAt.slice(0, 10).replace(/-/g, '.') : '-'}
                  </p>
                </td>
                <td className="py-5 px-2 text-right">
                  {inv.status === 'PENDING' ? (
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => resend(inv.id)}
                        className="text-xs font-bold text-secondary hover:underline">
                        초대 재발송
                      </button>
                      <button onClick={() => revoke(inv.id)}
                        className="text-xs font-bold text-primary/30 hover:text-danger transition-colors">
                        취소
                      </button>
                    </div>
                  ) : (
                    <button className="text-xs font-bold text-primary/30 hover:text-primary transition-all">
                      활동 로그
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ─── Evaluation tab ───────────────────────────────────────────────────────────
function EvaluationTab({ initial }: { initial: EvaluationSettings }) {
  const [form,    setForm]    = useState(initial)
  const [newName, setNewName] = useState('')
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setForm(initial) }, [initial.gradeS])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveEvaluation(form),
    onSuccess: () => {
      addToast('평가 설정이 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  function updateWeight(idx: number, weight: number) {
    setForm(f => ({
      ...f,
      metrics: f.metrics.map((m, i) => i === idx ? { ...m, weight } : m),
    }))
  }

  function removeMetric(idx: number) {
    setForm(f => ({ ...f, metrics: f.metrics.filter((_, i) => i !== idx) }))
  }

  function addMetric() {
    if (!newName.trim()) return
    setForm(f => ({
      ...f,
      metrics: [...f.metrics, { name: newName.trim(), icon: '📌', weight: 0 }],
    }))
    setNewName('')
  }

  const totalWeight = form.metrics.reduce((s, m) => s + m.weight, 0)

  const GRADES = [
    { key: 'gradeS' as const, label: 'S', bg: 'bg-primary', text: 'text-white' },
    { key: 'gradeA' as const, label: 'A', bg: 'bg-secondary', text: 'text-white' },
    { key: 'gradeB' as const, label: 'B', bg: 'bg-border', text: 'text-primary' },
  ]

  return (
    <Section
      title="평가 지표 및 기준 설정"
      sub="전문가 성과 측정을 위한 지표와 등급 체계를 관리합니다."
      action={
        <button
          onClick={() => setForm(f => ({ ...f, metrics: [...f.metrics, { name: '신규 지표', icon: '📌', weight: 0 }] }))}
          className="px-5 py-2.5 bg-surface border border-border rounded-xl text-xs font-bold hover:bg-white transition-all">
          + 지표 추가
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Metrics */}
        <div className="space-y-4">
          <Label>평가 지표 구성 {totalWeight !== 100 && <span className="text-danger ml-2">합계: {totalWeight}%</span>}</Label>
          <div className="space-y-3">
            {form.metrics.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/30 gap-3">
                <span className="text-sm font-bold flex-1">{m.icon} {m.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary/40">가중치</span>
                  <input
                    type="number" min={0} max={100} value={m.weight}
                    onChange={e => updateWeight(i, Number(e.target.value))}
                    className="w-16 bg-white border border-border/50 rounded-xl px-2 py-1.5 text-sm text-center font-black text-secondary focus:outline-none focus:border-secondary"
                  />
                  <span className="text-xs font-black text-secondary">%</span>
                  <button onClick={() => removeMetric(i)}
                    className="w-6 h-6 rounded-full bg-border/20 flex items-center justify-center text-[10px] text-primary/30 hover:bg-danger/10 hover:text-danger transition-all ml-1">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {/* add input */}
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMetric()}
                placeholder="새 지표 이름..."
                className="flex-1 bg-background border border-dashed border-border/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all"
              />
              <button onClick={addMetric}
                className="px-4 py-3 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-2xl hover:bg-secondary hover:text-white transition-all">
                추가
              </button>
            </div>
          </div>
        </div>

        {/* Grade thresholds */}
        <div className="space-y-4">
          <Label>등급 점수 기준 (5점 만점)</Label>
          <div className="space-y-4">
            {GRADES.map(g => (
              <div key={g.key} className="flex items-center gap-4">
                <span className={`w-12 h-8 ${g.bg} ${g.text} rounded-lg flex items-center justify-center text-xs font-black`}>
                  {g.label}
                </span>
                <input
                  type="number" step="0.1" min={0} max={5}
                  value={form[g.key]}
                  onChange={e => setForm(f => ({ ...f, [g.key]: Number(e.target.value) }))}
                  className="w-20 bg-background border border-border/50 rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none focus:border-secondary"
                />
                <span className="text-xs text-primary/40">점 이상</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/10 flex justify-end mt-8">
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </Section>
  )
}

// ─── Master data tab ──────────────────────────────────────────────────────────
const TECH_COLORS = [
  'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600', 'bg-orange-50 text-orange-600',
  'bg-sky-50 text-sky-600',   'bg-purple-50 text-purple-600',   'bg-rose-50 text-rose-600',
  'bg-amber-50 text-amber-600','bg-teal-50 text-teal-600',       'bg-indigo-50 text-indigo-600',
]

const EMPTY_REFERRAL: ReferralSource = { name: '', registrationNo: '', contactEmail: '', phone: '', bankAccount: '', attachments: [] }

const ATTACH_LABELS = ['사업자등록증', '통장사본', '계약서', '기타'] as const

function MasterDataTab({ initial }: { initial: MasterData }) {
  const [form, setForm] = useState(initial)
  const [newContractor, setNewContractor] = useState('')
  const [newTech, setNewTech] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newRef, setNewRef] = useState<ReferralSource>(EMPTY_REFERRAL)
  const [editingRefIdx, setEditingRefIdx] = useState<number | null>(null)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setForm(initial) }, [initial.contractors.length, initial.techStacks.length, initial.referralSources?.length, initial.projectRoles?.length])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveMasterData(form),
    onSuccess: () => {
      addToast('마스터 데이터가 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  function addContractor() {
    const v = newContractor.trim()
    if (!v || form.contractors.includes(v)) return
    setForm(f => ({ ...f, contractors: [...f.contractors, v] }))
    setNewContractor('')
  }

  function removeContractor(item: string) {
    setForm(f => ({ ...f, contractors: f.contractors.filter(c => c !== item) }))
  }

  function addTech() {
    const v = newTech.trim()
    if (!v || form.techStacks.includes(v)) return
    setForm(f => ({ ...f, techStacks: [...f.techStacks, v] }))
    setNewTech('')
  }

  function removeTech(item: string) {
    setForm(f => ({ ...f, techStacks: f.techStacks.filter(t => t !== item) }))
  }

  function addRole() {
    const v = newRole.trim()
    if (!v || (form.projectRoles ?? []).includes(v)) return
    setForm(f => ({ ...f, projectRoles: [...(f.projectRoles ?? []), v] }))
    setNewRole('')
  }

  function removeRole(item: string) {
    setForm(f => ({ ...f, projectRoles: (f.projectRoles ?? []).filter(r => r !== item) }))
  }

  function addReferralSource() {
    if (!newRef.name.trim()) return
    setForm(f => ({ ...f, referralSources: [...(f.referralSources ?? []), { ...newRef, name: newRef.name.trim() }] }))
    setNewRef(EMPTY_REFERRAL)
  }

  function updateReferralSource(idx: number, patch: Partial<ReferralSource>) {
    setForm(f => {
      const list = [...(f.referralSources ?? [])]
      list[idx] = { ...list[idx], ...patch }
      return { ...f, referralSources: list }
    })
  }

  function removeReferralSource(idx: number) {
    setForm(f => ({ ...f, referralSources: (f.referralSources ?? []).filter((_, i) => i !== idx) }))
  }

  const refInputCls = 'bg-background border border-dashed border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-all w-full'
  const refCellCls  = 'px-3 py-2.5 text-sm text-primary/70'

  return (
    <div className="bg-white p-10 rounded-[40px] border border-border/30 shadow-sm space-y-8">
      {/* 주사업자 + 기술스택 */}
      <div className="grid grid-cols-2 gap-10">
        {/* Contractors */}
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-border/10">
            <h3 className="text-base font-black">주사업자 리스트</h3>
            <span className="text-xs text-primary/30">{form.contractors.length}개</span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[80px]">
            {form.contractors.map(c => (
              <span key={c} className="px-4 py-2 bg-surface border border-border/50 rounded-xl text-xs font-bold flex items-center gap-2">
                {c}
                <button onClick={() => removeContractor(c)} className="opacity-30 hover:opacity-100 hover:text-danger transition-all">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newContractor} onChange={e => setNewContractor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addContractor()} placeholder="(주)회사명..."
              className="flex-1 bg-background border border-dashed border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <button onClick={addContractor}
              className="px-4 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-2xl hover:bg-secondary hover:text-white transition-all">
              + 추가
            </button>
          </div>
        </div>

        {/* Tech stacks */}
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-border/10">
            <h3 className="text-base font-black">공통 기술 스택</h3>
            <span className="text-xs text-primary/30">{form.techStacks.length}개</span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[80px]">
            {form.techStacks.map((t, i) => (
              <span key={t} className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 ${TECH_COLORS[i % TECH_COLORS.length]}`}>
                {t}
                <button onClick={() => removeTech(t)} className="opacity-40 hover:opacity-100 transition-all">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTech} onChange={e => setNewTech(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTech()} placeholder="React, Java Spring..."
              className="flex-1 bg-background border border-dashed border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <button onClick={addTech}
              className="px-4 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-2xl hover:bg-secondary hover:text-white transition-all">
              + 추가
            </button>
          </div>
        </div>
      </div>

      {/* 프로젝트 인력 역할 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border/10">
          <div>
            <h3 className="text-base font-black">프로젝트 인력 역할 코드</h3>
            <p className="text-xs text-primary/40 mt-0.5">프로젝트 등록 시 인력 구성에서 선택할 수 있는 역할 목록입니다.</p>
          </div>
          <span className="text-xs text-primary/30">{(form.projectRoles ?? []).length}개</span>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[80px]">
          {(form.projectRoles ?? []).map((r, i) => (
            <span
              key={r}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                i < 3 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                i < 8 ? 'bg-purple-50 text-purple-600 border-purple-100' :
                i < 14 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                i < 17 ? 'bg-orange-50 text-orange-600 border-orange-100' :
                'bg-surface text-primary/60 border-border/30'
              }`}
            >
              {r}
              <button onClick={() => removeRole(r)} className="opacity-40 hover:opacity-100 hover:text-danger transition-all">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRole()}
            placeholder="예: SAP 컨설턴트, 스토리지 엔지니어..."
            className="flex-1 bg-background border border-dashed border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all"
          />
          <button
            onClick={addRole}
            className="px-4 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-2xl hover:bg-secondary hover:text-white transition-all"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* 추천소스 테이블 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border/10">
          <h3 className="text-base font-black">추천소스 관리</h3>
          <span className="text-xs text-primary/30">{(form.referralSources ?? []).length}개</span>
        </div>

        <div className="border border-border/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-[11px] font-black text-primary/40 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[15%]">기관명</th>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[13%]">등록번호</th>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[17%]">담당자 이메일</th>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[13%]">전화번호</th>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[15%]">통장번호</th>
                <th className="px-4 py-3 text-left border-b border-border/20 w-[17%]">첨부파일</th>
                <th className="px-4 py-3 text-center border-b border-border/20 w-[10%]">액션</th>
              </tr>
            </thead>
            <tbody>
              {(form.referralSources ?? []).map((r, idx) => (
                <tr key={idx} className="border-b border-border/10 hover:bg-surface/50 transition-colors">
                  {editingRefIdx === idx ? (
                    <>
                      <td className="px-2 py-1.5"><input className={refInputCls} value={r.name} onChange={e => updateReferralSource(idx, { name: e.target.value })} placeholder="기관명" /></td>
                      <td className="px-2 py-1.5"><input className={refInputCls} value={r.registrationNo} onChange={e => updateReferralSource(idx, { registrationNo: e.target.value })} placeholder="000-00-00000" /></td>
                      <td className="px-2 py-1.5"><input className={refInputCls} value={r.contactEmail} onChange={e => updateReferralSource(idx, { contactEmail: e.target.value })} placeholder="contact@org.com" /></td>
                      <td className="px-2 py-1.5"><input className={refInputCls} value={r.phone} onChange={e => updateReferralSource(idx, { phone: e.target.value.replace(/\D/g, '') })} placeholder="0215551234" /></td>
                      <td className="px-2 py-1.5"><input className={refInputCls} value={r.bankAccount} onChange={e => updateReferralSource(idx, { bankAccount: e.target.value })} placeholder="은행 계좌번호" /></td>
                      <td className="px-2 py-1.5">
                        <AttachmentCell
                          attachments={r.attachments ?? []}
                          uploading={uploadingIdx === idx}
                          onUpload={async (file, name) => {
                            setUploadingIdx(idx)
                            try {
                              const res = await settingsApi.uploadReferralAttachment(file, name)
                              updateReferralSource(idx, { attachments: [...(r.attachments ?? []), res.data] })
                            } finally { setUploadingIdx(null) }
                          }}
                          onDelete={att => updateReferralSource(idx, { attachments: (r.attachments ?? []).filter(a => a.key !== att.key) })}
                          onDownload={async att => {
                            const res = await settingsApi.getAttachmentDownloadUrl(att.key)
                            window.open(res.data.url, '_blank')
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => setEditingRefIdx(null)} className="text-[11px] font-black text-secondary hover:underline">완료</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${refCellCls} font-bold text-primary`}>{r.name}</td>
                      <td className={refCellCls}>{r.registrationNo || <span className="text-primary/20">—</span>}</td>
                      <td className={refCellCls}>{r.contactEmail || <span className="text-primary/20">—</span>}</td>
                      <td className={refCellCls}>{r.phone || <span className="text-primary/20">—</span>}</td>
                      <td className={refCellCls}>{r.bankAccount || <span className="text-primary/20">—</span>}</td>
                      <td className={refCellCls}>
                        {(r.attachments ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(r.attachments ?? []).map(att => (
                              <button key={att.key} onClick={async () => {
                                const res = await settingsApi.getAttachmentDownloadUrl(att.key)
                                window.open(res.data.url, '_blank')
                              }} className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                                📎 {att.name}
                              </button>
                            ))}
                          </div>
                        ) : <span className="text-primary/20">—</span>}
                      </td>
                      <td className="px-2 py-2.5 text-center flex items-center justify-center gap-2">
                        <button onClick={() => setEditingRefIdx(idx)} className="text-[11px] font-black text-primary/40 hover:text-secondary transition-colors">수정</button>
                        <button onClick={() => removeReferralSource(idx)} className="text-[11px] font-black text-primary/40 hover:text-danger transition-colors">삭제</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {/* 신규 입력 행 */}
              <tr className="bg-surface/30">
                <td className="px-2 py-2"><input className={refInputCls} value={newRef.name} onChange={e => setNewRef(r => ({ ...r, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addReferralSource()} placeholder="기관명 *" /></td>
                <td className="px-2 py-2"><input className={refInputCls} value={newRef.registrationNo} onChange={e => setNewRef(r => ({ ...r, registrationNo: e.target.value }))} placeholder="000-00-00000" /></td>
                <td className="px-2 py-2"><input className={refInputCls} value={newRef.contactEmail} onChange={e => setNewRef(r => ({ ...r, contactEmail: e.target.value }))} placeholder="contact@org.com" /></td>
                <td className="px-2 py-2"><input className={refInputCls} value={newRef.phone} onChange={e => setNewRef(r => ({ ...r, phone: e.target.value.replace(/\D/g, '') }))} placeholder="0215551234" /></td>
                <td className="px-2 py-2"><input className={refInputCls} value={newRef.bankAccount} onChange={e => setNewRef(r => ({ ...r, bankAccount: e.target.value }))} placeholder="은행 계좌번호" /></td>
                <td className="px-2 py-2"><span className="text-xs text-primary/30">추가 후 수정에서 첨부</span></td>
                <td className="px-2 py-2 text-center">
                  <button onClick={addReferralSource} disabled={!newRef.name.trim()}
                    className="px-3 py-1.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-30">
                    + 추가
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-6 border-t border-border/10 flex justify-end">
        <button onClick={() => mutate()} disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab({ initial }: { initial: NotificationSettings }) {
  const [form, setForm] = useState(initial)
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setForm(initial) }, [initial.evalReminderDays, initial.urgentHours])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveNotifications(form),
    onSuccess: () => {
      addToast('알림 설정이 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  const RULES = [
    {
      key: 'evalReminder' as const,
      title: '평가 작성 리마인드 알림',
      desc: '프로젝트 종료 후 평가가 작성되지 않은 경우 PM에게 알림을 보냅니다.',
      enabledKey: 'evalReminderEnabled' as const,
      valueKey: 'evalReminderDays' as const,
      prefix: '종료 후', suffix: '일째 마다',
    },
    {
      key: 'urgent' as const,
      title: '긴급 채용 자동 전환',
      desc: "모집 마감일이 얼마 남지 않은 공고를 '긴급'으로 자동 표시합니다.",
      enabledKey: 'urgentEnabled' as const,
      valueKey: 'urgentHours' as const,
      prefix: '마감', suffix: '시간 전',
    },
  ]

  return (
    <Section
      title="알림 및 자동화 규칙"
      sub="시스템에서 발생하는 자동 알림의 트리거 조건을 설정합니다."
    >
      <div className="space-y-6">
        {RULES.map(rule => (
          <div key={rule.key} className="flex items-center justify-between p-6 bg-surface rounded-3xl border border-border/20">
            <div>
              <p className="text-sm font-black">{rule.title}</p>
              <p className="text-xs text-primary/40 mt-1">{rule.desc}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs font-bold">{rule.prefix}</span>
              <input
                type="number" min={1}
                value={form[rule.valueKey]}
                onChange={e => setForm(f => ({ ...f, [rule.valueKey]: Number(e.target.value) }))}
                className="w-16 bg-white border border-border rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none focus:border-secondary"
              />
              <span className="text-xs font-bold">{rule.suffix}</span>
              <Toggle
                value={form[rule.enabledKey]}
                onChange={v => setForm(f => ({ ...f, [rule.enabledKey]: v }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-border/10 flex justify-end mt-8">
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </Section>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ServiceAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border/30 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-10 h-20 flex items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight">시스템 설정</h2>
            <p className="text-xs text-primary/40 font-medium">플랫폼 운영 규칙 및 데이터를 관리합니다.</p>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-10 space-y-8">
        {/* Tabs */}
        <div className="flex bg-white/50 p-1.5 rounded-[22px] border border-border/30 backdrop-blur-sm shadow-inner w-fit flex-wrap gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-2.5 rounded-[18px] text-sm transition-all ${
                activeTab === tab.id
                  ? 'font-black bg-primary text-white shadow-lg shadow-primary/20'
                  : 'font-bold text-primary/40 hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-primary/30 text-sm">로딩 중...</div>
          </div>
        ) : settings ? (
          <div>
            {activeTab === 'general'       && <GeneralTab       initial={settings.general} />}
            {activeTab === 'users'         && <UsersTab />}
            {activeTab === 'evaluation'    && <EvaluationTab    initial={settings.evaluation} />}
            {activeTab === 'master'        && <MasterDataTab    initial={settings.masterData} />}
            {activeTab === 'notifications' && <NotificationsTab initial={settings.notifications} />}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── 첨부파일 셀 컴포넌트 ────────────────────────────────────────────────────────
function AttachmentCell({
  attachments, uploading, onUpload, onDelete, onDownload,
}: {
  attachments: ReferralAttachment[]
  uploading: boolean
  onUpload: (file: File, name: string) => Promise<void>
  onDelete: (att: ReferralAttachment) => void
  onDownload: (att: ReferralAttachment) => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingLabel, setPendingLabel] = useState<string>(ATTACH_LABELS[0])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(file, pendingLabel)
    e.target.value = ''
  }

  return (
    <div className="space-y-1.5">
      {attachments.map(att => (
        <div key={att.key} className="flex items-center gap-1">
          <button onClick={() => onDownload(att)}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors truncate max-w-[120px]">
            📎 {att.name}
          </button>
          <button onClick={() => onDelete(att)} className="text-primary/30 hover:text-danger text-xs transition-colors">✕</button>
        </div>
      ))}
      <div className="flex items-center gap-1 flex-wrap">
        <select value={pendingLabel} onChange={e => setPendingLabel(e.target.value)}
          className="bg-background border border-dashed border-border/50 rounded-lg px-1.5 py-1 text-[11px] focus:outline-none focus:border-secondary transition-all">
          {ATTACH_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="px-2 py-1 bg-secondary/5 border border-secondary/20 text-secondary text-[11px] font-black rounded-lg hover:bg-secondary hover:text-white transition-all disabled:opacity-40">
          {uploading ? '업로드 중...' : '+ 파일'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  )
}
