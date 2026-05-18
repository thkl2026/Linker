import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

/**
 * Axios 인스턴스 — 모든 API 요청의 기본 설정
 *
 * @rule 그라운드룰 Rule 1: 요청·응답 타임스탬프 로그 자동 기록
 * @rule 그라운드룰 Rule 2: API base URL은 환경 변수에서 주입
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 180000, // AI 분석 소요 시간을 고려하여 3분으로 연장
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

  // FormData는 브라우저가 Content-Type(+boundary)을 자동 설정하도록 헤더를 제거
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => {
    // @ts-expect-error
    const durationMs = Date.now() - response.config.metadata?.startTime
    console.info(`[RES] ${response.status} ${response.config.url} ${durationMs}ms`)
    return response
  },
  (error) => {
    console.error(`[RES_ERR] ${error.response?.status} ${error.config?.url}`, error)
    return Promise.reject(error)
  },
)

export default axiosInstance
