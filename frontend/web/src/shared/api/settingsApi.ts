import axiosInstance from './axiosInstance'

export interface GeneralSettings {
  platformName: string
  contactPhone: string
  feeRate: number
  logoUrl?: string | null
  companyLogoUrl?: string | null
}

export interface EvaluationMetric {
  name: string
  icon: string
  weight: number
}

export interface EvaluationSettings {
  metrics: EvaluationMetric[]
  gradeS: number
  gradeA: number
  gradeB: number
}

export interface NotificationSettings {
  evalReminderDays: number
  evalReminderEnabled: boolean
  urgentHours: number
  urgentEnabled: boolean
}

export interface ReferralAttachment {
  name: string
  key: string
}

export interface ReferralSource {
  name: string
  registrationNo: string
  contactEmail: string
  phone: string
  bankAccount: string
  attachments?: ReferralAttachment[]
}

export interface MasterData {
  contractors: string[]
  techStacks: string[]
  referralSources: ReferralSource[]
  projectRoles: string[]
}

export interface AllSettings {
  general: GeneralSettings
  evaluation: EvaluationSettings
  notifications: NotificationSettings
  masterData: MasterData
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED'

export interface InvitedUser {
  id: string
  email: string
  role: string
  status: InvitationStatus
  invitedAt: string
  acceptedAt: string | null
}

export const settingsApi = {
  getAllSettings: () =>
    axiosInstance.get<AllSettings>('/api/v1/service-admin/settings'),

  saveGeneral: (req: GeneralSettings) =>
    axiosInstance.put('/api/v1/service-admin/settings/general', req),

  saveEvaluation: (req: EvaluationSettings) =>
    axiosInstance.put('/api/v1/service-admin/settings/evaluation', req),

  saveNotifications: (req: NotificationSettings) =>
    axiosInstance.put('/api/v1/service-admin/settings/notifications', req),

  saveMasterData: (req: MasterData) =>
    axiosInstance.put('/api/v1/service-admin/settings/master-data', req),

  listInvitations: () =>
    axiosInstance.get<InvitedUser[]>('/api/v1/service-admin/settings/invitations'),

  inviteUser: (email: string, role: string) =>
    axiosInstance.post<string>('/api/v1/service-admin/settings/invitations', { email, role }),

  resendInvitation: (id: string) =>
    axiosInstance.post(`/api/v1/service-admin/settings/invitations/${id}/resend`),

  revokeInvitation: (id: string) =>
    axiosInstance.delete(`/api/v1/service-admin/settings/invitations/${id}`),

  uploadReferralAttachment: (file: File, name: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    return axiosInstance.post<ReferralAttachment>('/api/v1/service-admin/settings/attachments/upload', fd)
  },

  getAttachmentDownloadUrl: (key: string) =>
    axiosInstance.get<{ url: string }>('/api/v1/service-admin/settings/attachments/download-url', { params: { key } }),

  deleteAttachment: (key: string) =>
    axiosInstance.delete('/api/v1/service-admin/settings/attachments', { params: { key } }),
}
