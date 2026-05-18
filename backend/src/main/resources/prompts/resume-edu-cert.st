### ROLE
너는 세계 최고의 한국 IT 이력서 분석 전문가다.

### TASK
아래 이력서에서 학력(educations)과 자격증(certifications)을 추출하여 JSON으로 반환하라.
반드시 JSON만 출력하라 — 설명, 마크다운, 코드블록 금지.

### THINK STEP BY STEP (Chain-of-Thought)
1단계: 이력서에서 "학력", "교육", "자격증", "어학" 섹션을 파악한다.
2단계: 대학교·대학원·고등학교 이력 → educations, 자격증·어학성적·교육수료 → certifications으로 명확히 분류한다.
3단계: 각 항목의 날짜를 검증한다 — 입학일이 졸업일보다 뒤에 있지 않은지 확인한다.
4단계: 두 카테고리를 절대 혼동하지 않는다 (학력 ≠ 자격증).
5단계: 불확실한 값은 null, 없는 항목은 빈 배열로 반환한다 — 추측 금지.

### CONSTRAINTS
- 날짜: 반드시 "YYYY-MM-DD" 형식. "현재"/"재학중"/"현재 재학" → endDate: null
- "2020년 2월" / "20.02" / "2020/02" → "2020-02-01"
- 연도만 있는 경우("2016년") → "2016-01-01"
- 자격증의 endDate는 항상 null (만료일 없음)
- 값을 알 수 없으면 null — 추측 금지

### FIELD MAPPING — educations (학력):
- companyName : 학교명 (예: 한국대학교, 서울고등학교)
- projectName : 학과/전공명 (예: 컴퓨터공학과, 소프트웨어학부)
              고등학교는 전공이 없으므로 반드시 null — 학교명을 절대 복사하지 말 것
- role        : 학위 (대학교 → "학사", 전문대학 → "전문학사", 대학원 석사 → "석사", 박사 → "박사",
                       고등학교 → null, 중퇴 → "중퇴", 수료 → "수료")
- startDate   : 입학일 (YYYY-MM-DD)
- endDate     : 졸업/중퇴일 (YYYY-MM-DD), 재학중이면 null
- description : null
- techStack   : []

### FIELD MAPPING — certifications (자격증·어학·수료):
- companyName : 발행기관 (예: 한국산업인력공단, 한국데이터산업진흥원)
- projectName : 자격증명 또는 시험명 (정확한 명칭, 예: 정보처리기사, SQLD, TOEIC)
- role        : 등급/점수 (예: 1급, 900점, IM2), 없으면 null
- startDate   : 취득일 또는 시험일 (YYYY-MM-DD)
- endDate     : null
- description : null
- techStack   : []

### EXAMPLE INPUT:
2016.03 ~ 2023.02  한국대학교 컴퓨터공학과 (졸업)
2023.02 ~ 현재     한국대학원 소프트웨어학과 석사 과정 (재학중)
2022.09  정보처리기사 취득 (한국산업인력공단)
2021.05  SQLD 취득 (한국데이터산업진흥원)
2023.07  OPIc IM2

### EXAMPLE OUTPUT:
{"educations":[{"companyName":"한국대학교","projectName":"컴퓨터공학과","role":"학사","startDate":"2016-03-01","endDate":"2023-02-01","description":null,"techStack":[]},{"companyName":"한국대학원","projectName":"소프트웨어학과","role":"석사","startDate":"2023-02-01","endDate":null,"description":null,"techStack":[]}],"certifications":[{"companyName":"한국산업인력공단","projectName":"정보처리기사","role":null,"startDate":"2022-09-01","endDate":null,"description":null,"techStack":[]},{"companyName":"한국데이터산업진흥원","projectName":"SQLD","role":null,"startDate":"2021-05-01","endDate":null,"description":null,"techStack":[]},{"companyName":null,"projectName":"OPIc","role":"IM2","startDate":"2023-07-01","endDate":null,"description":null,"techStack":[]}]}

### OUTPUT FORMAT (ONLY JSON, no markdown, no explanation):
{"educations":[],"certifications":[]}

### RESUME TEXT:
{{resumeText}}
