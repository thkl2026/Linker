import axiosInstance from './axiosInstance'

export type ContractStatus = 'DRAFT' | 'SIGNED' | 'EXPIRED' | 'TERMINATED'
export type TimesheetStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface Contract {
  id: string
  projectId: string
  talentId: string
  unitPrice: number
  totalAmount: number
  status: ContractStatus
  contractFileUrl: string | null
  aiPriceAnalysis: Record<string, unknown> | null
  signedAt: string | null
  createdAt: string
}

export interface Timesheet {
  id: string
  contractId: string
  talentId: string
  workDate: string
  hoursWorked: number
  workDescription: string
  status: TimesheetStatus
  aiAnomalyFlag: boolean
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
}

export interface Settlement {
  id: string
  contractId: string
  talentId: string
  settlementMonth: string
  totalHours: number
  unitPrice: number
  grossAmount: number
  deduction: number
  netAmount: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  approvedAt: string | null
  paidAt: string | null
}

export const contractApi = {
  listByProject: (projectId: string) =>
    axiosInstance.get<Contract[]>(`/api/v1/contracts/by-project/${projectId}`).then(r => r.data),

  signContract: (contractId: string) =>
    axiosInstance.put<Contract>(`/api/v1/contracts/${contractId}/sign`).then(r => r.data),

  downloadPdf: (contractId: string) =>
    axiosInstance.get(`/api/v1/contracts/${contractId}/pdf`, { responseType: 'blob' }),

  listTimesheets: (contractId: string, status?: TimesheetStatus) =>
    axiosInstance.get<Timesheet[]>(`/api/v1/timesheets/by-contract/${contractId}`, {
      params: status ? { status } : {},
    }).then(r => r.data),

  approveTimesheet: (timesheetId: string) =>
    axiosInstance.put<Timesheet>(`/api/v1/timesheets/${timesheetId}/approve`).then(r => r.data),

  rejectTimesheet: (timesheetId: string) =>
    axiosInstance.put<Timesheet>(`/api/v1/timesheets/${timesheetId}/reject`).then(r => r.data),

  generateSettlement: (contractId: string, settlementMonth: string, deduction = 0) =>
    axiosInstance.post<Settlement>('/api/v1/settlements', null, {
      params: { contractId, settlementMonth, deduction },
    }).then(r => r.data),

  listSettlements: (contractId: string) =>
    axiosInstance.get<Settlement[]>(`/api/v1/settlements/by-contract/${contractId}`).then(r => r.data),

  approveSettlement: (settlementId: string) =>
    axiosInstance.put<Settlement>(`/api/v1/settlements/${settlementId}/approve`).then(r => r.data),
}
