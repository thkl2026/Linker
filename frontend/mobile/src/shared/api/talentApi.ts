import { apiClient } from './apiClient'

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'REST'

export interface TalentProfile {
  id: string
  name: string
  availabilityStatus: AvailabilityStatus
  desiredRate: number | null
  workType: string
  totalScore: number
  skills: { skillName: string; level: string; years: number }[]
}

export interface TimesheetPayload {
  contractId: string
  workDate: string      // YYYY-MM-DD
  hoursWorked: number
  workDescription?: string
}

export interface Timesheet {
  id: string
  contractId: string
  workDate: string
  hoursWorked: number
  workDescription: string
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  aiAnomalyFlag: boolean
  createdAt: string
}

export const talentApi = {
  getMyProfile: () =>
    apiClient.get<TalentProfile>('/api/v1/talents/me').then((r) => r.data),

  updateAvailability: (status: AvailabilityStatus) =>
    apiClient.patch('/api/v1/talents/me/availability', { status }).then((r) => r.data),

  submitTimesheet: (payload: TimesheetPayload) =>
    apiClient.post<Timesheet>('/api/v1/timesheets', payload).then((r) => r.data),

  listMyTimesheets: () =>
    apiClient.get<Timesheet[]>('/api/v1/timesheets/my').then((r) => r.data),
}
