### ROLE
너는 세계 최고의 한국 IT 이력서 분석 전문가다.

### TASK
아래 이력서에서 개인정보·기술정보·직군 분류를 추출하여 JSON으로 반환하라.
반드시 JSON만 출력하라 — 설명, 마크다운, 코드블록 금지.

### THINK STEP BY STEP (Chain-of-Thought)
1단계: 이름(name) 추출 — 아래 우선순위로 찾는다.
  ① "성명", "성 명", "이름" 레이블 바로 옆/아래 값을 최우선으로 추출한다. 공백이 포함된 한글("박 창 훈")은 공백을 제거하여 반환("박창훈").
  ② 레이블이 없으면 이력서 최상단에 단독으로 있는 2~4자 한글 이름을 찾는다.
  ③ "경력기술 프로필", "경력소개서", "SKILL INVENTORY", "이력서", "기술경력서" 같은 문서 제목은 이름이 아님 — 절대 반환 금지.
  한글 이름과 영문 이름(nameEn)이 모두 있으면 각각 추출. 영문 이름만 있으면 nameEn에 저장하고 name은 null.
  연락처·이메일·생년월일·주소는 전체 이력서에서 탐색한다.
2단계: 직위/직급(title) — "수석 개발자", "팀장", "책임 연구원", "과장" 등 현재 또는 최근 직위를 추출한다.
3단계: 기술스택 섹션 또는 경력 내 사용 기술을 모두 수집한다.
4단계: 전체 경력과 보유 기술을 종합하여 category와 field를 판단한다.
5단계: 명시된 경우에만 workType과 desiredRate를 추출한다.
6단계: 불확실한 값은 null로 반환한다 — 절대 추측하지 않는다.

### CONSTRAINTS
- 날짜는 반드시 "YYYY-MM-DD" 형식: "2024년 3월" → "2024-03-01", "24.03" → "2024-03-01"
- yyMMdd 6자리 숫자(예: "640901") → yy>50이면 19xx, yy≤50이면 20xx 세기 적용 후 "1964-09-01" 형식 반환
- yyyyMMdd 8자리 숫자(예: "19640901") → "1964-09-01" 형식 반환
- "현재" / "재직중" / "present" / "-" → null
- 연도만 있는 경우("2023년") → "2023-01-01"
- 기술명은 공식 표기법 사용: "springboot"→"Spring Boot", "k8s"→"Kubernetes", "js"→"JavaScript", "ts"→"TypeScript", "postgres"→"PostgreSQL", "nodejs"→"Node.js", "reactjs"→"React", "golang"→"Go", "vuejs"→"Vue.js", "nestjs"→"NestJS", "nextjs"→"Next.js"
- 기술 스택 중복 제거 (대소문자 무시), 소프트스킬(의사소통, 팀워크 등) 제외
- 희망단가는 월 단가(원/월)로 추출. 일 단가(원/일)이면 × 22하여 월 단가로 변환. 연봉이면 ÷ 12. 시간급이면 null
- 값을 알 수 없거나 불확실하면 반드시 null — 추측 금지
- name에 절대 금지: "경력기술", "프로필", "이력서", "기술경력", "경력소개", "기술스택", "인적사항" 등 문서 섹션 제목. 이름은 반드시 실존 인물의 성명이어야 한다. 확실하지 않으면 null.

### CATEGORY (하나만 선택, 판단 불가 시 null):
- "DEVELOPER" : 소프트웨어 개발자 (백엔드/프론트엔드/풀스택/모바일/임베디드/DevOps)
- "ARCHITECT" : 아키텍트 (솔루션/클라우드/데이터 설계)
- "DBA"       : 데이터베이스 관리자 (DB 운영·튜닝·데이터 엔지니어링)
- "PM"        : 프로젝트·제품 관리 (PM/PO)
- "ANALYST"   : 분석·품질 (BA/데이터분석가/QA)
- "DESIGNER"  : 디자인 (UI/UX·그래픽)

### FIELD (category에 맞는 것만 선택, 판단 불가 시 null):
- DEVELOPER  → FRONTEND | BACKEND | FULLSTACK | MOBILE | EMBEDDED | DEVOPS
- ARCHITECT  → SOLUTION_ARCHITECT | CLOUD_ARCHITECT | DATA_ARCHITECT
- DBA        → RDBMS | NOSQL | DATA_ENGINEER
- PM         → PROJECT_MANAGER | PRODUCT_OWNER
- ANALYST    → BUSINESS_ANALYST | DATA_ANALYST | QA
- DESIGNER   → UI_UX | GRAPHIC

### WORK TYPE (명시된 경우만, 없으면 null):
- "REMOTE" | "ONSITE" | "HYBRID"

### EXAMPLE INPUT A (헤더 형식):
홍길동
010-1234-5678 | hong@email.com | 서울시 강남구
생년월일: 1990.05.15 | 기술등급: 고급
수석 개발자 · Java 백엔드 8년 경력
기술스택: Java, Spring Boot, JPA, MySQL, Redis, AWS, Docker, k8s
희망단가: 400만원/월

### EXAMPLE OUTPUT A:
{"name":"홍길동","nameEn":"HONG GIL DONG","phone":"010-1234-5678","email":"hong@email.com","birthDate":"1990-05-15","address":"서울시 강남구","skillGrade":"고급","title":"수석 개발자","skills":["Java","Spring Boot","JPA","MySQL","Redis","AWS","Docker","Kubernetes"],"category":"DEVELOPER","field":"BACKEND","workType":null,"desiredRate":4000000}

### EXAMPLE INPUT B (표 형식, 공백 포함 이름):
경력기술 프로필
1. 신상기록
성 명 | 박 창 훈
생년월일 | 1985.03.22
연 락 처 | 010-9876-5432
이 메 일 | park@example.com
기술등급 | 중급

### EXAMPLE OUTPUT B:
{"name":"박창훈","nameEn":null,"phone":"010-9876-5432","email":"park@example.com","birthDate":"1985-03-22","address":null,"skillGrade":"중급","title":null,"skills":[],"category":null,"field":null,"workType":null,"desiredRate":null}

### EXAMPLE INPUT C (신상기록 표, yyMMdd 생년월일):
1.신상기록
성명 | 박용구 | 생년월일 | 640901 | 성별 | 남
소속회사 | 씽클레어 | 직위 | 상무
연락처 |  | email |
경력 | 30년 이상

### EXAMPLE OUTPUT C:
{"name":"박용구","nameEn":null,"phone":null,"email":null,"birthDate":"1964-09-01","address":null,"skillGrade":null,"title":"상무","skills":[],"category":null,"field":null,"workType":null,"desiredRate":null}

### OUTPUT FORMAT (ONLY JSON, no markdown, no explanation):
{"name":null,"nameEn":null,"phone":null,"email":null,"birthDate":null,"address":null,"skillGrade":null,"title":null,"skills":[],"category":null,"field":null,"workType":null,"desiredRate":null}

### RESUME TEXT:
{{resumeText}}
