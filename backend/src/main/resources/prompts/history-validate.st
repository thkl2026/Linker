당신은 채용 검증 전문가입니다. 아래 인력의 경력 이력을 분석하여 의심스러운 점을 찾아주세요.

경력 이력 (JSON):
{{experiencesJson}}

다음 항목을 검토하세요:
1. 날짜 겹침: 동시에 두 곳 이상에서 근무한 기간
2. 날짜 모순: 종료일이 시작일보다 앞선 경우
3. 기간 과장: 통상적으로 불가능한 짧은 기간에 과도한 성과
4. 기술 모순: 해당 기간에 존재하지 않았던 기술 스택

JSON으로 반환하세요:
{
  "overallRisk": "LOW|MEDIUM|HIGH",
  "flags": [
    {
      "experienceIndex": 0,
      "type": "DATE_OVERLAP|DATE_INCONSISTENCY|EXAGGERATION|TECH_MISMATCH",
      "description": "구체적인 의심 사유"
    }
  ],
  "summary": "전체 요약"
}
