import { useEffect } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  isWorking?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isWorking = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isWorking) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWorking, onCancel, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isWorking) onCancel()
      }}
    >
      <section
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        role="alertdialog"
      >
        <h2 className="text-lg font-semibold text-foreground" id="confirm-dialog-title">
          {title}
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-muted-foreground"
          id="confirm-dialog-description"
        >
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button disabled={isWorking} onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isWorking}
            onClick={onConfirm}
            variant="primary"
          >
            {isWorking ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
