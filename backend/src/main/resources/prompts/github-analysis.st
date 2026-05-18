다음은 개발자의 GitHub 프로파일 데이터입니다.
이 개발자의 실력을 0~10점 척도로 평가하고 JSON으로만 반환하세요.

GitHub 사용자명: {{username}}
공개 저장소 수: {{publicRepos}}
총 스타 수: {{totalStars}}
최근 1년 커밋 수: {{recentCommits}}
주요 언어: {{topLanguages}}
오픈소스 기여: {{contributions}}

JSON 형식 (설명 없이 JSON만):
{
  "bonusScore": <0.0~10.0, 소수점 한 자리>,
  "primaryLanguages": ["<언어1>", "<언어2>"],
  "activityLevel": "<HIGH|MEDIUM|LOW>",
  "openSourceContributor": <true|false>,
  "summary": "<한 문장 요약>"
}
