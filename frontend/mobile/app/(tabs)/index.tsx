import React, { useEffect } from 'react'
import { Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { talentApi } from '../../src/shared/api/talentApi'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * 홈 화면 — 알림 수신 + 대시보드 요약 (Phase 3)
 */
export default function HomeScreen() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: talentApi.getMyProfile,
  })

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NOTIFICATION]', notification.request.content)
    })
    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1 px-5 pt-6">
        <Text className="text-2xl font-bold text-amber-950">안녕하세요 👋</Text>
        <Text className="text-sm text-amber-700 mt-1">오늘도 좋은 하루 되세요.</Text>

        {isLoading ? (
          <ActivityIndicator color="#451A03" className="mt-8" />
        ) : profile ? (
          <View className="mt-6 gap-4">

            {/* 가용 상태 카드 */}
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <Text className="text-xs text-gray-500">현재 상태</Text>
              <Text className="text-lg font-bold text-amber-900 mt-1">
                {profile.availabilityStatus === 'AVAILABLE' ? '가용 가능 ✅' :
                 profile.availabilityStatus === 'BUSY' ? '업무 중 🔶' : '휴식 중 ⚫️'}
              </Text>
            </View>

            {/* AI 스코어 카드 */}
            <View className="bg-amber-900 rounded-2xl p-5 shadow-sm">
              <Text className="text-xs text-amber-300">AI 역량 스코어</Text>
              <Text className="text-4xl font-bold text-white mt-1">
                {profile.totalScore.toFixed(1)}
              </Text>
              <Text className="text-xs text-amber-300 mt-2">
                상위 {Math.max(0, 100 - Math.floor(profile.totalScore)).toFixed(0)}% 수준
              </Text>
            </View>

            {/* 기술 요약 */}
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <Text className="text-xs text-gray-500 mb-3">주요 기술</Text>
              <View className="flex-row flex-wrap gap-2">
                {profile.skills.slice(0, 5).map((s) => (
                  <View key={s.skillName} className="bg-amber-100 px-3 py-1 rounded-full">
                    <Text className="text-xs text-amber-900">{s.skillName}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
