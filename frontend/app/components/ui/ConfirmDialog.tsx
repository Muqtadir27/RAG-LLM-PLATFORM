'use client'

import { useEffect, useRef } from 'react'
import { Icon } from './Icons'
import { cn } from '../../lib/format'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="glass w-full max-w-sm rounded-2xl p-6 animate-pop">
        <div
          className={cn(
            'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
            destructive ? 'bg-bad/10 text-bad' : 'bg-accent/10 text-accent',
          )}
        >
          <Icon name={destructive ? 'trash' : 'info'} size={18} />
        </div>
        <h2 id="confirm-title" className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className={cn('btn', destructive ? 'bg-bad text-[#1a0505] hover:brightness-110' : 'btn-primary')}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
