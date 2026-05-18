import axiosInstance from './axiosInstance'
import type { TalentCategory, TalentField } from '@/shared/types/talent'

export type { TalentCategory, TalentField }
export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'REST'

export interface TalentProfileResponse {
  id: string
  name: string
  category: TalentCategory | null
  field: TalentField | null
  availabilityStatus: AvailabilityStatus
  availableFrom: string | null
  totalScore: number | null
  skillScore: number | null
  reliabilityScore: number | null
  performanceScore: number | null
  workType: WorkType
  desiredRate: number | null
  topSkills: string[]
  isNewTalent: boolean
}

export interface CreateProfileRequest {
  name: string
  category?: TalentCategory
  field?: TalentField
  workType: WorkType
  desiredRate?: number
  phone?: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export const talentApi = {
  search: (params?: { workType?: WorkType; maxRate?: number; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<TalentProfileResponse>>('/api/v1/talents', { params }),

  getProfile: (id: string) =>
    axiosInstance.get<TalentProfileResponse>(`/api/v1/talents/${id}`),

  getMyProfile: () => axiosInstance.get<TalentProfileResponse>('/api/v1/talents/me'),

  createProfile: (req: CreateProfileRequest) =>
    axiosInstance.post<string>('/api/v1/talents', req),
}
