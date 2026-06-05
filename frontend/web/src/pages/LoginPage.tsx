import { useState, useEffect } from 'react'
import linkerLogo from '@/statics/linker_bi_logo.png'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/shared/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { getApiErrorDetail } from '@/shared/utils/apiError'

const STORAGE_KEY = 'linker_saved_credentials'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/app'
  const { setAuth, user, isAuthenticated } = useAuthStore()
  const { addToast } = useUiStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 이미 로그인된 사용자면 앱으로 리다이렉트
    if (isAuthenticated && user) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, user, navigate, from])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { email: e, password: p } = JSON.parse(saved)
        setEmail(e ?? '')
        setPassword(p ?? '')
        setRememberMe(true)
      }
    } catch {
      // 저장된 값이 없거나 파싱 오류 시 무시
    }
  }, [])

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      setAuth(
        {
          id: res.data.userId,
          email,
          role: res.data.role,
          name: res.data.name,
          mfaEnabled: res.data.mfaEnabled,
          identityVerified: res.data.identityVerified,
          position: res.data.position ?? undefined,
          department: res.data.department ?? undefined,
        },
        res.data.accessToken,
        res.data.refreshToken,
      )
      navigate(from)
    } catch (err: any) {
      console.error('[LOGIN_FAIL]', err?.response?.status, err?.response?.data, err?.message, err)
      addToast(getApiErrorDetail(err, '아이디 및 비밀번호가 일치하지 않습니다.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px] border border-border/30">

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary via-[#5d2605] to-secondary p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-16">
            <img src={linkerLogo} alt="Linker" className="h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6">
            최고의 <span className="text-accent">전문가</span>와<br />
            성공적인 <span className="text-accent">프로젝트</span>를<br />
            연결합니다.
          </h1>
          <p className="text-amber-100/80 text-lg max-w-md leading-relaxed">
            검증된 IT 프리랜서 매칭부터, 스마트한 정산, 그리고 투명한 평가 시스템까지.
            Linker 하나로 모든 것을 완벽하게 관리하세요.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 mt-12 pt-8 border-t border-white/20">
          <div>
            <p className="text-3xl font-bold text-white mb-1">98%</p>
            <p className="text-xs text-amber-100/70">매칭 만족도</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white mb-1">5K+</p>
            <p className="text-xs text-amber-100/70">등록된 전문가</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white mb-1">0원</p>
            <p className="text-xs text-amber-100/70">수수료 정책</p>
          </div>
        </div>
      </div>

      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-surface/30">
        <div className="md:hidden text-3xl font-black tracking-tighter text-primary flex items-center gap-2 mb-10">
          <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xl font-black">L</span>
          Linker.
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">환영합니다! 👋</h2>
            <p className="text-primary/60">이메일과 비밀번호로 로그인하세요.</p>
          </div>

          <form onSubmit={handleCredentials} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-primary mb-2">이메일 주소</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40 text-base">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@linker.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-primary/30 font-medium shadow-sm"
                  required
                  autoFocus
                  tabIndex={1}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-primary">비밀번호</label>
                <div className="flex items-center gap-2">
                  <a href="#" tabIndex={-1} className="text-sm font-bold text-secondary hover:text-primary transition-colors">ID 찾기</a>
                  <span className="text-border/70 text-xs">|</span>
                  <a href="#" tabIndex={-1} className="text-sm font-bold text-secondary hover:text-primary transition-colors">비밀번호 찾기</a>
                </div>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40 text-base">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-border bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-primary/30 font-medium shadow-sm"
                  required
                  tabIndex={2}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary/40 hover:text-primary transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 아이디/비밀번호 저장 */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                tabIndex={-1}
                className="w-4 h-4 rounded accent-secondary cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-primary/60 font-medium cursor-pointer select-none">
                아이디/비밀번호 저장
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              tabIndex={3}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-amber-900 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
