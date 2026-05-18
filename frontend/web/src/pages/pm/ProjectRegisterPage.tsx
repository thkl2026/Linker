import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { projectApi, CreateProjectRequest, WorkType } from '@/shared/api/projectApi'
import { useUiStore } from '@/store/uiStore'
import { getApiErrorDetail } from '@/shared/utils/apiError'

interface SkillEntry { skill: string; level: 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT' }

interface FormState {
  title: string
  description: string
  skills: SkillEntry[]
  workType: WorkType | ''
  budgetMin: string
  budgetMax: string
}

const LEVEL_LABELS = { JUNIOR: '주니어', MID: '미드', SENIOR: '시니어', EXPERT: '전문가' }
const WORK_TYPE_LABELS = { REMOTE: '원격', ONSITE: '상주', HYBRID: '혼합' }

const EMPTY: FormState = {
  title: '', description: '', skills: [], workType: '', budgetMin: '', budgetMax: '',
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-10">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            s === step ? 'bg-secondary text-white' : s < step ? 'bg-secondary/20 text-secondary' : 'bg-surface text-primary/30 border border-border'
          }`}>{s}</div>
          {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-secondary/40' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

export function ProjectRegisterPage() {
  const navigate = useNavigate()
  const addToast = useUiStore(s => s.addToast)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [skillInput, setSkillInput] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillEntry['level']>('MID')

  const mutation = useMutation({
    mutationFn: () => {
      const req: CreateProjectRequest = {
        title: form.title,
        description: form.description || undefined,
        requiredSkills: form.skills.length > 0
          ? JSON.stringify(form.skills.map(s => ({ skill: s.skill, level: s.level })))
          : undefined,
        workType: (form.workType as WorkType) || undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      }
      return projectApi.createProject(req)
    },
    onSuccess: () => {
      addToast('프로젝트가 등록되었습니다.', 'success')
      navigate('/app/projects')
    },
    onError: (err) => addToast(getApiErrorDetail(err, '프로젝트 등록에 실패했습니다.'), 'error'),
  })

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !form.skills.find(s => s.skill === trimmed)) {
      setForm(f => ({ ...f, skills: [...f.skills, { skill: trimmed, level: skillLevel }] }))
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    setForm(f => ({ ...f, skills: f.skills.filter(s => s.skill !== skill) }))

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">프로젝트 등록</h1>
        <p className="text-sm text-primary/50 mt-1">새로운 프로젝트 기회를 등록합니다.</p>
      </div>

      <StepIndicator step={step} />

      <div className="bg-white rounded-2xl border border-border/50 p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-primary">기본 정보</h2>
            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">프로젝트 제목 *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                placeholder="예: Spring Boot 백엔드 개발자 모집"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/70 mb-1">프로젝트 설명</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={5}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none"
                placeholder="프로젝트 내용, 기간, 특이사항 등을 자유롭게 입력하세요."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-primary">요구 조건</h2>
            <div>
              <label className="block text-sm font-medium text-primary/70 mb-2">근무 형태</label>
              <div className="flex gap-3">
                {(['ONSITE', 'REMOTE', 'HYBRID'] as WorkType[]).map(wt => (
                  <button key={wt} type="button"
                    onClick={() => setForm(f => ({ ...f, workType: wt }))}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      form.workType === wt
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-border text-primary/60 hover:border-secondary/50'
                    }`}>
                    {WORK_TYPE_LABELS[wt]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/70 mb-2">요구 기술</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  placeholder="기술명 입력 (예: Java, React)"
                />
                <select
                  value={skillLevel}
                  onChange={e => setSkillLevel(e.target.value as SkillEntry['level'])}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                >
                  {(Object.keys(LEVEL_LABELS) as SkillEntry['level'][]).map(l => (
                    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                  ))}
                </select>
                <button type="button" onClick={addSkill}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-primary/70 hover:bg-border/30 transition-colors">
                  추가
                </button>
              </div>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map(s => (
                    <span key={s.skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                      {s.skill}
                      <span className="text-secondary/60">({LEVEL_LABELS[s.level]})</span>
                      <button onClick={() => removeSkill(s.skill)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-primary">예산 및 최종 확인</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary/70 mb-1">예산 하한 (원/월)</label>
                <input
                  type="number"
                  value={form.budgetMin}
                  onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  placeholder="5000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary/70 mb-1">예산 상한 (원/월)</label>
                <input
                  type="number"
                  value={form.budgetMax}
                  onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  placeholder="8000000"
                />
              </div>
            </div>

            <div className="bg-surface rounded-xl p-5 space-y-2.5 text-sm">
              <h3 className="font-semibold text-primary mb-3">등록 내용 확인</h3>
              <div className="flex gap-2">
                <span className="text-primary/50 w-20 shrink-0">제목</span>
                <span className="text-primary font-medium">{form.title}</span>
              </div>
              {form.description && (
                <div className="flex gap-2">
                  <span className="text-primary/50 w-20 shrink-0">설명</span>
                  <span className="text-primary line-clamp-2">{form.description}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-primary/50 w-20 shrink-0">근무 형태</span>
                <span className="text-primary">{form.workType ? WORK_TYPE_LABELS[form.workType] : '미지정'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary/50 w-20 shrink-0">요구 기술</span>
                <span className="text-primary">{form.skills.length > 0 ? form.skills.map(s => s.skill).join(', ') : '미지정'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary/50 w-20 shrink-0">예산</span>
                <span className="text-primary">
                  {form.budgetMin || form.budgetMax
                    ? `${form.budgetMin ? `${Number(form.budgetMin).toLocaleString()}원/월` : '—'} ~ ${form.budgetMax ? `${Number(form.budgetMax).toLocaleString()}원/월` : '—'}`
                    : '미지정'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/app/projects')}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface transition-colors">
          {step > 1 ? '이전' : '취소'}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !form.title.trim()}
            className="flex-1 py-3 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
            다음
          </button>
        ) : (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title.trim()}
            className="flex-1 py-3 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
            {mutation.isPending ? '등록 중...' : '프로젝트 등록'}
          </button>
        )}
      </div>
    </div>
  )
}
