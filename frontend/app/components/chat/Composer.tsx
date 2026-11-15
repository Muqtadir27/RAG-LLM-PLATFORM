'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '../ui/Icons'
import { cn } from '../../lib/format'

interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  streaming: boolean
  /** why sending is currently impossible (shown as the placeholder), if it is */
  blockedReason?: string
  placeholder: string
  focusKey: string
}

const MAX_HEIGHT = 200

export function Composer({ value, onChange, onSend, onStop, streaming, blockedReason, placeholder, focusKey }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // grow with the content, up to a cap
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  // focus when switching document (desktop only – don't pop the keyboard on phones)
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) ref.current?.focus()
  }, [focusKey])

  const canSend = value.trim().length > 0 && !streaming && !blockedReason

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'glass flex items-end gap-2 rounded-2xl p-2 pl-4 transition-[border-color,box-shadow] duration-200',
            'focus-within:border-accent/45 focus-within:shadow-[0_0_0_4px_rgb(45_212_238/0.08),0_10px_40px_-12px_rgb(0_0_0/0.6)]',
          )}
        >
          <label htmlFor="composer" className="sr-only">Ask a question</label>
          <textarea
            id="composer"
            ref={ref}
            value={value}
            rows={1}
            disabled={!!blockedReason}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (canSend) onSend()
              }
            }}
            placeholder={blockedReason ?? placeholder}
            className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-white outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
          />
          {streaming ? (
            <button className="btn btn-ghost !h-10 !w-10 shrink-0 !rounded-xl !p-0" onClick={onStop} aria-label="Stop generating" title="Stop generating">
              <Icon name="stop" size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary !h-10 !w-10 shrink-0 !rounded-xl !p-0"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <Icon name="send" size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-3">
          <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line · </span>
          Answers come from your documents and can still contain mistakes.
        </p>
      </div>
    </div>
  )
}
