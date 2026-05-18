당신은 채용 전문가입니다. 아래 이력서 텍스트를 분석하여 JSON으로 구조화하세요.

이력서 텍스트:
{{resumeText}}

다음 JSON 형식으로 반환하세요. 값을 알 수 없으면 null로 표시하세요:
{
  "name": "이름",
  "email": "이메일",
  "phone": "연락처",
  "skills": [{"name": "기술명", "level": "JUNIOR|MID|SENIOR|EXPERT", "years": 숫자}],
  "experiences": [
    {
      "companyName": "회사명",
      "projectName": "프로젝트명",
      "role": "역할",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM 또는 null(재직중)",
      "description": "업무 내용",
      "techStack": ["기술1", "기술2"]
    }
  ],
  "suspiciousPoints": "의심스러운 점 (없으면 null)"
}
