import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import {
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { ToastContext, type ToastInput, type ToastTone } from './toastContext'

interface ToastMessage {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-success/20',
  error: 'border-danger/25',
  info: 'border-info/20',
}

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { ...toast, id, tone: toast.tone ?? 'info' }])
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      5000,
    )
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-label="Notifications"
        aria-live="polite"
        className="fixed right-4 top-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone]
          return (
            <div
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xl',
                toneStyles[toast.tone],
              )}
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  toast.tone === 'success'
                    ? 'text-success'
                    : toast.tone === 'error'
                      ? 'text-danger'
                      : 'text-info',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <Button
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
                size="icon"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
