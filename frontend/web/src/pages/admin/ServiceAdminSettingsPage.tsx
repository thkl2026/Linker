import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '@/store/uiStore'
import {
  settingsApi,
  type GeneralSettings,
  type EvaluationSettings,
  type NotificationSettings,
  type MasterData,
  type SmtpSettings,
  type Contractor,
  type ReferralSource,
  type ReferralAttachment,
  type Contact,
  type InvitedUser,
} from '@/shared/api/settingsApi'

type Tab = 'general' | 'users' | 'evaluation' | 'master' | 'contractors' | 'referral' | 'notifications' | 'smtp'

function formatBizNo(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

const BANK_LIST: { group: string; banks: string[] }[] = [
  { group: '시중은행', banks: ['KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', 'KDB산업은행', 'SC제일은행', '한국씨티은행', '카카오뱅크', '케이뱅크', '토스뱅크', '수협은행', '전북은행', '광주은행', '경남은행', 'DGB대구은행', '부산은행', '제주은행', '우체국'] },
  { group: '증권사', banks: ['미래에셋증권', '삼성증권', 'NH투자증권', '한국투자증권', 'KB증권', '신한투자증권', '하나증권', '키움증권', '대신증권', '메리츠증권'] },
  { group: '저축은행', banks: ['SBI저축은행', 'OK저축은행', '페퍼저축은행', '한국투자저축은행', '다올저축은행'] },
]

const ALL_BANKS = BANK_LIST.flatMap(g => g.banks)

function parseBankAccount(combined: string): { bank: string; account: string } {
  const bank = ALL_BANKS.find(b => combined.startsWith(b + ' '))
  if (bank) return { bank, account: combined.slice(bank.length + 1) }
  return { bank: '', account: combined }
}

function combineBankAccount(bank: string, account: string): string {
  if (!bank) return account
  if (!account) return bank
  return `${bank} ${account}`
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',       label: '일반 설정' },
  { id: 'users',         label: '사용자 초대 및 관리' },
  { id: 'evaluation',    label: '평가 시스템 설정' },
  { id: 'master',        label: '마스터 데이터 관리' },
  { id: 'contractors',   label: '주사업자 관리' },
  { id: 'referral',      label: '추천기관' },
  { id: 'notifications', label: '알림 규칙 설정' },
  { id: 'smtp',          label: '메일 설정' },
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
  const [email,   setEmail]   = useState('')
  const [company, setCompany] = useState('')
  const [role,    setRole]    = useState('TALENT')
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  const { data: invitations = [] } = useQuery({
    queryKey: ['settings', 'invitations'],
    queryFn: () => settingsApi.listInvitations().then(r => r.data),
  })

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: () => settingsApi.inviteUser(email, company, role),
    onSuccess: () => {
      addToast(`${email} 으로 초대 링크를 발송했습니다.`, 'success')
      setEmail('')
      setCompany('')
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
        <div className="col-span-4">
          <Label>초대 이메일 주소</Label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@company.com"
            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all"
          />
        </div>
        <div className="col-span-3">
          <Label>소속 회사</Label>
          <input
            type="text" value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="(주)회사명"
            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all"
          />
        </div>
        <div className="col-span-2">
          <Label>사용자 유형</Label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-white border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all appearance-none font-bold text-secondary"
          >
            <option value="TALENT">전문가</option>
            <option value="PM">PM</option>
            <option value="PROCUREMENT">기업 담당자</option>
            <option value="SERVICE_ADMIN">서비스 관리자</option>
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
              <th className="pb-4 px-2">소속</th>
              <th className="pb-4 px-2">유형</th>
              <th className="pb-4 px-2">가입 상태</th>
              <th className="pb-4 px-2">초대일</th>
              <th className="pb-4 px-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/5">
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-primary/30">초대 내역이 없습니다.</td>
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
                  <p className="text-xs font-medium text-primary/60">{inv.company || <span className="text-primary/20">—</span>}</p>
                </td>
                <td className="py-5 px-2">
                  <span className={`px-2 py-1 text-[10px] font-black rounded-md border uppercase
                    ${inv.role === 'TALENT' ? 'bg-secondary/5 text-secondary border-secondary/10' : 'bg-primary/5 text-primary border-primary/10'}`}>
                    {inv.role === 'TALENT' ? 'Expert' : inv.role === 'PM' ? 'PM' : inv.role === 'SERVICE_ADMIN' ? 'Admin' : 'Client'}
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
                      {inv.inviteUrl && (
                        <button onClick={() => {
                          navigator.clipboard.writeText(inv.inviteUrl!)
                          addToast('초대 링크가 복사되었습니다.', 'success')
                        }}
                          className="text-xs font-bold text-primary/60 hover:text-primary transition-colors">
                          링크 복사
                        </button>
                      )}
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
  const [newTech, setNewTech] = useState('')
  const [newRole, setNewRole] = useState('')
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setForm(initial) }, [initial.techStacks.length, initial.projectRoles?.length])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveMasterData(form),
    onSuccess: () => {
      addToast('마스터 데이터가 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

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

  return (
    <div className="bg-white p-10 rounded-[40px] border border-border/30 shadow-sm space-y-8">
      {/* Tech stacks */}
      <div className="space-y-4">
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
            <span key={r} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              i < 3 ? 'bg-blue-50 text-blue-600 border-blue-100' :
              i < 8 ? 'bg-purple-50 text-purple-600 border-purple-100' :
              i < 14 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              i < 17 ? 'bg-orange-50 text-orange-600 border-orange-100' :
              'bg-surface text-primary/60 border-border/30'
            }`}>
              {r}
              <button onClick={() => removeRole(r)} className="opacity-40 hover:opacity-100 hover:text-danger transition-all">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newRole} onChange={e => setNewRole(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRole()}
            placeholder="예: SAP 컨설턴트, 스토리지 엔지니어..."
            className="flex-1 bg-background border border-dashed border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
          <button onClick={addRole}
            className="px-4 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-2xl hover:bg-secondary hover:text-white transition-all">
            + 추가
          </button>
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

// ─── Contractors tab ──────────────────────────────────────────────────────────
const EMPTY_CONTRACTOR: Contractor = { name: '', registrationNo: '', phone: '', bankAccount: '', attachments: [] }
const EMPTY_CONTACT: Contact = { name: '', position: '', email: '', phone: '' }

function ContractorsTab({ initial }: { initial: MasterData }) {
  const [items, setItems]             = useState<Contractor[]>(initial.contractors)
  const [newItem, setNewItem]         = useState<Contractor>(EMPTY_CONTRACTOR)
  const [editingIdx, setEditingIdx]   = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [newContact, setNewContact]   = useState<Contact>(EMPTY_CONTACT)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setItems(initial.contractors) }, [initial.contractors.length])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveMasterData({ ...initial, contractors: items }),
    onSuccess: () => {
      addToast('주사업자 정보가 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  function update(idx: number, patch: Partial<Contractor>) {
    setItems(s => s.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function remove(idx: number) {
    setItems(s => s.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1)
  }

  function addItem() {
    if (!newItem.name.trim()) return
    setItems(s => [...s, { ...newItem, name: newItem.name.trim(), contacts: [] }])
    setNewItem(EMPTY_CONTRACTOR)
  }

  function addContact(idx: number) {
    if (!newContact.name.trim()) return
    update(idx, { contacts: [...(items[idx].contacts ?? []), { ...newContact }] })
    setNewContact(EMPTY_CONTACT)
  }

  function removeContact(agencyIdx: number, contactIdx: number) {
    update(agencyIdx, { contacts: (items[agencyIdx].contacts ?? []).filter((_, i) => i !== contactIdx) })
  }

  const cellCls  = 'px-3 py-2.5 text-sm text-primary/70'
  const inputCls = 'bg-background border border-dashed border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-all w-full'

  return (
    <Section title="주사업자 관리" sub="프로젝트에 참여하는 주사업자(원도급) 회사 정보 및 담당자를 관리합니다.">
      <div className="border border-border/30 rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[11px] font-black text-primary/40 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[20%]">회사명</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[15%]">사업자등록번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[13%]">전화번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[15%]">통장번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[14%]">첨부파일</th>
              <th className="px-4 py-3 text-center border-b border-border/20 w-[11%]">담당자</th>
              <th className="px-4 py-3 text-center border-b border-border/20 w-[12%]">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, idx) => (
              <tr key={idx} className={`border-b border-border/10 transition-colors ${expandedIdx === idx ? 'bg-primary/5' : 'hover:bg-surface/50'}`}>
                {editingIdx === idx ? (
                  <>
                    <td className="px-2 py-1.5"><input className={inputCls} value={r.name} onChange={e => update(idx, { name: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input className={inputCls} value={r.registrationNo} onChange={e => update(idx, { registrationNo: formatBizNo(e.target.value) })} placeholder="000-00-00000" /></td>
                    <td className="px-2 py-1.5"><input className={inputCls} value={r.phone} onChange={e => update(idx, { phone: e.target.value })} placeholder="02-1234-5678" /></td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-row gap-1">
                        <select className={inputCls} value={parseBankAccount(r.bankAccount).bank}
                          onChange={e => update(idx, { bankAccount: combineBankAccount(e.target.value, parseBankAccount(r.bankAccount).account) })}>
                          <option value="">은행 선택</option>
                          {BANK_LIST.map(g => (
                            <optgroup key={g.group} label={g.group}>
                              {g.banks.map(b => <option key={b} value={b}>{b}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <input className={inputCls} value={parseBankAccount(r.bankAccount).account}
                          onChange={e => update(idx, { bankAccount: combineBankAccount(parseBankAccount(r.bankAccount).bank, e.target.value) })}
                          placeholder="계좌번호" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <AttachmentCell
                        attachments={r.attachments ?? []}
                        uploading={uploadingIdx === idx}
                        onUpload={async (file, name) => {
                          setUploadingIdx(idx)
                          try {
                            const res = await settingsApi.uploadReferralAttachment(file, name)
                            update(idx, { attachments: [...(r.attachments ?? []), res.data] })
                          } finally { setUploadingIdx(null) }
                        }}
                        onDelete={att => update(idx, { attachments: (r.attachments ?? []).filter(a => a.key !== att.key) })}
                        onDownload={async att => { const res = await settingsApi.getAttachmentDownloadUrl(att.key); window.open(res.data.url, '_blank') }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-xs text-primary/40">{(r.contacts ?? []).length}명</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => setEditingIdx(null)} className="text-[11px] font-black text-secondary hover:underline">완료</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className={`${cellCls} font-bold text-primary`}>{r.name}</td>
                    <td className={cellCls}>{r.registrationNo || <span className="text-primary/20">—</span>}</td>
                    <td className={cellCls}>{r.phone || <span className="text-primary/20">—</span>}</td>
                    <td className={cellCls}>{r.bankAccount ? (
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] text-primary/40">{parseBankAccount(r.bankAccount).bank || '—'}</span>
                        <span>{parseBankAccount(r.bankAccount).account || r.bankAccount}</span>
                      </div>
                    ) : <span className="text-primary/20">—</span>}</td>
                    <td className={cellCls}>
                      {(r.attachments ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(r.attachments ?? []).map(att => (
                            <button key={att.key}
                              onClick={async () => { const res = await settingsApi.getAttachmentDownloadUrl(att.key); window.open(res.data.url, '_blank') }}
                              className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                              📎 {att.name}
                            </button>
                          ))}
                        </div>
                      ) : <span className="text-primary/20">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => { setExpandedIdx(expandedIdx === idx ? null : idx); setNewContact(EMPTY_CONTACT) }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                          expandedIdx === idx
                            ? 'bg-primary text-white'
                            : 'bg-secondary/5 border border-secondary/20 text-secondary hover:bg-secondary hover:text-white'
                        }`}
                      >
                        담당자 {(r.contacts ?? []).length}명
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditingIdx(idx)} className="text-[11px] font-black text-primary/40 hover:text-secondary transition-colors">수정</button>
                        <button onClick={() => remove(idx)} className="text-[11px] font-black text-primary/40 hover:text-danger transition-colors">삭제</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {/* 신규 입력 행 */}
            <tr className="bg-surface/30">
              <td className="px-2 py-2"><input className={inputCls} value={newItem.name} onChange={e => setNewItem(r => ({ ...r, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="회사명 *" /></td>
              <td className="px-2 py-2"><input className={inputCls} value={newItem.registrationNo} onChange={e => setNewItem(r => ({ ...r, registrationNo: formatBizNo(e.target.value) }))} placeholder="000-00-00000" /></td>
              <td className="px-2 py-2"><input className={inputCls} value={newItem.phone} onChange={e => setNewItem(r => ({ ...r, phone: e.target.value }))} placeholder="02-1234-5678" /></td>
              <td className="px-2 py-2">
                <div className="flex flex-row gap-1">
                  <select className={inputCls} value={parseBankAccount(newItem.bankAccount).bank}
                    onChange={e => setNewItem(r => ({ ...r, bankAccount: combineBankAccount(e.target.value, parseBankAccount(r.bankAccount).account) }))}>
                    <option value="">은행 선택</option>
                    {BANK_LIST.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.banks.map(b => <option key={b} value={b}>{b}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input className={inputCls} value={parseBankAccount(newItem.bankAccount).account}
                    onChange={e => setNewItem(r => ({ ...r, bankAccount: combineBankAccount(parseBankAccount(r.bankAccount).bank, e.target.value) }))}
                    placeholder="계좌번호" />
                </div>
              </td>
              <td className="px-2 py-2"><span className="text-xs text-primary/30">추가 후 수정에서 첨부</span></td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-center">
                <button onClick={addItem} disabled={!newItem.name.trim()}
                  className="px-3 py-1.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-30">
                  + 추가
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 담당자 패널 */}
      {expandedIdx !== null && items[expandedIdx] && (
        <div className="bg-surface/50 border border-border/30 rounded-2xl p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-primary">
              {items[expandedIdx].name}
              <span className="text-primary/40 font-bold ml-2">담당자 목록</span>
            </h4>
            <span className="text-xs text-primary/30">{(items[expandedIdx].contacts ?? []).length}명</span>
          </div>

          {(items[expandedIdx].contacts ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(items[expandedIdx].contacts ?? []).map((contact, cIdx) => (
                <div key={cIdx} className="flex items-start justify-between bg-white rounded-2xl p-4 border border-border/30 shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-primary">{contact.name}</p>
                      {contact.position && (
                        <span className="text-[10px] font-bold text-primary/50 bg-surface px-2 py-0.5 rounded-lg border border-border/30">
                          {contact.position}
                        </span>
                      )}
                    </div>
                    {contact.email && <p className="text-xs text-primary/60">✉️ {contact.email}</p>}
                    {contact.phone && <p className="text-xs text-primary/60">📞 {contact.phone}</p>}
                  </div>
                  <button onClick={() => removeContact(expandedIdx, cIdx)}
                    className="text-primary/20 hover:text-danger transition-colors text-xs shrink-0 mt-0.5">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-primary/30 py-2">등록된 담당자가 없습니다. 아래에서 추가하세요.</p>
          )}

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-border/10">
            <input value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))}
              placeholder="이름 *"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.position} onChange={e => setNewContact(c => ({ ...c, position: e.target.value }))}
              placeholder="직책"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))}
              placeholder="이메일"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))}
              placeholder="전화번호"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <button onClick={() => addContact(expandedIdx)} disabled={!newContact.name.trim()}
              className="px-3 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-30">
              + 담당자 추가
            </button>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-border/10 flex justify-end">
        <button onClick={() => mutate()} disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </Section>
  )
}

// ─── Referral tab ─────────────────────────────────────────────────────────────
function ReferralTab({ initial }: { initial: MasterData }) {
  const [sources, setSources]           = useState<ReferralSource[]>(initial.referralSources ?? [])
  const [newRef, setNewRef]             = useState<ReferralSource>(EMPTY_REFERRAL)
  const [editingIdx, setEditingIdx]     = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx]   = useState<number | null>(null)
  const [newContact, setNewContact]     = useState<Contact>(EMPTY_CONTACT)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => { setSources(initial.referralSources ?? []) }, [initial.referralSources?.length])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveMasterData({ ...initial, referralSources: sources }),
    onSuccess: () => {
      addToast('추천기관 정보가 저장되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  function update(idx: number, patch: Partial<ReferralSource>) {
    setSources(s => s.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function remove(idx: number) {
    setSources(s => s.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1)
  }

  function addSource() {
    if (!newRef.name.trim()) return
    setSources(s => [...s, { ...newRef, name: newRef.name.trim(), contacts: [] }])
    setNewRef(EMPTY_REFERRAL)
  }

  function addContact(agencyIdx: number) {
    if (!newContact.name.trim()) return
    update(agencyIdx, { contacts: [...(sources[agencyIdx].contacts ?? []), { ...newContact }] })
    setNewContact(EMPTY_CONTACT)
  }

  function removeContact(agencyIdx: number, contactIdx: number) {
    update(agencyIdx, { contacts: (sources[agencyIdx].contacts ?? []).filter((_, i) => i !== contactIdx) })
  }

  const refInputCls = 'bg-background border border-dashed border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-all w-full'
  const refCellCls  = 'px-3 py-2.5 text-sm text-primary/70'

  return (
    <Section title="추천기관 관리" sub="인력 추천을 받는 기관의 정보 및 담당자를 관리합니다.">
      <div className="border border-border/30 rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[11px] font-black text-primary/40 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[18%]">기관명</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[13%]">사업자등록번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[13%]">전화번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[15%]">통장번호</th>
              <th className="px-4 py-3 text-left border-b border-border/20 w-[14%]">첨부파일</th>
              <th className="px-4 py-3 text-center border-b border-border/20 w-[12%]">담당자</th>
              <th className="px-4 py-3 text-center border-b border-border/20 w-[15%]">액션</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((r, idx) => (
              <tr key={idx} className={`border-b border-border/10 transition-colors ${expandedIdx === idx ? 'bg-primary/5' : 'hover:bg-surface/50'}`}>
                {editingIdx === idx ? (
                  <>
                    <td className="px-2 py-1.5"><input className={refInputCls} value={r.name} onChange={e => update(idx, { name: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input className={refInputCls} value={r.registrationNo} onChange={e => update(idx, { registrationNo: formatBizNo(e.target.value) })} placeholder="000-00-00000" /></td>
                    <td className="px-2 py-1.5"><input className={refInputCls} value={r.phone} onChange={e => update(idx, { phone: e.target.value })} placeholder="021-555-1234" /></td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-row gap-1">
                        <select className={refInputCls} value={parseBankAccount(r.bankAccount).bank}
                          onChange={e => update(idx, { bankAccount: combineBankAccount(e.target.value, parseBankAccount(r.bankAccount).account) })}>
                          <option value="">은행 선택</option>
                          {BANK_LIST.map(g => (
                            <optgroup key={g.group} label={g.group}>
                              {g.banks.map(b => <option key={b} value={b}>{b}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <input className={refInputCls} value={parseBankAccount(r.bankAccount).account}
                          onChange={e => update(idx, { bankAccount: combineBankAccount(parseBankAccount(r.bankAccount).bank, e.target.value) })}
                          placeholder="계좌번호" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <AttachmentCell
                        attachments={r.attachments ?? []}
                        uploading={uploadingIdx === idx}
                        onUpload={async (file, name) => {
                          setUploadingIdx(idx)
                          try {
                            const res = await settingsApi.uploadReferralAttachment(file, name)
                            update(idx, { attachments: [...(r.attachments ?? []), res.data] })
                          } finally { setUploadingIdx(null) }
                        }}
                        onDelete={att => update(idx, { attachments: (r.attachments ?? []).filter(a => a.key !== att.key) })}
                        onDownload={async att => { const res = await settingsApi.getAttachmentDownloadUrl(att.key); window.open(res.data.url, '_blank') }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-xs text-primary/40">{(r.contacts ?? []).length}명</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => setEditingIdx(null)} className="text-[11px] font-black text-secondary hover:underline">완료</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className={`${refCellCls} font-bold text-primary`}>{r.name}</td>
                    <td className={refCellCls}>{r.registrationNo || <span className="text-primary/20">—</span>}</td>
                    <td className={refCellCls}>{r.phone || <span className="text-primary/20">—</span>}</td>
                    <td className={refCellCls}>{r.bankAccount || <span className="text-primary/20">—</span>}</td>
                    <td className={refCellCls}>
                      {(r.attachments ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(r.attachments ?? []).map(att => (
                            <button key={att.key}
                              onClick={async () => { const res = await settingsApi.getAttachmentDownloadUrl(att.key); window.open(res.data.url, '_blank') }}
                              className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                              📎 {att.name}
                            </button>
                          ))}
                        </div>
                      ) : <span className="text-primary/20">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => { setExpandedIdx(expandedIdx === idx ? null : idx); setNewContact(EMPTY_CONTACT) }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                          expandedIdx === idx
                            ? 'bg-primary text-white'
                            : 'bg-secondary/5 border border-secondary/20 text-secondary hover:bg-secondary hover:text-white'
                        }`}
                      >
                        담당자 {(r.contacts ?? []).length}명
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditingIdx(idx)} className="text-[11px] font-black text-primary/40 hover:text-secondary transition-colors">수정</button>
                        <button onClick={() => remove(idx)} className="text-[11px] font-black text-primary/40 hover:text-danger transition-colors">삭제</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            <tr className="bg-surface/30">
              <td className="px-2 py-2"><input className={refInputCls} value={newRef.name} onChange={e => setNewRef(r => ({ ...r, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSource()} placeholder="기관명 *" /></td>
              <td className="px-2 py-2"><input className={refInputCls} value={newRef.registrationNo} onChange={e => setNewRef(r => ({ ...r, registrationNo: formatBizNo(e.target.value) }))} placeholder="000-00-00000" /></td>
              <td className="px-2 py-2"><input className={refInputCls} value={newRef.phone} onChange={e => setNewRef(r => ({ ...r, phone: e.target.value }))} placeholder="021-555-1234" /></td>
              <td className="px-2 py-2">
                <div className="flex flex-row gap-1">
                  <select className={refInputCls} value={parseBankAccount(newRef.bankAccount).bank}
                    onChange={e => setNewRef(r => ({ ...r, bankAccount: combineBankAccount(e.target.value, parseBankAccount(r.bankAccount).account) }))}>
                    <option value="">은행 선택</option>
                    {BANK_LIST.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.banks.map(b => <option key={b} value={b}>{b}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input className={refInputCls} value={parseBankAccount(newRef.bankAccount).account}
                    onChange={e => setNewRef(r => ({ ...r, bankAccount: combineBankAccount(parseBankAccount(r.bankAccount).bank, e.target.value) }))}
                    placeholder="계좌번호" />
                </div>
              </td>
              <td className="px-2 py-2"><span className="text-xs text-primary/30">추가 후 수정에서 첨부</span></td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-center">
                <button onClick={addSource} disabled={!newRef.name.trim()}
                  className="px-3 py-1.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-30">
                  + 추가
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 담당자 패널 */}
      {expandedIdx !== null && sources[expandedIdx] && (
        <div className="bg-surface/50 border border-border/30 rounded-2xl p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-primary">
              {sources[expandedIdx].name}
              <span className="text-primary/40 font-bold ml-2">담당자 목록</span>
            </h4>
            <span className="text-xs text-primary/30">{(sources[expandedIdx].contacts ?? []).length}명</span>
          </div>

          {(sources[expandedIdx].contacts ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(sources[expandedIdx].contacts ?? []).map((contact, cIdx) => (
                <div key={cIdx} className="flex items-start justify-between bg-white rounded-2xl p-4 border border-border/30 shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-primary">{contact.name}</p>
                      {contact.position && (
                        <span className="text-[10px] font-bold text-primary/50 bg-surface px-2 py-0.5 rounded-lg border border-border/30">
                          {contact.position}
                        </span>
                      )}
                    </div>
                    {contact.email && <p className="text-xs text-primary/60">✉️ {contact.email}</p>}
                    {contact.phone && <p className="text-xs text-primary/60">📞 {contact.phone}</p>}
                  </div>
                  <button onClick={() => removeContact(expandedIdx, cIdx)}
                    className="text-primary/20 hover:text-danger transition-colors text-xs shrink-0 mt-0.5">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-primary/30 py-2">등록된 담당자가 없습니다. 아래에서 추가하세요.</p>
          )}

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-border/10">
            <input value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))}
              placeholder="이름 *"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.position} onChange={e => setNewContact(c => ({ ...c, position: e.target.value }))}
              placeholder="직책"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))}
              placeholder="이메일"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <input value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))}
              placeholder="전화번호"
              className="bg-white border border-dashed border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-secondary transition-all" />
            <button onClick={() => addContact(expandedIdx)} disabled={!newContact.name.trim()}
              className="px-3 py-2.5 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-30">
              + 담당자 추가
            </button>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-border/10 flex justify-end">
        <button onClick={() => mutate()} disabled={isPending}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
          {isPending ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </Section>
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

// ─── SMTP tab ─────────────────────────────────────────────────────────────────
function SmtpTab({ initial }: { initial: SmtpSettings }) {
  const [host,     setHost]     = useState(initial.host)
  const [port,     setPort]     = useState(initial.port)
  const [username, setUsername] = useState(initial.username)
  const [password, setPassword] = useState('')
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  useEffect(() => {
    setHost(initial.host)
    setPort(initial.port)
    setUsername(initial.username)
  }, [initial.host, initial.port, initial.username])

  const { mutate, isPending } = useMutation({
    mutationFn: () => settingsApi.saveSmtp({ host, port, username, password: password || undefined }),
    onSuccess: () => {
      addToast('메일 설정이 저장되었습니다.', 'success')
      setPassword('')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  return (
    <Section
      title="SMTP 메일 서버 설정"
      sub="초대 메일 발송에 사용할 SMTP 서버 정보를 입력합니다. 비밀번호는 변경 시에만 입력하세요."
    >
      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <Label>SMTP 서버 주소</Label>
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <Label>포트</Label>
            <Input type="number" value={port} onChange={e => setPort(Number(e.target.value))} placeholder="587" />
          </div>
          <div>
            <Label>발신 계정 (이메일)</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="sender@gmail.com" />
          </div>
          <div>
            <Label>앱 비밀번호 {initial.hasPassword && <span className="text-success normal-case font-medium ml-1">· 설정됨</span>}</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={initial.hasPassword ? '변경하지 않으려면 비워두세요' : 'Gmail 앱 비밀번호 16자리'}
            />
          </div>
        </div>
        <div className="space-y-4 pt-2">
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
            <p className="text-sm font-black text-amber-800">Gmail 앱 비밀번호 발급 방법</p>
            <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Google 계정 → 보안 → 2단계 인증 활성화</li>
              <li>보안 → 앱 비밀번호 선택</li>
              <li>앱: 메일, 기기: 기타(직접 입력) → 생성</li>
              <li>생성된 16자리 코드를 위 비밀번호 칸에 입력</li>
            </ol>
          </div>
          <div className="p-5 bg-surface border border-border/30 rounded-2xl space-y-2">
            <p className="text-xs font-black text-primary/60">현재 설정 상태</p>
            <div className="space-y-1.5 text-xs text-primary/50">
              <p>서버: <span className="font-bold text-primary">{initial.host || '미설정'}</span></p>
              <p>포트: <span className="font-bold text-primary">{initial.port}</span></p>
              <p>계정: <span className="font-bold text-primary">{initial.username || '미설정'}</span></p>
              <p>비밀번호: <span className={`font-bold ${initial.hasPassword ? 'text-success' : 'text-danger'}`}>{initial.hasPassword ? '설정됨' : '미설정'}</span></p>
            </div>
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
            {activeTab === 'contractors'   && <ContractorsTab   initial={settings.masterData} />}
            {activeTab === 'referral'      && <ReferralTab      initial={settings.masterData} />}
            {activeTab === 'notifications' && <NotificationsTab initial={settings.notifications} />}
            {activeTab === 'smtp'          && <SmtpTab          initial={settings.smtp} />}
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
