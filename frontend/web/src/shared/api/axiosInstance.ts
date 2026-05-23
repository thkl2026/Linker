import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { APP_CONSTANTS } from '@/shared/constants/appConstants'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  // @ts-expect-error — metadata는 인터셉터 내부용 커스텀 필드
  config.metadata = { startTime: Date.now() }
  console.info(`[REQ] ${config.method?.toUpperCase()} ${config.url}`, {
    timestamp: new Date().toISOString(),
  })

  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

let isRefreshing = false
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = []

function drainQueue(token: string) {
  pendingQueue.forEach(p => p.resolve(token))
  pendingQueue = []
}

function rejectQueue(err: unknown) {
  pendingQueue.forEach(p => p.reject(err))
  pendingQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => {
    // @ts-expect-error: metadata is added by request interceptor
    const durationMs = Date.now() - response.config.metadata?.startTime
    console.info(`[RES] ${response.status} ${response.config.url} ${durationMs}ms`)
    return response
  },
  async (error) => {
    const original = error.config
    console.error(`[RES_ERR] ${error.response?.status} ${original?.url}`, error)

    if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem(APP_CONSTANTS.REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(axiosInstance(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await axiosInstance.post('/api/v1/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefresh } = res.data
      useAuthStore.getState().setAccessToken(accessToken)
      localStorage.setItem(APP_CONSTANTS.REFRESH_TOKEN_KEY, newRefresh)
      original.headers.Authorization = `Bearer ${accessToken}`
      drainQueue(accessToken)
      return axiosInstance(original)
    } catch (refreshErr) {
      rejectQueue(refreshErr)
      useAuthStore.getState().clearAuth()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance
