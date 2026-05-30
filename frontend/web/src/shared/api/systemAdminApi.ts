import axiosInstance from './axiosInstance'

export type ManagedUserRole = 'SYSTEM_ADMIN' | 'SERVICE_ADMIN' | 'PM' | 'PROCUREMENT'

export interface UserSummary {
  id: string
  email: string
  role: ManagedUserRole
  name: string | null
  position: string | null
  department: string | null
  isActive: boolean
  isLocked: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface CreateUserRequest {
  email: string
  password: string
  role: ManagedUserRole
}

export interface UpdateUserRequest {
  name?: string
  position?: string
  department?: string
  role?: ManagedUserRole
}

export interface SystemDashboardStats {
  systemAdmins: number
  serviceAdmins: number
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

export const systemAdminApi = {
  getStats: () =>
    axiosInstance.get<SystemDashboardStats>('/api/v1/system-admin/stats'),

  listUsers: (params?: { role?: ManagedUserRole; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<UserSummary>>('/api/v1/system-admin/users', { params }),

  createUser: (req: CreateUserRequest) =>
    axiosInstance.post<string>('/api/v1/system-admin/users', req),

  deactivateUser: (id: string) =>
    axiosInstance.put(`/api/v1/system-admin/users/${id}/deactivate`),

  activateUser: (id: string) =>
    axiosInstance.put(`/api/v1/system-admin/users/${id}/activate`),

  updateUser: (id: string, req: UpdateUserRequest) =>
    axiosInstance.put(`/api/v1/system-admin/users/${id}`, req),

  resetPassword: (id: string, password: string) =>
    axiosInstance.put(`/api/v1/system-admin/users/${id}/reset-password`, { password }),
}
