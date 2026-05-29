import { useEffect, useRef, useState, type ReactNode } from 'react'
import { displayName } from '@/shared/utils/nameUtils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  serviceAdminApi,
  TalentAdmin,
  CreateTalentRequest,
  ExperienceRequest,
  ExperienceResponse,
  ExperienceType,
  ResumeAnalysisResult,
  TalentInsightResponse,
  WorkType,
  AvailabilityStatus,
} from '@/shared/api/serviceAdminApi'
import {
  TalentCategory,
  TalentField,
  TALENT_CATEGORY_LABELS,
  TALENT_FIELD_LABELS,
  TALENT_FIELDS_BY_CATEGORY,
  TECH_STACK_CATEGORIES,
} from '@/shared/types/talent'
import { useUiStore } from '@/store/uiStore'
import { settingsApi } from '@/shared/api/settingsApi'
import thinklaireLogoUrl from '@/statics/Thinklair_logo.png'

// ── 상수 ─────────────────────────────────────────────────────────────────────


const INDUSTRY_OPTIONS = [
  '금융/보험', '공공/정부', '제조/생산', '의료/헬스케어', '유통/물류',
  '교육', 'IT/통신', '건설/부동산', '미디어/엔터테인먼트', '에너지/환경', '기타',
]

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = { AVAILABLE: '투입 가능', BUSY: '수행 중', REST: '투입대기중' }
const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  BUSY:      'text-amber-700  bg-amber-50  border border-amber-200',
  REST:      'text-slate-600  bg-slate-100 border border-slate-200',
}

const EMPTY_FORM: CreateTalentRequest = {
  name: '', nameEn: '', phone: '', category: undefined, field: undefined,
  workType: 'ONSITE', desiredRate: undefined, skills: [],
  birthDate: '', email: '', address: '', skillGrade: '', projectRole: '',
}

// 주소를 로/길 단위까지만 표시 ("인천 서구 청마로 170, 307동" → "인천 서구 청마로")
function shortAddress(addr: string | null | undefined): string {
  if (!addr) return ''
  const parts = addr.trim().split(/\s+/)
  const idx = parts.findIndex(p => /[로길]$/.test(p))
  return idx >= 0 ? parts.slice(0, idx + 1).join(' ') : addr
}

// ── 전화번호 포맷 유틸 ───────────────────────────────────────────────────────────
function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return d
}

// ── 이름 공백 제거 유틸 ────────────────────────────────────────────────────────
// AI가 "노 종 화"처럼 한글 음절 사이에 공백을 삽입하는 경우 제거
function normalizeKoreanName(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // 전체가 한글/공백으로만 이루어진 경우 공백 제거 (외국인 이름 보호)
  if (/^[가-힣\s]+$/.test(trimmed)) return trimmed.replace(/\s+/g, '')
  return trimmed
}

// ── 평가/리뷰 헬퍼 컴포넌트 ────────────────────────────────────────────────────

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          className="text-2xl leading-none transition-transform hover:scale-110">
          <span style={{ color: n <= (hover || value) ? '#f59e0b' : '#e5e7eb' }}>★</span>
        </button>
      ))}
    </div>
  )
}

// ── 경력 등록/수정 폼 모달 ────────────────────────────────────────────────────

const EMPTY_EXP_PROJECT: ExperienceRequest = {
  experienceType: 'PROJECT', companyName: '', projectName: '', role: '',
  startDate: '', endDate: null, description: '', techStack: [],
}
const EMPTY_EXP_COMPANY: ExperienceRequest = {
  experienceType: 'COMPANY', companyName: '', projectName: '', role: '',
  department: '', employmentType: '정규직', startDate: '', endDate: null, description: '', techStack: [],
}

function ExperienceFormModal({
  talentId, initial, defaultType, showTechStack, onClose,
}: {
  talentId: string
  initial: (ExperienceResponse & { _edit: true }) | null
  defaultType: ExperienceType
  showTechStack: boolean
  onClose: () => void
}) {
  const addToast = useUiStore(s => s.addToast)
  const qc = useQueryClient()
  const [form, setForm] = useState<ExperienceRequest>(
    initial
      ? {
          experienceType: initial.experienceType,
          companyName: initial.companyName ?? '',
          projectName: initial.projectName,
          role: initial.role ?? '',
          department: initial.department ?? '',
          employmentType: initial.employmentType ?? '정규직',
          startDate: initial.startDate,
          endDate: initial.endDate ?? null,
          description: initial.description ?? '',
          techStack: initial.techStack,
        }
      : defaultType === 'COMPANY' ? EMPTY_EXP_COMPANY : EMPTY_EXP_PROJECT,
  )
  const [techInput, setTechInput] = useState('')

  const addTech = () => {
    const t = techInput.trim()
    if (t && !(form.techStack ?? []).includes(t)) setForm(f => ({ ...f, techStack: [...(f.techStack ?? []), t] }))
    setTechInput('')
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      initial
        ? serviceAdminApi.updateExperience(talentId, initial.id, form)
        : serviceAdminApi.createExperience(talentId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'experiences', talentId] })
      addToast(initial ? '경력이 수정되었습니다.' : '경력이 추가되었습니다.', 'success')
      onClose()
    },
    onError: () => addToast('저장에 실패했습니다.', 'error'),
  })

  const isCompany = form.experienceType === 'COMPANY'
  const title = isCompany ? (initial ? '근무 회사 수정' : '근무 회사 등록') : (initial ? '프로젝트 수정' : '참여 프로젝트 등록')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-7 py-5 border-b border-border/50 bg-surface rounded-t-3xl flex items-center justify-between">
          <h3 className="font-bold text-primary text-lg flex items-center gap-2">
            <span>{isCompany ? '🏢' : '🚀'}</span> {title}
          </h3>
          <button onClick={onClose} className="text-2xl text-primary/30 hover:text-red-500 font-bold">&times;</button>
        </div>
        <div className="p-7 overflow-y-auto space-y-4">
          {/* 회사명 / 프로젝트명 */}
          <div className={`grid gap-4 ${isCompany ? '' : 'grid-cols-2'}`}>
            <div>
              <label className="text-xs font-bold text-primary/60 block mb-1">{isCompany ? '회사명 *' : '발주처(클라이언트)'}</label>
              <input value={form.companyName ?? ''} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                placeholder={isCompany ? '(주)링커' : '(주)대한로지스틱스'} />
            </div>
            {!isCompany && (
              <div>
                <label className="text-xs font-bold text-primary/60 block mb-1">프로젝트명 *</label>
                <input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  placeholder="물류 관리 시스템 구축" />
              </div>
            )}
          </div>
          {isCompany && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-primary/60 block mb-1">소속 부서</label>
                <input value={form.department ?? ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  placeholder="플랫폼 개발팀" />
              </div>
              <div>
                <label className="text-xs font-bold text-primary/60 block mb-1">근무 형태</label>
                <select value={form.employmentType ?? '정규직'} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 bg-white">
                  <option>정규직</option><option>계약직</option><option>인턴</option>
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-primary/60 block mb-1">{isCompany ? '직급/직책' : '담당 직무'}</label>
              <input value={form.role ?? ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                placeholder={isCompany ? '과장 / 팀장' : '프론트엔드 리드'} />
            </div>
            <div />
          </div>
          <div>
            <label className="text-xs font-bold text-primary/60 block mb-1">수행 기간 *</label>
            <div className="flex items-center gap-2">
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40" />
              <span className="text-primary/40 font-bold">~</span>
              <input type="date" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value || null }))}
                className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-primary/60 block mb-1">{isCompany ? '주요 업무' : '역할 및 개발 기능'}</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
              placeholder={isCompany ? '소속 회사에서 담당했던 주요 업무를 작성하세요.' : '개발했던 구체적인 업무와 기능을 작성하세요.'} />
          </div>
          {showTechStack && (
          <div>
            <label className="text-xs font-bold text-primary/60 block mb-1">사용 기술 스택</label>
            <div className="flex gap-2">
              <input value={techInput} onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())}
                className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                placeholder="기술명 입력 후 Enter" />
              <button type="button" onClick={addTech} className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-primary/60 hover:bg-border/30">추가</button>
            </div>
            {(form.techStack ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.techStack ?? []).map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                    {t}
                    <button onClick={() => setForm(f => ({ ...f, techStack: (f.techStack ?? []).filter(x => x !== t) }))} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
        <div className="px-7 py-5 border-t border-border/50 bg-gray-50 rounded-b-3xl flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border font-bold text-primary/70 hover:bg-white text-sm">취소</button>
          <button onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.projectName.trim() || !form.startDate}
            className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 ${isCompany ? 'bg-primary' : 'bg-secondary'}`}>
            {saveMutation.isPending ? '저장 중...' : (initial ? '수정' : '등록')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────



// IT 경력: 최초 근무/프로젝트 시작일부터 현재까지 기간 (두 유형 중 더 긴 쪽 적용)
function calcItCareerMonths(exps: { experienceType: string; startDate: string; endDate: string | null }[]): number {
  const now = new Date()
  const earliest = (type: string) => exps
    .filter(e => e.experienceType === type && e.startDate)
    .map(e => new Date(e.startDate).getTime())
    .reduce((min, t) => Math.min(min, t), Infinity)

  const companyStart  = earliest('COMPANY')
  const projectStart  = earliest('PROJECT')
  const earliestStart = Math.min(companyStart, projectStart)
  if (!isFinite(earliestStart)) return 0

  const s = new Date(earliestStart)
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth())
}

// 겹치는 기간을 병합하여 실제 경력 개월 수 계산 (COMPANY + PROJECT만 포함)
function calcCareerMonths(exps: { experienceType: string; startDate: string; endDate: string | null }[]): number {
  const workExps = exps.filter(e => e.experienceType === 'COMPANY' || e.experienceType === 'PROJECT')
  if (workExps.length === 0) return 0

  const ranges = workExps
    .map(e => ({
      start: new Date(e.startDate).getTime(),
      end:   (e.endDate ? new Date(e.endDate) : new Date()).getTime(),
    }))
    .filter(r => r.end > r.start)
    .sort((a, b) => a.start - b.start)

  // 겹치는 구간 병합
  const merged: { start: number; end: number }[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (!last || r.start > last.end) {
      merged.push({ start: r.start, end: r.end })
    } else {
      last.end = Math.max(last.end, r.end)
    }
  }

  return merged.reduce((acc, r) => {
    const s = new Date(r.start)
    const e = new Date(r.end)
    return acc + Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth())
  }, 0)
}

function fmtYearMonth(date: string): string {
  const d = new Date(date)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDuration(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y > 0 && m > 0) return `${y}년 ${m}개월`
  if (y > 0) return `${y}년`
  return `${m}개월`
}

function expMonths(exp: { startDate: string; endDate: string | null }): number {
  const s = new Date(exp.startDate)
  const e = exp.endDate ? new Date(exp.endDate) : new Date()
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth())
}

// ── PDF 인쇄 ──────────────────────────────────────────────────────────────────

// 버전 suffix가 붙은 경우도 처리 (Oracle12, Tibero6, SQL Server2016, EPAS 16 등)
const OS_LIST   = ['linux','unix','windows server','windows','aix','ibm aix','hp-ux','solaris','centos','ubuntu','red hat','redhat','debian','fedora','android','ios']
const DBMS_LIST = ['oracle','mysql','postgresql','mariadb','mssql','sql server','sqlite','mongodb','redis','tibero','db2','altibase','cubrid','sybase','cassandra','elasticsearch','hbase','dynamodb','informix','epas','exadata','aurora','enterprisedb','neo4j','influxdb','clickhouse']
const WAS_LIST  = ['tomcat','jboss','weblogic','websphere','apache','nginx','spring boot','spring','fastapi','flask','django','express','node.js','node','rails','kafka','rabbitmq','airflow','kubernetes','k8s','iis','jetty','undertow','websquare','nexacro','xplatform','react','vue','angular','next.js','nuxt','svelte']
const LANG_LIST = ['java','python','c++','c#','c','javascript','typescript','kotlin','swift','go','rust','php','ruby','scala','r','html','css','jsp','asp','vb','cobol','pl/sql','pro*c','shell','bash','groovy','dart','matlab','js','ts','visual basic']

// prefix 매칭: 버전 숫자·공백이 붙은 경우도 인식 (예: Oracle12, EPAS 16, SQL Server2016)
function matchTech(lo: string, keys: string[]): boolean {
  return keys.some(k =>
    lo === k || (lo.startsWith(k) && /^[\s\d.\-v_]/.test(lo[k.length] ?? ''))
  )
}

function categorizeTechStack(stack: string[]) {
  const lang: string[] = [], dbms: string[] = [], tools: string[] = [], webWas: string[] = [], os: string[] = []
  for (const s of stack) {
    const lo = s.toLowerCase()
    if (matchTech(lo, OS_LIST))        os.push(s)
    else if (matchTech(lo, DBMS_LIST)) dbms.push(s)
    else if (matchTech(lo, WAS_LIST))  webWas.push(s)
    else if (matchTech(lo, LANG_LIST)) lang.push(s)
    else tools.push(s)
  }
  return { lang, dbms, tools, webWas, os }
}

function envRow(label: string, items: string[]) {
  if (!items.length) return ''
  return `<div style="display:flex;gap:10px;margin-bottom:3px;font-size:12px;">
    <span style="width:58px;flex-shrink:0;color:#b45309;font-weight:700;padding-top:1px;">${label}</span>
    <span style="color:#1e293b;">${items.join(', ')}</span>
  </div>`
}

function analysisToExps(result: ResumeAnalysisResult): ExperienceResponse[] {
  const toExp = (type: ExperienceType, e: NonNullable<ResumeAnalysisResult['educations']>[0]): ExperienceResponse => ({
    id: '', experienceType: type,
    companyName: e.companyName ?? null,
    projectName: e.projectName ?? '',
    role: e.role ?? null,
    department: null, employmentType: null,
    startDate: e.startDate ?? '',
    endDate: e.endDate ?? null,
    description: e.description ?? null,
    techStack: e.techStack ?? [],
    isVerified: false, verificationStatus: 'UNVERIFIED',
  })
  return [
    ...(result.educations   ?? []).map(e => toExp('EDUCATION',     e)),
    ...(result.companyExps  ?? []).map(e => toExp('COMPANY',       e)),
    ...(result.projectExps  ?? []).map(e => toExp('PROJECT',       e)),
    ...(result.certifications ?? []).map(e => toExp('CERTIFICATION', e)),
  ]
}

async function printCareerCard(
  talent: TalentAdmin,
  experiences: ExperienceResponse[],
  totalMonths: number,
  analysisResult?: ResumeAnalysisResult,
  insight?: TalentInsightResponse,
) {
  const printExps = analysisResult ? analysisToExps(analysisResult) : experiences
  const logoDataUrl = await fetch(thinklaireLogoUrl)
    .then(r => r.blob())
    .then(blob => new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    }))
  const now       = new Date()
  const issueDate = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const dateStr   = now.toISOString().slice(0, 10).replace(/-/g, '')
  const fileName  = `Linker_${talent.name}_${dateStr}`
  const totalText = totalMonths === 0 ? '—' : fmtDuration(totalMonths)

  const byType = (t: string) => [...printExps]
    .filter(e => e.experienceType === t)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const companyExps = byType('COMPANY')
  const projectExps = byType('PROJECT')
  const eduExps     = byType('EDUCATION')
  const certExps    = byType('CERTIFICATION')

  // ── Section 1: Education & Certifications ──────────────────────────────────
  const eduRows = eduExps.map(e => `
    <tr>
      <td style="padding:8px 6px;font-size:13px;font-weight:700;color:#1e293b;">${e.companyName || ''}</td>
      <td style="padding:8px 6px;font-size:12px;color:#475569;">${e.projectName || ''}</td>
      <td style="padding:8px 6px;font-size:12px;color:#6b7280;white-space:nowrap;">${e.endDate ? e.endDate.slice(0,4) : '재학중'}</td>
      <td style="padding:8px 6px;font-size:12px;color:#475569;">${e.role || ''}</td>
    </tr>`).join('')

  const certRows = certExps.map(e => `
    <tr>
      <td style="padding:8px 6px;font-size:13px;font-weight:700;color:#1e293b;">
        ${e.projectName}${e.description ? `<span style="font-size:12px;font-weight:500;color:#b45309;margin-left:6px;">${e.description}</span>` : e.role ? `<span style="font-size:12px;font-weight:500;color:#b45309;margin-left:6px;">${e.role}</span>` : ''}
      </td>
      <td style="padding:8px 6px;font-size:12px;color:#6b7280;">${e.companyName || '—'}</td>
      <td style="padding:8px 6px;font-size:12px;color:#6b7280;white-space:nowrap;">
        ${e.endDate ? e.endDate.slice(0,4) : '—'}
      </td>
    </tr>`).join('')

  const calcDuration = (start: string, end: string | null): string => {
    const s = new Date(start)
    const e2 = end ? new Date(end) : new Date()
    const m = (e2.getFullYear() - s.getFullYear()) * 12 + (e2.getMonth() - s.getMonth())
    return m > 0 ? fmtDuration(m) : ''
  }

  // ── Section 3: Work Experience ─────────────────────────────────────────────
  const workRows = companyExps.map(e => {
    const role = [e.role, e.department, e.employmentType ? `(${e.employmentType})` : null].filter(Boolean).join(' / ')
    const dur = calcDuration(e.startDate, e.endDate)
    return `<tr style="page-break-inside:avoid;break-inside:avoid;">
      <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#1e293b;">${e.companyName || '—'}</td>
      <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#b45309;">${role || '—'}</td>
      <td style="padding:10px 8px;font-size:12px;color:#1e293b;white-space:nowrap;">
        ${e.startDate.slice(0,7).replace('-','.')} – ${e.endDate ? e.endDate.slice(0,7).replace('-','.') : '현재'}
        ${dur ? `<br><span style="color:#b45309;">(${dur})</span>` : ''}
      </td>
    </tr>`
  }).join('')

  // ── Section 4: Project Experience ──────────────────────────────────────────
  const projRows = projectExps.map(e => {
    const { lang, dbms, tools, webWas, os } = categorizeTechStack(e.techStack)
    const envHtml = [
      envRow('개발언어', lang),
      envRow('운영체계', os),
      envRow('DBMS', dbms),
      envRow('WEB/WAS', webWas),
      envRow('개발도구', tools),
    ].join('')
    const dur = calcDuration(e.startDate, e.endDate)
    return `<tr style="border-top:1px solid #f1e8dd;page-break-inside:avoid;break-inside:avoid;">
      <td style="padding:12px 8px 12px 0;vertical-align:top;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;line-height:1.4;margin-bottom:3px;word-break:keep-all;">${e.projectName}</div>
        ${e.companyName ? `<div style="font-size:12px;color:#b45309;font-weight:700;">${e.companyName}</div>` : ''}
      </td>
      <td style="padding:12px 8px;font-size:12px;color:#1e293b;font-weight:700;white-space:nowrap;vertical-align:top;">
        ${fmtYearMonth(e.startDate)}<br>~ ${e.endDate ? fmtYearMonth(e.endDate) : '현재'}
        ${dur ? `<br><span style="color:#b45309;">(${dur})</span>` : ''}
      </td>
      <td style="padding:12px 8px 12px 16px;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:#b45309;margin-bottom:6px;">${e.role || '—'}</div>
        ${e.description ? `<div style="font-size:12px;color:#1e293b;line-height:1.6;">${e.description}</div>` : ''}
      </td>
      <td style="padding:12px 8px;vertical-align:top;">${envHtml || '<span style="color:#1e293b;font-size:12px;">—</span>'}</td>
    </tr>`
  }).join('')

  // ── Section 3: Tech Stack ──────────────────────────────────────────────────
  const skillTags = talent.skills.map(s =>
    `<span style="display:inline-block;padding:4px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;font-size:11px;font-weight:700;margin:2px;">${s}</span>`
  ).join('') || '<span style="color:#9ca3af;">—</span>'

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Pretendard',sans-serif;color:#451a03;background:#f3f4f6;}
.page{width:210mm;min-height:297mm;padding:4mm 20mm 22mm;margin:20px auto;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.1);}
.sec-title{font-size:9px;font-weight:900;color:rgba(69,26,3,.3);letter-spacing:.2em;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid rgba(69,26,3,.05);margin-bottom:16px;}
section{page-break-inside:auto;}
.sec-head{page-break-inside:avoid;break-inside:avoid;}
table{border-collapse:collapse;}
th{font-size:9px;font-weight:900;color:rgba(69,26,3,.3);text-transform:uppercase;letter-spacing:.05em;padding:8px 6px;border-bottom:1px solid rgba(69,26,3,.05);}
.no-print{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;}
.btn-print{padding:8px 20px;background:#451a03;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .2s;}
.btn-print:disabled{opacity:.5;cursor:not-allowed;}
.btn-back{padding:8px 12px;background:transparent;border:none;color:#9ca3af;font-size:13px;cursor:pointer;}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-back" onclick="window.close()">← 닫기</button>
  <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <span style="font-size:14px;font-weight:700;">${talent.name} 이력서 미리보기</span>
    <span style="font-size:11px;color:#9ca3af;">저장 파일명: ${fileName}.pdf</span>
  </div>
  <button id="btn-save" class="btn-print" onclick="savePdf()">💾 PDF 저장 (Save As)</button>
</div>

<div id="resume-content" class="page">

  <!-- Header -->
  <header style="display:flex;align-items:flex-start;gap:24px;margin-bottom:40px;">
    <!-- 여권사진 -->
    <div style="flex-shrink:0;width:90px;height:120px;border:1.5px dashed #d1d5db;border-radius:6px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:9px;color:#9ca3af;text-align:center;line-height:1.6;">여권<br>사진</span>
    </div>
    <div>
      <h2 style="font-size:32px;font-weight:900;letter-spacing:-.02em;color:#451a03;margin-bottom:4px;">
        ${talent.name}
      </h2>
      <p style="font-size:16px;font-weight:700;color:#b45309;margin-bottom:20px;">
        ${talent.title || [talent.category ? TALENT_CATEGORY_LABELS[talent.category] : null, talent.field ? TALENT_FIELD_LABELS[talent.field] : null].filter(Boolean).join(' · ') || '전문가'}
      </p>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:#64748b;font-weight:500;">
        ${talent.address ? `<span>📍 ${shortAddress(talent.address)}</span>` : ''}
        ${talent.birthDate ? `<span>🎂 ${new Date(talent.birthDate).getFullYear()}년생</span>` : ''}
        <span>🏅 IT 경력 ${totalText}</span>
      </div>
    </div>
  </header>

  <!-- 1. Profile Summary -->
  ${talent.notes ? `
  <section style="margin-bottom:36px;">
    <div class="sec-head"><div class="sec-title">1. Profile Summary</div><div style="height:1px;"></div></div>
    <p style="font-size:13px;line-height:1.8;color:#475569;font-weight:500;">${talent.notes}</p>
  </section>` : ''}

  <!-- 1. Education & Certifications -->
  ${(eduExps.length > 0 || certExps.length > 0) ? `
  <section style="margin-bottom:36px;">
    <div class="sec-head"><div class="sec-title">1. Education &amp; Certifications</div><div style="height:1px;"></div></div>
    ${eduExps.length > 0 ? `
    <table style="width:100%;text-align:left;margin-bottom:20px;">
      <colgroup>
        <col style="width:30%;">
        <col style="width:35%;">
        <col style="width:18%;">
        <col style="width:17%;">
      </colgroup>
      <thead><tr>
        <th>학교</th>
        <th>전공</th>
        <th>졸업 연도</th>
        <th>학위</th>
      </tr></thead>
      <tbody style="font-size:13px;color:#475569;">${eduRows}</tbody>
    </table>` : ''}
    ${certExps.length > 0 ? `
    <table style="width:100%;text-align:left;border-top:1px solid rgba(69,26,3,.06);padding-top:12px;margin-top:4px;">
      <thead><tr>
        <th>자격증</th>
        <th>발행기관</th>
        <th style="width:80px;">취득 연도</th>
      </tr></thead>
      <tbody style="font-size:13px;color:#475569;">${certRows}</tbody>
    </table>` : ''}
  </section>` : ''}

  <!-- 2. Linker AI Expert Analysis -->
  ${insight ? (() => {
    const ins = insight
    const lvlColor = (v: string | null | undefined) => v === 'HIGH' ? '#dc2626' : v === 'MEDIUM' ? '#d97706' : v === 'LOW' ? '#16a34a' : '#6b7280'
    const lvlLabel = (v: string | null | undefined) => v === 'HIGH' ? '높음' : v === 'MEDIUM' ? '보통' : v === 'LOW' ? '낮음' : '—'
    const badge = (v: string | null | undefined) => `<span style="display:inline-block;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;color:#fff;background:${lvlColor(v)};margin-left:4px;">${lvlLabel(v)}</span>`

    const summaryHtml = ins.summary ? `
      <p style="font-size:12px;line-height:1.8;color:#475569;font-weight:500;margin-bottom:16px;">${ins.summary}</p>` : ''

    const riskHtml = ins.riskFlags && ins.riskFlags.length > 0 ? `
      <div style="margin-bottom:16px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:10px;font-weight:800;color:#7c3aed;letter-spacing:.05em;margin-bottom:6px;page-break-after:avoid;break-after:avoid;">RISK FLAGS</div>
        ${ins.riskFlags.map(r => `
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
            ${badge(r.severity)}
            <span style="font-size:11px;color:#475569;">${r.description}</span>
          </div>`).join('')}
      </div>` : ''

    const careerHtml = ins.careerPattern ? `
      <div style="margin-bottom:16px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:10px;font-weight:800;color:#0369a1;letter-spacing:.05em;margin-bottom:6px;page-break-after:avoid;break-after:avoid;">CAREER PATTERN</div>
        <div style="font-size:11px;color:#475569;line-height:1.7;">
          ${ins.careerPattern.consistencyReason ? `<div>일관성: ${badge(ins.careerPattern.consistency)} <span style="margin-left:4px;">${ins.careerPattern.consistencyReason}</span></div>` : ''}
          ${ins.careerPattern.persistenceReason ? `<div>지속성: ${badge(ins.careerPattern.persistenceLevel)} <span style="margin-left:4px;">${ins.careerPattern.persistenceReason}</span></div>` : ''}
          ${ins.careerPattern.gapPeriods && ins.careerPattern.gapPeriods.length > 0 ? `<div>공백 기간: ${ins.careerPattern.gapPeriods.map(g => `${g.fromDate}~${g.toDate}(${g.months}개월)`).join(', ')}</div>` : ''}
        </div>
      </div>` : ''

    const techHtml = ins.technicalProfile ? `
      <div style="margin-bottom:16px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:10px;font-weight:800;color:#0369a1;letter-spacing:.05em;margin-bottom:6px;page-break-after:avoid;break-after:avoid;">TECHNICAL PROFILE</div>
        <div style="font-size:11px;color:#475569;line-height:1.7;">
          ${ins.technicalProfile.coreSkills && ins.technicalProfile.coreSkills.length > 0 ? `
          <div style="margin-bottom:4px;">핵심 스킬:
            ${ins.technicalProfile.coreSkills.slice(0, 6).map(s => `<span style="display:inline-block;padding:1px 6px;background:#f0fdf4;border:1px solid #86efac;border-radius:3px;font-size:10px;font-weight:700;margin:1px;">${s.skill}(${s.level})</span>`).join('')}
          </div>` : ''}
          ${ins.technicalProfile.stackTransitionNote ? `<div>${ins.technicalProfile.stackTransitionNote}</div>` : ''}
        </div>
      </div>` : ''

    const domainHtml = ins.domainProfile && ins.domainProfile.domains && ins.domainProfile.domains.length > 0 ? `
      <div style="margin-bottom:16px;page-break-inside:avoid;break-inside:avoid;">
        <div style="font-size:10px;font-weight:800;color:#0369a1;letter-spacing:.05em;margin-bottom:6px;page-break-after:avoid;break-after:avoid;">DOMAIN</div>
        <div style="font-size:11px;color:#475569;">
          ${ins.domainProfile.primaryDomain ? `<span style="font-weight:700;">주요: ${ins.domainProfile.primaryDomain}</span> &nbsp;` : ''}
          ${ins.domainProfile.domains.map(d => `${d.name}(${d.pct}%)`).join(' · ')}
          ${ins.domainProfile.domainNote ? `<div style="margin-top:3px;">${ins.domainProfile.domainNote}</div>` : ''}
        </div>
      </div>` : ''

    return `<section style="margin-bottom:36px;">
      <div class="sec-head"><div class="sec-title">2. Linker AI Expert Analysis</div><div style="height:1px;"></div></div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:12px;">※ 본 분석은 생성형 AI에 의해 작성되었으며, 일부 오정보가 포함될 수 있습니다.</div>
      ${summaryHtml}${riskHtml}${careerHtml}${techHtml}${domainHtml}
    </section>`
  })() : ''}

  <!-- 3. Tech Stack -->
  <section style="margin-bottom:36px;">
    <div class="sec-head"><div class="sec-title">3. Tech Stack</div><div style="height:1px;"></div></div>
    <div style="margin-top:4px;">${skillTags}</div>
  </section>

  <!-- 4. Work Experience -->
  ${companyExps.length > 0 ? `
  <section style="margin-bottom:36px;">
    <div class="sec-head"><div class="sec-title">4. Work Experience</div><div style="height:1px;"></div></div>
    <table style="width:100%;text-align:left;">
      <thead><tr>
        <th style="width:40%;">Company</th>
        <th>Position / Key Role</th>
        <th style="width:130px;">Period</th>
      </tr></thead>
      <tbody>${workRows}</tbody>
    </table>
  </section>` : ''}

  <!-- 5. Project Experience -->
  ${projectExps.length > 0 ? `
  <section style="margin-bottom:36px;">
    <div class="sec-head"><div class="sec-title">5. Project Experience</div><div style="height:1px;"></div></div>
    <table style="width:100%;text-align:left;table-layout:fixed;">
      <colgroup>
        <col style="width:28%;">
        <col style="width:72px;">
        <col style="width:30%;">
        <col>
      </colgroup>
      <thead><tr>
        <th>프로젝트 / 발주처</th>
        <th>기간</th>
        <th>수행역할 · 담당업무</th>
        <th>개발환경</th>
      </tr></thead>
      <tbody>${projRows}</tbody>
    </table>
  </section>` : ''}

  <!-- Footer -->
  <footer style="margin-top:48px;padding-top:20px;display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;">
    <span style="opacity:.35;">본 문서는 전문가 정보를 기반으로 씽클레어 분석 플랫폼 Linker에서 생성되었습니다.</span>
    <span style="opacity:.35;">발행일 ${issueDate}</span>
  </footer>

</div>
<script>
function savePdf(){
  var btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = '변환 중...';
  var el = document.getElementById('resume-content');
  var logoSrc = '${logoDataUrl}';
  // 로고 원본 비율 계산 후 PDF 생성
  var logoImg = new Image();
  logoImg.onload = function() {
    var logoW = 30;
    var logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
    var bottomMargin = 15;
    html2pdf().set({
      margin: [22, 0, bottomMargin, 0],
      filename: '${fileName}.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(el).toPdf().get('pdf').then(function(pdf){
      var totalPages = pdf.internal.getNumberOfPages();
      var pw = pdf.internal.pageSize.getWidth();
      var ph = pdf.internal.pageSize.getHeight();
      // 컷 라인(ph-bottomMargin=282mm) 아래 여백 영역에 배치 → 컨텐츠와 겹침 없음
      var footerY = ph - bottomMargin + logoH + 3;
      for (var i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text(i + ' / ' + totalPages, pw / 2, footerY + 2, { align: 'center' });
        try { pdf.addImage(logoSrc, 'PNG', pw - 20 - logoW, footerY - logoH, logoW, logoH); } catch(e){}
      }
    }).save().then(function(){
      btn.disabled = false;
      btn.textContent = '💾 PDF 저장 (Save As)';
    });
  };
  logoImg.src = logoSrc;
}
</script>
</body></html>`

  const win = window.open('', '_blank', 'width=960,height=1200')
  if (!win) { alert('팝업이 차단되어 있습니다. 팝업 허용 후 다시 시도하세요.'); return }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  win.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

// ── 전문가 상세 모달 (mockup 기반) ────────────────────────────────────────────

function TalentDetailModal({
  talent, onClose, onUpdated,
}: {
  talent: TalentAdmin
  onClose: () => void
  onUpdated: () => void
}) {
  const addToast = useUiStore(s => s.addToast)
  const qc = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
    staleTime: 60_000,
  })
  const referralSources = settings?.masterData?.referralSources ?? []
  const projectRoles = settings?.masterData?.projectRoles ?? []
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null)
  const [form, setForm] = useState<CreateTalentRequest>({
    name: talent.name,
    nameEn: talent.nameEn ?? '',
    phone: talent.phone ?? '',
    category: talent.category ?? undefined,
    field: talent.field ?? undefined,
    workType: talent.workType,
    desiredRate: talent.desiredRate ?? undefined,
    skills: talent.skills,
    birthDate: talent.birthDate ?? '',
    email: talent.email ?? '',
    address: talent.address ?? '',
    skillGrade: talent.skillGrade ?? '',
    projectRole: talent.projectRole ?? '',
    title: talent.title ?? '',
    notes: talent.notes ?? '',
    industryExperience: talent.industryExperience ?? '',
    referralSource: talent.referralSource ?? '',
    itCareerMonths: talent.itCareerMonths ?? null,
  })

  useEffect(() => {
    setForm({
      name: talent.name,
      nameEn: talent.nameEn ?? '',
      phone: talent.phone ?? '',
      category: talent.category ?? undefined,
      field: talent.field ?? undefined,
      workType: talent.workType,
      desiredRate: talent.desiredRate ?? undefined,
      skills: talent.skills,
      birthDate: talent.birthDate ?? '',
      email: talent.email ?? '',
      address: talent.address ?? '',
      skillGrade: talent.skillGrade ?? '',
      projectRole: talent.projectRole ?? '',
      title: talent.title ?? '',
      notes: talent.notes ?? '',
      industryExperience: talent.industryExperience ?? '',
      referralSource: talent.referralSource ?? '',
      itCareerMonths: talent.itCareerMonths ?? null,
    })
    setTempPhotoUrl(null)
    setUploadedFileName(null)
    setAnalysisResult(null)
    setInsight(null)
    setInsightKeywords('')
    setMode('view')
    setHasChanges(false)
  }, [talent])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null)
  const [insight, setInsight] = useState<TalentInsightResponse | null>(null)
  const [insightKeywords, setInsightKeywords] = useState<string>('')
  const [insightLoading, setInsightLoading] = useState(false)

  // ── 평가/리뷰 상태 ────────────────────────────────────────────────────────
  const [reviewTab, setReviewTab] = useState<'write' | 'history'>('write')
  const [rCollab,   setRCollab]   = useState(0)
  const [rTech,     setRTech]     = useState(0)
  const [rReliable, setRReliable] = useState(0)
  const [rComment,  setRComment]  = useState('')

  const { data: reviewHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['talent-review-history', talent.id],
    queryFn: () => serviceAdminApi.getTalentReviewHistory(talent.id).then(r => r.data),
  })
  const avgScore = reviewHistory?.length
    ? reviewHistory.reduce((s, h) => s + h.avgScore, 0) / reviewHistory.length
    : null

  const submitReviewMutation = useMutation({
    mutationFn: () => serviceAdminApi.submitTalentReview(talent.id, {
      collaborationScore: rCollab,
      technicalScore:     rTech,
      reliabilityScore:   rReliable,
      comment:            rComment || undefined,
    }),
    onSuccess: () => {
      setRCollab(0); setRTech(0); setRReliable(0); setRComment('')
      setReviewTab('history')
      refetchHistory()
      qc.invalidateQueries({ queryKey: ['talent-eval-list'] })
      qc.invalidateQueries({ queryKey: ['talent-eval-stats'] })
      addToast('평가가 등록되었습니다.', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast(msg ?? '평가 등록에 실패했습니다.', 'error')
    },
  })

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => serviceAdminApi.deleteReview(talent.id, reviewId),
    onSuccess: () => {
      refetchHistory()
      qc.invalidateQueries({ queryKey: ['talent-eval-list'] })
      qc.invalidateQueries({ queryKey: ['talent-eval-stats'] })
      addToast('평가가 삭제되었습니다.', 'success')
    },
    onError: () => addToast('삭제에 실패했습니다.', 'error'),
  })

  const { data: savedInsightData } = useQuery({
    queryKey: ['talent-insight', talent.id],
    queryFn: () => serviceAdminApi.getInsight(talent.id).then(r => r.data),
    staleTime: Infinity,
  })
  const displayInsight = insight ?? savedInsightData?.insight ?? null
  const displayKeywords = insightKeywords || savedInsightData?.keywords || ''
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resumeUploadRef = useRef<HTMLInputElement>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [expFormOpen, setExpFormOpen] = useState(false)
  const [expFormType, setExpFormType] = useState<ExperienceType>('PROJECT')
  const [editingExp, setEditingExp] = useState<(ExperienceResponse & { _edit: true }) | null>(null)

  const { data: experiences } = useQuery({
    queryKey: ['admin', 'experiences', talent.id],
    queryFn: () => serviceAdminApi.listExperiences(talent.id).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (req: CreateTalentRequest) => serviceAdminApi.updateTalent(talent.id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      addToast('전문가 정보가 수정되었습니다.', 'success')
      onUpdated()
      setMode('view')
      setHasChanges(false)
    },
    onError: () => addToast('수정에 실패했습니다.', 'error'),
  })

  const deleteExpMutation = useMutation({
    mutationFn: (expId: string) => serviceAdminApi.deleteExperience(talent.id, expId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'experiences', talent.id] })
      addToast('삭제되었습니다.', 'success')
    },
    onError: () => addToast('삭제에 실패했습니다.', 'error'),
  })

  const addExpMutation = useMutation({
    mutationFn: (type: ExperienceType) => serviceAdminApi.createExperience(talent.id, {
      experienceType: type,
      companyName: '',
      projectName: type === 'EDUCATION' ? '' : '',
      role: '',
      department: '',
      employmentType: type === 'COMPANY' ? '정규직' : undefined,
      startDate: new Date().toISOString().substring(0, 7) + '-01',
      endDate: null,
      description: '',
      techStack: [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'experiences', talent.id] })
    },
    onError: () => addToast('추가에 실패했습니다.', 'error'),
  })

  // 로컬 변경 감지
  const [hasChanges, setHasChanges] = useState(false)

  // 전체 저장 로직
  const handleSaveAll = async () => {
    try {
      await updateMutation.mutateAsync(form)
      if (analysisResult && (
        (form.educations?.length ?? 0) +
        (form.companyExps?.length ?? 0) +
        (form.projectExps?.length ?? 0) +
        (form.certifications?.length ?? 0) > 0
      )) {
        await serviceAdminApi.replaceExperiences(talent.id, form)
        qc.invalidateQueries({ queryKey: ['admin', 'experiences', talent.id] })
        setAnalysisResult(null)
      }
      setHasChanges(false)
      addToast('모든 변경사항이 안전하게 저장되었습니다.', 'success')
    } catch (err) {
      addToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }

  // 팝업 닫기 요청 핸들러
  const handleCloseRequest = () => {
    if (hasChanges) {
      if (window.confirm('저장되지 않은 변경사항이 있습니다. 저장하고 닫으시겠습니까?')) {
        handleSaveAll().then(() => onClose())
      } else {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const processFile = async (file: File) => {
    setAnalyzing(true); setUploadedFileName(file.name)
    try {
      const { data } = await serviceAdminApi.analyzeResume(file)
      setAnalysisResult(data)
      setForm(f => ({
        ...f,
        name:        normalizeKoreanName(data.name) ?? f.name,
        nameEn:      data.nameEn ?? f.nameEn,
        phone:       data.phone ? data.phone.replace(/\D/g, '') : f.phone,
        workType:    data.workType    ?? f.workType,
        desiredRate: data.desiredRate ?? f.desiredRate,
        category:       data.category    ?? f.category,
        field:          data.field       ?? f.field,
        skills:         (data.skills && data.skills.length > 0) ? data.skills : f.skills,
        title:          data.title       ?? f.title,
        itCareerMonths: data.itCareerMonths ?? f.itCareerMonths,
        photoKey:       data.photoKey ?? f.photoKey,
        resumeKey:      data.resumeKey ?? f.resumeKey,
        educations:     data.educations,
        companyExps:    data.companyExps,
        projectExps:    data.projectExps,
        certifications: data.certifications,
      }))
      if (data.photoKey) {
        try {
          const res = await serviceAdminApi.getPhotoUrl(data.photoKey)
          setTempPhotoUrl(res.data.url)
        } catch (e) {
          console.error("Failed to get photo url", e)
        }
      } else {
        setTempPhotoUrl(null)
      }
      setHasChanges(true)
      addToast('이력서 분석 완료. 저장 시 경력 정보도 함께 반영됩니다.', 'success')
    } catch { addToast('이력서 분석에 실패했습니다.', 'error') }
    finally { setAnalyzing(false) }
  }

  const uploadResumeOnly = async (file: File) => {
    setUploadingResume(true)
    try {
      const { data } = await serviceAdminApi.analyzeResume(file)
      if (!data.resumeKey) {
        addToast('파일 저장에 실패했습니다.', 'error')
        return
      }
      await serviceAdminApi.updateTalent(talent.id, { ...form, resumeKey: data.resumeKey })
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      addToast('이력서 파일이 저장되었습니다.', 'success')
      onUpdated()
    } catch {
      addToast('파일 업로드 중 오류가 발생했습니다.', 'error')
    } finally {
      setUploadingResume(false)
    }
  }

  const handleAnalyzeInsights = async (keywords: string) => {
    setInsightLoading(true)
    try {
      const { data } = await serviceAdminApi.analyzeInsights(talent.id, keywords)
      setInsight(data.insight)
      setInsightKeywords(data.keywords ?? '')
      qc.invalidateQueries({ queryKey: ['talent-insight', talent.id] })
    } catch { addToast('AI 분석에 실패했습니다.', 'error') }
    finally { setInsightLoading(false) }
  }

  const availableFields: TalentField[] = form.category ? TALENT_FIELDS_BY_CATEGORY[form.category] : []

  const sortedExps = [...(experiences ?? [])].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  )
  const companyExps = sortedExps.filter(e => e.experienceType === 'COMPANY')
  const projectExps = sortedExps.filter(e => e.experienceType === 'PROJECT')
  const educations = sortedExps.filter(e => e.experienceType === 'EDUCATION')
  const certifications = sortedExps.filter(e => e.experienceType === 'CERTIFICATION')

  // IT 경력: 명기값 우선, 없으면 최초 근무/프로젝트 시작일 기준
  const totalMonths    = talent.itCareerMonths ?? calcItCareerMonths(sortedExps)
  const verifiedMonths = calcCareerMonths(sortedExps.filter(e => e.isVerified))
  const verifiedPct = totalMonths > 0 ? Math.round((verifiedMonths / totalMonths) * 100) : 0

  // ── 개발자 분석 지표 ──────────────────────────────────────────────────────────
  const projectDurations = projectExps.map(expMonths)
  const shortProjects    = projectExps.filter((_, i) => projectDurations[i] < 2)
  const avgProjectMonths = projectExps.length > 0
    ? Math.round(projectDurations.reduce((a, b) => a + b, 0) / projectExps.length)
    : 0
  const allTechStacks      = [...new Set(sortedExps.flatMap(e => e.techStack ?? []))]
  const hasTechStack       = !form.category || TECH_STACK_CATEGORIES.includes(form.category)

  const handleExpUpdate = (expId: string, currentExp: ExperienceResponse, updates: Partial<ExperienceRequest>) => {
    const req: ExperienceRequest = {
      experienceType: currentExp.experienceType,
      companyName: currentExp.companyName ?? '',
      projectName: currentExp.projectName,
      role: currentExp.role ?? '',
      department: currentExp.department ?? '',
      employmentType: currentExp.employmentType ?? '정규직',
      startDate: currentExp.startDate,
      endDate: currentExp.endDate ?? null,
      description: currentExp.description ?? '',
      techStack: currentExp.techStack,
      ...updates,
    }
    serviceAdminApi.updateExperience(talent.id, expId, req).then(() => {
      qc.invalidateQueries({ queryKey: ['admin', 'experiences', talent.id] })
    }).catch(() => {
      addToast('저장에 실패했습니다.', 'error')
    })
  }

  const handleBasicUpdate = (updates: Partial<CreateTalentRequest>) => {
    setForm(f => ({ ...f, ...updates }))
    setHasChanges(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col h-full max-h-[95vh] border border-white/20">
        {/* 헤더 */}
        <div className="px-8 py-5 border-b border-border/50 bg-surface rounded-t-3xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {editingField === 'name' ? (
              <input autoFocus type="text"
                className="text-xl font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-lg outline-none ring-2 ring-blue-400 min-w-[8rem]"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onBlur={() => { setHasChanges(true); setEditingField(null) }}
                onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
              />
            ) : (
              <h2 onDoubleClick={() => setEditingField('name')}
                className="text-xl font-bold text-primary flex items-center gap-2 cursor-default group select-none">
                <span>👤</span> {displayName(form.name, form.nameEn)}
                <span className="text-xs text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity font-normal">✎</span>
              </h2>
            )}
            {hasChanges && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-[11px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                변경됨
              </span>
            )}
            <div className="h-4 w-px bg-border/50 hidden sm:block" />
            <div className="flex gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${AVAILABILITY_COLORS[talent.availabilityStatus]}`}>
                {AVAILABILITY_LABELS[talent.availabilityStatus]}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 명시적 저장 버튼 */}
            <button 
              onClick={handleSaveAll}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all
                ${hasChanges 
                  ? 'bg-secondary text-white shadow-lg shadow-secondary/20 scale-105 hover:bg-secondary/90 active:scale-95' 
                  : 'bg-surface border border-border text-primary/30 cursor-not-allowed'}`}
            >
              <span>💾</span> 변경사항 저장
            </button>

            <div className="h-8 w-px bg-border/50" />
            
            <div className="flex bg-white border border-border rounded-lg p-1">
              <button onClick={() => setMode('view')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'view' ? 'bg-primary text-white shadow-sm' : 'text-primary/60 hover:bg-surface'}`}>상세 보기</button>
              <button onClick={() => setMode('edit')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'edit' ? 'bg-primary text-white shadow-sm' : 'text-primary/60 hover:bg-surface'}`}>정보 수정</button>
            </div>
            
            <button 
              onClick={handleCloseRequest} 
              className="ml-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-primary/30 hover:text-red-500 transition-colors text-2xl font-light"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ══════════════════════════════════════════════
              VIEW 모드 — mockup 기반 레이아웃
          ══════════════════════════════════════════════ */}
          {mode === 'view' && (
            <div className="bg-background p-6 space-y-6">

              {/* ① 경력 요약 헤더 ─────────────────────────── */}
              <section className="bg-surface rounded-3xl shadow-md border border-border/50 p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <span className="text-secondary">🏆</span> 경력 관리
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void printCareerCard(talent, sortedExps, totalMonths, analysisResult ?? undefined, displayInsight ?? undefined)}
                      className="px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                      📄 PDF 저장
                    </button>
                    <button onClick={() => setMode('edit')}
                      className="px-4 py-2 bg-white border border-border/50 hover:bg-surface hover:border-secondary transition-colors rounded-xl text-xs font-bold text-primary flex items-center gap-2 shadow-sm">
                      ✏️ 기본정보 수정
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* IT 경력 */}
                  <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-xl shrink-0">💼</div>
                    <div>
                      <p className="text-xs font-bold text-primary/50 mb-1">IT 경력</p>
                      <p className="text-xl font-black text-primary">
                        {totalMonths === 0 ? '—' : fmtDuration(totalMonths)}
                      </p>
                    </div>
                  </div>
                  {/* 인증 완료 경력 */}
                  <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-xl shrink-0">✅</div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-primary/50 mb-1">인증 완료 경력</p>
                      <p className="text-xl font-black text-success">
                        {verifiedMonths === 0 ? '—' : fmtDuration(verifiedMonths)}
                      </p>
                    </div>
                    {totalMonths > 0 && (
                      <>
                        <div className="absolute bottom-0 left-0 h-1 bg-success/20 w-full" />
                        <div className="absolute bottom-0 left-0 h-1 bg-success transition-all duration-500"
                          style={{ width: `${verifiedPct}%` }} />
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* ② 개인 이력 카드 ────────────────────────── */}
              <section className="bg-white rounded-xl border border-border/50 p-8 md:p-12 mb-6">
                
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-primary tracking-widest border-b-2 border-primary pb-4 inline-block px-10">
                    개인 이력 카드 ({displayName(talent.name, talent.nameEn)})
                  </h2>
                </div>

                {/* 0. 개발자 분석 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    개발자 분석
                  </h3>

                  {/* 상단 스탯 카드 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white border border-border/50 rounded-xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                      <span className="text-[11px] font-semibold text-primary/40 uppercase tracking-wide">전체 프로젝트</span>
                      <span className="text-2xl font-bold text-primary">{projectExps.length}<span className="text-sm font-normal text-primary/50 ml-1">건</span></span>
                    </div>
                    <div className={`bg-white border rounded-xl px-4 py-3 flex flex-col gap-1 shadow-sm ${shortProjects.length > 0 ? 'border-amber-300' : 'border-border/50'}`}>
                      <span className="text-[11px] font-semibold text-primary/40 uppercase tracking-wide">단기(2개월 미만) 프로젝트</span>
                      <span className={`text-2xl font-bold ${shortProjects.length > 0 ? 'text-amber-500' : 'text-primary'}`}>
                        {shortProjects.length}<span className="text-sm font-normal text-primary/50 ml-1">건</span>
                      </span>
                      {projectExps.length > 0 && (
                        <span className="text-[11px] text-primary/40">전체의 {Math.round((shortProjects.length / projectExps.length) * 100)}%</span>
                      )}
                    </div>
                    <div className="bg-white border border-border/50 rounded-xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                      <span className="text-[11px] font-semibold text-primary/40 uppercase tracking-wide">평균 프로젝트 기간</span>
                      <span className="text-2xl font-bold text-primary">{projectExps.length > 0 ? fmtDuration(avgProjectMonths) : '—'}</span>
                    </div>
                    {hasTechStack && (
                    <div className="bg-white border border-border/50 rounded-xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                      <span className="text-[11px] font-semibold text-primary/40 uppercase tracking-wide">기술스택 수</span>
                      <span className="text-2xl font-bold text-primary">{allTechStacks.length}<span className="text-sm font-normal text-primary/50 ml-1">개</span></span>
                    </div>
                    )}
                  </div>

                </div>

                {/* ── AI 종합 분석 ─────────────────────────────── */}
                <InsightPanel
                  insight={displayInsight}
                  keywords={displayKeywords}
                  loading={insightLoading}
                  onAnalyze={handleAnalyzeInsights}
                />

                {/* 1. 기본 정보 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    기본 정보
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* 프로필 사진 */}
                    <div className="w-32 h-40 bg-surface border border-border/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                      {(tempPhotoUrl || talent.photoUrl)
                        ? <img src={tempPhotoUrl || talent.photoUrl || ''} alt={talent.name} className="w-full h-full object-cover" />
                        : <span className="text-5xl text-primary/20">👤</span>
                      }
                    </div>
                    {/* 정보 테이블 — CSS grid로 열 완벽 정렬 */}
                    <div className="flex-1 border border-border/50 rounded-sm overflow-hidden"
                         style={{ display: 'grid', gridTemplateColumns: '6rem 1fr 6rem 1fr' }}>
                      {/* ── 생년월일 | 총 경력 ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">생년월일</div>
                      <div className="border-r border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'birthDate' ? (
                          <div className="p-0.5"><input autoFocus type="date"
                            className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                            value={form.birthDate ?? ''}
                            onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                            onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                          /></div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('birthDate')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.birthDate || '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">IT 경력</div>
                      <div className="border-b border-border/50 bg-white px-3 py-2 text-[13px] text-primary/80 flex items-center font-bold">{totalMonths === 0 ? '—' : fmtDuration(totalMonths)}</div>

                      {/* ── 소속 | 직급 ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">소속</div>
                      <div className="border-r border-b border-border/50 bg-white px-3 py-2 text-[13px] flex items-center text-primary/80">프리랜서</div>
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">직급</div>
                      <div className="border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'title' ? (
                          <div className="p-0.5"><input autoFocus type="text"
                            className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                            value={form.title ?? ''}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                          /></div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('title')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.title || '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>

                      {/* ── 기술 분류 | 근무 형태 ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">기술 분류</div>
                      <div className="border-r border-b border-border/50 bg-white p-0.5 text-[13px] flex items-center gap-1">
                        <select className="flex-1 bg-transparent hover:bg-surface/50 px-1 py-1.5 outline-none transition-all rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-primary/80"
                          defaultValue={talent.category || ''}
                          onChange={e => handleBasicUpdate({ category: (e.target.value as TalentCategory) || undefined, field: undefined })}>
                          <option value="">분류 선택</option>
                          {(Object.keys(TALENT_CATEGORY_LABELS) as TalentCategory[]).map(c => (
                            <option key={c} value={c}>{TALENT_CATEGORY_LABELS[c]}</option>
                          ))}
                        </select>
                        <span className="text-primary/20 shrink-0">/</span>
                        <select className="flex-1 bg-transparent hover:bg-surface/50 px-1 py-1.5 outline-none transition-all rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-primary/80"
                          defaultValue={talent.field || ''}
                          disabled={!talent.category}
                          onChange={e => handleBasicUpdate({ field: (e.target.value as TalentField) || undefined })}>
                          <option value="">분야 선택</option>
                          {(talent.category ? TALENT_FIELDS_BY_CATEGORY[talent.category] : []).map(f => (
                            <option key={f} value={f}>{TALENT_FIELD_LABELS[f]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">근무 형태</div>
                      <div className="border-b border-border/50 bg-white p-0.5 text-[13px]">
                        <select className="w-full h-full bg-transparent hover:bg-surface/50 px-2.5 py-1.5 outline-none transition-all rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-primary/80"
                          defaultValue={talent.workType}
                          onChange={e => handleBasicUpdate({ workType: e.target.value as WorkType })}>
                          <option value="ONSITE">상주</option>
                          <option value="REMOTE">원격</option>
                          <option value="HYBRID">혼합</option>
                        </select>
                      </div>

                      {/* ── 전화번호 | 이메일 ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">전화번호</div>
                      <div className="border-r border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'phone' ? (
                          <div className="p-0.5"><input autoFocus type="text"
                            className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                            value={formatPhone(form.phone)}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                            onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                          /></div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('phone')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.phone ? formatPhone(form.phone) : '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">이메일</div>
                      <div className="border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'email' ? (
                          <div className="p-0.5"><input autoFocus type="email"
                            className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                            value={form.email ?? ''}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                          /></div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('email')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.email || '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>

                      {/* ── 주소 | 기술등급 ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">주소</div>
                      <div className="border-r border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'address' ? (
                          <div className="p-0.5"><input autoFocus type="text"
                            className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                            value={form.address ?? ''}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { setHasChanges(true); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                          /></div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('address')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.address || '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">기술등급</div>
                      <div className="border-b border-border/50 bg-white text-[13px]">
                        <div className="px-3 py-2 flex items-center gap-1.5 min-h-[38px]">
                          {form.skillGrade
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{form.skillGrade}</span>
                            : <span className="text-primary/30 text-xs">자격증·경력 기반 자동산정</span>}
                        </div>
                      </div>

                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">역할</div>
                      <div className="border-b border-border/50 bg-white text-[13px]">
                        {editingField === 'projectRole' ? (
                          <div className="p-0.5">
                            <select autoFocus
                              className="w-full bg-blue-50 px-2.5 py-1.5 outline-none ring-1 ring-blue-400 rounded-sm text-primary/80"
                              value={form.projectRole ?? ''}
                              onChange={e => { setForm(f => ({ ...f, projectRole: e.target.value })); setHasChanges(true) }}
                              onBlur={() => { setHasChanges(true); setEditingField(null) }}
                            >
                              <option value="">—</option>
                              {projectRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div onDoubleClick={() => setEditingField('projectRole')}
                            className="px-3 py-2 cursor-default group flex items-center gap-1 min-h-[38px] select-none">
                            <span className="text-primary/80">{form.projectRole || '—'}</span>
                            <span className="text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                          </div>
                        )}
                      </div>

                      {/* ── 산업군 경험 (전체 너비) ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">산업군 경험</div>
                      <div className="border-b border-border/50 bg-white px-3 py-2 text-[13px] min-h-[38px]" style={{ gridColumn: 'span 3' }}>
                        {(() => {
                          const selected = (talent.industryExperience || '').split(',').map(s => s.trim()).filter(Boolean)
                          return (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {INDUSTRY_OPTIONS.map(opt => {
                                const active = selected.includes(opt)
                                return (
                                  <button key={opt} type="button"
                                    onClick={() => {
                                      const next = active ? selected.filter(s => s !== opt) : [...selected, opt]
                                      handleBasicUpdate({ industryExperience: next.join(',') })
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-secondary text-white border-secondary' : 'border-border/60 text-primary/50 hover:border-secondary/50 hover:text-secondary'}`}>
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>

                      {/* ── 추천 소스 (전체 너비) ── */}
                      <div className="bg-surface px-3 py-2 text-center text-[13px] font-bold text-primary border-r border-b border-border/50 flex items-center justify-center">추천 소스</div>
                      <div className="border-b border-border/50 bg-white p-0.5 text-[13px]" style={{ gridColumn: 'span 3' }}>
                        <select className="w-full h-full bg-transparent hover:bg-surface/50 px-2.5 py-1.5 outline-none transition-all rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-primary/80"
                          defaultValue={talent.referralSource || ''}
                          onChange={e => handleBasicUpdate({ referralSource: e.target.value || undefined })}>
                          <option value="">선택 안 함</option>
                          {referralSources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 학력 사항 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    학력 사항
                  </h3>
                  <div className="border border-border/50 border-r-0 border-b-0 rounded-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-surface text-primary font-bold">
                        <tr>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">학교명</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">전공</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">졸업년도</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">학위</th>
                        </tr>
                      </thead>
                      <tbody>
                        {educations.length > 0 ? (
                          educations.map(exp => (
                            <tr key={exp.id} className="group bg-white hover:bg-surface/50 transition-colors">
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center font-bold text-primary bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.companyName || ''} placeholder="학교명"
                                  onBlur={e => { if (e.target.value !== (exp.companyName || '')) handleExpUpdate(exp.id, exp, { companyName: e.target.value }) }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.projectName || ''} placeholder="전공"
                                  onBlur={e => { if (e.target.value !== (exp.projectName || '')) handleExpUpdate(exp.id, exp, { projectName: e.target.value }) }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  type="month"
                                  className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.endDate?.substring(0, 7) || ''}
                                  onBlur={e => { 
                                    const val = e.target.value ? e.target.value + '-01' : null;
                                    if (val !== exp.endDate) handleExpUpdate(exp.id, exp, { endDate: val }) 
                                  }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle relative group/btn">
                                <select
                                  className="w-[calc(100%-24px)] text-center text-primary/80 bg-transparent hover:bg-white px-1 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all appearance-none cursor-pointer"
                                  defaultValue={exp.role || ''}
                                  onChange={e => { if (e.target.value !== (exp.role || '')) handleExpUpdate(exp.id, exp, { role: e.target.value }) }}
                                >
                                  <option value="">—</option>
                                  <option value="학사">학사</option>
                                  <option value="전문학사">전문학사</option>
                                  <option value="석사">석사</option>
                                  <option value="박사">박사</option>
                                  <option value="중퇴">중퇴</option>
                                  <option value="수료">수료</option>
                                </select>
                                <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteExpMutation.mutate(exp.id) }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/btn:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity">🗑️</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={4} className="px-3 py-3 text-center text-primary/50 border-b border-r border-border/50">등록된 학력 사항이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => addExpMutation.mutate('EDUCATION')}
                    disabled={addExpMutation.isPending}
                    className="mt-2 flex items-center gap-1 text-xs text-secondary font-bold hover:text-secondary/70 disabled:opacity-50 transition-colors"
                  >
                    + 학력 추가
                  </button>
                </div>

                {/* 3. 근무 경력 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    근무 경력
                  </h3>
                  <div className="border border-border/50 border-r-0 border-b-0 rounded-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-surface text-primary font-bold">
                        <tr>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">직장명</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">부서/직위</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">근무기간</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">담당업무</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyExps.length > 0 ? (
                          companyExps.map(exp => (
                            <tr key={exp.id} className="group bg-white hover:bg-surface/50 transition-colors">
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center font-bold text-primary bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.companyName || ''} placeholder="직장명"
                                  onBlur={e => { if (e.target.value !== (exp.companyName || '')) handleExpUpdate(exp.id, exp, { companyName: e.target.value }) }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <div className="space-y-1">
                                  <input
                                    placeholder="부서"
                                    className="w-full text-center bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs"
                                    defaultValue={exp.department || ''}
                                    onBlur={e => { if (e.target.value !== (exp.department || '')) handleExpUpdate(exp.id, exp, { department: e.target.value }) }}
                                  />
                                  <input
                                    placeholder="직위"
                                    className="w-full text-center bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs"
                                    defaultValue={exp.role || ''}
                                    onBlur={e => { if (e.target.value !== (exp.role || '')) handleExpUpdate(exp.id, exp, { role: e.target.value }) }}
                                  />
                                </div>
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <div className="space-y-1">
                                  <input type="month" className="w-full text-center bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs" 
                                    defaultValue={exp.startDate.substring(0,7)} 
                                    onBlur={e => { const val = e.target.value ? e.target.value + '-01' : ''; if (val !== exp.startDate) handleExpUpdate(exp.id, exp, { startDate: val }) }} />
                                  <input type="month" className="w-full text-center bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs" 
                                    defaultValue={exp.endDate?.substring(0,7) || ''} 
                                    onBlur={e => { const val = e.target.value ? e.target.value + '-01' : null; if (val !== exp.endDate) handleExpUpdate(exp.id, exp, { endDate: val }) }} />
                                </div>
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 align-middle relative group/btn">
                                <textarea
                                  rows={2}
                                  placeholder="담당 업무"
                                  className="w-[calc(100%-24px)] bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs resize-none transition-all"
                                  defaultValue={exp.description || ''}
                                  onBlur={e => { if (e.target.value !== (exp.description || '')) handleExpUpdate(exp.id, exp, { description: e.target.value }) }}
                                />
                                <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteExpMutation.mutate(exp.id) }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/btn:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity">🗑️</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={4} className="px-3 py-3 text-center text-primary/50 border-b border-r border-border/50">등록된 근무 경력이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => addExpMutation.mutate('COMPANY')}
                    disabled={addExpMutation.isPending}
                    className="mt-2 flex items-center gap-1 text-xs text-secondary font-bold hover:text-secondary/70 disabled:opacity-50 transition-colors"
                  >
                    + 근무 경력 추가
                  </button>
                </div>

                {/* 4. 자격 및 어학 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    자격 및 어학
                  </h3>
                  <div className="border border-border/50 border-r-0 border-b-0 rounded-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-surface text-primary font-bold">
                        <tr>
                          <th className="w-1/2 px-3 py-2 border-b border-r border-border/50 text-center">자격증명 및 점수</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">발급기관</th>
                          <th className="w-1/4 px-3 py-2 border-b border-r border-border/50 text-center">취득일자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certifications.length > 0 ? (
                          certifications.map(exp => (
                            <tr key={exp.id} className="group bg-white hover:bg-surface/50 transition-colors">
                              <td className="w-1/2 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center font-bold text-primary bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.projectName || ''} placeholder="자격증명 및 점수"
                                  onBlur={e => { if (e.target.value !== (exp.projectName || '')) handleExpUpdate(exp.id, exp, { projectName: e.target.value }) }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.companyName || ''} placeholder="발급기관"
                                  onBlur={e => { if (e.target.value !== (exp.companyName || '')) handleExpUpdate(exp.id, exp, { companyName: e.target.value }) }}
                                />
                              </td>
                              <td className="w-1/4 p-1 border-b border-r border-border/50 text-center align-middle relative group/btn">
                                <input
                                  type="month"
                                  className="w-[calc(100%-24px)] text-center text-primary/80 bg-transparent hover:bg-white px-1 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                  defaultValue={exp.startDate.substring(0, 7)}
                                  onBlur={e => { const val = e.target.value ? e.target.value + '-01' : ''; if (val !== exp.startDate) handleExpUpdate(exp.id, exp, { startDate: val }) }}
                                />
                                <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteExpMutation.mutate(exp.id) }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/btn:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity">🗑️</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={3} className="px-3 py-3 text-center text-primary/50 border-b border-r border-border/50">등록된 자격 및 어학 사항이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. 보유 기술 — tech stack 카테고리(DEVELOPER·ARCHITECT·DBA)만 표시 */}
                {hasTechStack && (
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    보유 기술
                  </h3>
                  <div className="border border-border/50 border-r-0 border-b-0 rounded-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <tbody>
                        <tr className="bg-white">
                          <th className="w-32 bg-surface px-3 py-3 text-left text-primary font-bold border-b border-r border-border/50">Language</th>
                          <td className="px-3 py-3 border-b border-r border-border/50">
                            <div className="flex flex-wrap gap-2">
                              {talent.skills.length > 0 ? talent.skills.map(s => (
                                <span key={s} className="px-2 py-1 bg-surface border border-border/60 text-primary font-bold text-xs rounded-md shadow-sm">
                                  {s} (상)
                                </span>
                              )) : <span className="text-primary/40">—</span>}
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-white">
                          <th className="w-32 bg-surface px-3 py-3 text-left text-primary font-bold border-b border-r border-border/50">Framework</th>
                          <td className="px-3 py-3 border-b border-r border-border/50 text-primary/40">—</td>
                        </tr>
                        <tr className="bg-white">
                          <th className="w-32 bg-surface px-3 py-3 text-left text-primary font-bold border-b border-r border-border/50">DB / Server</th>
                          <td className="px-3 py-3 border-b border-r border-border/50 text-primary/40">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

                {/* 6. 프로젝트 수행 이력 */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 text-primary">
                    프로젝트 수행 이력 <span className="text-sm font-normal text-primary/50 ml-2">※ 최근 프로젝트 순으로 기재</span>
                  </h3>
                  <div className="border border-border/50 border-r-0 border-b-0 rounded-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-surface text-primary font-bold">
                        <tr>
                          <th className="w-[25%] px-3 py-2 border-b border-r border-border/50 text-center">프로젝트명 / 고객사</th>
                          <th className="w-[15%] px-3 py-2 border-b border-r border-border/50 text-center">참여기간</th>
                          <th className="w-[15%] px-3 py-2 border-b border-r border-border/50 text-center">수행역할</th>
                          <th className="w-[45%] px-3 py-2 border-b border-r border-border/50 text-center">개발환경 및 담당업무</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectExps.length > 0 ? (
                          projectExps.map(exp => (
                            <tr key={exp.id} className="group bg-white hover:bg-surface/50 transition-colors relative">
                              <td className="w-[25%] p-1 border-b border-r border-border/50 align-top">
                                <div className="space-y-1">
                                  <input
                                    placeholder="프로젝트명"
                                    className="w-full font-bold text-sm text-primary bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                    defaultValue={exp.projectName || ''}
                                    onBlur={e => { if (e.target.value !== (exp.projectName || '')) handleExpUpdate(exp.id, exp, { projectName: e.target.value }) }}
                                  />
                                  <div className="flex items-center px-2">
                                    <span className="text-[11px] text-primary/60 shrink-0">고객사:</span>
                                    <input
                                      placeholder="—"
                                      className="flex-1 ml-1 text-[11px] text-primary/80 bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                      defaultValue={exp.companyName || ''}
                                      onBlur={e => { if (e.target.value !== (exp.companyName || '')) handleExpUpdate(exp.id, exp, { companyName: e.target.value }) }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="w-[15%] p-1 border-b border-r border-border/50 text-center align-middle">
                                <div className="space-y-1">
                                  <input type="month" className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs transition-all" 
                                    defaultValue={exp.startDate.substring(0,7)} 
                                    onBlur={e => { const val = e.target.value ? e.target.value + '-01' : ''; if (val !== exp.startDate) handleExpUpdate(exp.id, exp, { startDate: val }) }} />
                                  <div className="text-primary/40 text-[10px]">~</div>
                                  <input type="month" className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none text-xs transition-all" 
                                    defaultValue={exp.endDate?.substring(0,7) || ''} 
                                    onBlur={e => { const val = e.target.value ? e.target.value + '-01' : null; if (val !== exp.endDate) handleExpUpdate(exp.id, exp, { endDate: val }) }} />
                                </div>
                              </td>
                              <td className="w-[15%] p-1 border-b border-r border-border/50 text-center align-middle">
                                <input
                                  className="w-full text-center text-primary/80 bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none font-medium transition-all"
                                  defaultValue={exp.role || ''} placeholder="역할"
                                  onBlur={e => { if (e.target.value !== (exp.role || '')) handleExpUpdate(exp.id, exp, { role: e.target.value }) }}
                                />
                              </td>
                              <td className="w-[45%] p-1 border-b border-r border-border/50 align-top relative group/btn">
                                <div className="flex flex-col h-full gap-2 p-1 w-[calc(100%-24px)]">
                                  {hasTechStack && (
                                  <div className="flex items-center gap-1 border-b border-border/20 pb-1">
                                    <span className="text-xs font-bold text-primary/60 shrink-0">Skills:</span>
                                    <input
                                      placeholder="기술 스택 (쉼표 구분)"
                                      className="flex-1 text-xs bg-transparent hover:bg-white px-1 py-1 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                      defaultValue={exp.techStack.join(', ')}
                                      onBlur={e => {
                                        const newTech = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                                        if (newTech.join(',') !== exp.techStack.join(',')) handleExpUpdate(exp.id, exp, { techStack: newTech });
                                      }}
                                    />
                                  </div>
                                  )}
                                  <textarea
                                    rows={2}
                                    placeholder="상세 업무 내용을 입력하세요."
                                    className="w-full flex-1 text-xs text-primary/80 bg-transparent hover:bg-white px-2 py-1.5 rounded-sm focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 outline-none resize-none transition-all"
                                    defaultValue={exp.description || ''}
                                    onBlur={e => { if (e.target.value !== (exp.description || '')) handleExpUpdate(exp.id, exp, { description: e.target.value }) }}
                                  />
                                </div>
                                <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteExpMutation.mutate(exp.id) }} className="absolute right-2 top-2 opacity-0 group-hover/btn:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity">🗑️</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={4} className="px-3 py-3 text-center text-primary/50 border-b border-r border-border/50">등록된 프로젝트 수행 이력이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 하단 씽클레어 로고 */}
                <div className="mt-16 flex justify-end items-center">
                  <span className="text-3xl font-black text-[#1A4266] tracking-tighter opacity-90" style={{ fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif" }}>주식회사 씽클레어</span>
                </div>
              </section>

              {/* 평가 및 참고 사항 */}
              <section className="bg-white rounded-xl border border-border/50 p-6 shadow-sm">
                <h2 className="text-base font-bold text-primary mb-3 flex items-center gap-2 border-l-4 border-secondary pl-3">
                  평가 및 참고 사항
                </h2>
                {editingField === 'notes' ? (
                  <textarea autoFocus
                    rows={4}
                    className="w-full border border-blue-400 ring-1 ring-blue-400 rounded-xl px-4 py-3 text-sm text-primary/80 bg-blue-50 focus:outline-none resize-none"
                    value={form.notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    onBlur={() => { setHasChanges(true); setEditingField(null) }}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingField(null) }}
                  />
                ) : (
                  <div onDoubleClick={() => setEditingField('notes')}
                    className="group relative min-h-[80px] rounded-xl border border-border/50 bg-surface/30 px-4 py-3 cursor-default select-none hover:bg-surface/60 transition-colors">
                    <p className="text-sm text-primary/80 whitespace-pre-wrap">{form.notes || <span className="text-primary/30">전문가에 대한 평가, 특이사항, 참고 메모를 입력하세요.</span>}</p>
                    <span className="absolute top-2 right-3 text-[10px] text-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">✎ 더블클릭하여 편집</span>
                  </div>
                )}
              </section>

              {/* 평가 / 리뷰 */}
              <section className="bg-white rounded-xl border border-border/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-primary flex items-center gap-2 border-l-4 border-amber-400 pl-3">
                    평가 / 리뷰
                    {avgScore != null && (
                      <span className="ml-2 text-amber-600 font-black text-sm">
                        ★ {avgScore.toFixed(1)}
                        <span className="text-primary/30 font-normal text-xs ml-1">({reviewHistory?.length}건)</span>
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-1 bg-surface rounded-xl p-1">
                    {(['write', 'history'] as const).map(t => (
                      <button key={t} onClick={() => setReviewTab(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${reviewTab === t ? 'bg-white shadow text-primary' : 'text-primary/40 hover:text-primary'}`}>
                        {t === 'write' ? '✍️ 평가 작성' : '📋 이력'}
                      </button>
                    ))}
                  </div>
                </div>

                {reviewTab === 'history' ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {!reviewHistory?.length
                      ? <p className="text-xs text-primary/30 text-center py-6">평가 이력이 없습니다.</p>
                      : reviewHistory.map(h => (
                        <div key={h.id} className="bg-surface/50 rounded-2xl p-4 border border-border/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-4">
                              {[{ label: '협업', val: h.collaborationScore }, { label: '기술', val: h.technicalScore }, { label: '신뢰', val: h.reliabilityScore }].map(({ label, val }) => (
                                <div key={label} className="text-center">
                                  <p className="text-[9px] font-bold text-primary/30 uppercase mb-0.5">{label}</p>
                                  <p className="text-sm font-black text-primary">{val}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="text-right">
                                <p className="text-lg font-black text-amber-600">{h.avgScore.toFixed(1)}</p>
                                <p className="text-[10px] text-primary/30">{h.createdAt}</p>
                                {h.reviewerName && <p className="text-[10px] text-primary/40 mt-0.5">{h.reviewerName}</p>}
                              </div>
                              <button
                                onClick={() => { if (window.confirm('이 평가를 삭제하시겠습니까?')) deleteReviewMutation.mutate(h.id) }}
                                disabled={deleteReviewMutation.isPending}
                                className="text-primary/20 hover:text-red-400 transition-colors text-base leading-none mt-1" title="삭제">
                                ✕
                              </button>
                            </div>
                          </div>
                          {h.comment && <p className="text-xs text-primary/60 border-t border-border/20 pt-2 mt-1 leading-relaxed">{h.comment}</p>}
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: '협업 능력', sub: '소통·팀워크', val: rCollab,   set: setRCollab   },
                      { label: '기술 역량', sub: '전문성·문제해결', val: rTech,     set: setRTech     },
                      { label: '신뢰도',   sub: '일정준수·책임감', val: rReliable, set: setRReliable },
                    ].map(({ label, sub, val, set }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-primary">{label}</span>
                          <span className="text-xs text-primary/40 ml-2">{sub}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StarInput value={val} onChange={set} />
                          <span className="text-xs font-black text-primary/30 w-5 text-right">{val > 0 ? `${val}점` : '—'}</span>
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={rComment} onChange={e => setRComment(e.target.value)}
                      placeholder="코멘트 (선택)"
                      rows={2}
                      className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-secondary transition-all"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => submitReviewMutation.mutate()}
                        disabled={rCollab === 0 || rTech === 0 || rReliable === 0 || submitReviewMutation.isPending}
                        className="px-6 py-2 bg-amber-500 text-white text-sm font-black rounded-xl shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100">
                        {submitReviewMutation.isPending ? '등록 중...' : '평가 등록'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 업로드 파일 */}
              <section className="bg-white rounded-xl border border-border/50 px-5 py-3.5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">📎</span>
                  <span className="text-sm font-semibold text-primary/70">업로드 파일</span>
                </div>
                {talent.resumeUrl
                  ? <a href={talent.resumeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-secondary/50 hover:text-secondary transition-all text-xs font-semibold text-primary/60 shrink-0">
                      <span>⬇︎</span>
                      <span>다운로드</span>
                    </a>
                  : <>
                      <input ref={resumeUploadRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                        onChange={async e => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ''; await uploadResumeOnly(f) }} />
                      <button onClick={() => resumeUploadRef.current?.click()} disabled={uploadingResume}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-dashed border-secondary/40 hover:border-secondary hover:text-secondary transition-all text-xs font-semibold text-primary/50 shrink-0 disabled:opacity-50">
                        {uploadingResume ? '업로드 중...' : '📤 파일 업로드'}
                      </button>
                    </>
                }
              </section>

              {/* 신규 경력 등록하기 (모달 하단 분리) */}
              <section className="bg-white rounded-xl border border-border/50 p-6 text-center shadow-sm">
                <h2 className="text-base font-bold text-primary mb-1.5">신규 경력 추가</h2>
                <p className="text-xs text-primary/60 mb-5">AI를 이용해 자동 등록하거나, 수동으로 새 경력을 추가하세요.</p>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setMode('edit')} className="p-3 rounded-lg border border-border hover:border-secondary/50 bg-surface/30 hover:bg-surface/80 transition-all flex flex-col items-center gap-2 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
                    <span className="text-[11px] font-bold text-primary">AI 추출 (이력서 업로드)</span>
                  </button>
                  <button onClick={() => { setExpFormType('COMPANY'); setEditingExp(null); setExpFormOpen(true) }} className="p-3 rounded-lg border border-border hover:border-secondary/50 bg-white hover:bg-surface/50 transition-all flex flex-col items-center gap-2 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                    <span className="text-[11px] font-bold text-primary">근무 회사 등록</span>
                  </button>
                  <button onClick={() => { setExpFormType('PROJECT'); setEditingExp(null); setExpFormOpen(true) }} className="p-3 rounded-lg border border-border hover:border-secondary/50 bg-white hover:bg-surface/50 transition-all flex flex-col items-center gap-2 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
                    <span className="text-[11px] font-bold text-primary">참여 프로젝트 등록</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              EDIT 모드
          ══════════════════════════════════════════════ */}
          {mode === 'edit' && (
            <div className="p-8 space-y-4">
              {/* 이력서 AI 분석 */}
              <div
                onClick={() => !analyzing && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); if (!analyzing) setDragging(true) }}
                onDragLeave={e => { e.preventDefault(); setDragging(false) }}
                onDrop={async e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f && !analyzing) await processFile(f) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer
                  ${analyzing ? 'border-secondary/40 bg-secondary/5 cursor-not-allowed' : dragging ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/60 hover:bg-secondary/5'}`}
              >
                <span className="text-xl">{analyzing ? '⏳' : uploadedFileName ? '✅' : '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {analyzing ? `AI 분석 중... (${uploadedFileName})` : uploadedFileName ? uploadedFileName : '이력서 업로드로 자동 입력'}
                  </p>
                  <p className="text-xs text-primary/40 mt-0.5">
                    {uploadedFileName && !analyzing ? '분석 완료 · 다른 파일을 올려 재분석' : 'PDF · DOCX · TXT · 드래그 앤 드롭 가능'}
                  </p>
                </div>
                {!analyzing && <span className="text-xs font-semibold text-secondary shrink-0">{uploadedFileName ? '재선택' : '파일 선택'}</span>}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                onChange={async e => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ''; await processFile(f) }} />

              {talent.resumeUrl && (
                <a href={talent.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-white hover:border-secondary/50 transition-all text-sm text-primary/70 hover:text-secondary w-fit">
                  <span>📎</span>
                  <span className="font-medium">저장된 이력서 다운로드</span>
                </a>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* 프로필 사진 미리보기 */}
                <div className="w-32 h-40 bg-surface border border-border/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                  {(tempPhotoUrl || talent.photoUrl)
                    ? <img src={tempPhotoUrl || talent.photoUrl || ''} alt={form.name} className="w-full h-full object-cover" />
                    : <span className="text-5xl text-primary/20">👤</span>
                  }
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-primary/70 block mb-1">이름 *</label>
                      <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setHasChanges(true) }}
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="홍길동" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-primary/70 block mb-1">이메일</label>
                      <input type="email" value={form.email ?? ''} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setHasChanges(true) }}
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="user@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-primary/70 block mb-1">연락처</label>
                      <input value={formatPhone(form.phone)} onChange={e => { setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') })); setHasChanges(true) }}
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="01000000000" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-primary/70 block mb-1">생년월일</label>
                      <input type="date" value={form.birthDate ?? ''} onChange={e => { setForm(f => ({ ...f, birthDate: e.target.value })); setHasChanges(true) }}
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">주소</label>
                  <input value={form.address ?? ''} onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setHasChanges(true) }}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="서울특별시 강남구..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">기술등급 <span className="text-xs font-normal text-primary/40">(자동산정)</span></label>
                  <div className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 text-sm text-primary/50 min-h-[42px] flex items-center">
                    {form.skillGrade || '자격증·경력 입력 시 자동 산정됩니다'}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-primary/70 block mb-1">역할</label>
                <select value={form.projectRole ?? ''} onChange={e => { setForm(f => ({ ...f, projectRole: e.target.value })); setHasChanges(true) }}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                  <option value="">선택 안 함</option>
                  {projectRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-primary/70 block mb-1">산업군 경험</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border rounded-xl min-h-[46px]">
                  {INDUSTRY_OPTIONS.map(opt => {
                    const selected = (form.industryExperience || '').split(',').map(s => s.trim()).filter(Boolean)
                    const active = selected.includes(opt)
                    return (
                      <button key={opt} type="button"
                        onClick={() => {
                          const next = active ? selected.filter(s => s !== opt) : [...selected, opt]
                          setForm(f => ({ ...f, industryExperience: next.join(',') }))
                          setHasChanges(true)
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-secondary text-white border-secondary' : 'border-border text-primary/50 hover:border-secondary/50 hover:text-secondary'}`}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">분류</label>
                  <select value={form.category ?? ''} onChange={e => { setForm(f => ({ ...f, category: (e.target.value as TalentCategory) || undefined, field: undefined })); setHasChanges(true) }}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <option value="">선택 안 함</option>
                    {(Object.keys(TALENT_CATEGORY_LABELS) as TalentCategory[]).map(c => (
                      <option key={c} value={c}>{TALENT_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">분야</label>
                  <select value={form.field ?? ''} onChange={e => { setForm(f => ({ ...f, field: (e.target.value as TalentField) || undefined })); setHasChanges(true) }}
                    disabled={!form.category}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 disabled:opacity-50">
                    <option value="">선택 안 함</option>
                    {availableFields.map(f => <option key={f} value={f}>{TALENT_FIELD_LABELS[f]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">추천 소스</label>
                  <select value={form.referralSource ?? ''} onChange={e => { setForm(f => ({ ...f, referralSource: e.target.value })); setHasChanges(true) }}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <option value="">선택 안 함</option>
                    {referralSources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">근무 형태</label>
                  <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value as WorkType }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <option value="ONSITE">상주</option><option value="REMOTE">원격</option><option value="HYBRID">혼합</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">희망 단가 (원/월)</label>
                  <input type="number" value={form.desiredRate ?? ''}
                    onChange={e => setForm(f => ({ ...f, desiredRate: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="5000000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-primary/70 block mb-1">기술 스택</label>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), (() => {
                      const t = skillInput.trim()
                      if (t && !(form.skills ?? []).includes(t)) setForm(f => ({ ...f, skills: [...(f.skills ?? []), t] }))
                      setSkillInput('')
                    })())}
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    placeholder="기술명 입력 후 Enter" />
                  <button type="button" onClick={() => { const t = skillInput.trim(); if (t && !(form.skills ?? []).includes(t)) setForm(f => ({ ...f, skills: [...(f.skills ?? []), t] })); setSkillInput('') }}
                    className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-primary/70 hover:bg-border/30">추가</button>
                </div>
                {(form.skills ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(form.skills ?? []).map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                        {s}
                        <button onClick={() => setForm(f => ({ ...f, skills: (f.skills ?? []).filter(x => x !== s) }))} className="hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-primary/70 block mb-1">평가 및 참고 사항</label>
                <textarea
                  rows={4}
                  value={form.notes ?? ''}
                  onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setHasChanges(true) }}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none"
                  placeholder="전문가에 대한 평가, 특이사항, 참고 메모를 입력하세요."
                />
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-8 py-5 border-t border-border/50 bg-gray-50 rounded-b-3xl flex justify-between shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border font-bold text-primary/70 hover:bg-white text-sm">닫기</button>
          {mode === 'edit' && (
            <div className="flex gap-3">
              <button onClick={() => setMode('view')} className="px-6 py-2.5 rounded-xl border border-border font-bold text-primary/70 hover:bg-white text-sm">취소</button>
              <button onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending || analyzing || !form.name.trim()}
                className="px-8 py-2.5 rounded-xl bg-secondary text-white font-bold text-sm hover:bg-secondary/90 disabled:opacity-50">
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      </div>

      {expFormOpen && (
        <ExperienceFormModal
          talentId={talent.id}
          initial={editingExp}
          defaultType={expFormType}
          showTechStack={hasTechStack}
          onClose={() => { setExpFormOpen(false); setEditingExp(null) }}
        />
      )}
    </div>
  )
}

// ── AI 종합 분석 패널 ─────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  HIGH:   'text-red-600 bg-red-50 border-red-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW:    'text-emerald-600 bg-emerald-50 border-emerald-200',
}
const LEVEL_LABEL: Record<string, string> = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' }
const BREADTH_LABEL: Record<string, string> = { WIDE: '넓음', MEDIUM: '보통', NARROW: '좁음' }
const DEPTH_LABEL:   Record<string, string> = { DEEP: '깊음', MEDIUM: '보통', SHALLOW: '얕음' }
const RISK_TYPE_LABEL: Record<string, string> = {
  SHORT_PROJECT: '단기 프로젝트',
  GAP:           '경력 공백',
  INCONSISTENCY: '이력 불일치',
  TECH_MISMATCH: '기술 불일치',
}

function LevelBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${LEVEL_COLOR[value] ?? 'text-primary/50 bg-surface border-border/50'}`}>
      {LEVEL_LABEL[value] ?? value}
    </span>
  )
}

function InsightSection({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-border/40 rounded-2xl p-5 shadow-sm">
      <h4 className="text-[13px] font-bold text-primary mb-3 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h4>
      {children}
    </div>
  )
}

function Highlight({ text, kws }: { text: string; kws: string[] }) {
  if (!kws.length || !text) return <>{text}</>
  const pattern = new RegExp(`(${kws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((p, i) =>
        kws.some(k => k.toLowerCase() === p.toLowerCase())
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm not-italic">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

function InsightPanel({
  insight, keywords: usedKeywords, loading, onAnalyze,
}: {
  insight: TalentInsightResponse | null
  keywords: string
  loading: boolean
  onAnalyze: (keywords: string) => void
}) {
  const [keywords, setKeywords] = useState('')

  const kws = usedKeywords
    ? usedKeywords.split(/[\s,，]+/).map(k => k.trim()).filter(k => k.length >= 2)
    : []

  const handleSubmit = () => { onAnalyze(keywords) }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold flex items-center gap-2 border-l-4 border-violet-400 pl-3 text-primary">
          AI 전문가 분석
          {kws.length > 0 && (
            <span className="flex gap-1 flex-wrap">
              {kws.map((k, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700 text-[10px] font-semibold">{k}</span>
              ))}
            </span>
          )}
        </h3>
      </div>

      <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold text-violet-700">집중 분석 키워드 <span className="font-normal text-violet-400">(선택)</span></p>
            <p className="text-[11px] text-violet-400">특정 기술, 도메인, 강점·우려 사항 등을 입력하면 해당 부분을 중점 분석합니다.</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            {loading ? '⏳ 분석 중...' : '✨ 분석'}
          </button>
        </div>
        <textarea
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="예: Oracle DBA 금융권 성능 최적화, 단기 이직 우려"
          rows={2}
          className="w-full text-xs px-3 py-2 rounded-xl border border-violet-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 text-primary placeholder:text-primary/25"
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
        />
      </div>

      {!insight && !loading && (
        <div className="bg-surface border border-dashed border-border/50 rounded-2xl p-8 text-center text-primary/30 text-sm">
          분석 버튼을 눌러 전문가 인사이트를 확인하세요.
        </div>
      )}

      {loading && (
        <div className="bg-surface border border-dashed border-violet-200 rounded-2xl p-8 text-center text-violet-400 text-sm animate-pulse">
          AI가 경력·기술·도메인을 분석하고 있습니다...
        </div>
      )}

      {insight && !loading && (
        <div className="space-y-4">

          {/* 종합 요약 */}
          {insight.summary && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
              <p className="text-[13px] text-violet-900 leading-relaxed"><Highlight text={insight.summary} kws={kws} /></p>
            </div>
          )}

          {/* 리스크 플래그 — 있을 때만 표시 */}
          {(insight.riskFlags?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2">
              {insight.riskFlags.map((f, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-[12px] ${LEVEL_COLOR[f.severity] ?? ''}`}>
                  <span className="font-bold shrink-0">[{RISK_TYPE_LABEL[f.type] ?? f.type}]</span>
                  <span><Highlight text={f.description} kws={kws} /></span>
                  <LevelBadge value={f.severity} />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 커리어 패턴 */}
            {insight.careerPattern && (
              <InsightSection title="커리어 패턴" icon="📊">
                <div className="space-y-2 text-[12px] text-primary/70">
                  <div className="flex items-center justify-between">
                    <span>직무 일관성</span>
                    <LevelBadge value={insight.careerPattern.consistency} />
                  </div>
                  {insight.careerPattern.consistencyReason && (
                    <p className="text-primary/50"><Highlight text={insight.careerPattern.consistencyReason} kws={kws} /></p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span>근속성</span>
                    <LevelBadge value={insight.careerPattern.persistenceLevel} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>평균 프로젝트 기간</span>
                    <span className="font-semibold text-primary">{fmtDuration(insight.careerPattern.avgProjectMonths ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>단기 프로젝트</span>
                    <span className={`font-semibold ${(insight.careerPattern.shortProjectCount ?? 0) > 0 ? 'text-amber-500' : 'text-primary'}`}>
                      {insight.careerPattern.shortProjectCount ?? 0}건
                    </span>
                  </div>
                  {(insight.careerPattern.gapPeriods?.length ?? 0) > 0 && (
                    <div className="pt-1 border-t border-border/30">
                      <p className="font-semibold text-primary/60 mb-1">공백 기간</p>
                      {insight.careerPattern.gapPeriods.map((g, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{g.fromDate} ~ {g.toDate} ({g.months}개월)</span>
                          <span className="text-primary/40">{g.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </InsightSection>
            )}

            {/* 기술 프로필 */}
            {insight.technicalProfile && (
              <InsightSection title="기술 프로필" icon="🔧">
                <div className="space-y-2 text-[12px]">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {insight.technicalProfile.skillBreadth && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                        넓이: {BREADTH_LABEL[insight.technicalProfile.skillBreadth]}
                      </span>
                    )}
                    {insight.technicalProfile.skillDepth && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                        깊이: {DEPTH_LABEL[insight.technicalProfile.skillDepth]}
                      </span>
                    )}
                    {insight.technicalProfile.modernSkillRatio != null && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                        모던 기술 {insight.technicalProfile.modernSkillRatio}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {insight.technicalProfile.coreSkills?.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="font-medium text-primary/80 truncate"><Highlight text={s.skill} kws={kws} /></span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-surface text-primary/50">{s.level}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${s.recency === '최근' ? 'bg-emerald-50 text-emerald-600' : s.recency === '오래됨' ? 'bg-red-50 text-red-400' : 'bg-surface text-primary/40'}`}>
                            {s.recency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {insight.technicalProfile.stackTransitionNote && (
                    <p className="text-primary/40 pt-1 border-t border-border/30">
                      <Highlight text={insight.technicalProfile.stackTransitionNote} kws={kws} />
                    </p>
                  )}
                </div>
              </InsightSection>
            )}

            {/* 도메인 프로필 */}
            {insight.domainProfile && (
              <InsightSection title="산업 도메인" icon="🏢">
                <div className="space-y-2 text-[12px]">
                  {insight.domainProfile.primaryDomain && (
                    <p className="font-semibold text-primary">주력: <Highlight text={insight.domainProfile.primaryDomain} kws={kws} /></p>
                  )}
                  <div className="space-y-1.5">
                    {insight.domainProfile.domains?.map((d, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-0.5 text-primary/60">
                          <span><Highlight text={d.name} kws={kws} /></span><span>{d.pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-secondary/60 rounded-full" style={{ width: `${d.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {insight.domainProfile.domainNote && (
                    <p className="text-primary/40 pt-1 border-t border-border/30"><Highlight text={insight.domainProfile.domainNote} kws={kws} /></p>
                  )}
                </div>
              </InsightSection>
            )}

            {insight.roleProfile && (
              <InsightSection title="역할 프로필" icon="🎯">
                <div className="space-y-1.5 text-[12px] text-primary/70">
                  {insight.roleProfile.primaryRole && (
                    <p className="font-semibold text-primary"><Highlight text={insight.roleProfile.primaryRole} kws={kws} /></p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {insight.roleProfile.hasArchitectExperience && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-semibold">설계 경험</span>
                    )}
                    {insight.roleProfile.hasLeadExperience && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">리드 경험</span>
                    )}
                  </div>
                  {insight.roleProfile.roleNote && (
                    <p className="text-primary/40"><Highlight text={insight.roleProfile.roleNote} kws={kws} /></p>
                  )}
                </div>
              </InsightSection>
            )}

          </div>


        </div>
      )}
    </section>
  )
}

// ── 전문가 등록 모달 ──────────────────────────────────────────────────────────

function TalentCreateModal({ onClose, onSave, isPending }: {
  onClose: () => void
  onSave: (req: CreateTalentRequest) => void
  isPending: boolean
}) {
  const addToast = useUiStore(s => s.addToast)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
    staleTime: 60_000,
  })
  const projectRoles = settings?.masterData?.projectRoles ?? []
  const [form, setForm] = useState<CreateTalentRequest>(EMPTY_FORM)
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setAnalyzing(true); setUploadedFileName(file.name)
    try {
      const { data } = await serviceAdminApi.analyzeResume(file)
      setForm(f => ({
        ...f,
        name:        normalizeKoreanName(data.name) ?? f.name,
        nameEn:      data.nameEn ?? f.nameEn,
        phone:       data.phone ? data.phone.replace(/\D/g, '') : f.phone,
        workType:    data.workType    ?? f.workType,
        desiredRate: data.desiredRate ?? f.desiredRate,
        category:    data.category    ?? f.category,
        field:       data.field       ?? f.field,
        skills:      data.skills.length > 0 ? data.skills : f.skills,
        birthDate:   data.birthDate   ?? f.birthDate,
        email:       data.email       ?? f.email,
        address:     data.address     ?? f.address,
        skillGrade:  data.skillGrade  ?? f.skillGrade,
        title:       data.title       ?? f.title,
        educations:     data.educations?.length ? data.educations : f.educations,
        companyExps:    data.companyExps?.length ? data.companyExps : f.companyExps,
        projectExps:    data.projectExps?.length ? data.projectExps : f.projectExps,
        certifications: data.certifications?.length ? data.certifications : f.certifications,
        itCareerMonths: data.itCareerMonths ?? f.itCareerMonths,
        photoKey:       data.photoKey ?? f.photoKey,
        resumeKey:      data.resumeKey ?? f.resumeKey,
      }))
      if (data.photoKey) {
        try {
          const res = await serviceAdminApi.getPhotoUrl(data.photoKey)
          setTempPhotoUrl(res.data.url)
        } catch (e) {
          console.error("Failed to get photo url", e)
        }
      } else {
        setTempPhotoUrl(null)
      }
      if (data.resumeKey) {
        addToast('이력서 분석 완료. 내용을 확인하세요.', 'success')
      } else {
        addToast('이력서 분석 완료. 파일 저장은 등록 후 상세보기에서 다시 업로드해 주세요.', 'warning')
      }
    } catch { addToast('이력서 분석에 실패했습니다.', 'error') }
    finally { setAnalyzing(false) }
  }

  const availableFields: TalentField[] = form.category ? TALENT_FIELDS_BY_CATEGORY[form.category] : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-r-2xl shadow-xl w-full max-w-3xl p-8 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-primary">전문가 등록</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-primary/70 hover:bg-surface">취소</button>
            <button onClick={() => onSave(form)} disabled={isPending || analyzing || !form.name.trim()}
              className="px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 disabled:opacity-50">
              {isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 이력서 AI 분석 */}
        <div
          onClick={() => !analyzing && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!analyzing) setDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setDragging(false) }}
          onDrop={async e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f && !analyzing) await processFile(f) }}
          className={`mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer
            ${analyzing ? 'border-secondary/40 bg-secondary/5 cursor-not-allowed' : dragging ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/60 hover:bg-secondary/5'}`}
        >
          <span className="text-xl">{analyzing ? '⏳' : dragging ? '📥' : uploadedFileName ? '✅' : '📄'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">
              {analyzing ? `AI 분석 중... (${uploadedFileName})` : dragging ? '여기에 놓으세요' : uploadedFileName ? uploadedFileName : '이력서 업로드로 자동 입력'}
            </p>
            <p className="text-xs text-primary/40 mt-0.5">
              {uploadedFileName && !analyzing ? '분석 완료 · 다른 파일을 올려 재분석' : 'PDF · DOCX · TXT · 드래그 앤 드롭 가능'}
            </p>
          </div>
          {!analyzing && !dragging && <span className="text-xs font-semibold text-secondary shrink-0">{uploadedFileName ? '재선택' : '파일 선택'}</span>}
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
          onChange={async e => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ''; await processFile(f) }} />
          
        {uploadedFileName && !analyzing && (
          <div className="mb-5 flex flex-wrap gap-2">
            {(form.educations?.length ?? 0) > 0 && <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">학력 {form.educations?.length}건 추출</span>}
            {(form.companyExps?.length ?? 0) > 0 && <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">근무경력 {form.companyExps?.length}건 추출</span>}
            {(form.projectExps?.length ?? 0) > 0 && <span className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 rounded-full border border-purple-200">프로젝트 {form.projectExps?.length}건 추출</span>}
            {(form.certifications?.length ?? 0) > 0 && <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">자격증 {form.certifications?.length}건 추출</span>}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 프로필 사진 미리보기 */}
            <div className="w-32 h-40 bg-surface border border-border/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
              {tempPhotoUrl
                ? <img src={tempPhotoUrl} alt="프로필 미리보기" className="w-full h-full object-cover" />
                : <span className="text-5xl text-primary/20">👤</span>
              }
            </div>
            {/* 기본 입력 폼들 */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">이름 (한글) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="홍길동" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">이름 (영문)</label>
                  <input value={form.nameEn ?? ''} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="HONG GIL DONG" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">이메일</label>
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary/70 block mb-1">연락처</label>
                  <input value={formatPhone(form.phone)} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="01000000000" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">생년월일</label>
              <input type="date" value={form.birthDate ?? ''} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">주소</label>
              <input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="서울특별시 강남구..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">기술등급 <span className="text-xs font-normal text-primary/40">(자동산정)</span></label>
              <div className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 text-sm text-primary/40 min-h-[42px] flex items-center">
                자격증·경력 입력 후 자동 산정됩니다
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">역할</label>
              <select value={form.projectRole ?? ''} onChange={e => setForm(f => ({ ...f, projectRole: e.target.value }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                <option value="">선택 안 함</option>
                {projectRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">분류</label>
              <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: (e.target.value as TalentCategory) || undefined, field: undefined }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                <option value="">선택 안 함</option>
                {(Object.keys(TALENT_CATEGORY_LABELS) as TalentCategory[]).map(c => (
                  <option key={c} value={c}>{TALENT_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">분야</label>
              <select value={form.field ?? ''} onChange={e => setForm(f => ({ ...f, field: (e.target.value as TalentField) || undefined }))}
                disabled={!form.category}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 disabled:opacity-50">
                <option value="">선택 안 함</option>
                {availableFields.map(f => <option key={f} value={f}>{TALENT_FIELD_LABELS[f]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">근무 형태</label>
              <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value as WorkType }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                <option value="ONSITE">상주</option><option value="REMOTE">원격</option><option value="HYBRID">혼합</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-primary/70 block mb-1">희망 단가 (원/월)</label>
              <input type="number" value={form.desiredRate ?? ''}
                onChange={e => setForm(f => ({ ...f, desiredRate: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="5000000" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-primary/70 block mb-1">기술 스택</label>
            <div className="flex gap-2">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), (() => {
                  const t = skillInput.trim(); if (t && !(form.skills ?? []).includes(t)) setForm(f => ({ ...f, skills: [...(f.skills ?? []), t] })); setSkillInput('')
                })())}
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="기술명 입력 후 Enter" />
              <button type="button" onClick={() => { const t = skillInput.trim(); if (t && !(form.skills ?? []).includes(t)) setForm(f => ({ ...f, skills: [...(f.skills ?? []), t] })); setSkillInput('') }}
                className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-primary/70 hover:bg-border/30">추가</button>
            </div>
            {(form.skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.skills ?? []).map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                    {s}<button onClick={() => setForm(f => ({ ...f, skills: (f.skills ?? []).filter(x => x !== s) }))} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          </div>
          
          <div className="mt-8 space-y-6 border-t border-border/50 pt-6">
            <h3 className="text-sm font-bold text-primary">이력 사항 상세</h3>
            
            {/* 학력 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-primary/70">학력</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, educations: [...(f.educations || []), { companyName: '', projectName: '', role: '', startDate: '', endDate: '', description: '', techStack: [] }] }))} className="text-[11px] text-secondary hover:underline">+ 추가</button>
              </div>
              <div className="space-y-2">
                {(form.educations || []).map((exp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <input className="border px-2 py-1.5 rounded w-1/4" placeholder="학교명" value={exp.companyName || ''} onChange={e => { const arr = [...(form.educations||[])]; arr[i] = {...arr[i], companyName: e.target.value}; setForm(f => ({...f, educations: arr})) }} />
                    <input className="border px-2 py-1.5 rounded w-1/4" placeholder="전공" value={exp.projectName || ''} onChange={e => { const arr = [...(form.educations||[])]; arr[i] = {...arr[i], projectName: e.target.value}; setForm(f => ({...f, educations: arr})) }} />
                    <input className="border px-2 py-1.5 rounded w-1/5" type="date" value={exp.startDate || ''} onChange={e => { const arr = [...(form.educations||[])]; arr[i] = {...arr[i], startDate: e.target.value}; setForm(f => ({...f, educations: arr})) }} />
                    <span className="text-gray-400">~</span>
                    <input className="border px-2 py-1.5 rounded w-1/5" type="date" value={exp.endDate || ''} onChange={e => { const arr = [...(form.educations||[])]; arr[i] = {...arr[i], endDate: e.target.value}; setForm(f => ({...f, educations: arr})) }} />
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => { const arr = [...(form.educations||[])]; arr.splice(i, 1); setForm(f => ({...f, educations: arr})) }}>삭제</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 근무경력 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-primary/70">근무경력</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, companyExps: [...(f.companyExps || []), { companyName: '', projectName: '', role: '', startDate: '', endDate: '', description: '', techStack: [] }] }))} className="text-[11px] text-secondary hover:underline">+ 추가</button>
              </div>
              <div className="space-y-2">
                {(form.companyExps || []).map((exp, i) => (
                  <div key={i} className="flex flex-col gap-1 mb-2 pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2 text-xs">
                      <input className="border px-2 py-1.5 rounded w-1/4" placeholder="직장명" value={exp.companyName || ''} onChange={e => { const arr = [...(form.companyExps||[])]; arr[i] = {...arr[i], companyName: e.target.value}; setForm(f => ({...f, companyExps: arr})) }} />
                      <input className="border px-2 py-1.5 rounded w-1/4" placeholder="부서/직위" value={exp.role || ''} onChange={e => { const arr = [...(form.companyExps||[])]; arr[i] = {...arr[i], role: e.target.value}; setForm(f => ({...f, companyExps: arr})) }} />
                      <input className="border px-2 py-1.5 rounded flex-1" type="date" value={exp.startDate || ''} onChange={e => { const arr = [...(form.companyExps||[])]; arr[i] = {...arr[i], startDate: e.target.value}; setForm(f => ({...f, companyExps: arr})) }} />
                      <span className="text-gray-400">~</span>
                      <input className="border px-2 py-1.5 rounded flex-1" type="date" value={exp.endDate || ''} onChange={e => { const arr = [...(form.companyExps||[])]; arr[i] = {...arr[i], endDate: e.target.value}; setForm(f => ({...f, companyExps: arr})) }} />
                      <button type="button" className="text-red-500 hover:text-red-700 font-bold px-1" onClick={() => { const arr = [...(form.companyExps||[])]; arr.splice(i, 1); setForm(f => ({...f, companyExps: arr})) }}>&times;</button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <input className="border px-2 py-1.5 rounded flex-1" placeholder="사용 기술 스택 (예: Java, Spring, MySQL)" value={(exp.techStack||[]).join(', ')} onChange={e => { const arr = [...(form.companyExps||[])]; arr[i] = {...arr[i], techStack: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; setForm(f => ({...f, companyExps: arr})) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 자격증 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-primary/70">자격증</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, certifications: [...(f.certifications || []), { companyName: '', projectName: '', role: '', startDate: '', endDate: '', description: '', techStack: [] }] }))} className="text-[11px] text-secondary hover:underline">+ 추가</button>
              </div>
              <div className="space-y-2">
                {(form.certifications || []).map((exp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <input className="border px-2 py-1.5 rounded w-1/3" placeholder="자격증명" value={exp.projectName || ''} onChange={e => { const arr = [...(form.certifications||[])]; arr[i] = {...arr[i], projectName: e.target.value}; setForm(f => ({...f, certifications: arr})) }} />
                    <input className="border px-2 py-1.5 rounded w-1/3" placeholder="발급기관" value={exp.companyName || ''} onChange={e => { const arr = [...(form.certifications||[])]; arr[i] = {...arr[i], companyName: e.target.value}; setForm(f => ({...f, certifications: arr})) }} />
                    <input className="border px-2 py-1.5 rounded w-1/4" type="date" value={exp.startDate || ''} onChange={e => { const arr = [...(form.certifications||[])]; arr[i] = {...arr[i], startDate: e.target.value}; setForm(f => ({...f, certifications: arr})) }} />
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => { const arr = [...(form.certifications||[])]; arr.splice(i, 1); setForm(f => ({...f, certifications: arr})) }}>삭제</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 프로젝트 수행 이력 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-primary/70">프로젝트 수행 이력</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, projectExps: [...(f.projectExps || []), { companyName: '', projectName: '', role: '', startDate: '', endDate: '', description: '', techStack: [] }] }))} className="text-[11px] text-secondary hover:underline">+ 추가</button>
              </div>
              <div className="space-y-2">
                {(form.projectExps || []).map((exp, i) => (
                  <div key={i} className="flex flex-col gap-1 mb-2 pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2 text-xs">
                      <input className="border px-2 py-1.5 rounded w-1/4" placeholder="프로젝트명" value={exp.projectName || ''} onChange={e => { const arr = [...(form.projectExps||[])]; arr[i] = {...arr[i], projectName: e.target.value}; setForm(f => ({...f, projectExps: arr})) }} />
                      <input className="border px-2 py-1.5 rounded w-1/4" placeholder="고객사" value={exp.companyName || ''} onChange={e => { const arr = [...(form.projectExps||[])]; arr[i] = {...arr[i], companyName: e.target.value}; setForm(f => ({...f, projectExps: arr})) }} />
                      <input className="border px-2 py-1.5 rounded flex-1" type="date" value={exp.startDate || ''} onChange={e => { const arr = [...(form.projectExps||[])]; arr[i] = {...arr[i], startDate: e.target.value}; setForm(f => ({...f, projectExps: arr})) }} />
                      <span className="text-gray-400">~</span>
                      <input className="border px-2 py-1.5 rounded flex-1" type="date" value={exp.endDate || ''} onChange={e => { const arr = [...(form.projectExps||[])]; arr[i] = {...arr[i], endDate: e.target.value}; setForm(f => ({...f, projectExps: arr})) }} />
                      <button type="button" className="text-red-500 hover:text-red-700 font-bold px-1" onClick={() => { const arr = [...(form.projectExps||[])]; arr.splice(i, 1); setForm(f => ({...f, projectExps: arr})) }}>&times;</button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <input className="border px-2 py-1.5 rounded flex-1" placeholder="사용 기술 스택 (예: React, TypeScript)" value={(exp.techStack||[]).join(', ')} onChange={e => { const arr = [...(form.projectExps||[])]; arr[i] = {...arr[i], techStack: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; setForm(f => ({...f, projectExps: arr})) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

      </div>
    </div>
  )
}

// ── 프로젝트 배정 모달 ──────────────────────────────────────────────────────

function ProjectAssignModal({ talent, onClose }: { talent: TalentAdmin; onClose: () => void }) {
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [role, setRole] = useState('')

  const { data: projectsPage } = useQuery({
    queryKey: ['service-admin', 'projects', 'open'],
    queryFn: () => serviceAdminApi.listProjects({ status: 'OPEN', size: 100 }).then(r => r.data),
  })
  const projects = projectsPage?.content ?? []

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
    staleTime: 60_000,
  })
  const roleOptions = settingsData?.masterData?.projectRoles ?? []

  const { mutate, isPending } = useMutation({
    mutationFn: () => serviceAdminApi.assignMember(selectedProjectId, talent.id, role || undefined),
    onSuccess: () => {
      addToast(`${displayName(talent.name)}을(를) 프로젝트에 배정했습니다.`, 'success')
      qc.invalidateQueries({ queryKey: ['service-admin', 'projects'] })
      onClose()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => addToast(err?.response?.data?.message ?? '할당에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <h3 className="text-lg font-black mb-1">프로젝트 배정</h3>
        <p className="text-xs text-primary/40 mb-6">{talent.name} · {talent.category ?? '-'}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1.5">프로젝트 선택 *</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all">
              <option value="">모집 중인 프로젝트 선택</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}{p.clientCompany ? ` (${p.clientCompany})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-1.5">역할 (선택)</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all">
              <option value="">역할 선택</option>
              {roleOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border/50 text-sm font-bold text-primary/60 hover:bg-surface transition-all">취소</button>
          <button
            onClick={() => mutate()}
            disabled={!selectedProjectId || isPending}
            className="flex-1 py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-secondary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {isPending ? '할당 중...' : '할당'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 가용상태 변경 모달 ────────────────────────────────────────────────────────

function AvailabilityModal({
  talent, onClose, onSaved,
}: { talent: TalentAdmin; onClose: () => void; onSaved: () => void }) {
  const addToast = useUiStore(s => s.addToast)
  const qc = useQueryClient()
  const [status, setStatus] = useState<AvailabilityStatus>(talent.availabilityStatus)
  const [availableFrom, setAvailableFrom] = useState('')

  const mutation = useMutation({
    mutationFn: () => serviceAdminApi.updateAvailability(talent.id, status, availableFrom || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      addToast('가용 상태가 변경되었습니다.', 'success')
      onSaved()
      onClose()
    },
    onError: () => addToast('상태 변경에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-80 p-6">
        <h3 className="font-bold text-primary text-base mb-1">가용 상태 변경</h3>
        <p className="text-sm text-primary/50 mb-4">{displayName(talent.name, talent.nameEn)}</p>
        <div className="space-y-2 mb-5">
          {(['AVAILABLE', 'BUSY', 'REST'] as AvailabilityStatus[]).map(s => (
            <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${status === s ? 'border-secondary bg-secondary/5' : 'border-border hover:bg-surface'}`}>
              <input type="radio" name="avail-status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-secondary" />
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AVAILABILITY_COLORS[s]}`}>{AVAILABILITY_LABELS[s]}</span>
            </label>
          ))}
        </div>
        {status === 'BUSY' && (
          <div className="mb-5">
            <label className="text-xs font-semibold text-primary/60 block mb-1">투입 가능 예정일 (선택)</label>
            <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface">취소</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 disabled:opacity-50">
            {mutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 평가/리뷰 모달 ────────────────────────────────────────────────────────────

function EvaluationModal({
  talent, onClose,
}: { talent: TalentAdmin; onClose: () => void }) {
  const addToast = useUiStore(s => s.addToast)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'write' | 'history'>('write')
  const [rCollab,   setRCollab]   = useState(0)
  const [rTech,     setRTech]     = useState(0)
  const [rReliable, setRReliable] = useState(0)
  const [rComment,  setRComment]  = useState('')

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['eval-modal-history', talent.id],
    queryFn: () => serviceAdminApi.getTalentReviewHistory(talent.id).then(r => r.data),
  })

  const submitMutation = useMutation({
    mutationFn: () => serviceAdminApi.submitTalentReview(talent.id, {
      collaborationScore: rCollab, technicalScore: rTech, reliabilityScore: rReliable,
      comment: rComment || undefined,
    }),
    onSuccess: () => {
      setRCollab(0); setRTech(0); setRReliable(0); setRComment('')
      refetchHistory()
      qc.invalidateQueries({ queryKey: ['talent-review-history', talent.id] })
      qc.invalidateQueries({ queryKey: ['talent-eval-list'] })
      qc.invalidateQueries({ queryKey: ['talent-eval-stats'] })
      addToast('평가가 등록되었습니다.', 'success')
      setTab('history')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast(msg ?? '평가 등록에 실패했습니다.', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => serviceAdminApi.deleteReview(talent.id, reviewId),
    onSuccess: () => {
      refetchHistory()
      qc.invalidateQueries({ queryKey: ['talent-review-history', talent.id] })
      qc.invalidateQueries({ queryKey: ['talent-eval-list'] })
      qc.invalidateQueries({ queryKey: ['talent-eval-stats'] })
      addToast('평가가 삭제되었습니다.', 'success')
    },
    onError: () => addToast('삭제에 실패했습니다.', 'error'),
  })

  const categoryLabel = talent.category ? TALENT_CATEGORY_LABELS[talent.category] : null
  const fieldLabel    = talent.field    ? TALENT_FIELD_LABELS[talent.field]        : null
  const subLabel      = [categoryLabel, fieldLabel].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-6 pt-5 pb-4 border-b border-border/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-primary/30 uppercase tracking-widest mb-0.5">평가 / 리뷰</p>
              <h3 className="text-xl font-black text-primary">{displayName(talent.name, talent.nameEn)}</h3>
              {subLabel && <p className="text-xs text-primary/50 mt-0.5">{subLabel}</p>}
            </div>
            <button onClick={onClose} className="text-primary/30 hover:text-primary text-2xl leading-none mt-0.5">×</button>
          </div>
          <div className="flex gap-1 bg-surface rounded-xl p-1 mt-4">
            {(['write', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-white shadow text-primary' : 'text-primary/40 hover:text-primary'}`}>
                {t === 'write' ? '✍️ 평가 작성' : `📋 평가 이력${history?.length ? ` (${history.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'history' ? (
            <div className="space-y-3">
              {!history?.length
                ? <p className="text-sm text-primary/30 text-center py-10">평가 이력이 없습니다.</p>
                : history.map(h => (
                  <div key={h.id} className="bg-surface/60 rounded-2xl p-4 border border-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-4">
                        {[{ label: '협업', val: h.collaborationScore }, { label: '기술', val: h.technicalScore }, { label: '신뢰', val: h.reliabilityScore }].map(({ label, val }) => (
                          <div key={label} className="text-center">
                            <p className="text-[9px] font-bold text-primary/30 uppercase mb-0.5">{label}</p>
                            <p className="text-sm font-black text-primary">{val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="text-right">
                          <p className="text-lg font-black text-amber-600">{h.avgScore.toFixed(1)}</p>
                          <p className="text-[10px] text-primary/30">{h.createdAt}</p>
                          {h.reviewerName && (
                            <p className="text-[10px] text-primary/40 mt-0.5">{h.reviewerName}</p>
                          )}
                        </div>
                        <button
                          onClick={() => { if (window.confirm('이 평가를 삭제하시겠습니까?')) deleteMutation.mutate(h.id) }}
                          disabled={deleteMutation.isPending}
                          className="text-primary/20 hover:text-red-400 transition-colors text-lg leading-none mt-0.5" title="삭제">
                          ✕
                        </button>
                      </div>
                    </div>
                    {h.comment && <p className="text-xs text-primary/60 border-t border-border/20 pt-2 mt-1 leading-relaxed">{h.comment}</p>}
                  </div>
                ))
              }
            </div>
          ) : (
            <div className="space-y-5">
              {[
                { label: '협업 능력', sub: '소통·팀워크·협조 자세',   val: rCollab,   set: setRCollab   },
                { label: '기술 역량', sub: '전문 지식·문제 해결력',   val: rTech,     set: setRTech     },
                { label: '신뢰도',   sub: '일정 준수·책임감',        val: rReliable, set: setRReliable },
              ].map(({ label, sub, val, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-primary">{label}</span>
                    <span className="text-xs text-primary/40 ml-2">{sub}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StarInput value={val} onChange={set} />
                    <span className="text-xs font-black text-primary/30 w-5 text-right">{val > 0 ? `${val}점` : '—'}</span>
                  </div>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-primary/50 block mb-1.5">평가 코멘트 (선택)</label>
                <textarea value={rComment} onChange={e => setRComment(e.target.value)} rows={3}
                  className="w-full bg-surface/60 border border-border/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-secondary transition-all"
                  placeholder="해당 전문가에 대한 종합 의견을 자유롭게 작성하세요..." />
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        {tab === 'write' && (
          <div className="px-6 py-4 border-t border-border/20 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface transition-colors">
              취소
            </button>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={rCollab === 0 || rTech === 0 || rReliable === 0 || submitMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-secondary/90 disabled:opacity-40 transition-all">
              {submitMutation.isPending ? '등록 중...' : '평가 등록'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export function TalentCareerPage() {
  const qc = useQueryClient()
  const showToast = useUiStore(s => s.addToast)

  // 검색
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(0)

  // 정렬
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'availabilityStatus' | 'desiredRate' | 'createdAt'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 모달
  const [showCreate, setShowCreate] = useState(false)
  const [detailTarget, setDetailTarget] = useState<TalentAdmin | null>(null)
  const [availabilityTarget, setAvailabilityTarget] = useState<TalentAdmin | null>(null)
  const [evaluationTarget, setEvaluationTarget] = useState<TalentAdmin | null>(null)
  const [assignTarget, setAssignTarget] = useState<TalentAdmin | null>(null)

  // 그리드 인라인 편집
  const [inlineAvailId, setInlineAvailId] = useState<string | null>(null)
  const [inlineRateId, setInlineRateId] = useState<string | null>(null)
  const [inlineRateVal, setInlineRateVal] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAllSettings().then(r => r.data),
    staleTime: 60_000,
  })
  const referralSources = settings?.masterData?.referralSources ?? []

  // 이름 드롭다운
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const availDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (availDropdownRef.current && !availDropdownRef.current.contains(e.target as Node)) {
        setInlineAvailId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNameClick = (e: React.MouseEvent, t: TalentAdmin) => {
    e.stopPropagation()
    if (openDropdownId === t.id) { setOpenDropdownId(null); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    setOpenDropdownId(t.id)
  }

  const doSearch = () => { setSearchKeyword(keyword); setPage(0) }

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <span className="ml-1 text-primary/20">↕</span>
    return <span className="ml-1 text-secondary">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'talents', searchKeyword, page, sortBy, sortDir],
    queryFn: () => serviceAdminApi.listTalents({
      keyword:  searchKeyword || undefined,
      page, size: 20,
      sort: `${sortBy},${sortDir}`,
    }).then(r => r.data),
  })

  const inlineAvailMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AvailabilityStatus }) =>
      serviceAdminApi.updateAvailability(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      showToast('가용 상태가 변경되었습니다.', 'success')
      setInlineAvailId(null)
    },
    onError: () => showToast('상태 변경에 실패했습니다.', 'error'),
  })

  const inlineRateMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number | null }) =>
      serviceAdminApi.updateDesiredRate(id, rate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      showToast('희망 단가가 변경되었습니다.', 'success')
      setInlineRateId(null)
    },
    onError: () => showToast('단가 변경에 실패했습니다.', 'error'),
  })

  const saveInlineRate = (t: TalentAdmin) => {
    const rate = inlineRateVal !== '' ? Number(inlineRateVal) : null
    if (rate === t.desiredRate) { setInlineRateId(null); return }
    inlineRateMutation.mutate({ id: t.id, rate })
  }

  const inlineProfileMutation = useMutation({
    mutationFn: ({ talent, patch }: { talent: TalentAdmin; patch: Partial<{ referralSource: string | undefined; category: TalentCategory | undefined; field: TalentField | undefined }> }) =>
      serviceAdminApi.updateTalent(talent.id, {
        name: talent.name,
        phone: talent.phone ?? undefined,
        category: patch.category !== undefined ? patch.category : talent.category ?? undefined,
        field: patch.field !== undefined ? patch.field : (patch.category !== undefined ? undefined : talent.field ?? undefined),
        workType: talent.workType,
        desiredRate: talent.desiredRate ?? undefined,
        skills: talent.skills,
        birthDate: talent.birthDate,
        email: talent.email,
        address: talent.address,
        skillGrade: talent.skillGrade,
        title: talent.title,
        projectRole: talent.projectRole ?? undefined,
        notes: talent.notes,
        industryExperience: talent.industryExperience,
        referralSource: patch.referralSource !== undefined ? patch.referralSource : talent.referralSource,
        itCareerMonths: talent.itCareerMonths ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      showToast('변경되었습니다.', 'success')
    },
    onError: () => showToast('변경에 실패했습니다.', 'error'),
  })

  const createMutation = useMutation({
    mutationFn: (req: CreateTalentRequest) => serviceAdminApi.createTalent(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      showToast('전문가가 등록되었습니다.', 'success')
      setShowCreate(false)
    },
    onError: () => showToast('전문가 등록에 실패했습니다.', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serviceAdminApi.deleteTalent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'talents'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      showToast('전문가가 삭제되었습니다.', 'success')
      setSelectedIds([])
    },
    onError: () => showToast('삭제에 실패했습니다.', 'error'),
  })

  const talents = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const selectedTalent = selectedIds.length === 1 ? talents.find(t => t.id === selectedIds[0]) ?? null : null

  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    const confirmMsg = selectedIds.length === 1 
      ? `"${talents.find(x => x.id === selectedIds[0])?.name}" 전문가를 삭제하시겠습니까?`
      : `선택한 ${selectedIds.length}명의 전문가를 모두 삭제하시겠습니까?`
    
    if (window.confirm(confirmMsg)) {
      try {
        await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync(id)))
        setSelectedIds([])
      } catch (err) {
        // 개별 에러는 mutation의 onError에서 처리됨
      }
    }
  }

  const handleToggleAll = () => {
    if (selectedIds.length === talents.length && talents.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(talents.map(t => t.id))
    }
  }

  const handleToggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">전문가 목록</h1>
          <p className="text-sm text-primary/50 mt-0.5">총 {data?.totalElements ?? 0}명</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => selectedTalent && setDetailTarget(selectedTalent)}
            disabled={selectedIds.length !== 1}
            className="w-28 py-2.5 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            상세조회
          </button>
          <button onClick={handleDelete}
            disabled={selectedIds.length === 0 || deleteMutation.isPending}
            className="w-28 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            삭제
          </button>
          <button onClick={() => setShowCreate(true)}
            className="w-28 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold hover:bg-secondary/90">
            + 전문가 등록
          </button>
        </div>
      </div>

      {/* 통합 검색 */}
      <div className="mb-4">
        <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-secondary/50 bg-white">
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-transparent"
            placeholder="이름, 기술스택으로 검색" />
          <button onClick={doSearch}
            className="px-5 py-2.5 text-sm font-medium text-primary/70 hover:bg-surface border-l border-border transition-colors shrink-0">검색</button>
        </div>
      </div>

      {/* 그리드 툴바 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-primary/50">
          {selectedIds.length > 0 && <span className="text-secondary font-semibold">{selectedIds.length}명 선택됨</span>}
        </span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-primary/30 text-sm">불러오는 중...</div>
        ) : talents.length === 0 ? (
          <div className="p-12 text-center text-primary/30 text-sm">등록된 전문가가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border/50">
              <tr>
                <th className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" 
                    checked={talents.length > 0 && selectedIds.length === talents.length}
                    ref={el => { if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < talents.length }}
                    onChange={handleToggleAll}
                    className="w-4 h-4 accent-secondary cursor-pointer" />
                </th>
                <th onClick={() => handleSort('name')}
                  className="text-left px-4 py-3 font-semibold text-primary/60 cursor-pointer hover:text-primary select-none">
                  이름<SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">연락처</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">추천소스</th>
                <th onClick={() => handleSort('category')}
                  className="text-left px-4 py-3 font-semibold text-primary/60 cursor-pointer hover:text-primary select-none">
                  분류 / 분야<SortIcon col="category" />
                </th>
                <th onClick={() => handleSort('availabilityStatus')}
                  className="text-left px-4 py-3 font-semibold text-primary/60 cursor-pointer hover:text-primary select-none">
                  가용 상태<SortIcon col="availabilityStatus" />
                </th>
                <th onClick={() => handleSort('desiredRate')}
                  className="text-left px-4 py-3 font-semibold text-primary/60 cursor-pointer hover:text-primary select-none">
                  희망 단가(월)<SortIcon col="desiredRate" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">기술 스택</th>
              </tr>
            </thead>
            <tbody>
              {talents.map(t => {
                const checked = selectedIds.includes(t.id)
                return (
                  <tr key={t.id}
                    onClick={() => handleToggleOne(t.id)}
                    className={`border-b border-border/30 last:border-0 cursor-pointer transition-colors ${checked ? 'bg-secondary/5 border-secondary/20' : 'hover:bg-surface/50'}`}>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked}
                        onChange={() => handleToggleOne(t.id)}
                        className="w-4 h-4 accent-secondary cursor-pointer" />
                    </td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleNameClick(e, t)}
                        className="font-medium text-primary hover:text-secondary hover:underline cursor-pointer flex items-center gap-1">
                        {displayName(t.name, t.nameEn)}
                        <span className="text-primary/30 text-[10px]">▾</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-primary/60">{t.phone ? formatPhone(t.phone) : '—'}</td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <select
                        value={t.referralSource || ''}
                        onChange={e => inlineProfileMutation.mutate({ talent: t, patch: { referralSource: e.target.value || undefined } })}
                        className="text-xs text-primary/60 bg-transparent hover:bg-surface/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 outline-none rounded px-1 py-0.5 cursor-pointer max-w-[120px] transition-all">
                        <option value="">—</option>
                        {referralSources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <select
                          value={t.category || ''}
                          onChange={e => inlineProfileMutation.mutate({ talent: t, patch: { category: (e.target.value as TalentCategory) || undefined } })}
                          className="text-xs font-semibold text-primary/70 bg-transparent hover:bg-surface/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 outline-none rounded px-1 py-0.5 cursor-pointer transition-all">
                          <option value="">분류 선택</option>
                          {(Object.keys(TALENT_CATEGORY_LABELS) as TalentCategory[]).map(c => (
                            <option key={c} value={c}>{TALENT_CATEGORY_LABELS[c]}</option>
                          ))}
                        </select>
                        <select
                          value={t.field || ''}
                          onChange={e => inlineProfileMutation.mutate({ talent: t, patch: { field: (e.target.value as TalentField) || undefined } })}
                          disabled={!t.category}
                          className="text-xs text-primary/40 bg-transparent hover:bg-surface/50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 outline-none rounded px-1 py-0.5 cursor-pointer disabled:cursor-default transition-all">
                          <option value="">분야 선택</option>
                          {(t.category ? TALENT_FIELDS_BY_CATEGORY[t.category] : []).map(f => (
                            <option key={f} value={f}>{TALENT_FIELD_LABELS[f]}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block" ref={inlineAvailId === t.id ? availDropdownRef : undefined}>
                        <button
                          onClick={() => setInlineAvailId(inlineAvailId === t.id ? null : t.id)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AVAILABILITY_COLORS[t.availabilityStatus]} hover:opacity-80 transition-opacity`}>
                          {AVAILABILITY_LABELS[t.availabilityStatus]}
                        </button>
                        {inlineAvailId === t.id && (
                          <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-border/50 p-2 min-w-[130px]">
                            {(['AVAILABLE', 'BUSY', 'REST'] as AvailabilityStatus[]).map(s => (
                              <button key={s} disabled={inlineAvailMutation.isPending}
                                onClick={() => inlineAvailMutation.mutate({ id: t.id, status: s })}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-surface ${t.availabilityStatus === s ? 'opacity-40 cursor-default' : ''}`}>
                                <span className={`px-2 py-0.5 rounded-full ${AVAILABILITY_COLORS[s]}`}>{AVAILABILITY_LABELS[s]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-primary/60" onClick={e => { e.stopPropagation(); if (inlineRateId !== t.id) { setInlineRateId(t.id); setInlineRateVal(t.desiredRate ? String(t.desiredRate) : '') } }}>
                      {inlineRateId === t.id ? (
                        <input autoFocus type="number"
                          className="w-28 border border-blue-400 ring-1 ring-blue-400 rounded-lg px-2 py-1 text-sm bg-blue-50 outline-none"
                          value={inlineRateVal}
                          onChange={e => setInlineRateVal(e.target.value)}
                          onBlur={() => saveInlineRate(t)}
                          onKeyDown={e => { if (e.key === 'Enter') saveInlineRate(t); if (e.key === 'Escape') setInlineRateId(null) }}
                        />
                      ) : (
                        <span className="cursor-pointer hover:text-secondary hover:underline">
                          {t.desiredRate ? `${t.desiredRate.toLocaleString()}원/월` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {t.skills.slice(0, 4).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">{s}</span>
                        ))}
                        {t.skills.length > 4 && (
                          <span className="px-2 py-0.5 bg-surface text-primary/40 text-xs rounded-full">+{t.skills.length - 4}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40">이전</button>
          <span className="text-sm text-primary/60">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40">다음</button>
        </div>
      )}

      {showCreate && (
        <TalentCreateModal
          onClose={() => setShowCreate(false)}
          onSave={req => createMutation.mutate(req)}
          isPending={createMutation.isPending}
        />
      )}

      {detailTarget && (
        <TalentDetailModal
          talent={detailTarget}
          onClose={() => setDetailTarget(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'talents'] }).then(() => {
              setDetailTarget(null)
            })
          }}
        />
      )}

      {availabilityTarget && (
        <AvailabilityModal
          talent={availabilityTarget}
          onClose={() => setAvailabilityTarget(null)}
          onSaved={() => setAvailabilityTarget(null)}
        />
      )}

      {evaluationTarget && (
        <EvaluationModal
          talent={evaluationTarget}
          onClose={() => setEvaluationTarget(null)}
        />
      )}

      {assignTarget && (
        <ProjectAssignModal
          talent={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* 이름 드롭다운 */}
      {openDropdownId && (() => {
        const t = talents.find(x => x.id === openDropdownId)
        if (!t) return null
        return (
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
            className="bg-white rounded-xl shadow-xl border border-border/50 w-44 overflow-hidden py-1">
            <button
              onClick={() => { setDetailTarget(t); setOpenDropdownId(null) }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2">
              <span className="text-base">🔍</span> 상세조회
            </button>
            <button
              onClick={() => { setEvaluationTarget(t); setOpenDropdownId(null) }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2">
              <span className="text-base">✏️</span> 평가등록
            </button>
            <button
              onClick={() => { setAssignTarget(t); setOpenDropdownId(null) }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2">
              <span className="text-base">📋</span> 프로젝트 배정
            </button>
            <div className="border-t border-border/30 my-1" />
            <button
              onClick={() => {
                setOpenDropdownId(null)
                serviceAdminApi.listExperiences(t.id).then(r => {
                  const exps = r.data
                  const months = t.itCareerMonths ?? calcItCareerMonths(exps)
                  void printCareerCard(t, exps, months)
                })
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2">
              <span className="text-base">📄</span> PDF 출력
            </button>
          </div>
        )
      })()}
    </div>
  )
}
