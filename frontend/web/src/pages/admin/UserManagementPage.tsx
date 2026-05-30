import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemAdminApi, ManagedUserRole, UserSummary } from '@/shared/api/systemAdminApi'
import { useUiStore } from '@/store/uiStore'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpUserManagement } from '@/shared/help/helpContent'

const ROLE_LABELS: Record<ManagedUserRole, string> = {
  SYSTEM_ADMIN: '시스템관리자',
  SERVICE_ADMIN: '서비스관리자',
  PM: 'PM',
  PROCUREMENT: '구매담당',
}

const ROLE_COLORS: Record<ManagedUserRole, string> = {
  SYSTEM_ADMIN: 'bg-purple-100 text-purple-700',
  SERVICE_ADMIN: 'bg-indigo-100 text-indigo-700',
  PM: 'bg-blue-100 text-blue-700',
  PROCUREMENT: 'bg-green-100 text-green-700',
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const showToast = useUiStore(s => s.addToast)
  const [form, setForm] = useState({ email: '', password: '', role: 'PM' as ManagedUserRole })

  const { mutate, isPending } = useMutation({
    mutationFn: () => systemAdminApi.createUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'users'] })
      showToast('사용자가 생성되었습니다.', 'success')
      onClose()
    },
    onError: () => showToast('사용자 생성에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-primary mb-6">사용자 생성</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary/70 block mb-1">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-primary/70 block mb-1">임시 비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="8자 이상"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-primary/70 block mb-1">역할</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as ManagedUserRole }))}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            >
              <option value="SYSTEM_ADMIN">시스템 관리자</option>
              <option value="SERVICE_ADMIN">서비스 관리자</option>
              <option value="PM">PM</option>
              <option value="PROCUREMENT">구매담당</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface transition-colors">
            취소
          </button>
          <button onClick={() => mutate()} disabled={isPending || !form.email || !form.password}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
            {isPending ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const queryClient = useQueryClient()
  const showToast = useUiStore(s => s.addToast)
  const [password, setPassword] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => systemAdminApi.resetPassword(user.id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'users'] })
      showToast('비밀번호가 초기화되었습니다.', 'success')
      onClose()
    },
    onError: () => showToast('비밀번호 초기화에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-xl font-bold text-primary mb-2">비밀번호 초기화</h2>
        <p className="text-sm text-primary/50 mb-6">{user.email}</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
          placeholder="새 비밀번호 (8자 이상)" />
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface transition-colors">취소</button>
          <button onClick={() => mutate()} disabled={isPending || password.length < 8}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
            {isPending ? '처리 중...' : '초기화'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ROLE_FILTERS: Array<ManagedUserRole | ''> = ['', 'SYSTEM_ADMIN', 'SERVICE_ADMIN', 'PM', 'PROCUREMENT']

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const showToast = useUiStore(s => s.addToast)
  const [roleFilter, setRoleFilter] = useState<ManagedUserRole | ''>('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['system-admin', 'users', roleFilter, page],
    queryFn: () => systemAdminApi.listUsers({ role: roleFilter || undefined, page, size: 20 }).then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: (user: UserSummary) =>
      user.isActive ? systemAdminApi.deactivateUser(user.id) : systemAdminApi.activateUser(user.id),
    onSuccess: (_d, user) => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'users'] })
      showToast(user.isActive ? '계정이 비활성화되었습니다.' : '계정이 활성화되었습니다.', 'success')
    },
    onError: () => showToast('처리에 실패했습니다.', 'error'),
  })

  const users = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">사용자 관리</h1>
          <p className="text-sm text-primary/50 mt-0.5">총 {data?.totalElements ?? 0}명</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold hover:bg-secondary/90 transition-colors">
            + 사용자 생성
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {ROLE_FILTERS.map(r => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(0) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              roleFilter === r ? 'bg-secondary text-white' : 'bg-white border border-border text-primary/60 hover:border-secondary/50'
            }`}>
            {r === '' ? '전체' : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-primary/30 text-sm">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-primary/30 text-sm">사용자가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border/50">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-primary/60">이메일</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">역할</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">상태</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">최근 로그인</th>
                <th className="text-left px-4 py-3 font-semibold text-primary/60">가입일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/30 last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-primary">{u.email}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {u.isLocked
                      ? <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">잠금</span>
                      : u.isActive
                        ? <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">활성</span>
                        : <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">비활성</span>
                    }
                  </td>
                  <td className="px-4 py-4 text-primary/50">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-4 text-primary/50">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => toggleActive.mutate(u)}
                        className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-surface transition-colors text-primary/70">
                        {u.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button onClick={() => setResetTarget(u)}
                        className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-surface transition-colors text-primary/70">
                        PW 초기화
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">이전</button>
          <span className="text-sm text-primary/60">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl border border-border text-sm text-primary/60 hover:bg-surface disabled:opacity-40 transition-colors">다음</button>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpUserManagement} />
    </div>
  )
}
