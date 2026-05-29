export const TALENT_MOCK = {
  total: 142,
  available: 58,
  busy: 71,
  rest: 13,
  newThisMonth: 7,
  avgRate: 620,
  byCategory: [
    { label: '개발자',  count: 84, color: 'bg-blue-500' },
    { label: 'PM',     count: 18, color: 'bg-violet-500' },
    { label: 'DBA',    count: 12, color: 'bg-emerald-500' },
    { label: 'DA',     count: 11, color: 'bg-amber-500' },
    { label: 'AA',     count: 9,  color: 'bg-rose-500' },
    { label: 'UI/UX',   count: 5, color: 'bg-pink-400' },
    { label: '기획자',  count: 3,  color: 'bg-slate-400' },
  ],
  byGrade: [
    { label: '특급', count: 19, color: 'bg-red-500' },
    { label: '고급', count: 38, color: 'bg-orange-500' },
    { label: '중급', count: 52, color: 'bg-yellow-500' },
    { label: '초급', count: 27, color: 'bg-green-500' },
    { label: '입문', count: 6,  color: 'bg-blue-400' },
  ],
  monthlyNew: [
    { month: '11월', count: 4 }, { month: '12월', count: 6 },
    { month: '1월',  count: 3 }, { month: '2월',  count: 8 },
    { month: '3월',  count: 5 }, { month: '4월',  count: 11 },
    { month: '5월',  count: 7 },
  ],
  topSkills: [
    { skill: 'Java',        count: 61 },
    { skill: 'Spring Boot', count: 54 },
    { skill: 'React',       count: 48 },
    { skill: 'Python',      count: 39 },
    { skill: 'SQL',         count: 37 },
    { skill: 'AWS',         count: 31 },
    { skill: 'Docker',      count: 28 },
    { skill: 'Kubernetes',  count: 19 },
  ],
}

export const PROJECT_MOCK = {
  total: 47,
  open: 14,
  matched: 21,
  closed: 9,
  cancelled: 3,
  avgHeadcount: 4.2,
  byMonth: [
    { month: '11월', open: 3, closed: 2 }, { month: '12월', open: 4, closed: 1 },
    { month: '1월',  open: 5, closed: 3 }, { month: '2월',  open: 6, closed: 4 },
    { month: '3월',  open: 8, closed: 5 }, { month: '4월',  open: 7, closed: 6 },
    { month: '5월',  open: 14, closed: 9 },
  ],
  topClients: [
    { name: 'SKT',         count: 8, rate: 93 },
    { name: 'LG CNS',      count: 6, rate: 87 },
    { name: 'KB금융',      count: 5, rate: 91 },
    { name: '삼성SDS',     count: 5, rate: 89 },
    { name: '현대오토에버', count: 4, rate: 85 },
    { name: '신한금융',    count: 3, rate: 96 },
  ],
  byWorkType: [
    { label: '상주', count: 29, color: 'bg-blue-500' },
    { label: '재택', count: 11, color: 'bg-emerald-500' },
    { label: '혼합', count: 7,  color: 'bg-amber-500' },
  ],
}

export const REVENUE_MOCK = {
  totalMonthly: 4_230,
  avgRate: 620,
  yoy: +12.4,
  byMonth: [
    { month: '11월', amount: 3_180 }, { month: '12월', amount: 3_420 },
    { month: '1월',  amount: 2_950 }, { month: '2월',  amount: 3_560 },
    { month: '3월',  amount: 3_910 }, { month: '4월',  amount: 4_080 },
    { month: '5월',  amount: 4_230 },
  ],
  byRateBand: [
    { label: '300만 미만',  count: 12, color: 'bg-slate-400' },
    { label: '300~500만',   count: 38, color: 'bg-blue-400' },
    { label: '500~700만',   count: 57, color: 'bg-blue-600' },
    { label: '700~900만',   count: 28, color: 'bg-violet-500' },
    { label: '900만 이상',  count: 7,  color: 'bg-rose-500' },
  ],
  byReferral: [
    { name: '직접 발굴',  count: 61, pct: 43 },
    { name: '지인 추천',  count: 38, pct: 27 },
    { name: '헤드헌팅',   count: 24, pct: 17 },
    { name: '공고',       count: 12, pct: 8 },
    { name: '기타',       count: 7,  pct: 5 },
  ],
}

export const EVAL_MOCK = {
  avgScore: 4.1,
  totalReviews: 89,
  highPerformers: 31,
  avgCollab: 4.2,
  avgTech: 3.9,
  avgReliable: 4.3,
  byMonth: [
    { month: '11월', avg: 3.8 }, { month: '12월', avg: 3.9 },
    { month: '1월',  avg: 4.0 }, { month: '2월',  avg: 4.1 },
    { month: '3월',  avg: 4.0 }, { month: '4월',  avg: 4.2 },
    { month: '5월',  avg: 4.1 },
  ],
  topTalents: [
    { name: '김**', category: '개발자', grade: '특급', score: 4.9, reviews: 7 },
    { name: '이**', category: 'PM',     grade: '고급', score: 4.8, reviews: 5 },
    { name: '박**', category: '개발자', grade: '특급', score: 4.7, reviews: 9 },
    { name: '최**', category: 'DBA',    grade: '고급', score: 4.6, reviews: 4 },
    { name: '정**', category: 'DA',     grade: '중급', score: 4.5, reviews: 6 },
  ],
  distribution: [
    { label: '5점',     count: 18 },
    { label: '4~5점',   count: 34 },
    { label: '3~4점',   count: 28 },
    { label: '3점 미만', count: 9 },
  ],
}
