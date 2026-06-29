import axiosInstance from './axiosInstance'
import type { TalentCategory, TalentField } from '@/shared/types/talent'

export type { TalentCategory, TalentField }
export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'REST'
export type ProjectStatus = 'OPEN' | 'MATCHED' | 'CLOSED' | 'CANCELLED'

export interface ProjectAdmin {
  id: string
  title: string
  clientCompany: string | null
  mainContractor: string | null
  status: ProjectStatus
  pmName: string | null
  requiredHeadcount: number
  startDate: string | null
  endDate: string | null
  createdAt: string
  awardStatus: string | null
}

export interface ProjectMember {
  memberId: string
  talentId: string
  talentName: string
  role: string | null
  category: TalentCategory | null
  availabilityStatus: AvailabilityStatus | null
  skills: string
  assignedAt: string | null
  confirmed: boolean
  rejected: boolean
  givenUp: boolean
  proposedPrice: number | null
  talentSalary: number | null
}

export interface ProjectDetail extends ProjectAdmin {
  description: string | null
  workType: string | null
  budgetMin: number | null
  budgetMax: number | null
  requiredSkills: string | null
  evaluationScore: number | null
  evaluationNote: string | null
  evaluatedAt: string | null
  awardStatus: string | null
  awardAmount: number | null
  contractDate: string | null
  awardNote: string | null
  contractorContact: string | null
  members: ProjectMember[]
}

export interface ProjectStats {
  total: number
  open: number
  matched: number
}

export interface PmUser {
  id: string
  name: string | null
  department: string | null
}

export interface AdminCreateProjectRequest {
  title: string
  clientCompany?: string
  mainContractor?: string
  startDate?: string
  endDate?: string
  requiredSkills?: string
  requiredHeadcount?: number
  pmId?: string
}

export interface UpdateProjectRequest {
  title: string
  clientCompany?: string | null
  mainContractor?: string | null
  startDate?: string | null
  endDate?: string | null
  requiredHeadcount?: number
  workType?: string
  description?: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  awardStatus?: string | null
  awardAmount?: number | null
  contractDate?: string | null
  awardNote?: string | null
  contractorContact?: string | null
}

export interface TalentAdmin {
  id: string
  userId: string
  name: string
  nameEn?: string | null
  phone: string | null
  category: TalentCategory | null
  field: TalentField | null
  secondaryFields?: TalentField[]
  availabilityStatus: AvailabilityStatus
  workType: WorkType
  desiredRate: number | null
  totalScore: number | null
  skills: string[]
  birthDate?: string
  email?: string
  address?: string
  skillGrade?: string
  title?: string
  projectRole?: string | null
  notes?: string
  industryExperience?: string
  referralSource?: string
  itCareerMonths?: number | null
  photoUrl?: string | null
  resumeUrl?: string | null
}

export interface CreateTalentRequest {
  name: string
  nameEn?: string | null
  phone?: string
  category?: TalentCategory
  field?: TalentField
  secondaryFields?: TalentField[]
  workType?: WorkType
  desiredRate?: number
  skills?: string[]
  birthDate?: string
  email?: string
  address?: string
  skillGrade?: string
  title?: string
  projectRole?: string
  notes?: string
  industryExperience?: string
  referralSource?: string
  itCareerMonths?: number | null
  photoKey?: string | null
  resumeKey?: string | null
  educations?: any[]
  companyExps?: any[]
  projectExps?: any[]
  certifications?: any[]
  trainings?: any[]
}

export type EvalStatus = 'PENDING' | 'COMPLETED' | 'CRITICAL'

export interface EvaluationItem {
  id: string
  title: string
  clientCompany: string | null
  pmName: string | null
  requiredHeadcount: number
  endDate: string | null
  evalStatus: EvalStatus
  evaluationScore: number | null
  evaluatedAt: string | null
}

export interface EvaluationStats {
  avgScore: number
  pendingCount: number
  highPerformerCount: number
  monthlyFeedbackCount: number
  completionRate: number
}

export interface TalentEvalSummary {
  id: string
  name: string
  nameEn?: string | null
  category: string | null
  field: string | null
  availabilityStatus: string
  avgScore: number | null
  reviewCount: number
}

export interface TalentEvalStats {
  avgScore: number
  totalReviewed: number
  highPerformerCount: number
  monthlyCount: number
}

export interface TalentReviewHistoryItem {
  id: string
  collaborationScore: number
  technicalScore: number
  reliabilityScore: number
  avgScore: number
  comment: string | null
  createdAt: string | null
  reviewerName: string | null
}

export interface AdminReviewRequest {
  collaborationScore: number
  technicalScore: number
  reliabilityScore: number
  comment?: string
}

export interface LabelCount { label: string; count: number }
export interface MonthlyCount { month: string; count: number }

export interface DashboardStats {
  totalTalents: number
  activeProjects: number
  categoryDist: LabelCount[]
  gradeDist: LabelCount[]
  evalDist: LabelCount[]
  monthlyTrend: MonthlyCount[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ResumeAnalysisResult {
  name: string | null
  nameEn?: string | null
  phone: string | null
  workType: WorkType | null
  desiredRate: number | null
  category: TalentCategory | null
  field: TalentField | null
  skills: string[]
  birthDate?: string
  email?: string
  address?: string
  skillGrade?: string
  title?: string
  educations?: any[]
  companyExps?: any[]
  projectExps?: any[]
  certifications?: any[]
  trainings?: any[]
  itCareerMonths?: number | null
  photoKey?: string | null
  resumeKey?: string | null
}

export type RiskFlagType = 'SHORT_PROJECT' | 'GAP' | 'INCONSISTENCY' | 'TECH_MISMATCH'
export type Level3 = 'HIGH' | 'MEDIUM' | 'LOW'

export interface TalentInsightResponse {
  summary: string | null
  careerPattern: {
    consistency: Level3 | null
    consistencyReason: string | null
    shortProjectCount: number
    shortProjectRisk: Level3 | null
    gapPeriods: { fromDate: string; toDate: string; months: number; note: string }[]
    avgProjectMonths: number
    persistenceLevel: Level3 | null
    persistenceReason: string | null
  } | null
  technicalProfile: {
    coreSkills: { skill: string; type?: string; level: string; recency: string }[]
    skillBreadth: 'WIDE' | 'MEDIUM' | 'NARROW' | null
    skillDepth: 'DEEP' | 'MEDIUM' | 'SHALLOW' | null
    modernSkillRatio: number
    stackTransitionNote: string | null
  } | null
  domainProfile: {
    primaryDomain: string | null
    domains: { name: string; pct: number }[]
    domainNote: string | null
  } | null
  roleProfile: {
    primaryRole: string | null
    hasArchitectExperience: boolean
    hasLeadExperience: boolean
    roleNote: string | null
  } | null
  softSkills: {
    leadership: Level3 | null
    communication: Level3 | null
    problemSolving: Level3 | null
    summary: string | null
  } | null
  riskFlags: { type: RiskFlagType; severity: Level3; description: string }[]
  marketValue: {
    estimatedMonthlyRate: number | null
    rateRangeMin: number | null
    rateRangeMax: number | null
    scarcityLevel: Level3 | null
    rationale: string | null
  } | null
  careerRoadmap: {
    currentLevel: string | null
    nextStep: string | null
    skillGaps: string[]
    recommendedPath: string | null
  } | null
}

export type ExperienceType = 'PROJECT' | 'COMPANY' | 'EDUCATION' | 'CERTIFICATION' | 'TRAINING'
export type EmploymentType = '정규직' | '계약직' | '인턴'

export interface ExperienceRequest {
  experienceType?: ExperienceType
  companyName?: string
  projectName: string        // COMPANY: 회사명 표시제목, PROJECT: 프로젝트명
  role?: string
  department?: string        // COMPANY 전용
  employmentType?: string    // COMPANY 전용
  startDate: string          // ISO date: "2024-01-01"
  endDate?: string | null
  description?: string
  techStack?: string[]
}

export interface ExperienceResponse {
  id: string
  experienceType: ExperienceType
  companyName: string | null
  projectName: string
  role: string | null
  department: string | null
  employmentType: string | null
  startDate: string
  endDate: string | null
  description: string | null
  techStack: string[]
  isVerified: boolean
  verificationStatus: string
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface TalentReport {
  total: number; available: number; busy: number; rest: number
  newThisPeriod: number; avgRate: number
  byCategory: { label: string; count: number }[]
  byGrade:    { label: string; count: number }[]
  monthlyNew: { month: string; count: number }[]
  topSkills:  { skill: string; count: number }[]
}

export interface ProjectReport {
  total: number; open: number; matched: number; closed: number
  cancelled: number; avgHeadcount: number
  byMonth:    { month: string; open: number; closed: number }[]
  topClients: { name: string; count: number; rate: number }[]
  byWorkType: { label: string; count: number }[]
}

export interface RevenueReport {
  totalMonthly: number; avgRate: number
  byMonth:    { month: string; amount: number }[]
  byRateBand: { label: string; count: number }[]
  byReferral: { name: string; count: number; pct: number }[]
}

export interface EvalReport {
  avgScore: number; totalReviews: number; highPerformers: number
  avgCollab: number; avgTech: number; avgReliable: number
  byMonth:     { month: string; avg: number }[]
  topTalents:  { name: string; category: string; grade: string; score: number; reviews: number }[]
  distribution: { label: string; count: number }[]
}

export interface ProjectAnalysisResult {
  title?: string
  clientCompany?: string
  mainContractor?: string
  startDate?: string
  endDate?: string
  roles?: {
    role: string
    headcount: number
    mm: number
    roleStart?: string
    roleEnd?: string
    techStack?: string
    roleDescription?: string
    skillGrade?: string
  }[]
}

export const serviceAdminApi = {
  listTalents: (params?: {
    keyword?: string
    category?: TalentCategory
    field?: TalentField
    page?: number
    size?: number
    sort?: string
  }) =>
    axiosInstance.get<PageResponse<TalentAdmin>>('/api/v1/service-admin/talents', { params }),

  createTalent: (req: CreateTalentRequest) =>
    axiosInstance.post<string>('/api/v1/service-admin/talents', req),

  updateTalent: (id: string, req: CreateTalentRequest) =>
    axiosInstance.put(`/api/v1/service-admin/talents/${id}`, req),

  updateDesiredRate: (id: string, desiredRate: number | null) =>
    axiosInstance.patch(`/api/v1/service-admin/talents/${id}/desired-rate`, { desiredRate }),

  deleteTalent: (id: string) =>
    axiosInstance.delete(`/api/v1/service-admin/talents/${id}`),

  recalculateAllGrades: () =>
    axiosInstance.post<void>('/api/v1/service-admin/talents/recalculate-grades'),

  analyzeResume: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosInstance.post<ResumeAnalysisResult>(
      '/api/v1/service-admin/talents/analyze-resume',
      fd,
    )
  },

  analyzeResumeText: (text: string) =>
    axiosInstance.post<ResumeAnalysisResult>(
      '/api/v1/service-admin/talents/analyze-text',
      { text }
    ),

  getPhotoUrl: (key: string) =>
    axiosInstance.get<{ url: string }>('/api/v1/service-admin/talents/photo-url', { params: { key } }),

  listExperiences: (talentId: string) =>
    axiosInstance.get<ExperienceResponse[]>(`/api/v1/service-admin/talents/${talentId}/experiences`),

  createExperience: (talentId: string, req: ExperienceRequest) =>
    axiosInstance.post<string>(`/api/v1/service-admin/talents/${talentId}/experiences`, req),

  updateExperience: (talentId: string, expId: string, req: ExperienceRequest) =>
    axiosInstance.put(`/api/v1/service-admin/talents/${talentId}/experiences/${expId}`, req),

  deleteExperience: (talentId: string, expId: string) =>
    axiosInstance.delete(`/api/v1/service-admin/talents/${talentId}/experiences/${expId}`),

  replaceExperiences: (talentId: string, req: CreateTalentRequest) =>
    axiosInstance.put(`/api/v1/service-admin/talents/${talentId}/experiences/bulk`, req),

  analyzeInsights: (talentId: string, keywords?: string) =>
    axiosInstance.post<{ insight: TalentInsightResponse; keywords: string | null }>(`/api/v1/service-admin/talents/${talentId}/insights`, { keywords: keywords || null }),

  getInsight: (talentId: string) =>
    axiosInstance.get<{ insight: TalentInsightResponse | null; keywords: string | null }>(`/api/v1/service-admin/talents/${talentId}/insights`),

  updateAvailability: (talentId: string, status: AvailabilityStatus, availableFrom?: string) =>
    axiosInstance.patch(`/api/v1/service-admin/talents/${talentId}/availability`, {
      status,
      availableFrom: availableFrom ?? null,
    }),

  updateBonusScore: (talentId: string, bonusScore: number, comment?: string) =>
    axiosInstance.patch(`/api/v1/service-admin/talents/${talentId}/bonus-score`, {
      bonusScore,
      comment: comment ?? null,
    }),

  listProjects: (params?: {
    keyword?: string
    status?: ProjectStatus
    page?: number
    size?: number
  }) =>
    axiosInstance.get<PageResponse<ProjectAdmin>>('/api/v1/service-admin/projects', { params }),

  getProjectStats: () =>
    axiosInstance.get<ProjectStats>('/api/v1/service-admin/projects/stats'),

  listPmUsers: () =>
    axiosInstance.get<PmUser[]>('/api/v1/service-admin/projects/pm-list'),

  getProjectDetail: (id: string) =>
    axiosInstance.get<ProjectDetail>(`/api/v1/service-admin/projects/${id}`),

  updateProject: (id: string, req: UpdateProjectRequest) =>
    axiosInstance.put<void>(`/api/v1/service-admin/projects/${id}`, req),

  assignMember: (projectId: string, talentId: string, role?: string, proposedPrice?: number | null, talentSalary?: number | null) =>
    axiosInstance.post<string>(`/api/v1/service-admin/projects/${projectId}/members`, { talentId, role, proposedPrice: proposedPrice ?? null, talentSalary: talentSalary ?? null }),

  removeMember: (projectId: string, memberId: string) =>
    axiosInstance.delete(`/api/v1/service-admin/projects/${projectId}/members/${memberId}`),

  updateMember: (projectId: string, memberId: string, req: { role?: string | null; proposedPrice?: number | null; talentSalary?: number | null }) =>
    axiosInstance.put(`/api/v1/service-admin/projects/${projectId}/members/${memberId}`, req),

  confirmMember: (projectId: string, memberId: string) =>
    axiosInstance.patch(`/api/v1/service-admin/projects/${projectId}/members/${memberId}/confirm`),

  rejectMember: (projectId: string, memberId: string) =>
    axiosInstance.patch(`/api/v1/service-admin/projects/${projectId}/members/${memberId}/reject`),

  giveUpMember: (projectId: string, memberId: string) =>
    axiosInstance.patch(`/api/v1/service-admin/projects/${projectId}/members/${memberId}/giveup`),

  updateProjectSkills: (projectId: string, requiredSkills: string) =>
    axiosInstance.patch(`/api/v1/service-admin/projects/${projectId}/skills`, { requiredSkills }),

  changeProjectStatus: (projectId: string, status: ProjectStatus) =>
    axiosInstance.patch(`/api/v1/service-admin/projects/${projectId}/status`, { status }),

  deleteProject: (id: string) =>
    axiosInstance.delete(`/api/v1/service-admin/projects/${id}`),

  adminCreateProject: (req: AdminCreateProjectRequest) =>
    axiosInstance.post<string>('/api/v1/service-admin/projects', req),

  getDashboardStats: () =>
    axiosInstance.get<DashboardStats>('/api/v1/service-admin/dashboard/stats'),

  getEvaluationStats: () =>
    axiosInstance.get<EvaluationStats>('/api/v1/service-admin/evaluations/stats'),

  listEvaluations: (params?: { keyword?: string; evaluated?: boolean; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<EvaluationItem>>('/api/v1/service-admin/evaluations', { params }),

  evaluateProject: (id: string, score: number, note?: string) =>
    axiosInstance.patch(`/api/v1/service-admin/evaluations/${id}`, { score, note }),

  getTalentEvalStats: () =>
    axiosInstance.get<TalentEvalStats>('/api/v1/service-admin/evaluations/talent-stats'),

  listTalentsForEvaluation: (params?: { keyword?: string; category?: string; page?: number; size?: number }) =>
    axiosInstance.get<PageResponse<TalentEvalSummary>>('/api/v1/service-admin/evaluations/talents', { params }),

  submitTalentReview: (talentId: string, req: AdminReviewRequest) =>
    axiosInstance.post(`/api/v1/service-admin/evaluations/talents/${talentId}`, req),

  getTalentReviewHistory: (talentId: string) =>
    axiosInstance.get<TalentReviewHistoryItem[]>(`/api/v1/service-admin/evaluations/talents/${talentId}/history`),

  deleteReview: (talentId: string, reviewId: string) =>
    axiosInstance.delete(`/api/v1/service-admin/evaluations/talents/${talentId}/history/${reviewId}`),

  // ── Reports ────────────────────────────────────────────────────────────────
  getTalentReport: (period = '6m') =>
    axiosInstance.get<TalentReport>('/api/v1/service-admin/reports/talent', { params: { period } }),

  getProjectReport: (period = '6m') =>
    axiosInstance.get<ProjectReport>('/api/v1/service-admin/reports/project', { params: { period } }),

  getRevenueReport: (period = '6m') =>
    axiosInstance.get<RevenueReport>('/api/v1/service-admin/reports/revenue', { params: { period } }),

  getEvalReport: (period = '6m') =>
    axiosInstance.get<EvalReport>('/api/v1/service-admin/reports/evaluation', { params: { period } }),

  analyzeProjectText: (text: string) =>
    axiosInstance.post<ProjectAnalysisResult>('/api/v1/service-admin/projects/analyze', { text }),
}
