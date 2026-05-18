import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../src/shared/api/apiClient'

interface Settlement {
  id: string
  contractId: string
  settlementMonth: string
  totalHours: number
  unitPrice: number
  grossAmount: number
  deduction: number
  netAmount: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  approvedAt: string | null
  paidAt: string | null
}

const settlementApi = {
  listByContract: (contractId: string) =>
    apiClient.get<Settlement[]>(`/api/v1/settlements/by-contract/${contractId}`).then(r => r.data),

  listMine: () =>
    apiClient.get<Settlement[]>('/api/v1/settlements/my').then(r => r.data),
}

const STATUS_COLOR: Record<Settlement['status'], string> = {
  DRAFT:    '#B45309',
  APPROVED: '#1D4ED8',
  PAID:     '#15803D',
}

const STATUS_BG: Record<Settlement['status'], string> = {
  DRAFT:    '#FEF9C3',
  APPROVED: '#DBEAFE',
  PAID:     '#DCFCE7',
}

const STATUS_LABEL: Record<Settlement['status'], string> = {
  DRAFT:    '대기',
  APPROVED: '승인',
  PAID:     '지급완료',
}

/**
 * 정산 현황 탭 — Talent 본인 정산 목록 조회 (Phase 5)
 */
export default function SettlementScreen() {
  const [contractId, setContractId] = useState('')
  const [activeContractId, setActiveContractId] = useState<string | null>(null)

  const { data: settlements, isLoading, refetch } = useQuery({
    queryKey: ['my-settlements', activeContractId],
    queryFn: () =>
      activeContractId
        ? settlementApi.listByContract(activeContractId)
        : settlementApi.listMine(),
    staleTime: 60_000,
  })

  const totalPaid = (settlements ?? [])
    .filter(s => s.status === 'PAID')
    .reduce((sum, s) => sum + s.netAmount, 0)

  const renderItem = ({ item }: { item: Settlement }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.monthText}>{item.settlementMonth}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>총 근무시간</Text>
          <Text style={styles.amountValue}>{item.totalHours}h</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>총액</Text>
          <Text style={styles.amountValue}>₩{item.grossAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>실지급</Text>
          <Text style={[styles.amountValue, styles.netAmount]}>
            ₩{item.netAmount.toLocaleString()}
          </Text>
        </View>
      </View>

      {item.deduction > 0 && (
        <Text style={styles.deductionText}>공제: ₩{item.deduction.toLocaleString()}</Text>
      )}

      {item.paidAt && (
        <Text style={styles.dateText}>
          지급일: {new Date(item.paidAt).toLocaleDateString('ko-KR')}
        </Text>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>정산 현황</Text>
        {settlements && settlements.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>누적 지급 완료</Text>
            <Text style={styles.summaryAmount}>₩{totalPaid.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* 계약 ID 필터 */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="계약 UUID (선택)"
          placeholderTextColor="#A78B6E"
          value={contractId}
          onChangeText={setContractId}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setActiveContractId(contractId.trim() || null)}
        >
          <Text style={styles.filterBtnText}>조회</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#451A03" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={settlements ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <Text style={styles.emptyText}>정산 내역이 없습니다.</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  header:    { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#451A03' },
  title:     { fontSize: 22, fontWeight: '700', color: '#FFF8F0', marginBottom: 12 },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel:  { fontSize: 12, color: '#D6C4A8' },
  summaryAmount: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  filterRow:   { flexDirection: 'row', padding: 16, gap: 8 },
  filterInput: {
    flex: 1, borderWidth: 1, borderColor: '#D6C4A8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  filterBtn:     { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#451A03', borderRadius: 12, justifyContent: 'center' },
  filterBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#451A03', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthText:  { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  amountRow:   { flexDirection: 'row', gap: 8 },
  amountBlock: { flex: 1, alignItems: 'center', backgroundColor: '#FFFBF5', borderRadius: 10, padding: 10 },
  amountLabel: { fontSize: 11, color: '#A78B6E', marginBottom: 4 },
  amountValue: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  netAmount:   { color: '#15803D' },

  deductionText: { fontSize: 12, color: '#B45309', marginTop: 8 },
  dateText:      { fontSize: 12, color: '#A78B6E', marginTop: 4 },
  emptyText:     { textAlign: 'center', color: '#A78B6E', marginTop: 40, fontSize: 14 },
})
