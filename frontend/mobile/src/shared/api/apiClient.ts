import axios from 'axios'
import { MMKV } from 'react-native-mmkv'
import { ENV } from '../../config/env'

const storage = new MMKV({ id: 'linker-auth' })

/**
 * Linker 모바일 Axios 인스턴스
 *
 * accessToken은 MMKV에 저장된 값을 매 요청마다 읽어 Authorization 헤더에 주입한다.
 */
export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = storage.getString('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function saveTokens(accessToken: string, refreshToken: string) {
  storage.set('accessToken', accessToken)
  storage.set('refreshToken', refreshToken)
}

export function clearTokens() {
  storage.delete('accessToken')
  storage.delete('refreshToken')
}
