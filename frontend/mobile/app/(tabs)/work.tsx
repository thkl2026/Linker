import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { talentApi, Timesheet } from '../../src/shared/api/talentApi'

const STATUS_LABEL = { SUBMITTED: '제출', APPROVED: '승인', REJECTED: '반려' }
const STATUS_COLOR = { SUBMITTED: '#D97706', APPROVED: '#16A34A', REJECTED: '#DC2626' }

/**
 * 업무(타임시트) 화면 — 등록 폼 + 내 타임시트 목록 (Phase 3)
 */
export default function WorkScreen() {
  const queryClient = useQueryClient()

  const [contractId, setContractId] = useState('')
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0])
  const [hours, setHours] = useState('8')
  const [description, setDescription] = useState('')

  const { data: timesheets, isLoading } = useQuery({
    queryKey: ['myTimesheets'],
    queryFn: talentApi.listMyTimesheets,
  })

  const submitMutation = useMutation({
    mutationFn: talentApi.submitTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimesheets'] })
      setDescription('')
      Alert.alert('등록 완료', '타임시트가 제출되었습니다.')
    },
    onError: () => Alert.alert('오류', '타임시트 등록에 실패했습니다.'),
  })

  const handleSubmit = () => {
    if (!contractId.trim()) return Alert.alert('필수 입력', '계약 ID를 입력하세요.')
    const h = parseFloat(hours)
    if (isNaN(h) || h < 0.5 || h > 24) return Alert.alert('입력 오류', '근무 시간은 0.5~24h이어야 합니다.')
    submitMutation.mutate({ contractId, workDate, hoursWorked: h, workDescription: description })
  }

  const renderItem = ({ item }: { item: Timesheet }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-center">
        <Text className="font-semibold text-gray-800">{item.workDate}</Text>
        <View className="flex-row items-center gap-2">
          {item.aiAnomalyFlag && (
            <View className="bg-red-100 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-red-700">이상</Text>
            </View>
          )}
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[item.status] + '20' }}>
            <Text className="text-xs font-medium" style={{ color: STATUS_COLOR[item.status] }}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
      </View>
      <Text className="text-sm text-gray-500 mt-1">{item.hoursWorked}h · {item.workDescription ?? '내용 없음'}</Text>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={timesheets ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              <Text className="text-xl font-bold text-amber-950 mb-4">타임시트</Text>

              {/* 등록 폼 */}
              <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-3">새 타임시트 등록</Text>

                <TextInput
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm"
                  placeholder="계약 ID (UUID)"
                  value={contractId}
                  onChangeText={setContractId}
                  autoCapitalize="none"
                />
                <TextInput
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm"
                  placeholder="근무일 (YYYY-MM-DD)"
                  value={workDate}
                  onChangeText={setWorkDate}
                />
                <TextInput
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm"
                  placeholder="근무 시간 (예: 8)"
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm"
                  placeholder="업무 내용"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-amber-900 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">
                    {submitMutation.isPending ? '제출 중…' : '타임시트 제출'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-600 mb-2">제출 내역</Text>
              {isLoading && <ActivityIndicator color="#451A03" />}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
