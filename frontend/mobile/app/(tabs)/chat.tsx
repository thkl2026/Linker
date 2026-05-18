import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MMKV } from 'react-native-mmkv'
import { ENV } from '../../src/config/env'

const storage = new MMKV({ id: 'linker-auth' })

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
}

/**
 * AI 챗 화면 — STOMP WebSocket 기반 실시간 채팅 (Phase 3, F-6.2)
 *
 * SockJS + STOMP 클라이언트는 번들 크기 이슈로 REST fallback 방식으로 구현한다.
 * 네이티브 WebSocket 직접 사용 (STOMP 프레임 수동 처리).
 */
export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(Math.random().toString(36).slice(2))
  const wsRef = useRef<WebSocket | null>(null)
  const flatListRef = useRef<FlatList>(null)

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => {
    const token = storage.getString('accessToken')
    const wsUrl = (ENV.WS_URL ?? '').replace('http', 'ws') + '/ws/chat/websocket'
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      // STOMP CONNECT 프레임
      ws.send(`CONNECT\naccept-version:1.1,1.0\nheart-beat:0,0\nAuthorization:Bearer ${token ?? ''}\n\n\0`)
    }

    ws.onmessage = (e) => {
      const frame = e.data as string
      if (frame.startsWith('CONNECTED')) {
        setConnected(true)
        // 응답 구독
        ws.send(`SUBSCRIBE\nid:sub-0\ndestination:/user/topic/chat.reply\n\n\0`)
        return
      }
      if (frame.startsWith('MESSAGE')) {
        try {
          const body = frame.split('\n\n').slice(1).join('\n\n').replace('\0', '')
          const parsed = JSON.parse(body)
          if (parsed.role === 'ASSISTANT') {
            setLoading(false)
            appendMessage({ id: Date.now().toString(), role: 'ASSISTANT', content: parsed.content })
          }
        } catch {/* ignore */}
      }
    }

    ws.onerror = () => setConnected(false)
    ws.onclose = () => setConnected(false)

    return () => ws.close()
  }, [appendMessage])

  const send = () => {
    const text = input.trim()
    if (!text || !connected || loading) return

    appendMessage({ id: Date.now().toString(), role: 'USER', content: text })
    setInput('')
    setLoading(true)

    const payload = JSON.stringify({ sessionId: sessionId.current, role: 'USER', content: text })
    wsRef.current?.send(`SEND\ndestination:/app/chat.send\ncontent-type:application/json\n\n${payload}\0`)
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'USER'
    return (
      <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
        <View
          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isUser ? 'bg-amber-900' : 'bg-white shadow-sm'
          }`}
        >
          <Text className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* 상태 표시 */}
        <View className="px-5 pt-4 pb-2 flex-row items-center gap-2">
          <Text className="text-lg font-bold text-amber-950">AI 어시스턴트</Text>
          <View className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20 }}
          className="flex-1"
        />

        {loading && (
          <View className="px-5 pb-2 items-start">
            <View className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <ActivityIndicator size="small" color="#451A03" />
            </View>
          </View>
        )}

        {/* 입력 영역 */}
        <View className="flex-row items-end px-4 py-3 bg-white border-t border-amber-100 gap-3">
          <TextInput
            className="flex-1 bg-amber-50 rounded-2xl px-4 py-3 text-sm max-h-24"
            placeholder="메시지를 입력하세요…"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!connected || loading || !input.trim()}
            className="bg-amber-900 rounded-2xl px-4 py-3"
          >
            <Text className="text-white font-semibold text-sm">전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
