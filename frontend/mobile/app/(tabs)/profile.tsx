import React from 'react'
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { talentApi, AvailabilityStatus } from '../../src/shared/api/talentApi'

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  AVAILABLE: '가용 가능',
  BUSY: '업무 중',
  REST: '휴식',
}

const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  AVAILABLE: '#16A34A',
  BUSY: '#D97706',
  REST: '#6B7280',
}

/**
 * 프로필 화면 — 인력 정보 조회 + 가용 상태 FAB 토글 (Phase 3)
 */
export default function ProfileScreen() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: talentApi.getMyProfile,
  })

  const availabilityMutation = useMutation({
    mutationFn: (status: AvailabilityStatus) => talentApi.updateAvailability(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  const cycleStatus = () => {
    if (!profile) return
    const order: AvailabilityStatus[] = ['AVAILABLE', 'BUSY', 'REST']
    const next = order[(order.indexOf(profile.availabilityStatus) + 1) % order.length]
    availabilityMutation.mutate(next)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#451A03" />
      </SafeAreaView>
    )
  }

  if (!profile) return null

  const statusColor = STATUS_COLOR[profile.availabilityStatus]

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* 헤더 */}
        <Text className="text-2xl font-bold text-amber-950">{profile.name}</Text>
        <Text className="text-sm text-amber-700 mt-1">{profile.workType} · 희망 단가 {profile.desiredRate ?? '-'}만원</Text>

        {/* AI 스코어 */}
        <View className="mt-6 bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-xs text-gray-500 mb-1">AI 역량 스코어</Text>
          <Text className="text-4xl font-bold text-amber-900">{profile.totalScore.toFixed(1)}</Text>
          <View className="mt-2 h-2 bg-amber-100 rounded-full">
            <View
              className="h-2 bg-amber-700 rounded-full"
              style={{ width: `${Math.min(profile.totalScore, 100)}%` }}
            />
          </View>
        </View>

        {/* 기술 스택 */}
        <View className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-sm font-semibold text-gray-700 mb-3">기술 스택</Text>
          <View className="flex-row flex-wrap gap-2">
            {profile.skills.map((s) => (
              <View key={s.skillName} className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-xs text-amber-900">{s.skillName} · {s.level}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* 가용 상태 FAB */}
      <TouchableOpacity
        onPress={cycleStatus}
        disabled={availabilityMutation.isPending}
        className="absolute bottom-8 right-6 rounded-full px-5 py-4 shadow-lg"
        style={{ backgroundColor: statusColor }}
      >
        <Text className="text-white font-bold text-sm">
          {availabilityMutation.isPending ? '변경 중…' : STATUS_LABEL[profile.availabilityStatus]}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
