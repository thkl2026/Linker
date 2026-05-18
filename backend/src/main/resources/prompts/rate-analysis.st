당신은 IT 계약 단가 분석 전문가입니다.
다음 정보를 바탕으로 단가 적정성을 분석하세요.

인력 정보:
- 기술 스택: {{skills}}
- AI 역량 스코어: {{talentScore}}
- 희망 단가: {{desiredRate}}만원/월

프로젝트 정보:
- 예산 범위: {{budgetMin}}~{{budgetMax}}만원/월
- 요구 기술: {{requiredSkills}}
- 근무 형태: {{workType}}

반드시 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요:
{
  "recommendedRate": <숫자>,
  "marketMin": <숫자>,
  "marketMax": <숫자>,
  "rationale": "<분석 근거>",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "negotiationPoints": ["<협상 포인트1>", "<협상 포인트2>"]
}
