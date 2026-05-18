# Linker - 개발 로그

---

## 2026-04-19 | Phase 6: 고도화 — 외부인증·자가증명·Peer Review·Grafana·E2E

### 작업 요약

외부 인증 연동(GitHub 레포 검증 + 학력 stub), GitHub 활동 분석 자가 증명 가점, 인터뷰 가이드 자동 생성(Red-flag 기반 LLM), 익명 Peer Review, Grafana 비즈니스 대시보드 + Micrometer 커스텀 메트릭, Playwright E2E 테스트(골든 패스: 로그인→매칭→계약)를 구현했다.

---

### 신규 파일 목록 (Phase 6)

#### 데이터베이스
| 파일 | 설명 |
|------|------|
| `V4__peer_reviews.sql` | peer_reviews·self_certifications 테이블 |

#### 백엔드
| 파일 | 설명 |
|------|------|
| `verification/service/ExternalVerificationService.java` | GitHub 레포 존재 확인 + 학력 수동 검증 stub |
| `verification/service/SelfCertificationService.java` | GitHub 활동 분석 → bonus_score 산출·업데이트 |
| `matching/service/InterviewGuideService.java` | FAILED 인증 Red-flag → LLM 인터뷰 가이드 생성 |
| `matching/controller/MatchingController.java` | `GET /proposals/{id}/interview-guide` 엔드포인트 추가 |
| `peerreview/domain/PeerReview.java` | Peer Review 엔티티 (1-5 검증, 익명 처리) |
| `peerreview/service/PeerReviewService.java` | 자기 평가 방지·중복 방지·익명화 서비스 |
| `peerreview/dto/PeerReviewResponse.java` | ADMIN 아닌 경우 reviewerId null 마스킹 |
| `common/metrics/LinkerMetrics.java` | Micrometer Counter/Gauge 중앙 관리 컴포넌트 |
| `common/config/WebClientConfig.java` | RestTemplate (5s 연결 / 10s 읽기 타임아웃) |
| `resources/prompts/github-analysis.st` | GitHub 활동 분석 → bonusScore JSON 프롬프트 |
| `resources/prompts/interview-guide.st` | Red-flag 기반 인터뷰 가이드 JSON 프롬프트 |

#### 모니터링
| 파일 | 설명 |
|------|------|
| `monitoring/grafana/provisioning/dashboards/dashboards.yml` | Grafana 대시보드 프로바이더 설정 |
| `monitoring/grafana/provisioning/dashboards/linker-overview.json` | JVM·API 운영 대시보드 (10 패널) |
| `monitoring/grafana/provisioning/dashboards/linker-business.json` | 비즈니스 메트릭 대시보드 (매칭·계약·타임시트·리스크) |

#### E2E 테스트
| 파일 | 설명 |
|------|------|
| `frontend/web/e2e/playwright.config.ts` | Playwright 설정 (Chromium, CI webServer 없음) |
| `frontend/web/e2e/tests/helpers.ts` | `mockApi()` — 백엔드 API 전체 인터셉트 헬퍼 |
| `frontend/web/e2e/tests/golden-path.spec.ts` | 골든 패스 6단계 + 로그아웃 테스트 |

#### CI 추가
| 변경 | 설명 |
|------|------|
| `.github/workflows/ci.yml` | `e2e` 잡 추가 (Playwright Chromium, artifact 업로드) |

---

### Micrometer 커스텀 메트릭 목록

| 메트릭 이름 | 타입 | 트리거 |
|---|---|---|
| `linker.match.proposals.created` | Counter | AI 매칭 제안 생성 시 |
| `linker.contracts.signed` | Counter | 계약 전자 서명 시 |
| `linker.timesheets.approved` | Counter | 타임시트 승인 시 |
| `linker.timesheet.anomaly.flags` | Counter | 10시간 초과 이상 감지 시 |
| `linker.risk.alerts.sent` | Counter | HIGH 리스크 SSE 발송 시 |
| `linker.ai.jobs.completed` | Counter | AI 작업 완료 시 |
| `linker.ai.jobs.failed` | Counter | AI 작업 실패 시 |
| `linker.ai.jobs.queue.size` | Gauge | AI 큐 대기 수 |

---

### Playwright E2E 골든 패스 흐름

```
1. PM 로그인 (이메일 + OTP 6자리)
2. 사이드바 '프로젝트' 링크 클릭 → /projects 이동
3. AI 매칭 실행 → 후보 카드 (김인재, similarity 0.92) 확인
4. 매칭 제안 수락 → ACCEPTED 상태 배지 확인
5. (PROCUREMENT) 계약 생성 (단가/총액 입력 → DRAFT)
6. 계약 서명 → SIGNED 상태 배지 + PDF URL 확인
+ 로그아웃 → /auth/login 리다이렉트
```

모든 백엔드 호출은 `mockApi()` 헬퍼로 인터셉트. CI에서 별도 백엔드 서버 불필요.

---

### 다음 작업 (Phase 7 — 운영 준비)

- [ ] 슬랙/이메일 알림 채널 연동 (SseEmitter → 실제 push)
- [ ] 인력 자기소개서 PDF 파싱 (Apache PDFBox)
- [ ] Rate Limiting (Bucket4j + Redis)
- [ ] OpenAPI 3.0 스펙 자동 생성 및 Swagger UI 연동

---

## 2026-04-19 | Phase 5: CI/CD·통합테스트·Web 사이드바·모바일 정산·알림

### 작업 요약

GitHub Actions CI/CD 파이프라인 강화(PostgreSQL 서비스 컨테이너 + Docker 빌드·푸시), Testcontainers 통합 테스트 3종, React Web 역할 기반 사이드바 네비게이션, 모바일 정산 현황 화면 및 알림 히스토리 화면을 구현했다.

---

### 신규 파일 목록 (Phase 5)

#### CI/CD
| 파일 | 설명 |
|------|------|
| `.github/workflows/ci.yml` | PostgreSQL 서비스 컨테이너 추가, Docker build·push 잡 추가 |
| `backend/Dockerfile` | Multi-stage build (JDK 21 builder → JRE alpine runtime) |

#### 백엔드 테스트
| 파일 | 설명 |
|------|------|
| `common/AbstractIntegrationTest.java` | Testcontainers PostgreSQL 공유 컨테이너 베이스 클래스 |
| `settlement/SettlementDomainTest.java` | Settlement 도메인 단위 테스트 — 상태 전이·금액 계산 검증 |
| `settlement/SettlementRepositoryTest.java` | SettlementRepository Testcontainers 통합 테스트 |
| `timesheet/TimesheetRepositoryTest.java` | TimesheetRepository Testcontainers 통합 테스트 |
| `test/resources/application-test.yml` | 테스트 프로파일 설정 |
| `test/resources/db/test-init.sql` | pgvector·uuid-ossp 익스텐션 초기화 |
| `test/resources/db/settlement-test-data.sql` | 정산 테스트 픽스처 |
| `test/resources/db/timesheet-test-data.sql` | 타임시트 테스트 픽스처 |

#### React Web 프론트엔드
| 파일 | 설명 |
|------|------|
| `pages/RootLayout.tsx` | 역할 기반 사이드바 + 상단 헤더 (접기/펼치기 토글) |
| `router.tsx` | 계약·정산·평가·업무보고 라우트 추가 |
| `pages/procurement/ContractListPage.tsx` | 계약 목록 진입 페이지 (ProjectSelector) |
| `pages/procurement/SettlementListPage.tsx` | 정산 현황 조회 페이지 |
| `pages/pm/EvaluationListPage.tsx` | 평가 목록 + AI 평가 등록 페이지 |
| `pages/pm/WorkReportListPage.tsx` | 업무 보고 목록 + AI 리스크 표시 페이지 |

#### React Native 모바일
| 파일 | 설명 |
|------|------|
| `app/(tabs)/settlement.tsx` | 정산 현황 탭 — 누적 지급금·월별 내역·상태 배지 |
| `app/(tabs)/notifications.tsx` | 알림 히스토리 탭 — 타입별 아이콘·읽음 처리·전체 읽음 |
| `app/(tabs)/_layout.tsx` | notifications 탭 추가 (6개 탭) |

---

### CI 파이프라인 개선 내용

```
PR/Push → main, develop

1. secret-scan        GitLeaks
2. backend            PostgreSQL·Redis 서비스 컨테이너 → Checkstyle → Build & Test
3. frontend-web       TypeScript 체크 + ESLint
4. commitlint         Conventional Commits (PR 한정)
5. docker (main only) ghcr.io/{repo}/linker-backend:{sha,latest} 이미지 빌드·푸시
```

### 통합 테스트 구조

```
AbstractIntegrationTest
  @Container static PostgreSQLContainer pgvector/pgvector:pg16
  @DynamicPropertySource → spring.datasource.url/username/password 덮어쓰기

SettlementDomainTest    — 순수 단위 테스트 (DB 없음)
SettlementRepositoryTest — @DataJpaTest + @Sql(픽스처)
TimesheetRepositoryTest  — @DataJpaTest + @Sql(픽스처)
```

---

### 다음 작업 (Phase 6 — 고도화)

- [ ] 외부 인증 연동 (학력·자격증 API) — F-1.6
- [ ] GitHub/블로그 분석 자가 증명 가점 — F-1.7
- [ ] 인터뷰 가이드 자동 생성 (Red-flag 기반) — F-2.5
- [ ] Peer Review 익명 다면 평가 — F-4.5
- [ ] Prometheus + Grafana 대시보드 설정 파일 완성
- [ ] E2E 테스트 (Playwright — 이력서 등록 → 매칭 → 계약 골든 패스)

---

## 2026-04-19 | Phase 4: 정산·평가·업무보고·React Web 대시보드

### 작업 요약

정산 워크플로우(DRAFT→APPROVED→PAID), AI 피드백 구조화 평가, 주간 업무 보고 + AI 리스크 분석(HIGH 시 SSE RISK_ALERT), React Web PM/Procurement 대시보드를 구현했다.

---

### 신규 파일 목록 (Phase 4)

#### 데이터베이스
| 파일 | 설명 |
|------|------|
| `V3__settlements.sql` | settlements 테이블 — 계약별 월 정산 마스터 |

#### 백엔드
| 파일 | 설명 |
|------|------|
| `settlement/domain/Settlement.java` | 정산 엔티티 (F-4.1) |
| `settlement/domain/SettlementStatus.java` | 정산 상태 Enum |
| `settlement/repository/SettlementRepository.java` | 계약·인력·상태별 정산 조회 |
| `settlement/dto/SettlementResponse.java` | 정산 응답 DTO |
| `settlement/service/SettlementService.java` | 타임시트 집계 → 정산 생성·승인·지급 처리 |
| `settlement/controller/SettlementController.java` | `/api/v1/settlements` REST API |
| `evaluation/domain/Evaluation.java` | 평가 엔티티 (F-4.2) |
| `evaluation/repository/EvaluationRepository.java` | 계약별 평가 조회 |
| `evaluation/dto/CreateEvaluationRequest.java` | 평가 등록 요청 DTO |
| `evaluation/dto/EvaluationResponse.java` | 평가 응답 DTO |
| `evaluation/service/EvaluationService.java` | AI 피드백 구조화 + trustScore 산출 |
| `evaluation/controller/EvaluationController.java` | `/api/v1/evaluations` REST API |
| `workreport/domain/WorkReport.java` | 주간 업무 보고 엔티티 (F-4.3) |
| `workreport/repository/WorkReportRepository.java` | 계약·인력별 보고 조회 |
| `workreport/dto/SubmitWorkReportRequest.java` | 업무 보고 등록 요청 DTO |
| `workreport/dto/WorkReportResponse.java` | 업무 보고 응답 DTO |
| `workreport/service/WorkReportService.java` | AI 리스크 분석 + HIGH 시 SSE RISK_ALERT |
| `workreport/controller/WorkReportController.java` | `/api/v1/work-reports` REST API |
| `resources/prompts/evaluate-feedback.st` | 피드백 구조화 프롬프트 (5점 척도 JSON) |
| `resources/prompts/work-report-risk.st` | 업무 보고 리스크 분석 프롬프트 |

#### React Web 프론트엔드
| 파일 | 설명 |
|------|------|
| `shared/api/matchingApi.ts` | 매칭 제안·인터뷰 API 클라이언트 |
| `shared/api/contractApi.ts` | 계약·타임시트·정산 API 클라이언트 |
| `pages/pm/ProposalListPage.tsx` | PM 대시보드 — 매칭 제안 목록 + 승낙/거절 + 인터뷰 일정 |
| `pages/procurement/ContractDashboardPage.tsx` | Procurement 대시보드 — 계약 + 타임시트 승인 + 정산 생성 |
| `pages/HomePage.tsx` | 역할 기반 대시보드 분기 (PM/PROCUREMENT/TALENT) |

---

### 정산 흐름

```
POST /api/v1/settlements?contractId=&settlementMonth=    (DRAFT — 승인 타임시트 자동 집계)
PUT  /api/v1/settlements/{id}/approve                    (APPROVED)
PUT  /api/v1/settlements/{id}/pay                        (PAID)
```

### 업무 보고 AI 흐름

```
TALENT: POST /api/v1/work-reports
  → work-report-risk.st 프롬프트 → Gemini LLM
  → riskLevel HIGH → SSE "RISK_ALERT" to procurementId
```

---

### 다음 작업 (Phase 5 예정)

- [ ] Docker Compose 전체 서비스 연동 검증 (PostgreSQL + pgvector + MinIO + Redis + ClamAV)
- [ ] 통합 테스트 (Testcontainers — DB + LLM Mock)
- [ ] CI/CD 파이프라인 (GitHub Actions — build → test → Docker push)
- [ ] React Web Sidebar/Navigation 완성
- [ ] 모바일 정산·알림 히스토리 화면

---

## 2026-04-19 | Phase 3: 계약·단가AI·타임시트·AI챗·모바일

### 작업 요약

계약 관리 CRUD + PDF 생성, 단가 분석 AI, 타임시트 등록·승인 워크플로우, AI 챗 WebSocket, React Native Talent 핵심 화면 4종을 구현했다.

---

### 신규 파일 목록 (Phase 3)

#### 백엔드
| 파일 | 설명 |
|------|------|
| `contract/domain/Contract.java` | 계약 엔티티 (DRAFT→SIGNED→TERMINATED) |
| `contract/domain/ContractStatus.java` | 계약 상태 Enum |
| `contract/repository/ContractRepository.java` | 인력·프로젝트별 계약 조회 |
| `contract/dto/CreateContractRequest.java` | 계약 생성 요청 DTO |
| `contract/dto/ContractResponse.java` | 계약 응답 DTO |
| `contract/service/ContractService.java` | 계약 CRUD + AI 단가 분석 통합 (F-3.1) |
| `contract/service/ContractPdfService.java` | OpenPDF 기반 계약서 PDF 생성 |
| `contract/service/RateAnalysisService.java` | Gemini LLM 단가 적정성 분석 (F-3.2) |
| `contract/controller/ContractController.java` | `/api/v1/contracts` REST API + PDF 다운로드 |
| `timesheet/domain/Timesheet.java` | 타임시트 엔티티 (10h 초과 이상 플래그) |
| `timesheet/domain/TimesheetStatus.java` | 타임시트 상태 Enum |
| `timesheet/repository/TimesheetRepository.java` | 계약·인력별 타임시트 조회 |
| `timesheet/dto/SubmitTimesheetRequest.java` | 타임시트 등록 요청 DTO |
| `timesheet/dto/TimesheetResponse.java` | 타임시트 응답 DTO |
| `timesheet/service/TimesheetService.java` | 등록·승인·반려 워크플로우 (F-3.3) |
| `timesheet/controller/TimesheetController.java` | `/api/v1/timesheets` REST API |
| `chat/config/WebSocketConfig.java` | STOMP WebSocket 설정 (ws://.../ws/chat) |
| `chat/dto/ChatMessage.java` | 채팅 메시지 DTO |
| `chat/service/AiChatService.java` | 세션별 대화 이력 + Gemini LLM 응답 + DB 저장 (F-6.2) |
| `chat/controller/ChatController.java` | STOMP /app/chat.send + /app/chat.close |
| `resources/prompts/rate-analysis.st` | 단가 분석 프롬프트 템플릿 |
| `resources/prompts/chat-system.st` | AI 챗 시스템 프롬프트 템플릿 |

#### 기존 파일 수정
| 파일 | 변경 내용 |
|------|------|
| `common/storage/FileStorageService.java` | `uploadBytes()` 메서드 추가 |
| `common/storage/MinioFileStorageService.java` | `uploadBytes()` 구현 (PutObjectArgs) |
| `talent/controller/TalentController.java` | `PATCH /me/availability` 모바일 전용 엔드포인트 추가 |
| `talent/service/TalentProfileService.java` | `updateMyAvailability()` 메서드 추가 |
| `build.gradle.kts` | `com.github.librepdf:openpdf:1.3.30` 추가 |

#### React Native 모바일
| 파일 | 설명 |
|------|------|
| `src/shared/api/apiClient.ts` | MMKV 기반 Axios 인스턴스 + 토큰 관리 |
| `src/shared/api/talentApi.ts` | 프로필·가용상태·타임시트 API 클라이언트 |
| `app/(tabs)/index.tsx` | 홈 화면 — 대시보드 요약 + 알림 수신 |
| `app/(tabs)/profile.tsx` | 프로필 화면 — AI 스코어 + 기술 스택 + 가용 상태 FAB |
| `app/(tabs)/work.tsx` | 업무 화면 — 타임시트 등록 폼 + 내역 목록 |
| `app/(tabs)/chat.tsx` | AI 챗 화면 — STOMP WebSocket 실시간 대화 |

---

### 계약 흐름

```
POST /api/v1/contracts          (DRAFT 생성 + AI 단가 분석)
  → RateAnalysisService          (Gemini LLM → ai_price_analysis JSONB)
PUT  /api/v1/contracts/{id}/sign (서명 → PDF 생성 → MinIO 저장)
GET  /api/v1/contracts/{id}/pdf  (PDF 다운로드 — application/pdf)
PUT  /api/v1/contracts/{id}/terminate
```

### 타임시트 흐름

```
TALENT: POST /api/v1/timesheets         (SUBMITTED, 10h↑ = aiAnomalyFlag)
PM:     PUT  /api/v1/timesheets/{id}/approve
PM:     PUT  /api/v1/timesheets/{id}/reject
```

### AI 챗 흐름

```
클라이언트 ws://{host}/ws/chat (SockJS)
STOMP SUBSCRIBE /user/topic/chat.reply
STOMP SEND      /app/chat.send  → AiChatService → Gemini 응답
STOMP SEND      /app/chat.close → chat_histories DB 저장
```

---

### 다음 작업 (Phase 4 예정)

- [ ] 정산·정산 승인 워크플로우 (settlement)
- [ ] 평가 시스템 (evaluations CRUD + AI 구조화 분석)
- [ ] 주간 업무 보고 + AI 리스크 분석 (work_reports)
- [ ] React Web 대시보드 (PM·Procurement 화면)
- [ ] Docker Compose 전체 서비스 연동 검증

---

---

## 2026-04-19 | Phase 2: AI 파이프라인 + 매칭 + SSE + 인터뷰 관리

### 작업 요약

AI 핵심 기능 전체를 구현했다. 이력서 파싱 → 임베딩 → 스코어링 → 이력검증 → pgvector 매칭 → SSE 실시간 알림 → 인터뷰 관리 CRUD 완성.

---

### 신규 파일 목록 (Phase 2)

#### 데이터베이스
| 파일 | 설명 |
|------|------|
| `V2__ai_pipeline.sql` | profile_embedding vector(768) + HNSW 인덱스, ai_jobs, match_proposals, interview_records |

#### 백엔드
| 파일 | 설명 |
|------|------|
| `talent/domain/AiJobRecord.java` | AI 작업 상태 추적 엔티티 (PENDING→PROCESSING→DONE/FAILED) |
| `talent/domain/AiJobStatus.java` | 작업 상태 Enum |
| `talent/repository/AiJobRepository.java` | 작업 상태 조회 Repository |
| `talent/dto/PresignedUrlRequest/Response.java` | Pre-signed URL 요청·응답 DTO |
| `talent/dto/ResumeParseRequest.java` | 이력서 파싱 요청 DTO |
| `talent/dto/JobStatusResponse.java` | AI 작업 상태 응답 DTO |
| `talent/service/UploadService.java` | Pre-signed URL 발급 + 파싱 요청 + 상태 조회 |
| `talent/controller/UploadController.java` | `/api/v1/upload/presigned`, `/upload/resume`, `/upload/resume/status/{jobId}` |
| `common/ai/PromptLoader.java` | `.st` 프롬프트 파일 로더 + 변수 치환 (캐싱) |
| `talent/service/ResumeParseService.java` | Gemini LLM 이력서 파싱 (F-1.1) |
| `talent/service/EmbeddingService.java` | Gemini 임베딩 생성 + pgvector 컬럼 업데이트 (F-1.4) |
| `talent/service/TalentScoringService.java` | AI 다차원 스코어링 + 콜드스타트 보정 (F-1.3) |
| `talent/service/HistoryValidationService.java` | AI 이력 검증 + Red-flag 생성 (F-1.5) |
| `common/queue/AiJobProcessor.java` | AI Worker — 작업 유형별 서비스 라우팅, SSE 완료 이벤트 발송 |
| `matching/domain/MatchProposal.java` | 매칭 제안 엔티티 |
| `matching/domain/ProposalStatus.java` | 제안 상태 Enum |
| `matching/domain/InterviewRecord.java` | 인터뷰 기록 엔티티 |
| `matching/repository/MatchProposalRepository.java` | pgvector 네이티브 유사도 쿼리 포함 |
| `matching/repository/InterviewRecordRepository.java` | 제안별 인터뷰 조회 |
| `matching/dto/MatchProposalResponse.java` | 매칭 제안 응답 DTO |
| `matching/dto/CreateInterviewRequest.java` | 인터뷰 일정 등록 DTO |
| `matching/dto/RecordInterviewResultRequest.java` | 인터뷰 결과 기록 DTO |
| `matching/service/MatchingService.java` | pgvector 검색 + LLM 매칭 이유 생성 (F-2.2) |
| `matching/service/InterviewService.java` | 인터뷰 CRUD (F-2.3) |
| `matching/controller/MatchingController.java` | `/api/v1/projects/{id}/recommendations`, `/proposals` |
| `matching/controller/InterviewController.java` | `/api/v1/proposals/{id}/interviews`, `/interviews/{id}/result` |
| `notification/service/SseEmitterRegistry.java` | SSE Emitter 사용자별 관리 |
| `notification/controller/NotificationController.java` | `GET /api/v1/notifications/stream` (text/event-stream) |

---

### AI 파이프라인 흐름

```
클라이언트
  ↓ POST /upload/presigned           → Pre-signed PUT URL 발급
  ↓ PUT {presignedUrl} (파일 직접)   → MinIO에 업로드
  ↓ POST /upload/resume              → jobId 반환 (202 Accepted)
  ↓ GET /upload/resume/status/{jobId} → 폴링 (또는 SSE)

AI Worker (Virtual Thread, @Async)
  RESUME_PARSE  → ResumeParseService (Gemini LLM)
               → EmbeddingService (pgvector 업데이트)
               → TalentScoringService (스코어 계산)
               → SSE "JOB_DONE" 이벤트 발송
```

### 매칭 흐름

```
POST /projects/{id}/recommendations
  → 프로젝트 텍스트 임베딩
  → pgvector <=> 코사인 유사도 상위 10명 선별
  → Gemini LLM matchReason + strengths + concerns + interviewGuide 생성
  → match_proposals 저장
```

---

### 다음 작업 (Phase 3)

- [ ] 계약 관리 (contracts CRUD + PDF 생성)
- [ ] 단가 분석 AI (F-3.2)
- [ ] 타임시트 등록·승인 워크플로우
- [ ] AI 챗 기반 (WebSocket + LangChain4j ConversationChain)
- [ ] React Native 모바일 Talent 핵심 화면

---

## 2026-04-19 | Phase 1 완료: TalentProfile·Project CRUD + 인프라 구현체 + React 인증 화면

### 작업 요약

Phase 1의 나머지 작업을 마무리했다. TalentProfile·ProjectOpportunity CRUD, MinIO/ClamAV 구현체, FCM 푸시 알림, React 로그인·회원가입·2FA 화면을 모두 구현했다.

---

### 신규 파일 목록 (2차)

#### 백엔드
| 파일 | 설명 |
|------|------|
| `talent/domain/TalentProfile.java` | 인력 프로필 엔티티 (AI 스코어 GENERATED ALWAYS 읽기 전용 매핑) |
| `talent/domain/TalentSkill.java` | 인력 기술 엔티티 |
| `talent/domain/AvailabilityStatus.java` | 가용 상태 Enum |
| `talent/domain/WorkType.java` | 근무 형태 Enum |
| `talent/repository/TalentProfileRepository.java` | 가용 상태·근무형태·단가 필터 JPQL 검색 |
| `talent/dto/TalentProfileResponse.java` | 응답 DTO (상위 5개 기술 정렬 포함) |
| `talent/service/TalentProfileService.java` | 프로필 CRUD + 소유자 권한 검증 |
| `talent/controller/TalentController.java` | `/api/v1/talents` REST API |
| `project/domain/ProjectOpportunity.java` | 프로젝트 기회 엔티티 (requiredSkills JSONB) |
| `project/domain/ProjectStatus.java` | 프로젝트 상태 Enum |
| `project/repository/ProjectOpportunityRepository.java` | PM별·상태별 조회 |
| `project/dto/CreateProjectRequest.java` | 등록 요청 DTO |
| `project/dto/ProjectResponse.java` | 응답 DTO |
| `project/service/ProjectService.java` | 프로젝트 기회 비즈니스 로직 |
| `project/controller/ProjectController.java` | `/api/v1/projects` REST API |
| `common/storage/MinioConfig.java` | MinIO 클라이언트 Bean 설정 (local/onprem) |
| `common/storage/MinioFileStorageService.java` | MinIO Pre-signed URL 구현체 |
| `common/storage/StorageException.java` | 파일 저장소 예외 |
| `common/scan/ClamAvVirusScanService.java` | ClamAV INSTREAM 프로토콜 스캔 구현체 |
| `common/scan/ScanException.java` | 바이러스 스캔 예외 |
| `common/notification/PushNotificationService.java` | 푸시 알림 추상화 인터페이스 |
| `common/notification/FcmConfig.java` | Firebase Admin SDK 초기화 |
| `common/notification/FcmPushNotificationService.java` | FCM 단건·사용자·멀티캐스트 발송 |
| `common/notification/PushNotificationException.java` | 푸시 알림 예외 |

#### 프론트엔드 웹
| 파일 | 설명 |
|------|------|
| `shared/api/authApi.ts` | 인증 API 함수 (registerInitiate, issueTotpSecret, completeMfaSetup, login, verifyMfa, logout) |
| `shared/components/ToastContainer.tsx` | 화면 우측 하단 토스트 알림 컴포넌트 |
| `pages/LoginPage.tsx` | 로그인 2단계 흐름 (이메일/비밀번호 → OTP 입력) |
| `pages/RegisterPage.tsx` | 회원가입 3단계 흐름 (계정 생성 → QR 스캔 → OTP 확인) |

---

### 다음 작업 (Phase 2)

- [ ] 이력서 파싱 AI 파이프라인 (LangChain4j + Gemini)
- [ ] 인력 AI 스코어링 (F-1.3)
- [ ] 매칭 제안 생성 (F-2.2, pgvector HNSW)
- [ ] 계약·타임시트·정산 도메인
- [ ] React Native Expo 공통 컴포넌트

---

## 2026-04-19 | Phase 1 시작: Gemini 구조 반영 + JWT·Auth 도메인 구현

### 작업 요약

Gemini 구조 분석에서 채택한 3가지를 반영하고, Phase 1의 인증 기반(JWT + Auth 도메인)을 구현했다.

---

### Gemini 구조 반영 (3가지)

| 항목 | 파일 | 내용 |
|------|------|------|
| **AI 프롬프트 외부화** | `resources/prompts/*.st` | 이력서 파싱·이력 검증·스코어링·매칭 이유 프롬프트 4개 — 코드 변경 없이 AI 튜닝 가능 |
| **AiConfig.java** | `common/config/AiConfig.java` | ChatModel·StreamingChatModel·EmbeddingModel Bean 등록 (Gemini API) |
| **프론트 types/store** | `shared/types/*.ts`, `store/*.ts` | TypeScript 타입 중앙화 + Zustand 인증·UI 상태 스토어 |

---

### 신규 파일 목록

#### 백엔드
| 파일 | 설명 |
|------|------|
| `common/config/JwtProperties.java` | JWT 설정 바인딩 레코드 (Rule 2) |
| `common/security/JwtTokenProvider.java` | Access/Refresh Token 생성·검증·파싱 |
| `common/security/JwtAuthenticationFilter.java` | Bearer 토큰 추출 → SecurityContext 등록 |
| `common/encryption/EnvEncryptionKeyProvider.java` | 환경 변수 기반 AES-256 키 제공자 (local/onprem Profile) |
| `common/queue/InMemoryAsyncJobQueue.java` | BlockingQueue 기반 AI 작업 큐 (local/onprem Profile) |
| `auth/domain/User.java` | 사용자 엔티티 (AES 암호화 필드, 잠금·MFA 도메인 메서드) |
| `auth/domain/UserRole.java` | 역할 Enum (TALENT/PM/PROCUREMENT/ADMIN) |
| `auth/domain/MfaType.java` | MFA 방식 Enum (TOTP/SMS) |
| `auth/repository/UserRepository.java` | 이메일 해시 기반 조회 |
| `auth/exception/AuthException.java` | 인증 도메인 예외 (자격증명·잠금·MFA·OTP) |
| `auth/service/AuthService.java` | 가입·로그인·MFA·로그아웃 비즈니스 로직 |
| `auth/service/MfaService.java` | TOTP QR 발급·검증 (Google Authenticator 호환) |
| `auth/controller/AuthController.java` | 인증 API 8개 엔드포인트 (`/api/v1/auth/**`) |
| `auth/dto/*.java` | 요청·응답 DTO 6개 |

#### 프론트엔드 웹
| 파일 | 설명 |
|------|------|
| `shared/types/auth.ts` | 인증 관련 TypeScript 타입 |
| `shared/types/talent.ts` | 인력 관련 TypeScript 타입 |
| `shared/types/common.ts` | ProblemDetail·Page·JobStatus 공통 타입 |
| `store/authStore.ts` | Zustand 인증 상태 (accessToken 메모리 보관, refreshToken persist) |
| `store/uiStore.ts` | Zustand UI 상태 (토스트·사이드바) |

---

### 로그인 흐름 구현 결과

```
가입: POST /register/initiate → POST /register/mfa-setup → POST /register/complete
로그인: POST /login → POST /mfa/verify → JWT 발급
로그아웃: POST /logout → Redis Refresh Token 삭제
```

---

### 다음 작업 (Phase 1 계속)

- [ ] TalentProfile 도메인 (Entity, Repository, Service, Controller)
- [ ] ProjectOpportunity 도메인 기본 CRUD
- [ ] MinIO Pre-signed URL 파일 업로드 + ClamAV 바이러스 스캔
- [ ] FCM 푸시 알림 기반 (`PushNotificationService`)
- [ ] React 로그인·회원가입·2FA 화면 구현

---

## 2026-04-18 | Phase 0: 개발 환경 구성 완료

### 작업 요약

Phase 0 목표인 "팀 전원이 동일한 개발 규칙·도구·로컬 환경을 갖춘 상태로 Sprint 1 진입"을 달성했다.

---

### 생성된 파일 목록

#### 루트
| 파일 | 설명 |
|------|------|
| `docker-compose.yml` | 로컬 개발 인프라 전체 (7개 서비스) |
| `.env.example` | 환경 변수 키 목록 (값 없음 — Git 공유용) |
| `.gitignore` | `.env`, 빌드 산출물, IDE 파일 제외 설정 |
| `.commitlintrc.json` | Conventional Commits 규칙 강제 |
| `.husky/commit-msg` | 커밋 메시지 훅 (commitlint 연동) |
| `package.json` | 루트 레벨 (Husky devDependency) |
| `.github/workflows/ci.yml` | GitHub Actions CI 파이프라인 |

#### 백엔드 (`backend/`)
| 파일 | 설명 |
|------|------|
| `build.gradle.kts` | Gradle 빌드 설정 (Java 21, Spring Boot 3.3) |
| `settings.gradle.kts` | 프로젝트명 설정 |
| `gradle/wrapper/gradle-wrapper.properties` | Gradle 8.8 래퍼 |
| `config/checkstyle/checkstyle.xml` | JavaDoc·매직 넘버 검사 규칙 |
| `src/main/java/.../LinkerApplication.java` | 앱 진입점 |
| `common/aop/TransactionLoggingAspect.java` | 트랜잭션 자동 로깅 AOP (Rule 1) |
| `common/storage/FileStorageService.java` | 파일 저장소 추상화 인터페이스 |
| `common/queue/AsyncJobQueue.java` | AI 작업 큐 추상화 인터페이스 |
| `common/queue/AiJob.java` | AI 작업 메시지 레코드 |
| `common/scan/VirusScanService.java` | 바이러스 스캔 추상화 인터페이스 |
| `common/encryption/EncryptionKeyProvider.java` | 암호화 키 추상화 인터페이스 |
| `common/encryption/EncryptionService.java` | AES-256-GCM 암호화/복호화/해시 |
| `common/exception/LinkerException.java` | 도메인 예외 기본 클래스 |
| `common/exception/GlobalExceptionHandler.java` | 전역 예외 처리 (RFC 9457 ProblemDetail) |
| `common/config/SecurityConfig.java` | Spring Security (JWT Stateless + CORS) |
| `resources/application.yml` | 공통 설정 |
| `resources/application-local.yml` | 개발자 PC (Docker Compose) 설정 |
| `resources/application-onprem.yml` | 내부 서버 운영 설정 |
| `resources/application-cloud.yml` | AWS 클라우드 전환 후 설정 |
| `resources/logback-spring.xml` | JSON 구조 로그 + Loki 연동 설정 |
| `resources/db/migration/V1__init_schema.sql` | Flyway 초기 스키마 (18개 테이블) |

#### 프론트엔드 웹 (`frontend/web/`)
| 파일 | 설명 |
|------|------|
| `package.json` | React 18, Vite, Tailwind, TanStack Query 등 |
| `vite.config.ts` | Vite 설정 (PWA Plugin, API 프록시, 경로 alias) |
| `tailwind.config.js` | Neo-Retro Brown 컬러 토큰 |
| `tsconfig.json` | TypeScript strict 설정 |
| `postcss.config.js` | Tailwind PostCSS 설정 |
| `index.html` | 앱 진입 HTML |
| `.env.development` | 개발 환경 API URL |
| `.env.production.example` | 운영 환경 URL 템플릿 |
| `src/main.tsx` | React 루트 (QueryClient, RouterProvider) |
| `src/index.css` | Tailwind 기본 스타일 (iOS 줌 방지 포함) |
| `src/router.tsx` | React Router v6 라우터 (lazy 로딩) |
| `src/shared/api/axiosInstance.ts` | Axios 인스턴스 (타임스탬프 인터셉터) |
| `src/shared/constants/appConstants.ts` | 전역 상수 (Rule 2) |
| `src/pages/*.tsx` | 레이아웃·페이지 플레이스홀더 |

#### 프론트엔드 모바일 (`frontend/mobile/`)
| 파일 | 설명 |
|------|------|
| `package.json` | Expo 51, React Native, NativeWind 등 |
| `app.config.js` | Expo 설정 (환경 변수 extra 주입) |
| `tailwind.config.js` | NativeWind 컬러 토큰 (웹과 동일) |
| `src/config/env.ts` | 환경 변수 접근 (Rule 2) |
| `app/_layout.tsx` | 루트 레이아웃 (GestureHandler, QueryClient) |
| `app/(tabs)/_layout.tsx` | Bottom Tab 네비게이션 (홈·챗·업무·정산·프로필) |
| `app/(tabs)/index.tsx` | 홈 탭 플레이스홀더 |

#### 모니터링 (`monitoring/`)
| 파일 | 설명 |
|------|------|
| `prometheus/prometheus.yml` | 백엔드 메트릭 스크랩 설정 |
| `loki/loki-config.yml` | 로그 수집 설정 (31일 보존) |
| `grafana/provisioning/datasources/datasources.yml` | Prometheus·Loki 데이터소스 자동 등록 |

#### 인프라 (`infra/`)
| 파일 | 설명 |
|------|------|
| `postgres/init.sql` | uuid-ossp, vector, pg_trgm 익스텐션 설치 |

---

### Docker Compose 서비스 구성

| 서비스 | 이미지 | 포트 | 용도 |
|--------|--------|------|------|
| `postgres` | pgvector/pgvector:pg16 | 5432 | PostgreSQL + pgvector |
| `redis` | redis:7-alpine | 6379 | 캐시·세션·Rate Limit |
| `minio` | minio/minio | 9000/9001 | 파일 저장소 (S3 호환) |
| `elasticsearch` | elasticsearch:8.13.0 | 9200 | 검색·필터 |
| `clamav` | clamav/clamav | 3310 | 바이러스 스캔 |
| `prometheus` | prom/prometheus | 9090 | 메트릭 수집 |
| `grafana` | grafana/grafana | 3000 | 모니터링 대시보드 |
| `loki` | grafana/loki | 3100 | 로그 수집 |

---

### Flyway V1 초기 스키마 테이블 목록 (18개)

| # | 테이블 | 설명 |
|---|--------|------|
| 1 | `users` | 전체 역할 계정 (2FA·실명인증 포함) |
| 2 | `identity_verifications` | NICE/KCB 본인확인 결과 |
| 3 | `partner_companies` | 파트너사 |
| 4 | `talent_profiles` | 인력 프로필 + AI 스코어 + 벡터 |
| 5 | `talent_skills` | 보유 기술 |
| 6 | `talent_experiences` | 인력 이력 상세 |
| 7 | `project_opportunities` | 프로젝트 기회 |
| 8 | `match_proposals` | AI 매칭 제안 |
| 9 | `interview_records` | 인터뷰 기록 |
| 10 | `contracts` | 계약 정보 |
| 11 | `timesheets` | 타임시트 |
| 12 | `work_reports` | 업무 보고 |
| 13 | `evaluations` | 피드백·평가 |
| 14 | `score_history` | AI 스코어 변동 이력 |
| 15 | `verification_logs` | 이력 진위 검증 로그 |
| 16 | `notifications` | 알림 이력 |
| 17 | `audit_logs` | 전 엔티티 감사 로그 |
| 18 | `chat_histories` | AI 챗 세션 영구 저장 |

---

### CI 파이프라인 (`.github/workflows/ci.yml`)

```
PR/Push → main, develop

1. secret-scan    GitLeaks — 시크릿 커밋 차단 (Rule 4)
2. backend        Checkstyle → Build → Unit Tests (Java 21)
3. frontend-web   TypeScript 타입 체크 + ESLint
4. commitlint     Conventional Commits 형식 검사 (PR 한정)
```

---

### 그라운드룰 준수 현황

| Rule | 항목 | 구현 |
|------|------|------|
| Rule 1 | 트랜잭션 타임스탬프 로그 | `TransactionLoggingAspect` + Logback JSON + `axiosInstance` 인터셉터 |
| Rule 2 | 하드코딩 금지 | Spring Profile 3종, `@ConfigurationProperties`, Vite env, Expo Constants |
| Rule 3 | 상세 주석 | 모든 public 클래스·메서드 JavaDoc/TSDoc, Checkstyle 검사 |
| Rule 4 | 버전 관리 | Flyway V1, commitlint + Husky, GitHub Actions GitLeaks |
| Rule 5 | 기능별 소스 분리 | 도메인 패키지 분리, `features/` 구조, `shared/` 공통 |

---

### 다음 작업 (Phase 1 — Sprint 1~3)

- [ ] 실명인증 (NICE/KCB API 연동)
- [ ] 2FA (TOTP + SMS OTP) 구현
- [ ] JWT 인증 필터 (`JwtAuthenticationFilter`)
- [ ] `users`, `talent_profiles`, `project_opportunities` 기본 CRUD API
- [ ] MinIO Pre-signed URL + ClamAV 파일 업로드
- [ ] FCM 푸시 알림 기반
- [ ] React 로그인·회원가입·2FA 화면 구현
- [ ] React Native Expo 공통 컴포넌트 (Button, Card, Bottom Sheet, Toast)
