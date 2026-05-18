import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/shared/api/authApi'
import { useUiStore } from '@/store/uiStore'
import { getApiErrorDetail } from '@/shared/utils/apiError'
import type { UserRole } from '@/shared/types/auth'

type Step = 'account' | 'totp-setup' | 'totp-verify'
type AccountType = 'expert' | 'client'

const ROLE_MAP: Record<AccountType, UserRole> = {
  expert: 'TALENT',
  client: 'PM',
}

interface TotpSetup {
  secretKey: string
  otpAuthUri: string
}

function StepHeader({ step: _step }: { step: Step }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg">L</span>
          <span className="text-2xl font-black tracking-tighter">Linker.</span>
        </div>
        <h1 className="text-3xl font-black mb-2">회원가입</h1>
        <p className="text-primary/60 font-medium text-sm">전문가와 기업의 신뢰를 연결하는 시작점입니다.</p>
      </div>

      <div className="flex items-center justify-between px-4 relative">
        <div className="absolute top-4 left-8 right-8 h-px bg-border/30 -z-10" />
        {[
          { n: 1, label: '계정 정보', active: true },
          { n: 2, label: '본인 인증', active: false },
          { n: 3, label: '가입 완료', active: false },
        ].map(({ n, label, active }) => (
          <div key={n} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${
              active ? 'bg-primary text-white' : 'bg-white border border-border text-primary/30'
            }`}>
              {n}
            </div>
            <span className={`text-[10px] font-bold ${active ? 'text-primary' : 'text-primary/30'}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { addToast } = useUiStore()

  const [step, setStep] = useState<Step>('account')
  const [accountType, setAccountType] = useState<AccountType>('expert')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState('')
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const initRes = await authApi.registerInitiate({
        email,
        password,
        role: ROLE_MAP[accountType],
      })
      const newUserId = initRes.data
      setUserId(newUserId)

      const totpRes = await authApi.issueTotpSecret(newUserId)
      setTotpSetup({ secretKey: totpRes.data.secretKey, otpAuthUri: totpRes.data.otpAuthUri })
      setStep('totp-setup')
    } catch (err) {
      addToast(getApiErrorDetail(err, '회원가입에 실패했습니다.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.completeMfaSetup(userId, { otpCode })
      addToast('계정이 생성됐습니다. 로그인해주세요.', 'success')
      navigate('/auth/login')
    } catch (err) {
      addToast(getApiErrorDetail(err, 'OTP 코드가 올바르지 않습니다.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'totp-setup' && totpSetup) {
    return (
      <div className="w-full max-w-2xl">
        <StepHeader step={step} />
        <div className="bg-white rounded-[40px] border border-border/50 shadow-2xl p-10 md:p-12 space-y-6">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border/20 pb-2">
            Step 1-2. 2단계 인증(TOTP) 설정
          </h2>
          <p className="text-sm text-primary/60">
            Google Authenticator 앱으로 아래 QR 코드를 스캔하세요.
          </p>
          <div className="flex justify-center py-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(totpSetup.otpAuthUri)}&size=180x180`}
              alt="TOTP QR Code"
              className="w-44 h-44 rounded-2xl border border-border shadow-sm"
            />
          </div>
          <details className="text-xs text-primary/40">
            <summary className="cursor-pointer font-bold">QR 코드를 스캔할 수 없나요?</summary>
            <p className="mt-2 break-all font-mono bg-surface border border-border rounded-xl p-3">
              {totpSetup.secretKey}
            </p>
          </details>
          <button
            type="button"
            onClick={() => setStep('totp-verify')}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-amber-950 transition-all shadow-md"
          >
            다음 — OTP 코드 확인
          </button>
        </div>
      </div>
    )
  }

  if (step === 'totp-verify') {
    return (
      <div className="w-full max-w-2xl">
        <StepHeader step={step} />
        <form onSubmit={handleTotpVerify} className="bg-white rounded-[40px] border border-border/50 shadow-2xl p-10 md:p-12 space-y-6">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border/20 pb-2">
            Step 1-3. OTP 확인
          </h2>
          <p className="text-sm text-primary/60">
            앱에 표시된 6자리 코드를 입력하여 계정 설정을 완료하세요.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-5 py-4 rounded-2xl border border-border bg-surface/30 text-primary text-center tracking-[0.5em] text-2xl font-bold focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-amber-950 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? '처리 중...' : '가입 완료 — 로그인하기'}
          </button>
          <button
            type="button"
            onClick={() => setStep('totp-setup')}
            className="w-full py-2 text-sm text-primary/40 hover:text-primary transition-colors"
          >
            이전으로
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      <StepHeader step={step} />
      <form onSubmit={handleAccount} className="bg-white rounded-[40px] border border-border/50 shadow-2xl p-10 md:p-12 space-y-8">
        <h2 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border/20 pb-2">
          Step 1. 계정 정보
        </h2>

        {/* 계정 유형 */}
        <div>
          <label className="block text-xs font-bold text-primary/60 mb-3 uppercase">계정 유형</label>
          <div className="grid grid-cols-2 gap-3">
            {(['expert', 'client'] as AccountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAccountType(t)}
                className={`py-3.5 px-4 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  accountType === t
                    ? 'border-secondary bg-secondary/5 text-secondary'
                    : 'border-border text-primary/40 hover:border-secondary/50'
                }`}
              >
                {t === 'expert' ? '🧑‍💻 전문가' : '🏢 기업 / 파트너사'}
              </button>
            ))}
          </div>
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-xs font-bold text-primary/60 mb-2 uppercase">
            이메일 주소 <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-surface/30 text-sm font-medium outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            required
            autoFocus
          />
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="block text-xs font-bold text-primary/60 mb-2 uppercase">
            비밀번호 <span className="text-danger">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상 입력"
            minLength={8}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-surface/30 text-sm font-medium outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            required
          />
          <p className="mt-1.5 text-[10px] text-primary/40 font-medium">
            영문·숫자·특수문자(@$!%*#?&) 각 1개 이상, 8자 이상
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl hover:bg-amber-950 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0"
        >
          {loading ? '처리 중...' : '다음 — 2FA 설정'}
        </button>

        <p className="text-center text-sm text-primary/40 font-medium">
          이미 계정이 있으신가요?{' '}
          <Link to="/auth/login" className="text-secondary font-bold underline underline-offset-4">
            로그인하기
          </Link>
        </p>
      </form>
    </div>
  )
}
