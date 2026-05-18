import axiosInstance from './axiosInstance'

export type AdminUserRole = 'ADMIN' | 'PM' | 'PROCUREMENT'

export interface UserSummary {
  id: string
  email: string
  role: AdminUserRole
  isActive: boolean
  isLocked: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface CreateUserRequest {
  email: string
  password: string
  role: AdminUserRole
}

export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type AvailabilityStatus = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE'

export interface TalentAdmin {
  id: string
  userId: string
  name: string
  phone: string | null
  availabilityStatus: AvailabilityStatus
  workType: WorkType
  desiredRate: number | null
  totalScore: number | null
  skills: string[]
  birthDate?: string
  email?: string
  address?: string
  skillGrade?: string
}

export interface CreateTalentRequest {
  name: string
  phone?: string
  workType?: WorkType
  desiredRate?: number
  skills?: string[]
  birthDate?: string
  email?: string
  address?: string
  skillGrade?: string
  educations?: any[]
  companyExps?: any[]
  projectExps?: any[]
  certifications?: any[]
}

export interface DashboardStats {
  admins: number
  pm: number
  procurement: number
  talents: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export const adminApi = {
  getStats: () =>
    axiosInstance.get<DashboardStats>('/api/v1/admin/stats'),

  // 사용자 관리
  listUsers: (params?: { role?: AdminUserRole; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<UserSummary>>('/api/v1/admin/users', { params }),

  createUser: (req: CreateUserRequest) =>
    axiosInstance.post<string>('/api/v1/admin/users', req),

  deactivateUser: (id: string) =>
    axiosInstance.put(`/api/v1/admin/users/${id}/deactivate`),

  activateUser: (id: string) =>
    axiosInstance.put(`/api/v1/admin/users/${id}/activate`),

  resetPassword: (id: string, password: string) =>
    axiosInstance.put(`/api/v1/admin/users/${id}/reset-password`, { password }),

  // 전문가 관리
  listTalents: (params?: { keyword?: string; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<TalentAdmin>>('/api/v1/admin/talents', { params }),

  createTalent: (req: CreateTalentRequest) =>
    axiosInstance.post<string>('/api/v1/admin/talents', req),

  updateTalent: (id: string, req: CreateTalentRequest) =>
    axiosInstance.put(`/api/v1/admin/talents/${id}`, req),

  deleteTalent: (id: string) =>
    axiosInstance.delete(`/api/v1/admin/talents/${id}`),
}
