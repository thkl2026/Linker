# 이력서 자동 분석 정확성 개선 방안

> 대상 코드: `ResumeAnalysisService.java` (서비스 관리자 직접 업로드 플로우)  
> AI: Google Gemini API (`gemini-2.5-flash-lite`), 직접 REST 호출, 4개 병렬 파싱

---

## 1. 현재 구조 요약

```
파일 업로드 (PDF/DOCX/TXT)
    └─ 텍스트 추출 (Apache PDFBox / Apache POI)
         └─ 4개 병렬 Gemini 호출
              ├─ parseBasicInfo()   → name, phone, email, birthDate, address, skillGrade, skills
              ├─ parseEduCert()     → educations[], certifications[]
              ├─ parseCompanyExp()  → companyExps[]
              └─ parseProjectExp()  → projectExps[]
         └─ 결과 병합 → ResumeAnalysisResult 반환
              └─ resume_analysis_logs 테이블 저장
```

**재직자 플로우** (`ResumeParseService.java`)는 MinIO에서 다운로드 후 LangChain4j + `resume-parse.st` 템플릿 사용. 서비스 관리자 플로우와 별도로 관리됨.

---

## 2. 현재 문제점 진단

### 2-1. 프롬프트 품질

| 문제 | 현황 |
|---|---|
| Few-shot 예시 없음 | 프롬프트에 예시 입출력 없이 포맷 규칙만 존재 |
| 도메인 어휘 없음 | IT 직군 분류(AA/TA/DA/DBA 등) 기준이 프롬프트에 없음 |
| 추론 항목 미지정 | `workType`, `desiredRate`, `category`, `field`는 프롬프트에서 요청하지 않음 |
| 모호한 날짜 처리 | `YYYY-MM-DD` 포맷 강제하나 `2024년 3월`, `24.03` 등 다양한 입력 처리 불명확 |
| 프롬프트 하드코딩 | Java 소스에 직접 문자열로 존재 → 수정 시 재배포 필요 |

### 2-2. 텍스트 추출

| 문제 | 현황 |
|---|---|
| 이미지형 PDF | OCR 없음 → 스캔본 이력서에서 텍스트 추출 불가 |
| 테이블/다단 레이아웃 | PDFBox의 기본 추출은 테이블 셀 순서가 뒤섞이는 경우 존재 |
| DOCX 스타일드 템플릿 | 표 안에 작성된 이력서는 Apache POI 추출 시 순서 보장 안 됨 |
| 재직자 플로우의 BT/ET 파싱 | `ResumeParseService`가 PDFBox 대신 BT/ET 오퍼레이터 수동 파싱 → 단편적 텍스트 추출 |

### 2-3. 후처리 및 검증 없음

- Gemini가 반환한 JSON이 스키마에 맞지 않아도 그대로 사용
- 날짜 역전(startDate > endDate), 미래 날짜 등 논리 오류 미검증
- 필드 값이 빈 문자열(`""`) vs `null` 혼재
- `workType`, `category`, `field`가 허용된 enum 값인지 확인 없음

### 2-4. 피드백 루프 없음

- 관리자가 분석 결과를 수정해도 어떤 필드가 틀렸는지 기록하지 않음
- 정확도 측정 지표 없음 → 개선 효과를 알 수 없음
- `resume_analysis_logs`에 rawContent는 저장하나 사후 보정 내역은 저장 안 됨

---

## 3. 개선 방법

### 방법 A. 프롬프트 개선 (즉시 적용 가능, 효과 大)

#### A-1. Few-shot 예시 추가

각 파싱 프롬프트에 실제 입력/출력 예시 1~2개를 포함.

```
### EXAMPLE INPUT:
홍길동 | Java 개발자 | 010-1234-5678
(주)링커솔루션 2022.03 ~ 2024.12 백엔드 개발팀 수석 개발자
Spring Boot, Kafka, Redis 활용 실시간 알림 시스템 구축

### EXAMPLE OUTPUT:
{"companyName":"(주)링커솔루션","projectName":"백엔드 개발팀","role":"수석 개발자",
 "startDate":"2022-03-01","endDate":"2024-12-01","description":"실시간 알림 시스템 구축",
 "techStack":["Spring Boot","Kafka","Redis"]}
```

#### A-2. `parseBasicInfo`에 분류 항목 추가

현재 `category`, `field`, `workType`, `desiredRate`는 AI가 추출하지 않음.  
`parseBasicInfo` 프롬프트에 아래 항목 추가:

```
### CLASSIFICATION RULES:
- category: 아래 중 하나로 분류 ["AA", "TA", "DA", "DBA", "DEVELOPER", "DESIGNER", "PLANNER"]
  - AA(Application Architect): 애플리케이션 설계/아키텍처 담당
  - TA(Technical Architect): 기술 스택/인프라 설계
  - DA(Data Architect): 데이터 모델링/데이터 설계
  - DBA(Database Admin): DB 운영/튜닝
  - DEVELOPER: 일반 개발자
- workType: 이력서에 명시된 경우만 ["REMOTE","ONSITE","HYBRID"] 중 선택, 없으면 null
- desiredRate: 희망단가(원/일) 숫자만, 없으면 null

### OUTPUT FORMAT:
{"name":"","phone":"","email":"","birthDate":"YYYY-MM-DD","address":"",
 "skillGrade":"","skills":[],"category":null,"field":null,"workType":null,"desiredRate":null}
```

#### A-3. 날짜 정규화 규칙 명시

```
### DATE RULES:
- 날짜는 반드시 "YYYY-MM-DD" 형식으로 변환
- "현재", "재직중", "present" → endDate를 null로 처리
- "2024년 3월" → "2024-03-01"
- "24.03" → "2024-03-01"
- 연도만 있는 경우("2023년") → "2023-01-01"
```

#### A-4. 프롬프트를 `.st` 파일로 이관

`ResumeParseService`가 이미 `PromptLoader`를 사용하는 패턴을 따라,  
`ResumeAnalysisService`의 하드코딩 프롬프트도 `resources/prompts/` 폴더로 이관.

```
resources/prompts/
├── resume-basic-info.st       ← parseBasicInfo 프롬프트
├── resume-edu-cert.st         ← parseEduCert 프롬프트
├── resume-company-exp.st      ← parseCompanyExp 프롬프트
├── resume-project-exp.st      ← parseProjectExp 프롬프트
└── resume-parse.st            ← 기존 재직자 플로우 (현재 존재)
```

재배포 없이 프롬프트 수정 → 즉각 효과 확인 가능.

---

### 방법 B. 모델 업그레이드 (비용 상승, 정확도 大폭 향상)

현재 `gemini-2.5-flash-lite`는 속도/비용 최적화 모델.  
복잡한 이력서 레이아웃과 다양한 작성 방식에는 한계 존재.

| 모델 | 정확도 | 속도 | 비용 |
|---|---|---|---|
| `gemini-2.5-flash-lite` (현재) | ★★★☆☆ | 매우 빠름 | 저렴 |
| `gemini-2.5-flash` | ★★★★☆ | 빠름 | 중간 |
| `gemini-2.5-pro` | ★★★★★ | 느림 | 비쌈 |

**권장**: 분석 결과가 비즈니스 의사결정에 활용되는 만큼 `gemini-2.5-flash`로 업그레이드.  
`application.yml`의 `linker.ai.llm-model` 값만 변경하면 즉시 적용됨.

---

### 방법 C. 후처리 검증 레이어 추가

`ResumeAnalysisService.analyze()` 반환 전에 검증 단계 삽입.

```java
// 제안: ResumeAnalysisValidator.java 신규 작성
public class ResumeAnalysisValidator {

    public ResumeAnalysisResult validate(ResumeAnalysisResult raw) {
        return new ResumeAnalysisResult(
            normalizeName(raw.name()),
            normalizePhone(raw.phone()),       // 010-0000-0000 형식 통일
            validateEnum(raw.workType(), WorkType.class),
            validatePositive(raw.desiredRate()),
            validateEnum(raw.category(), TalentCategory.class),
            validateEnum(raw.field(), TalentField.class),
            deduplicateSkills(raw.skills()),   // 중복 제거, 대소문자 정규화
            normalizeDate(raw.birthDate()),
            normalizeEmail(raw.email()),
            raw.address(),
            raw.skillGrade(),
            validateExps(raw.educations()),    // startDate <= endDate 검증
            validateExps(raw.companyExps()),
            validateExps(raw.projectExps()),
            validateExps(raw.certifications())
        );
    }

    private List<ResumeAnalysisResult.Exp> validateExps(List<ResumeAnalysisResult.Exp> exps) {
        // 날짜 역전 감지, 빈 projectName 제거, 미래 startDate 플래그
    }
}
```

---

### 방법 D. 피드백 루프 구축 (정확도 측정 + 지속 개선)

#### D-1. 보정 내역 로깅

관리자가 분석 결과를 수정하여 저장할 때, 원본 AI 결과와 최종 저장값의 차이를 기록.

**신규 테이블**: `resume_correction_logs`

```sql
CREATE TABLE resume_correction_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_log_id UUID REFERENCES resume_analysis_logs(id),
    talent_id   UUID,
    field_name  VARCHAR(50),   -- 'name', 'skills', 'companyExps[0].projectName' 등
    ai_value    TEXT,          -- AI가 추출한 값
    human_value TEXT,          -- 관리자가 수정한 최종 값
    corrected_at TIMESTAMPTZ DEFAULT now()
);
```

#### D-2. 정확도 지표 산출

```sql
-- 필드별 AI 정확도 조회
SELECT
    field_name,
    COUNT(*) AS total_corrections,
    ROUND(
        100.0 * SUM(CASE WHEN ai_value = human_value THEN 1 ELSE 0 END) / COUNT(*),
        1
    ) AS accuracy_pct
FROM resume_correction_logs
GROUP BY field_name
ORDER BY accuracy_pct ASC;
```

가장 오류율 높은 필드를 파악 → 해당 필드 프롬프트 집중 개선.

#### D-3. 프론트엔드 연동

`TalentCareerPage`에서 기본정보 저장 시 (`updateMutation.mutate(form)`),  
분석 로그 ID와 수정된 필드를 함께 전송하여 D-1 테이블에 기록.

---

### 방법 E. 텍스트 추출 품질 향상

#### E-1. 재직자 플로우 BT/ET 파서 → PDFBox 교체

`ResumeParseService`의 커스텀 BT/ET 파싱을 `ResumeAnalysisService`와 동일하게  
Apache PDFBox(`PDDocument`, `PDFTextStripper`)로 통일.

```java
// 현재 (ResumeParseService - 취약한 방식)
// BT, ET 사이 텍스트 수동 추출

// 개선 후
try (PDDocument doc = PDDocument.load(pdfBytes)) {
    PDFTextStripper stripper = new PDFTextStripper();
    stripper.setSortByPosition(true);  // 레이아웃 순서 보장
    return stripper.getText(doc);
}
```

#### E-2. 이미지형 PDF 대응 (OCR)

스캔본 이력서는 텍스트 추출 결과가 빈 문자열.  
텍스트 길이가 임계값(예: 100자) 미만이면 OCR 경로로 전환.

```java
String text = extractText(file);
if (text.length() < 100) {
    text = ocrService.extract(file);  // Google Cloud Vision API 또는 Tesseract
}
```

---

## 4. 우선순위별 구현 로드맵

| 순위 | 방법 | 예상 효과 | 구현 난이도 | 비용 변화 |
|---|---|---|---|---|
| ★1 | **A-3** 날짜 규칙 명시 | 날짜 파싱 오류 80% 감소 | 낮음 (프롬프트만) | 없음 |
| ★2 | **A-2** category/field AI 추출 | 수작업 분류 제거 | 낮음 (프롬프트만) | 없음 |
| ★3 | **A-4** 프롬프트 파일 이관 | 운영 중 튜닝 가능 | 낮음 | 없음 |
| ★4 | **C** 후처리 검증 레이어 | 잘못된 값 자동 보정 | 중간 | 없음 |
| ★5 | **B** 모델 업그레이드 | 전반적 정확도 향상 | 낮음 (설정만) | 약 3~5배 증가 |
| ★6 | **D** 피드백 루프 | 장기적 지속 개선 | 높음 (DB+프론트) | 없음 |
| ★7 | **A-1** Few-shot 예시 추가 | 구조화 정확도 향상 | 낮음 (프롬프트만) | 토큰 약 20% 증가 |
| ★8 | **E-1** PDFBox 통일 | 재직자 플로우 개선 | 중간 | 없음 |
| ★9 | **E-2** OCR 연동 | 스캔본 이력서 지원 | 높음 | 추가 API 비용 |

---

## 5. 즉시 적용 가능한 프롬프트 개선 예시

### `parseBasicInfo` — 수정 전/후 비교

**현재:**
```
### TASK: 아래 이력서에서 반드시 '이름'과 '개인정보'를 추출하세요.
### OUTPUT FORMAT (ONLY JSON):
{"name":"","phone":"","email":"","birthDate":"YYYY-MM-DD","address":"","skillGrade":"","skills":[]}
```

**개선 후:**
```
### ROLE: 한국 IT 업계 이력서 분석 전문가

### TASK: 아래 이력서에서 개인정보, 기술정보, 직군 분류를 추출하세요.

### DATE RULES:
- "현재"/"재직중"/"present" → null
- "2024년 3월" / "24.03" / "2024/03" → "2024-03-01"

### CATEGORY RULES (하나만 선택):
- AA: 애플리케이션 아키텍트 (설계/아키텍처 리드)
- TA: 기술 아키텍트 (인프라/기술스택 설계)
- DA: 데이터 아키텍트 (데이터 모델링/설계)
- DBA: 데이터베이스 관리자 (DB 운영/튜닝)
- DEVELOPER: 일반 개발자
- DESIGNER: UI/UX 디자이너
- PLANNER: 기획자/PM

### SKILL RULES:
- 기술명은 공식 표기법 사용 (예: "springboot" → "Spring Boot", "k8s" → "Kubernetes")
- 중복 제거

### OUTPUT FORMAT (ONLY JSON, no markdown):
{
  "name": "",
  "phone": "",
  "email": "",
  "birthDate": "YYYY-MM-DD or null",
  "address": "",
  "skillGrade": "",
  "skills": [],
  "category": "AA|TA|DA|DBA|DEVELOPER|DESIGNER|PLANNER|null",
  "field": null,
  "workType": "REMOTE|ONSITE|HYBRID|null",
  "desiredRate": null
}

### RESUME TEXT:
{resumeText}
```

---

## 6. 참고: 두 플로우 통합 고려

현재 분석 서비스가 두 개로 분리되어 중복 유지보수 발생.

| 항목 | 서비스 관리자 플로우 | 재직자 플로우 |
|---|---|---|
| 진입점 | `POST /api/v1/service-admin/talents/analyze-resume` | `POST /api/v1/upload/resume` |
| 처리 방식 | 동기 (즉시 응답) | 비동기 (jobId 폴링) |
| AI 호출 | Gemini 직접 REST, 4개 병렬 | LangChain4j, 단일 호출 |
| 텍스트 추출 | Apache PDFBox/POI | BT/ET 수동 파서 |
| 프롬프트 관리 | 하드코딩 | `.st` 파일 |

**권장**: 텍스트 추출과 후처리 검증을 공통 모듈(`ResumeTextExtractor`, `ResumeAnalysisValidator`)로 분리하여 양쪽 플로우에서 재사용.
