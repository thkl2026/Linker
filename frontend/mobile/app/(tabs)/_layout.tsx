import { Tabs } from 'expo-router'

/**
 * Bottom Tab 네비게이션 — Talent 앱 기준
 * Phase 5: 정산·알림 히스토리 탭 추가
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#451A03',
        tabBarInactiveTintColor: '#D6C4A8',
        tabBarStyle: { backgroundColor: '#FFF8F0', borderTopColor: '#D6C4A8' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"         options={{ title: '홈' }} />
      <Tabs.Screen name="chat"          options={{ title: '챗' }} />
      <Tabs.Screen name="work"          options={{ title: '업무' }} />
      <Tabs.Screen name="settlement"    options={{ title: '정산' }} />
      <Tabs.Screen name="notifications" options={{ title: '알림' }} />
      <Tabs.Screen name="profile"       options={{ title: '프로필' }} />
    </Tabs>
  )
}
