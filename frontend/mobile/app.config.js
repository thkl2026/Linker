/**
 * Expo 앱 설정 — 환경 변수를 extra로 주입하여 런타임에 접근 가능하게 한다.
 *
 * @rule 그라운드룰 Rule 2: API URL 등 설정값은 환경 변수로 관리, 하드코딩 금지
 */
export default ({ config }) => ({
  ...config,
  name: 'Linker',
  slug: 'linker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFBEB',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'kr.co.linker',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFBEB',
    },
    package: 'kr.co.linker',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json.example',
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    [
      'expo-build-properties',
      {
        android: { compileSdkVersion: 34, targetSdkVersion: 34, buildToolsVersion: '34.0.0' },
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api/v1',
    wsUrl: process.env.WS_URL || 'ws://localhost:8080/ws',
    eas: { projectId: process.env.EAS_PROJECT_ID || '' },
  },
})
