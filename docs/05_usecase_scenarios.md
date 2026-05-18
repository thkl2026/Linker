# Linker - 유즈케이스 시나리오

---

## UC-1.1: AI 기반 프로필 등록

**액터**: 외부 인력 (Talent)  
**사전 조건**: 회원가입 완료, 이력서(PDF/Word) 준비

### 주 흐름
```
1. Talent가 이력서 파일 업로드 (S3 저장)
2. AI 엔진(LangChain4j) PDF 파싱
   → 기술 스택, 경력 기간, 학력, 주요 프로젝트 추출
3. 파싱 결과 → talent_profiles, talent_experiences 저장
4. 임베딩 모델(OpenAI/Gemini) 호출 → profile_embedding 생성
5. F-1.5: 날짜 겹침 및 기술스택 모순 자동 검사
   → suspicious_points 기록
6. F-1.3: AI 초기 스코어 산출 (skill_score 중심)
7. Talent에게 파싱 결과 확인 화면 제공 → 수정 가능
```

---

## UC-1.6: AI 다차원 스코어링 (시스템 내부 로직)

**트리거**: 인력 정보 업데이트 또는 프로젝트 종료 후 PM 평가 완료

### 스코어 재계산 흐름
```
1. 이벤트 발생 (profile update / evaluation saved)
2. skill_score 재계산
   - 기술 숙련도: 사용 기간 × 프로젝트 복잡도 가중치
   - AI가 비정형 텍스트(설명) 분석
3. reliability_score 재계산
   - 과거 프로젝트 평점 가중 평균
   - 이력 진위 검증 결과 반영
4. performance_score 재계산
   - PM evaluations.structured_feedback KPI 집계
5. total_score GENERATED COLUMN 자동 갱신
6. profile_embedding 재생성 (변경 사항 반영)
7. score_history 이력 기록
8. 시스템 대시보드 갱신된 스코어·랭킹 표시
```

---

## UC-2.3: 사업 기회 등록 및 타겟 추천

**액터**: PM  
**사전 조건**: PM 계정 로그인, 신규 프로젝트 인력 소싱 시작

### 주 흐름
```
1. PM이 프로젝트 요구사항 입력
   - 필수 기술, 기간, 예산, 업무 범위
2. project_opportunities INSERT
3. AI 엔진이 요건 텍스트 → requirement_embedding 생성
4. 매칭 쿼리 실행:

   SELECT tp.id, tp.name, tp.total_score,
          1 - (tp.profile_embedding <=> po.requirement_embedding) AS similarity
   FROM talent_profiles tp, project_opportunities po
   WHERE po.id = :projectId
     AND tp.availability_status = 'AVAILABLE'
   ORDER BY similarity DESC, tp.total_score DESC
   LIMIT 5;

5. AI 포인트 추가 계산:
   - 과거 선호 업무 유형 분석
   - 예상 매칭 성공 확률 계산
6. match_proposals 저장 (ai_reason 포함)
7. PM에게 추천 리스트 + 추천 사유 제공
8. 후보자에게 참여 제안 알림 발송 (Slack/Mail)
```

---

## UC-2.1: 스마트 계약 프로세스

**액터**: 구매부  
**사전 조건**: PM이 최종 인력 선정 완료

### 주 흐름
```
1. 구매부가 계약 생성 요청
2. F-3.2: AI 단가 적정성 분석
   - 시장 평균 단가 조회
   - 해당 인력 과거 계약 단가 이력 비교
   - ai_price_analysis JSONB 리포트 생성
3. F-3.1: 계약서 초안 자동 생성
   - 프로젝트 정보 + 표준 계약 템플릿 결합
   - LLM으로 독소 조항 감지
   - PDF 생성 → S3 저장
4. 구매부 검토 및 단가 협상
5. contracts.status = 'SIGNED' 업데이트
6. UC-2.2: 디지털 권한 부여
   - 협업 툴 계정 자동 생성
   - 보안 권한 자동 할당
```

---

## UC-3.1: AI 기반 리스크 모니터링

**액터**: AI 엔진 (자동 실행)  
**주기**: 주간 업무 보고 제출 시

### 주 흐름
```
1. Talent가 주간 work_reports 제출
2. AI 엔진 분석:
   a) 감성 분석 → sentiment_score 산출
      - 부정적 감정 임계값 초과 → 이탈 징후 감지
   b) 진척률 추정
      - 보고 내용 vs 마일스톤 대조
      - 달성 가능 확률 산출
3. ai_risk_level 결정 (LOW/MEDIUM/HIGH)
4. HIGH 판정 시 PM에게 즉시 알림
5. ai_risk_summary 저장
```

---

## UC-4.1: 자동 정산 및 지급 승인

**액터**: 구매부  
**사전 조건**: 타임시트 승인 완료

### 주 흐름
```
1. F-4.2: 타임시트 자동 검증
   - 등록 공수 vs 실제 결과물(커밋·산출물) 대조
   - 이상 징후 시 ai_anomaly_flag = TRUE
2. F-5.1: 정산액 자동 계산
   - 승인된 timesheets 합산
   - contracts.unit_price × 공수 = 정산액
   - 정산 내역서 생성
3. F-5.2: 구매 정산 승인 워크플로우
   - 구매부 담당자 정산 내역 검토
   - 최종 승인 → ERP 시스템 지급 데이터 전송
4. Talent에게 정산 완료 알림 발송
```
