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

export interface Contact {
  name: string
  position: string
  email: string
  phone: string
  role?: string
}

export type ReferralContact = Contact

export interface Contractor {
  name: string
  registrationNo: string
  phone: string
  bankAccount: string
  attachments?: ReferralAttachment[]
  contacts?: Contact[]
}

export interface ReferralSource {
  name: string
  registrationNo: string
  contactEmail: string
  phone: string
  bankAccount: string
  attachments?: ReferralAttachment[]
  contacts?: Contact[]
}

export interface MasterData {
  contractors: Contractor[]
  techStacks: string[]
  referralSources: ReferralSource[]
  projectRoles: string[]
}

export interface SmtpSettings {
  host: string
  port: number
  username: string
  hasPassword: boolean
}

export interface AllSettings {
  general: GeneralSettings
  evaluation: EvaluationSettings
  notifications: NotificationSettings
  masterData: MasterData
  smtp: SmtpSettings
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED'

export interface InvitedUser {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  role: string
  status: InvitationStatus
  invitedAt: string
  acceptedAt: string | null
  inviteUrl?: string | null
  lastLoginAt: string | null
  lastLoginIp: string | null
  accountCreatedAt: string | null
  photoUrl?: string | null
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

  inviteUser: (email: string, company: string, role: string) =>
    axiosInstance.post<string>('/api/v1/service-admin/settings/invitations', { email, company: company || null, role }),

  resendInvitation: (id: string) =>
    axiosInstance.post(`/api/v1/service-admin/settings/invitations/${id}/resend`),

  updateInvitedUser: (id: string, req: { name?: string; phone?: string; company?: string; role?: string }) =>
    axiosInstance.put(`/api/v1/service-admin/settings/invitations/${id}`, req),

  uploadUserPhoto: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosInstance.post<{ url: string }>(`/api/v1/service-admin/settings/invitations/${id}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  revokeInvitation: (id: string) =>
    axiosInstance.delete(`/api/v1/service-admin/settings/invitations/${id}`),

  analyzeContractorDocument: (file: File, name: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    return axiosInstance.post<{
      registrationNo: string | null
      phone: string | null
      bankName: string | null
      bankAccount: string | null
      key: string
      name: string
    }>('/api/v1/service-admin/settings/attachments/analyze', fd)
  },

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

  saveSmtp: (req: { host: string; port: number; username: string; password?: string }) =>
    axiosInstance.put('/api/v1/service-admin/settings/smtp', req),
}
