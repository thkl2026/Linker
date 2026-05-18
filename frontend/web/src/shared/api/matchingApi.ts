import axiosInstance from './axiosInstance'

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface MatchProposal {
  id: string
  projectId: string
  talentId: string
  talentName?: string
  similarityScore: number
  matchReason: string
  strengths: string[]
  concerns: string[]
  interviewGuide: string[]
  status: ProposalStatus
  createdAt: string
}

export interface InterviewRecord {
  id: string
  proposalId: string
  scheduledAt: string
  location: string
  result: string | null
  notes: string | null
}

export const matchingApi = {
  generateProposals: (projectId: string) =>
    axiosInstance.post<{ created: number }>(`/api/v1/projects/${projectId}/recommendations`).then(r => r.data),

  listProposals: (projectId: string, page = 0) =>
    axiosInstance.get<{ content: MatchProposal[]; totalElements: number }>(
      `/api/v1/projects/${projectId}/proposals`, { params: { page, size: 20 } }
    ).then(r => r.data),

  respondProposal: (proposalId: string, accept: boolean) =>
    axiosInstance.put(`/api/v1/projects/proposals/${proposalId}/respond`, null, { params: { accept } }),

  scheduleInterview: (proposalId: string, scheduledAt: string, location: string) =>
    axiosInstance.post(`/api/v1/proposals/${proposalId}/interviews`, { scheduledAt, location }),

  listInterviews: (proposalId: string) =>
    axiosInstance.get<InterviewRecord[]>(`/api/v1/proposals/${proposalId}/interviews`).then(r => r.data),

  recordInterviewResult: (interviewId: string, result: 'PASS' | 'FAIL', notes: string) =>
    axiosInstance.put(`/api/v1/interviews/${interviewId}/result`, { result, notes }),
}
