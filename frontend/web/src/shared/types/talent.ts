export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'REST'
export type WorkType = 'REMOTE' | 'ONSITE' | 'HYBRID'
export type SkillLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT'

export type TalentCategory = 'DEVELOPER' | 'ARCHITECT' | 'DBA' | 'PM' | 'ANALYST' | 'DESIGNER'

export type TalentField =
  // DEVELOPER
  | 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'MOBILE' | 'EMBEDDED' | 'DEVOPS'
  // ARCHITECT
  | 'SOLUTION_ARCHITECT' | 'CLOUD_ARCHITECT' | 'DATA_ARCHITECT'
  // DBA
  | 'RDBMS' | 'NOSQL' | 'DATA_ENGINEER'
  // PM
  | 'PROJECT_MANAGER' | 'PRODUCT_OWNER'
  // ANALYST
  | 'BUSINESS_ANALYST' | 'DATA_ANALYST' | 'QA'
  // DESIGNER
  | 'UI_UX' | 'GRAPHIC'

/** category → 선택 가능한 field 목록 */
export const TALENT_FIELDS_BY_CATEGORY: Record<TalentCategory, TalentField[]> = {
  DEVELOPER: ['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'EMBEDDED', 'DEVOPS'],
  ARCHITECT: ['SOLUTION_ARCHITECT', 'CLOUD_ARCHITECT', 'DATA_ARCHITECT'],
  DBA:       ['RDBMS', 'NOSQL', 'DATA_ENGINEER'],
  PM:        ['PROJECT_MANAGER', 'PRODUCT_OWNER'],
  ANALYST:   ['BUSINESS_ANALYST', 'DATA_ANALYST', 'QA'],
  DESIGNER:  ['UI_UX', 'GRAPHIC'],
}

export const TALENT_CATEGORY_LABELS: Record<TalentCategory, string> = {
  DEVELOPER: '개발자',
  ARCHITECT: '아키텍트',
  DBA:       'DBA',
  PM:        'PM',
  ANALYST:   '분석/품질',
  DESIGNER:  '디자이너',
}

export const TALENT_FIELD_LABELS: Record<TalentField, string> = {
  FRONTEND:           '프론트엔드',
  BACKEND:            '백엔드',
  FULLSTACK:          '풀스택',
  MOBILE:             '모바일',
  EMBEDDED:           '임베디드/펌웨어',
  DEVOPS:             'DevOps/인프라',
  SOLUTION_ARCHITECT: '솔루션 아키텍트',
  CLOUD_ARCHITECT:    '클라우드 아키텍트',
  DATA_ARCHITECT:     '데이터 아키텍트',
  RDBMS:              'RDBMS',
  NOSQL:              'NoSQL',
  DATA_ENGINEER:      '데이터 엔지니어',
  PROJECT_MANAGER:    'PM',
  PRODUCT_OWNER:      'PO',
  BUSINESS_ANALYST:   'BA',
  DATA_ANALYST:       '데이터 분석가',
  QA:                 'QA 엔지니어',
  UI_UX:              'UI/UX 디자이너',
  GRAPHIC:            '그래픽 디자이너',
}

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
