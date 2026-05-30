export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'REST'
export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type SkillLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT'

export type TalentCategory =
  | 'DEVELOPER'
  | 'ARCHITECT'
  | 'DATA'
  | 'SECURITY'
  | 'PM'
  | 'DESIGNER'

export type TalentField =
  // DEVELOPER
  | 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'MOBILE' | 'EMBEDDED'
  // ARCHITECT
  | 'EA' | 'TA_SYSTEM' | 'TA_NETWORK' | 'TA_CLOUD' | 'AA' | 'SA' | 'DA'
  // DATA
  | 'DBA_RDBMS' | 'DBA_NOSQL' | 'DATA_ENGINEER' | 'DATA_ANALYST' | 'ML_ENGINEER'
  // SECURITY
  | 'ISMS' | 'NETWORK_SEC' | 'APP_SEC' | 'CLOUD_SEC' | 'PENTEST'
  // PM
  | 'PROJECT_MGR' | 'PMO' | 'QA'
  // DESIGNER
  | 'UX_PLANNER' | 'UI_DESIGNER'
  // 공통
  | 'ETC'

/** category → 선택 가능한 field 목록 */
export const TALENT_FIELDS_BY_CATEGORY: Record<TalentCategory, TalentField[]> = {
  DEVELOPER: ['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'EMBEDDED', 'ETC'],
  ARCHITECT: ['EA', 'TA_SYSTEM', 'TA_NETWORK', 'TA_CLOUD', 'AA', 'SA', 'DA', 'ETC'],
  DATA:      ['DBA_RDBMS', 'DBA_NOSQL', 'DATA_ENGINEER', 'DATA_ANALYST', 'ML_ENGINEER', 'ETC'],
  SECURITY:  ['ISMS', 'NETWORK_SEC', 'APP_SEC', 'CLOUD_SEC', 'PENTEST', 'ETC'],
  PM:        ['PROJECT_MGR', 'PMO', 'QA', 'ETC'],
  DESIGNER:  ['UX_PLANNER', 'UI_DESIGNER', 'ETC'],
}

export const TALENT_CATEGORY_LABELS: Record<TalentCategory, string> = {
  DEVELOPER: '개발자',
  ARCHITECT: '아키텍트',
  DATA:      '데이터',
  SECURITY:  '보안',
  PM:        '사업관리',
  DESIGNER:  'UI/UX',
}

export const TALENT_FIELD_LABELS: Record<TalentField, string> = {
  // DEVELOPER
  FRONTEND:     '프론트엔드',
  BACKEND:      '백엔드',
  FULLSTACK:    '풀스택',
  MOBILE:       '모바일',
  EMBEDDED:     '임베디드/펌웨어',
  // ARCHITECT
  EA:           'Enterprise Architect',
  TA_SYSTEM:    '시스템 TA',
  TA_NETWORK:   '네트워크 TA',
  TA_CLOUD:     '클라우드 TA',
  AA:           'Application Architect',
  SA:           'Solution Architect',
  DA:           'Data Architect',
  // DATA
  DBA_RDBMS:    'DBA (RDBMS)',
  DBA_NOSQL:    'DBA (NoSQL)',
  DATA_ENGINEER:'데이터 엔지니어',
  DATA_ANALYST: '데이터 분석가',
  ML_ENGINEER:  'AI/ML 엔지니어',
  // SECURITY
  ISMS:         '정보보안/ISMS',
  NETWORK_SEC:  '네트워크 보안',
  APP_SEC:      '애플리케이션 보안',
  CLOUD_SEC:    '클라우드 보안',
  PENTEST:      '모의해킹/취약점 진단',
  // PM
  PROJECT_MGR:  'PM',
  PMO:          'PMO/사업관리',
  QA:           '품질관리',
  // DESIGNER
  UX_PLANNER:   '기획자',
  UI_DESIGNER:  '디자이너',
  // 공통
  ETC:          '기타',
}

export const TECH_STACK_CATEGORIES: TalentCategory[] = ['DEVELOPER', 'ARCHITECT', 'DATA', 'SECURITY', 'PM', 'DESIGNER']

export interface TalentSummary {
  id: string
  name: string
  category?: TalentCategory
  field?: TalentField
  availabilityStatus: AvailabilityStatus
  totalScore: number
  skillScore: number
  reliabilityScore: number
  performanceScore: number
  topSkills: string[]
  workType: WorkType
  desiredRate?: number
}

export interface TalentScore {
  skillScore: number
  reliabilityScore: number
  performanceScore: number
  bonusScore: number
  totalScore: number
  updatedAt: string
}
