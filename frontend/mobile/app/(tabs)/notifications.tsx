import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../src/shared/api/apiClient'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  metadata: Record<string, unknown> | null
}

const notificationApi = {
  list: () =>
    apiClient.get<Notification[]>('/api/v1/notifications').then(r => r.data),

  markRead: (id: string) =>
    apiClient.put(`/api/v1/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    apiClient.put('/api/v1/notifications/read-all').then(r => r.data),
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  RISK_ALERT:       { icon: '⚠️', color: '#B91C1C', bg: '#FEF2F2' },
  MATCHING_PROPOSAL:{ icon: '🤝', color: '#1D4ED8', bg: '#EFF6FF' },
  TIMESHEET_APPROVED:{ icon: '✅', color: '#15803D', bg: '#F0FDF4' },
  TIMESHEET_REJECTED:{ icon: '❌', color: '#B91C1C', bg: '#FEF2F2' },
  SETTLEMENT_PAID:  { icon: '💴', color: '#15803D', bg: '#F0FDF4' },
  CONTRACT_SIGNED:  { icon: '📋', color: '#6D28D9', bg: '#F5F3FF' },
  INTERVIEW_SCHEDULED:{ icon: '📅', color: '#B45309', bg: '#FFFBEB' },
}

const DEFAULT_CONFIG = { icon: '🔔', color: '#374151', bg: '#F9FAFB' }

/**
 * 알림 히스토리 탭 — 전체 알림 목록 + 읽음 처리 (Phase 5)
 */
export default function NotificationsScreen() {
  const qc = useQueryClient()

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    staleTime: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length

  const renderItem = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => !item.isRead && markReadMutation.mutate(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: config.color }]}>{item.title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.cardBody_text} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.cardTime}>
            {new Date(item.createdAt).toLocaleString('ko-KR', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAllText}>
              {markAllMutation.isPending ? '처리 중…' : '모두 읽음'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#451A03" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#451A03"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={styles.emptyText}>알림이 없습니다.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },

  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#451A03',
  },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title:        { fontSize: 22, fontWeight: '700', color: '#FFF8F0' },
  unreadBadge:  { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  markAllBtn:  { alignSelf: 'flex-start' },
  markAllText: { fontSize: 13, color: '#D6C4A8', textDecorationLine: 'underline' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  card: {
    flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#451A03', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#451A03' },

  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon:    { fontSize: 20 },

  cardBody:   { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  cardTitle:  { fontSize: 14, fontWeight: '600' },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#451A03' },

  cardBody_text: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  cardTime:      { fontSize: 11, color: '#9CA3AF', marginTop: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 15, color: '#A78B6E' },
})
