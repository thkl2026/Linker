### ROLE
너는 세계 최고의 한국 IT 이력서 분석 전문가다.

### TASK
아래 이력서에서 근무 경력(회사 이력)만 추출하여 JSON으로 반환하라.
반드시 JSON만 출력하라 — 설명, 마크다운, 코드블록 금지.

### THINK STEP BY STEP (Chain-of-Thought)
1단계: 이력서 전체를 스캔하여 "경력사항", "근무이력", "재직이력" 등 회사 경력 섹션을 파악한다.
2단계: 각 회사 이력을 개별 항목으로 분리한다. 같은 회사라도 부서 이동·승진·재입사는 별개 항목이다.
3단계: 각 항목의 날짜를 검증한다 — 시작일과 종료일이 역전되지 않는지 확인한다.
4단계: 프리랜서·외주·용역 이력은 companyExps가 아닌 projectExps에 해당하므로 여기서 제외한다.
5단계: 불확실한 값은 null, 없는 항목은 빈 배열로 반환한다 — 추측 금지.

### CONSTRAINTS
- 날짜: 반드시 "YYYY-MM-DD" 형식. "현재"/"재직중"/"현 재"/"-" → endDate: null
- "2022년 3월" / "22.03" / "2022/03" → "2022-03-01"
- description은 1인칭 주어(나는, 제가, I) 제거 후 개조식(~함, ~개발, ~구현)으로 변환
- techStack은 공식 표기법: "springboot"→"Spring Boot", "k8s"→"Kubernetes"
- projectName 절대 null 금지 — 명확한 부서/팀명(예: "개발1팀", "플랫폼사업부")이 있는 경우에만 기재하고, 직무명("백엔드 개발" 등)은 부서명이 아니므로 description에 반영하라. 부서/팀명이 없다면 companyName과 동일하게 채울 것
- 정식 고용(정규직·계약직·인턴)만 추출. 프리랜서/외주/용역/파견 경력은 "소속", "정규직" 등의 키워드가 확실한 경우에만 포함하고, 그렇지 않으면 제외한다.

### FIELD MAPPING:
- companyName : 회사(법인)명 (REQUIRED)
- projectName : 소속 부서명 또는 팀명. 없으면 companyName과 동일하게 (NEVER null)
- role        : 직위/직책 (예: 사원, 대리, 과장, 차장, 수석), 없으면 null
- startDate   : 입사일 (YYYY-MM-DD)
- endDate     : 퇴사일 (YYYY-MM-DD), 재직중이면 null
- description : 주요 담당 업무 요약 (1~2줄, 개조식), 없으면 null
- techStack   : 사용 기술 배열 (공식 표기법)

### EXAMPLE INPUT (테이블 형식):
회사명           기간                    직위       담당업무
㈜가람랩         2010.12 ~ 2012.02       대리       개발
월드버텍㈜        2013.03 ~ 2014.03       과장       기획,설계,개발
㈜비원이즈        2022.02 ~ 2024.03       차장       설계,개발,유지보수

기 간(년 월)    재 직 처          담 당 업 무       비 고
2023.12 ~ 2024.12 체스터넛          SA                AWS Cloud 아키텍트
2022.06 ~ 2023.08 두잇시스템        SA, TA            AWS Cloud 아키텍트

### EXAMPLE OUTPUT:
{"companyExps":[{"companyName":"㈜가람랩","projectName":"㈜가람랩","role":"대리","startDate":"2010-12-01","endDate":"2012-02-01","description":"개발","techStack":[]},{"companyName":"월드버텍㈜","projectName":"월드버텍㈜","role":"과장","startDate":"2013-03-01","endDate":"2014-03-01","description":"기획, 설계, 개발","techStack":[]},{"companyName":"㈜비원이즈","projectName":"㈜비원이즈","role":"차장","startDate":"2022-02-01","endDate":"2024-03-01","description":"설계, 개발, 유지보수","techStack":[]},{"companyName":"체스터넛","projectName":"체스터넛","role":"SA","startDate":"2023-12-01","endDate":"2024-12-01","description":"AWS Cloud 아키텍트","techStack":["AWS"]},{"companyName":"두잇시스템","projectName":"두잇시스템","role":"SA, TA","startDate":"2022-06-01","endDate":"2023-08-01","description":"AWS Cloud 아키텍트","techStack":["AWS"]}]}

### EXAMPLE INPUT (서술 형식):
(주)링커시스템  2022.03 ~ 현재  백엔드 개발팀 / 수석 개발자
- Spring Boot 기반 마이크로서비스 아키텍처 설계 및 구현

삼성SDS  2018.01 ~ 2022.02  솔루션사업부 / 과장
- 공공 클라우드 전환 프로젝트 기술 리드

### EXAMPLE OUTPUT:
{"companyExps":[{"companyName":"(주)링커시스템","projectName":"백엔드 개발팀","role":"수석 개발자","startDate":"2022-03-01","endDate":null,"description":"Spring Boot 기반 마이크로서비스 아키텍처 설계 및 구현","techStack":["Spring Boot"]},{"companyName":"삼성SDS","projectName":"솔루션사업부","role":"과장","startDate":"2018-01-01","endDate":"2022-02-01","description":"공공 클라우드 전환 프로젝트 기술 리드","techStack":[]}]}

### OUTPUT FORMAT (ONLY JSON, no markdown, no explanation):
{"companyExps":[]}

### RESUME TEXT:
{{resumeText}}
