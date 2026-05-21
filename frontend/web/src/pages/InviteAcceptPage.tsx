import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authApi } from '@/shared/api/authApi'
import { useUiStore } from '@/store/uiStore'
import { getApiErrorDetail } from '@/shared/utils/apiError'
import { ToastContainer } from '@/shared/components/ToastContainer'

const ROLE_LABELS: Record<string, string> = {
  TALENT: '전문가 (Expert)',
  PM: 'PM (Project Manager)',
  PROCUREMENT: '기업 담당자 (Client)',
  SERVICE_ADMIN: '서비스 관리자 (Admin)',
  SYSTEM_ADMIN: '시스템 관리자 (System Admin)',
}

type PageState = 'loading' | 'form' | 'error'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { addToast } = useUiStore()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setErrorMsg('잘못된 초대 링크입니다.'); setPageState('error'); return }
    authApi.getInviteInfo(token)
      .then(res => {
        setInviteEmail(res.data.email)
        setInviteRole(res.data.role)
        setPageState('form')
      })
      .catch(err => {
        const status = err?.response?.status
        setErrorMsg(
          status === 404 ? '초대 링크를 찾을 수 없습니다.' :
          status === 410 ? '이 초대 링크는 만료되었거나 이미 사용되었습니다.' :
          '초대 정보를 불러오는 데 실패했습니다.'
        )
        setPageState('error')
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      addToast('비밀번호가 일치하지 않습니다.', 'error')
      return
    }
    if (!token) return
    setSubmitting(true)
    try {
      await authApi.acceptInvite(token, password)
      addToast('계정이 생성되었습니다. 로그인해 주세요.', 'success')
      navigate('/auth/login')
    } catch (err: any) {
      addToast(getApiErrorDetail(err, '계정 생성에 실패했습니다.'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-border/30">
        <div className="bg-primary px-8 py-6">
          <span className="text-2xl font-black text-white tracking-tight">Linker.</span>
        </div>
        <div className="p-8">
          {pageState === 'loading' && (
            <p className="text-center text-primary/60 py-8">초대 정보를 불러오는 중...</p>
          )}

          {pageState === 'error' && (
            <div className="text-center py-8">
              <p className="text-2xl mb-3">⚠️</p>
              <p className="font-bold text-primary mb-2">초대 링크 오류</p>
              <p className="text-primary/60 text-sm">{errorMsg}</p>
            </div>
          )}

          {pageState === 'form' && (
            <>
              <h2 className="text-2xl font-black text-primary mb-1">초대 수락</h2>
              <p className="text-primary/60 text-sm mb-6">
                <strong>{inviteEmail}</strong> 계정으로{' '}
                <strong>{ROLE_LABELS[inviteRole] ?? inviteRole}</strong> 역할로 초대받으셨습니다.
                <br />사용할 비밀번호를 설정해 주세요.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="8자 이상 입력"
                      minLength={8}
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border border-border bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-primary/30 font-medium shadow-sm pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary/40 hover:text-primary"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary mb-2">비밀번호 확인</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
                    required
                    className="w-full px-4 py-3.5 rounded-2xl border border-border bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-primary/30 font-medium shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-amber-900 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? '처리 중...' : '계정 생성하기'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
