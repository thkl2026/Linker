-- 연봉(연간) 단위로 잘못 입력된 희망 단가를 월 단가로 환산 (÷ 12)
-- 기준: 월 단가로 보기에 비합리적으로 큰 값(10,000,000원 초과)을 연봉으로 간주
UPDATE talent_profiles
SET desired_rate = ROUND(desired_rate / 12)
WHERE desired_rate > 10000000;
