import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function HomePage() {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/auth/login" replace />

  switch (user.role) {
    case 'SYSTEM_ADMIN':  return <Navigate to="/app/system-admin"  replace />
    case 'SERVICE_ADMIN': return <Navigate to="/app/service-admin" replace />
    case 'PM':            return <Navigate to="/app/projects"       replace />
    case 'PROCUREMENT':   return <Navigate to="/app/experts/search" replace />
    default:              return <Navigate to="/auth/login"         replace />
  }
}
