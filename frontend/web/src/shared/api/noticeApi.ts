import axiosInstance from './axiosInstance'

export const NOTICE_CATEGORIES = ['운영/시스템', '비즈니스/정책', '가이드/교육'] as const
export type NoticeCategory = typeof NOTICE_CATEGORIES[number]

export interface Notice {
  id: string
  title: string
  content: string
  category: string
  pinned: boolean
  hidden: boolean
  viewCount: number
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface NoticePage {
  content: Notice[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface NoticeStats {
  total: number
  pinned: number
  thisMonth: number
}

export interface CreateNoticeRequest {
  title: string
  content: string
  category: string
  pinned: boolean
  authorName: string
}

export interface UpdateNoticeRequest {
  title: string
  content: string
  category: string
  pinned: boolean
}

export const noticeApi = {
  list: (params: { category?: string; keyword?: string; page?: number; size?: number }) =>
    axiosInstance.get<NoticePage>('/api/v1/notices', { params }),

  stats: () =>
    axiosInstance.get<NoticeStats>('/api/v1/notices/stats'),

  getById: (id: string) =>
    axiosInstance.get<Notice>(`/api/v1/notices/${id}`),

  create: (req: CreateNoticeRequest) =>
    axiosInstance.post<Notice>('/api/v1/notices', req),

  update: (id: string, req: UpdateNoticeRequest) =>
    axiosInstance.put<Notice>(`/api/v1/notices/${id}`, req),

  delete: (id: string) =>
    axiosInstance.delete(`/api/v1/notices/${id}`),

  toggleHidden: (id: string) =>
    axiosInstance.patch(`/api/v1/notices/${id}/hidden`),

  togglePinned: (id: string) =>
    axiosInstance.patch(`/api/v1/notices/${id}/pinned`),
}
