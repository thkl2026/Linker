당신은 IT 채용 인터뷰 전문가입니다.
아래 인력 정보와 Red-flag를 바탕으로 심층 인터뷰 질문을 생성하세요.

인력 프로필 요약:
{{talentSummary}}

이전 프로젝트 검증 결과 (Red-flag):
{{redFlags}}

우려사항:
{{concerns}}

요구사항: {{projectRequirements}}

다음 JSON 형식으로만 반환하세요:
{
  "questions": [
    {
      "category": "<기술역량|이력검증|협업태도|리스크확인>",
      "question": "<질문 내용>",
      "intent": "<이 질문의 의도 한 줄>"
    }
  ],
  "warningPoints": ["<면접관 주의사항1>"],
  "overallRisk": "<LOW|MEDIUM|HIGH>"
}

질문은 최소 5개, Red-flag가 있는 경우 이를 직접 검증하는 질문을 반드시 포함하세요.
