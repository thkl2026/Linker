# Linker — 초기 데이터 (Seed Data)

> **파일 위치**: `backend/src/main/resources/db/seed/seed_data.sql`  
> **실행 환경**: 개발·데모 전용 — 프로덕션 절대 금지  
> **실행 방법**: `psql -U linker -d linker -f backend/src/main/resources/db/seed/seed_data.sql`

---

## 목적

- 백엔드 개발 및 데모 시연을 위한 현실적인 초기 데이터 제공
- 전체 기능 플로우(등록→매칭→계약→타임시트→정산)를 직접 테스트 가능한 시나리오 구성
- UUID 고정으로 프론트엔드 개발 시 별도 조회 없이 바로 사용 가능

---

## 데이터 구성 요약

| 테이블 | 건수 | 비고 |
|--------|------|------|
| users | 10 | ADMIN×1, PM×2, PROCUREMENT×2, TALENT×5 |
| partner_companies | 2 | 링커소프트(PREFERRED), 넥스트테크(STANDARD) |
| talent_profiles | 5 | AI 스코어 포함 |
| talent_skills | 21 | 인력별 4~5개 스킬 |
| talent_experiences | 4 | 검증 상태 포함 |
| project_opportunities | 3 | MATCHED×1, OPEN×2 |
| match_proposals | 5 | ACCEPTED×2, PENDING×3 |
| interview_records | 1 | PASS 완료 |
| contracts | 2 | SIGNED×1, DRAFT×1 |
| timesheets | 12 | APPROVED×10, SUBMITTED×2 (이상플래그×1) |
| work_reports | 2 | LOW×1, HIGH 리스크×1 |
| evaluations | 1 | PM 평가 |
| settlements | 1 | 2026-03, APPROVED |
| score_history | 3 | 스코어 변동 이력 |
| verification_logs | 2 | PASSED×1, FAILED×1 |
| peer_reviews | 2 | 익명 다면 평가 |
| self_certifications | 1 | GitHub 분석 결과 |
| notifications | 5 | 유형별 다양 |
| audit_logs | 3 | 주요 행위 감사 |
| ai_jobs | 2 | DONE 상태 |

---

## 고정 UUID 목록

### users

| 역할 | 이름 | UUID |
|------|------|------|
| ADMIN | 관리자 | `00000000-0000-0000-0000-000000000001` |
| PM | 김성준 | `00000000-0000-0000-0000-000000000002` |
| PM | 이지현 | `00000000-0000-0000-0000-000000000003` |
| PROCUREMENT | 박수현 | `00000000-0000-0000-0000-000000000004` |
| PROCUREMENT | 최민준 | `00000000-0000-0000-0000-000000000005` |
| TALENT | 김인재 | `00000000-0000-0000-0000-000000000006` |
| TALENT | 이개발 | `00000000-0000-0000-0000-000000000007` |
| TALENT | 박서버 | `00000000-0000-0000-0000-000000000008` |
| TALENT | 최프론트 | `00000000-0000-0000-0000-000000000009` |
| TALENT | 정클라우드 | `00000000-0000-0000-0000-000000000010` |

### partner_companies

| 이름 | UUID | 등급 |
|------|------|------|
| 링커소프트(주) | `00000000-0000-0000-0001-000000000001` | PREFERRED |
| 넥스트테크(주) | `00000000-0000-0000-0001-000000000002` | STANDARD |

### talent_profiles

| 인력 | UUID | 소속 | total_score* |
|------|------|------|-------------|
| 김인재 | `00000000-0000-0000-0002-000000000001` | 링커소프트 | 90.00 |
| 이개발 | `00000000-0000-0000-0002-000000000002` | 링커소프트 | 78.10 |
| 박서버 | `00000000-0000-0000-0002-000000000003` | 넥스트테크 | 83.30 |
| 최프론트 | `00000000-0000-0000-0002-000000000004` | 넥스트테크 | 74.00 |
| 정클라우드 | `00000000-0000-0000-0002-000000000005` | 링커소프트 | 95.50 |

\* `total_score = skill×0.4 + reliability×0.3 + performance×0.3 + bonus` (GENERATED 컬럼)

### project_opportunities

| 프로젝트명 | UUID | PM | 상태 |
|-----------|------|-----|------|
| 금융 플랫폼 MSA 전환 | `00000000-0000-0000-0003-000000000001` | 김성준 | MATCHED |
| 이커머스 모바일 프론트엔드 고도화 | `00000000-0000-0000-0003-000000000002` | 이지현 | OPEN |
| ML 데이터 파이프라인 구축 | `00000000-0000-0000-0003-000000000003` | 김성준 | OPEN |

### match_proposals

| UUID | 프로젝트 | 인력 | 유사도 | 상태 |
|------|---------|------|-------|------|
| `00000000-0000-0000-0004-000000000001` | 금융MSA | 김인재 | 0.9412 | ACCEPTED |
| `00000000-0000-0000-0004-000000000002` | 금융MSA | 이개발 | 0.8834 | PENDING |
| `00000000-0000-0000-0004-000000000003` | 이커머스 | 최프론트 | 0.9156 | ACCEPTED |
| `00000000-0000-0000-0004-000000000004` | 이커머스 | 이개발 | 0.8721 | PENDING |
| `00000000-0000-0000-0004-000000000005` | ML파이프라인 | 박서버 | 0.9023 | PENDING |

### contracts

| UUID | 프로젝트 | 인력 | 단가(시간) | 상태 |
|------|---------|------|----------|------|
| `00000000-0000-0000-0005-000000000001` | 금융MSA | 김인재 | 50,000원 | SIGNED |
| `00000000-0000-0000-0005-000000000002` | 이커머스 | 최프론트 | 45,000원 | DRAFT |

---

## 시나리오 설명

### 시나리오 A — 완성된 골든 패스 (계약1)

```
[PM 김성준] 금융 플랫폼 MSA 전환 프로젝트 등록
    ↓
[AI 매칭] 김인재(0.94) / 이개발(0.88) 제안 생성
    ↓
[PM 김성준] 김인재 제안 수락
    ↓
[인터뷰] 2026-03-25, 화상, PASS
    ↓
[구매담당자 박수현] 계약 생성 (단가 50,000원/h, 총 48,000,000원)
    ↓
[구매담당자 박수현] 계약 서명 → SIGNED (2026-04-01)
    ↓
[김인재] 타임시트 제출 (2026-03, 12일치)
    ↓
[PM 김성준] 타임시트 10일 승인 (2일 대기 중)
    ↓
[김인재] 주간 업무 보고 2건 (1건 HIGH 리스크 → SSE RISK_ALERT 발송)
    ↓
[구매담당자 박수현] 3월 정산 생성 → 승인 (80h × 50,000원 = 4,000,000원)
    ↓
[PM 김성준] PM 평가 제출 (trust_score: 88.5)
```

### 시나리오 B — 진행 중 (계약2)

```
[PM 이지현] 이커머스 모바일 프론트엔드 고도화 프로젝트 등록
    ↓
[AI 매칭] 최프론트(0.92) / 이개발(0.87) 제안 생성
    ↓
[PM 이지현] 최프론트 제안 수락
    ↓
[구매담당자 최민준] 계약 초안 생성 (단가 45,000원/h) ← DRAFT 상태
    ↓ (다음 단계: 서명 대기)
```

### 시나리오 C — 신규 매칭 대기

```
[PM 김성준] ML 데이터 파이프라인 구축 프로젝트
    ↓
[AI 매칭] 박서버(0.90) 제안 생성 ← PENDING 상태
    ↓ (다음 단계: PM 검토 대기)
```

---

## AI 스코어 계산 예시

```
김인재: skill=85 × 0.4 + reliability=88 × 0.3 + performance=82 × 0.3 + bonus=5
      = 34.0 + 26.4 + 24.6 + 5.0 = 90.0

정클라우드: skill=90 × 0.4 + reliability=85 × 0.3 + performance=80 × 0.3 + bonus=6
          = 36.0 + 25.5 + 24.0 + 6.0 = 91.5
```

---

## 타임시트 이상 감지 예시

```
2026-03-18: 11.5시간 → ai_anomaly_flag = TRUE
  → LinkerMetrics.incrementTimesheetAnomalyFlags() 호출
  → Grafana linker_timesheet_anomaly_flags_total +1
```

---

## HIGH 리스크 업무 보고 예시

```
2026-03-10 주차 보고: ai_risk_level = 'HIGH'
  → SSE RISK_ALERT → PM 김성준에게 실시간 알림
  → LinkerMetrics.incrementRiskAlertsSent() 호출
  → Grafana linker_risk_alerts_sent_total +1
```

---

## 주의 사항

- `email` / `phone` 컬럼: 운영 환경에서는 AES-256-GCM 암호화 저장. 시드 데이터는 편의상 평문.
- `email_hash`: 실제 SHA-256 값이 아닌 더미 값. 운영 시 `SHA256(plaintext_email)` 적용.
- `profile_embedding` (vector 컬럼): 시드 데이터에서 NULL. 실제 임베딩은 AI 작업 완료 후 갱신.
- `total_score` / `is_new_talent`: PostgreSQL GENERATED 컬럼 — INSERT 시 명시 불가, 자동 계산.
- `password_hash`: 시드에서 NULL (OTP 기반 로그인이므로 불필요).

---

## 재실행 방법

```bash
# 1. Docker Compose가 실행 중인 경우
docker exec -i linker-postgres psql -U linker -d linker < backend/src/main/resources/db/seed/seed_data.sql

# 2. 로컬 psql 직접 실행
psql -h localhost -p 5432 -U linker -d linker -f backend/src/main/resources/db/seed/seed_data.sql

# 3. Gradle task로 실행 (build.gradle.kts에 태스크 등록 후)
./gradlew seedData
```
