import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { talentApi, type WorkType } from '@/shared/api/talentApi'
import { useUiStore } from '@/store/uiStore'
import { getApiErrorDetail } from '@/shared/utils/apiError'

type RankLevel = 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD' | 'PARTNER'

const RANKS: { value: RankLevel; label: string }[] = [
  { value: 'JUNIOR', label: '주니어 (1~3년)' },
  { value: 'MIDDLE', label: '미들 (3~7년)' },
  { value: 'SENIOR', label: '시니어 (7~12년)' },
  { value: 'LEAD', label: '리드 / 아키텍트' },
  { value: 'PARTNER', label: '대표 / 파트너급' },
]

function deriveWorkType(remote: boolean, onsite: boolean): WorkType {
  if (remote && onsite) return 'HYBRID'
  if (remote) return 'REMOTE'
  return 'ONSITE'
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { addToast } = useUiStore()

  const [verified, setVerified] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [rank, setRank] = useState<RankLevel>('MIDDLE')
  const [rateManwon, setRateManwon] = useState(700)
  const [remoteOk, setRemoteOk] = useState(true)
  const [onsiteOk, setOnsiteOk] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleVerify() {
    setVerified(true)
    addToast('본인 인증이 완료됐습니다.', 'success')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { addToast('약관에 동의해 주세요.', 'error'); return }
    setLoading(true)
    try {
      await talentApi.createProfile({
        name,
        workType: deriveWorkType(remoteOk, onsiteOk),
        desiredRate: rateManwon * 10000,
        phone: phone || undefined,
      })
      addToast('가입이 완료됐습니다!', 'success')
      navigate('/app')
    } catch (err) {
      addToast(getApiErrorDetail(err, '프로필 생성에 실패했습니다.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Logo & Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg">L</span>
          <span className="text-2xl font-black tracking-tighter">Linker.</span>
        </div>
        <h1 className="text-3xl font-black mb-2">회원가입</h1>
        <p className="text-primary/60 font-medium text-sm">전문가와 기업의 신뢰를 연결하는 시작점입니다.</p>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center justify-between mb-12 px-4 relative">
        <div className="absolute top-4 left-8 right-8 h-px bg-border/30 -z-10" />
        {[
          { n: 1, label: '계정 정보', state: 'done' },
          { n: 2, label: '본인 인증', state: 'active' },
          { n: 3, label: '가입 완료', state: 'pending' },
        ].map(({ n, label, state }) => (
          <div key={n} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${
              state === 'done'    ? 'bg-primary text-white' :
              state === 'active'  ? 'bg-secondary text-white' :
                                    'bg-white border border-border text-primary/30'
            }`}>
              {state === 'done' ? '✓' : n}
            </div>
            <span className={`text-[10px] font-bold ${
              state === 'done' ? 'text-primary' : state === 'active' ? 'text-secondary' : 'text-primary/30'
            }`}>{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[40px] border border-border/50 shadow-2xl p-10 md:p-12 space-y-10">

        {/* Step 2: 실명 인증 */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border/20 pb-2">
            Step 2. 실명 인증 및 개인정보
          </h2>

          <div className="p-6 bg-surface/50 rounded-3xl border border-border/40 text-center">
            <p className="text-xs font-bold text-primary/60 mb-4">신뢰할 수 있는 활동을 위해 본인 인증이 필요합니다.</p>
            {verified ? (
              <div className="flex items-center justify-center gap-2 text-success font-bold py-3">
                <span>✅</span> 본인 인증 완료
              </div>
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                className="w-full py-4 bg-white border border-secondary text-secondary rounded-2xl font-black text-sm hover:bg-secondary hover:text-white transition-all shadow-md flex items-center justify-center gap-2"
              >
                📱 휴대폰 본인 확인 서비스 연동
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-primary/60 mb-2 uppercase">
                성명 (실명) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={verified ? '이름을 입력하세요' : '본인 인증 후 입력 가능'}
                disabled={!verified}
                className={`w-full px-5 py-3.5 rounded-xl border border-border text-sm font-bold outline-none transition-all ${
                  verified
                    ? 'bg-surface/30 text-primary focus:border-secondary'
                    : 'bg-gray-100/50 text-primary/40 cursor-not-allowed'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary/60 mb-2 uppercase">휴대폰 번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={verified ? '010-0000-0000' : '본인 인증 후 입력 가능'}
                disabled={!verified}
                className={`w-full px-5 py-3.5 rounded-xl border border-border text-sm font-medium outline-none transition-all ${
                  verified
                    ? 'bg-surface/30 text-primary focus:border-secondary'
                    : 'bg-gray-100/50 text-primary/40 cursor-not-allowed'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-primary/60 mb-2 uppercase">주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="주소를 입력하세요"
                className="w-full px-5 py-3.5 rounded-xl border border-border bg-surface/30 text-sm outline-none focus:border-secondary"
              />
            </div>
          </div>
        </div>

        {/* Step 3: 전문가 활동 조건 */}
        <div className="space-y-8 bg-surface/30 p-8 rounded-[32px] border border-secondary/20">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-secondary/20 pb-2">
            Step 3. 전문가 활동 조건 설정
          </h2>

          {/* 직급 */}
          <div>
            <label className="block text-xs font-bold text-primary/60 mb-3 uppercase">현재 직급 / 숙련도</label>
            <div className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRank(r.value)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    rank === r.value
                      ? 'border-secondary bg-secondary text-white'
                      : 'border-border bg-white text-primary/40 hover:border-secondary/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 단가 슬라이더 */}
          <div>
            <label className="block text-xs font-bold text-primary/60 mb-3 uppercase">수행 가능 최소 금액 (월 기준)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                className="flex-1 accent-secondary"
                min={300}
                max={1500}
                step={50}
                value={rateManwon}
                onChange={(e) => setRateManwon(Number(e.target.value))}
              />
              <span className="text-sm font-black text-secondary whitespace-nowrap">
                {rateManwon.toLocaleString()}만원 이상
              </span>
            </div>
            <p className="text-[10px] text-primary/40 mt-1">
              설정하신 금액 미만의 프로젝트는 매칭 제안이 발송되지 않습니다.
            </p>
          </div>

          {/* 근무 형태 */}
          <div>
            <label className="block text-xs font-bold text-primary/60 mb-3 uppercase">근무 가능 형태 (중복 선택)</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '🏠 100% 원격', checked: remoteOk, toggle: () => setRemoteOk(!remoteOk) },
                { label: '🏢 현장 / 출근', checked: onsiteOk, toggle: () => setOnsiteOk(!onsiteOk) },
              ].map(({ label, checked, toggle }) => (
                <button
                  key={label}
                  type="button"
                  onClick={toggle}
                  className={`py-2.5 text-center border rounded-lg text-[11px] font-bold transition-all ${
                    checked
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-primary/50 hover:border-primary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 약관 동의 */}
        <div className="p-6 bg-white rounded-3xl border border-border/30">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-border accent-secondary"
            />
            <span className="text-sm font-bold text-primary">모든 약관 및 개인정보 활용에 동의합니다.</span>
          </label>
        </div>

        {/* 제출 */}
        <button
          type="submit"
          disabled={loading || !agreed || !name}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl hover:bg-amber-950 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : 'Linker 가입 완료하기'}
        </button>

        <p className="text-center text-sm text-primary/40 font-medium">
          이미 계정이 있으신가요?{' '}
          <Link to="/auth/login" className="text-secondary font-bold underline underline-offset-4">
            로그인하기
          </Link>
        </p>
      </form>

      <div className="h-20" />
    </div>
  )
}
