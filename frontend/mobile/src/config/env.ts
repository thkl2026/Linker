import Constants from 'expo-constants'

/**
 * 모바일 환경 설정 — Expo Constants를 통해 빌드 시 주입된 값을 읽는다.
 * app.config.js의 extra 섹션에서 환경 변수를 매핑하여 사용한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
export const ENV = {
  API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl as string,
  WS_URL: Constants.expoConfig?.extra?.wsUrl as string,
} as const
