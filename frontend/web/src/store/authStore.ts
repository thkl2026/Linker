import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/shared/types/auth'
import { APP_CONSTANTS } from '@/shared/constants/appConstants'

/**
 * 인증 상태 전역 스토어 (Zustand)
 *
 * <p>서버 상태(API 응답)는 TanStack Query, UI·세션 상태는 이 스토어에서 관리한다.
 * accessToken은 메모리에만 보관하고, refreshToken만 localStorage에 persist한다.
 *
 * @rule 그라운드룰 Rule 2: 토큰 키는 APP_CONSTANTS에서 참조
 */
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setAccessToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem(APP_CONSTANTS.REFRESH_TOKEN_KEY, refreshToken)
        set({ user, accessToken, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem(APP_CONSTANTS.REFRESH_TOKEN_KEY)
        localStorage.removeItem(APP_CONSTANTS.ACCESS_TOKEN_KEY)
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setAccessToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'linker-auth',
      // accessToken은 persist 제외 — 메모리에만 보관 (보안)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
