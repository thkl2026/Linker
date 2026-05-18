import { Outlet } from 'react-router-dom'
import { ToastContainer } from '@/shared/components/ToastContainer'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 py-12">
      <Outlet />
      <ToastContainer />
    </div>
  )
}
