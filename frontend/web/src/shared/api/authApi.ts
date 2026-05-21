import axiosInstance from './axiosInstance'
import type {
  LoginRequest,
  RegisterInitiateRequest,
  TokenResponse,
} from '@/shared/types/auth'

export interface TotpSetupResponse {
  secretKey: string
  otpAuthUri: string
}

export interface MfaSetupRequest {
  otpCode: string
}

export const authApi = {
  /** 회원가입 1단계: 이메일·비밀번호·역할 등록 → 생성된 userId(UUID) 반환 */
  registerInitiate: (req: RegisterInitiateRequest) =>
    axiosInstance.post<string>('/api/v1/auth/register/initiate', req),

  /** 회원가입 2단계: TOTP 비밀키 발급 */
  issueTotpSecret: (userId: string) =>
    axiosInstance.post<TotpSetupResponse>(`/api/v1/auth/register/mfa-setup?userId=${userId}`),

  /** 회원가입 3단계: OTP 검증 후 계정 활성화 */
  completeMfaSetup: (userId: string, req: MfaSetupRequest) =>
    axiosInstance.post<void>(`/api/v1/auth/register/complete?userId=${userId}`, req),

  /** 로그인: 이메일·비밀번호 → JWT 토큰 발급 */
  login: (req: LoginRequest) =>
    axiosInstance.post<TokenResponse>('/api/v1/auth/login', req),

  /** 로그아웃 */
  logout: () =>
    axiosInstance.post<void>('/api/v1/auth/logout'),

  /** 초대 토큰 검증: 이메일·역할 조회 */
  getInviteInfo: (token: string) =>
    axiosInstance.get<{ email: string; role: string }>(`/api/v1/auth/invite/${token}`),

  /** 초대 수락: 비밀번호 설정 후 계정 생성 */
  acceptInvite: (token: string, password: string) =>
    axiosInstance.post<void>(`/api/v1/auth/invite/${token}/accept`, { password }),
}
