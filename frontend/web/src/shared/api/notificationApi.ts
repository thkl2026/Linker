import axiosInstance from './axiosInstance'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export const notificationApi = {
  getRecent: () => axiosInstance.get<NotificationItem[]>('/api/v1/notifications'),
  markRead: (id: string) => axiosInstance.patch(`/api/v1/notifications/${id}/read`),
  markAllRead: () => axiosInstance.patch('/api/v1/notifications/read-all'),
}
