import { Navigate } from 'react-router-dom'

/** 구 Admin 대시보드 — 라우터에서 제거됨. SYSTEM_ADMIN 대시보드로 리다이렉트. */
export function AdminDashboardPage() {
  return <Navigate to="/app/system-admin" replace />
}
