'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from './Icons'
import { cn } from '../../lib/format'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string, action?: ToastItem['action']) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const STYLE: Record<ToastKind, { icon: IconName; ring: string; tint: string }> = {
  success: { icon: 'check', ring: 'border-ok/30', tint: 'text-ok bg-ok/10' },
  error: { icon: 'alert', ring: 'border-bad/30', tint: 'text-bad bg-bad/10' },
  info: { icon: 'info', ring: 'border-accent/30', tint: 'text-accent bg-accent/10' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems(list => list.filter(t => t.id !== id)), [])

  const push = useCallback((kind: ToastKind, message: string, action?: ToastItem['action']) => {
    const id = nextId.current++
    // keep at most 4 on screen, and don't stack identical messages
    setItems(list => [...list.filter(t => t.message !== message), { id, kind, message, action }].slice(-4))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: m => push('success', m),
      error: (m, action) => push('error', m, action),
      info: m => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {items.map(t => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const s = STYLE[item.kind]
  useEffect(() => {
    const ms = item.kind === 'error' ? 7000 : 4500
    const timer = setTimeout(onDismiss, ms)
    return () => clearTimeout(timer)
  }, [item.id, item.kind, onDismiss])

  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 pr-2 animate-pop',
        s.ring,
      )}
    >
      <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg', s.tint)}>
        <Icon name={s.icon} size={14} strokeWidth={2.2} />
      </span>
      <p className="min-w-0 flex-1 py-0.5 text-[13px] leading-snug text-ink">{item.message}</p>
      {item.action && (
        <button
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
          onClick={() => {
            item.action?.onClick()
            onDismiss()
          }}
        >
          {item.action.label}
        </button>
      )}
      <button className="icon-btn !h-7 !w-7 shrink-0" onClick={onDismiss} aria-label="Dismiss notification">
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
