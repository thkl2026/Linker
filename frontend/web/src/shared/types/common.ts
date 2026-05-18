/**
 * 공통 API 응답 타입
 */

/** RFC 9457 ProblemDetail — 백엔드 오류 응답 형식 */
export interface ProblemDetail {
  type?: string
  title?: string
  status: number
  detail: string
  errorCode?: string
  fieldErrors?: Record<string, string>
  timestamp: string
}

/** 페이지네이션 응답 래퍼 */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

/** AI 비동기 작업 상태 폴링 응답 */
export interface JobStatus {
  jobId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  resultId?: string
  errorMessage?: string
}
