/**
 * 인증 관련 타입 정의
 *
 * @rule 그라운드룰 Rule 2: 역할·상태 값은 Enum 형태의 const로 관리
 */

export type UserRole = 'TALENT' | 'PM' | 'PROCUREMENT' | 'SYSTEM_ADMIN' | 'SERVICE_ADMIN'
export type MfaType = 'TOTP' | 'SMS'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
  mfaEnabled: boolean
  identityVerified: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  /** MFA 챌린지 토큰 — 2단계 OTP 검증에 사용 */
  mfaChallengeToken: string
}

export interface MfaVerifyRequest {
  mfaChallengeToken: string
  otpCode: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: UserRole
  userId: string
  name: string
  mfaEnabled: boolean
  identityVerified: boolean
}

export interface RegisterInitiateRequest {
  email: string
  password: string
  role: UserRole
}
