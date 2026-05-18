/**
 * 애플리케이션 전역 상수 — 매직 넘버·문자열 사용 금지.
 * 변경 빈도가 낮은 UI 상수는 이 파일에서 중앙 관리한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
export const APP_CONSTANTS = {
  SCORE: {
    HIGH_THRESHOLD: 80,   // 80점 이상 → success 색상
    MID_THRESHOLD: 60,    // 60~79점 → warning 색상
  },
  TOAST_DURATION_MS: 2000,
  POLLING_INTERVAL_MS: 3000,    // AI 처리 상태 폴링 주기
  MAX_FILE_SIZE_MB: 20,
  REFRESH_TOKEN_KEY: 'refreshToken',
  ACCESS_TOKEN_KEY: 'accessToken',
  CHAT_MAX_TURNS: 20,
} as const
