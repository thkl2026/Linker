# Linker - 보안 및 개인정보 보호 정책

> 개인정보보호법(PIPA), 정보통신망법 준수를 기본 원칙으로 한다.  
> 모든 개인정보는 수집 최소화·목적 외 사용 금지·안전한 파기 원칙을 따른다.

---

## 1. 가입 및 본인확인 절차

### 1.1 실명인증 (가입 필수)

| 단계 | 내용 |
|------|------|
| 제공 업체 | **NICE평가정보** 또는 **KCB(코리아크레딧뷰로)** 본인확인 서비스 |
| 인증 방식 | 이름 + 휴대폰 본인인증 (SKT·KT·LGU+ OTP 문자) |
| 저장 데이터 | CI(연계정보), DI(중복가입확인정보) — AES-256-GCM 암호화 후 `identity_verifications` 테이블 저장 |
| 중복 가입 차단 | `di_hash` UNIQUE INDEX — 동일인이 다른 이메일로 중복 가입 시 DB 레벨 차단 |
| 실명 활용 | 계약서 서명·정산 지급 확인 목적 한정, AI 매칭·검색에 노출 금지 |

```
가입 흐름:
① 이메일·비밀번호 입력
    ↓
② NICE/KCB 본인확인 팝업 → 이름 + 휴대폰 OTP 인증
    ↓  CI·DI 수신 및 암호화 저장
③ 2FA 설정 (TOTP 앱 QR 스캔 또는 SMS 번호 등록)
    ↓
④ OTP 6자리 입력 → 검증 성공 → 계정 활성화
```

### 1.2 2단계 인증 (2FA)

| 항목 | 내용 |
|------|------|
| 지원 방식 | **TOTP** (Google Authenticator / Authy / MS Authenticator) 또는 **SMS OTP** |
| 강제 여부 | 가입 완료 조건 — 2FA 미설정 계정은 로그인 후 설정 화면 강제 리디렉션 |
| TOTP 시드 | AES-256-GCM 암호화 후 `users.mfa_secret` 저장 |
| 백업 코드 | 8자리 코드 10개 발급, BCrypt 해시로 `users.mfa_backup_codes`(JSONB) 저장, 1회 사용 후 무효화 |
| SMS 폴백 | TOTP 앱 분실 시 SMS OTP로 로그인 후 TOTP 재등록 강제 |

### 1.3 로그인 보안

| 항목 | 정책 |
|------|------|
| 연속 실패 잠금 | 5회 연속 실패 → `locked_until = NOW() + 30분` 자동 잠금 + 이메일 알림 |
| JWT 만료 | Access Token 15분 / Refresh Token 7일 |
| 세션 무효화 | 로그아웃 시 Refresh Token Redis 블랙리스트 등록 → 즉시 무효화 |
| 비밀번호 규칙 | 최소 12자, 대소문자·숫자·특수문자 각 1개 이상 |
| 비밀번호 저장 | BCrypt (cost factor 12) — 평문 저장 절대 금지 |
| IP 기록 | 로그인 성공 시 `users.last_login_ip` 갱신, 비정상 국가/IP 감지 시 재인증 요구 |

---

## 2. 개인정보 처리 원칙

### 2.1 수집 항목 및 목적

| 항목 | 수집 목적 | 보존 기한 |
|------|-----------|-----------|
| 이메일 | 계정 식별·알림 발송 | 탈퇴 후 5년 |
| 휴대폰 | 본인인증·2FA SMS | 탈퇴 후 5년 |
| 실명 | 계약서 서명·정산 지급 확인 | 계약 종료 후 5년 |
| CI/DI | 중복 가입 방지 | 탈퇴 후 즉시 파기 |
| TOTP 시드 | 2FA 인증 | 2FA 재설정 시 즉시 파기 |
| 이력·경력 정보 | AI 스코어링·매칭 | 탈퇴 후 5년 (계약 관련 데이터) |
| 계약·정산 금액 | 정산 처리·ERP 연동 | 계약 종료 후 5년 (세법 기준) |
| 로그인 IP | 보안 감사 | 1년 |

### 2.2 암호화 기준

| 필드 | 암호화 방식 | 검색 보조 컬럼 |
|------|------------|----------------|
| 이메일 | AES-256-GCM (AWS KMS) | `email_hash` SHA-256 |
| 휴대폰 | AES-256-GCM (AWS KMS) | `phone_hash` SHA-256 |
| 실명 | AES-256-GCM (AWS KMS) | — (검색 불필요) |
| CI/DI | AES-256-GCM (AWS KMS) | `di_hash` SHA-256 |
| TOTP 시드 | AES-256-GCM (AWS KMS) | — |
| 계약 금액 | AES-256-GCM (AWS KMS) | — |

> **AWS KMS 키 정책**: 암호화 키 90일마다 자동 로테이션, 키 접근 이력 CloudTrail 기록, 키 삭제는 관리자 2인 승인 필요

### 2.3 데이터 파기

| 트리거 | 파기 대상 | 처리 방식 |
|--------|-----------|-----------|
| 회원 탈퇴 요청 | CI/DI, TOTP 시드 | 즉시 AES 키 파기 후 컬럼 NULL 처리 |
| 보존 기한 만료 (5년) | 이메일·실명·이력·계약 | 야간 Batch Job — `deleted_at` 기준 자동 파기 |
| 계약 만료 후 5년 | 계약·정산 관련 개인정보 | 동일 Batch Job |
| 파기 기록 | 모든 파기 이벤트 | `audit_logs` 기록 (GDPR Article 17 준수) |

---

## 3. 접근 통제

### 3.1 역할별 개인정보 접근 범위

| 역할 | 접근 가능 데이터 | 제한 |
|------|----------------|------|
| Talent (본인) | 본인 프로필·이력·계약·정산 전체 | 타인 정보 접근 불가 |
| PM | 매칭된 인력 이름·기술 스택·스코어·연락처 | 민감 개인정보(주민번호·급여 등) 접근 불가 |
| Procurement | 계약 당사자 정보·정산 금액 | 인력 평가·이력 상세 접근 불가 |
| Admin | 전체 (감사 목적 한정) | 모든 접근 `audit_logs` 기록 필수 |

### 3.2 개인정보 접근 로그

민감 필드(이메일·연락처·실명·계약 금액) 조회 시 별도 접근 로그 기록:

```sql
-- 개인정보 접근 시 audit_logs 자동 기록 (AOP)
action: 'PERSONAL_DATA_ACCESS'
target_type: 'users' | 'talent_profiles' | 'contracts'
after_data: { "fields": ["email", "phone"], "purpose": "contract_signing" }
```

### 3.3 제3자 제공 금지

- 수집된 개인정보는 Linker 서비스 운영 목적 외 제3자 제공 금지
- AI 모델 학습 데이터로 활용 시 사전 동의 및 익명화 필수
- ERP 연동 시 최소 필요 정보(정산 금액·지급 계좌)만 전달, 개인 식별 정보 제외

---

## 4. 네트워크 및 인프라 보안

### 4.1 AWS 보안 아키텍처

```
인터넷
  │
AWS WAF v2 (OWASP 규칙셋, SQL Injection/XSS/Rate Limit 차단)
  │
AWS Shield Standard (DDoS 방어)
  │
ALB (Public Subnet)
  │
EKS App Tier (Private Subnet)  ←→  Redis (Private)
  │
RDS PostgreSQL (Isolated Subnet, 퍼블릭 접근 완전 차단)
```

### 4.2 Rate Limiting 정책

| 엔드포인트 | 임계치 | 초과 시 |
|-----------|--------|---------|
| `POST /auth/login` | 10 req/분/IP | 429 Too Many Requests + 5분 차단 |
| `POST /auth/register/*` | 5 req/분/IP | 429 + WAF 일시 차단 |
| `POST /auth/mfa/verify` | 10 req/분/사용자 | 429 + 계정 MFA 잠금 |
| 일반 API | 300 req/분/사용자 | 429 |

### 4.3 보안 HTTP 헤더

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

---

## 5. 파일 보안

| 항목 | 정책 |
|------|------|
| 이력서·계약서 업로드 | S3 Pre-signed URL (유효 5분), Lambda 바이러스 스캔 통과 후 DB 등록 |
| 다운로드 | RBAC 검증 후 Pre-signed URL 발급 (유효 15분), 직접 S3 URL 노출 금지 |
| S3 버킷 | 퍼블릭 액세스 완전 차단, SSE-KMS 서버 사이드 암호화 |
| 파일 접근 로그 | 계약서·이력서 다운로드 시 `audit_logs` 기록 |

---

## 6. 보안 사고 대응

### 6.1 개인정보 침해 대응 절차

```
침해 감지 (CloudWatch Alert / 내부 신고)
    ↓ 즉시 (1시간 내)
① 해당 계정·서비스 격리 (IP 차단, 계정 잠금)
    ↓ 24시간 내
② 침해 범위 파악 (audit_logs, CloudTrail 분석)
③ 개인정보보호위원회 신고 (72시간 내 — 개인정보보호법 제34조)
    ↓ 72시간 내
④ 피해 당사자 개별 통지
⑤ 재발 방지 대책 수립 및 적용
```

### 6.2 모니터링 알림 조건

| 조건 | 알림 채널 |
|------|----------|
| 단일 IP에서 로그인 100회/시간 이상 실패 | PagerDuty + Slack |
| 동일 계정 개인정보 조회 건수 1,000건/시간 초과 | PagerDuty + Slack |
| S3 버킷 퍼블릭 접근 정책 변경 감지 | PagerDuty (Critical) |
| RDS 외부 접속 시도 감지 | PagerDuty (Critical) |
| DLQ 누적 메시지 10건 이상 | Slack |

---

## 7. 보안 점검 계획

| 주기 | 항목 |
|------|------|
| 매 배포 | OWASP Dependency-Check — 라이브러리 취약점 스캔 |
| 주 1회 | AWS Inspector — EKS 컨테이너 이미지 취약점 스캔 |
| 분기 1회 | 모의 침투 테스트 (외부 보안 전문 업체) |
| 반기 1회 | 개인정보 처리 현황 점검, 불필요 데이터 파기 확인 |
| 연 1회 | 개인정보 영향 평가 (PIA), 보안 정책 전면 검토 |
