import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'

// 새 배포로 청크 파일명이 바뀌면 캐시된 옛 index.html이 존재하지 않는 청크를 요청해
// "Failed to fetch dynamically imported module" 오류가 난다. 이때 1회 자동 새로고침하여
// 최신 index.html/청크를 받아온다. (무한 루프 방지를 위해 sessionStorage 가드 사용)
function reloadOnChunkError() {
  const KEY = 'chunk-reload-ts'
  const last = Number(sessionStorage.getItem(KEY) || 0)
  // 마지막 새로고침이 10초 이내면 재시도하지 않는다 (루프 방지)
  if (Date.now() - last < 10_000) return
  sessionStorage.setItem(KEY, String(Date.now()))
  window.location.reload()
}

// Vite가 동적 import 프리로드 실패 시 발생시키는 이벤트
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  reloadOnChunkError()
})

// 일반 동적 import 실패도 포착
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e?.reason?.message ?? e?.reason ?? '')
  if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) {
    reloadOnChunkError()
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // 1분
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
