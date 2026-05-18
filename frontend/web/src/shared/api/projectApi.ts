import axiosInstance from './axiosInstance'

export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type ProjectStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED'

export interface ProjectResponse {
  id: string
  title: string
  description: string | null
  requiredSkills: string | null
  budgetMin: number | null
  budgetMax: number | null
  workType: WorkType | null
  pmId: string
  status: ProjectStatus
  createdAt: string
}

export interface CreateProjectRequest {
  title: string
  description?: string
  requiredSkills?: string
  budgetMin?: number
  budgetMax?: number
  workType?: WorkType
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export const projectApi = {
  listMyProjects: (params?: { page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<ProjectResponse>>('/api/v1/projects/me', { params }),

  createProject: (req: CreateProjectRequest) =>
    axiosInstance.post<void>('/api/v1/projects', req),

  getProject: (id: string) =>
    axiosInstance.get<ProjectResponse>(`/api/v1/projects/${id}`),

  cancelProject: (id: string) =>
    axiosInstance.delete(`/api/v1/projects/${id}`),
}
