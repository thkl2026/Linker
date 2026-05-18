import { create } from 'zustand'

/**
 * UI 상태 전역 스토어 (Zustand) — 모달·토스트·사이드바 등 순수 UI 상태 관리
 *
 * <p>서버 데이터와 무관한 UI 상태만 여기에 보관한다.
 */

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface UiState {
  toasts: Toast[]
  isSidebarOpen: boolean
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isSidebarOpen: true,

  addToast: (message, type) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))
