import { useUiStore } from '@/store/uiStore'

const TYPE_CLASSES = {
  success: 'bg-success text-white',
  error:   'bg-danger text-white',
  warning: 'bg-warning text-white',
  info:    'bg-info text-white',
} as const

/** 화면 우측 하단에 렌더링되는 토스트 알림 목록 */
export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer max-w-sm
            ${TYPE_CLASSES[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
