'use client'

import { useEffect, useState } from 'react'
import type { Citation, Message } from '../../lib/types'
import { cn } from '../../lib/format'
import { Icon, Logo } from '../ui/Icons'
import { Markdown } from '../ui/Markdown'
import { Sources } from './Sources'

const isErrorMessage = (m: Message) => !!m.error || m.content.trimStart().startsWith('⚠')

function Avatar() {
  return (
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line-2 bg-surface-2">
      <Logo size={18} />
    </div>
  )
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <button
      className={cn('btn btn-ghost !gap-1.5 !rounded-lg !border-transparent !bg-transparent !px-2 !py-1 !text-xs !font-medium', className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch { /* clipboard blocked – nothing useful to do */ }
      }}
      aria-label="Copy answer"
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} className={copied ? 'text-ok' : undefined} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

interface MessageViewProps {
  message: Message
  isLast: boolean
  busy: boolean
  onRegenerate: () => void
}

export function MessageView({ message, isLast, busy, onRegenerate }: MessageViewProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-accent/20 bg-gradient-to-br from-accent/[0.16] to-accent-2/[0.14] px-4 py-3 text-[15px] leading-relaxed text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    )
  }

  if (isErrorMessage(message)) {
    const text = message.content.replace(/^⚠\s*/, '')
    return (
      <div className="flex gap-3 animate-fade-up">
        <Avatar />
        <div className="min-w-0 flex-1">
          <div role="alert" className="rounded-xl border border-bad/25 bg-bad/[0.07] p-4">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
              <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-bad" />
              <span>{text}</span>
            </p>
            {isLast && !busy && (
              <button className="btn btn-ghost mt-3 !py-1.5" onClick={onRegenerate}>
                <Icon name="refresh" size={14} /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 animate-fade-up">
      <Avatar />
      <div className="min-w-0 flex-1">
        <Markdown>{message.content}</Markdown>
        <Sources citations={message.citations} labels={message.sources} />
        <div className="-ml-2 mt-3 flex items-center gap-1 text-ink-3">
          <CopyButton text={message.content} />
          {isLast && !busy && (
            <button
              className="btn btn-ghost !gap-1.5 !rounded-lg !border-transparent !bg-transparent !px-2 !py-1 !text-xs !font-medium"
              onClick={onRegenerate}
            >
              <Icon name="refresh" size={14} /> Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** The answer while it is still being written. */
export function StreamingMessage({
  content,
  phase,
  citations,
}: {
  content: string
  phase: 'searching' | 'writing'
  citations?: Citation[]
}) {
  return (
    <div className="flex gap-3 animate-fade-up" aria-live="polite" aria-busy="true">
      <Avatar />
      <div className="min-w-0 flex-1">
        {content ? (
          <div className="relative">
            <Markdown>{content}</Markdown>
            <span className="caret" aria-hidden="true" />
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2 text-sm text-ink-2">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </span>
            {phase === 'searching' ? 'Searching your documents…' : 'Writing the answer…'}
          </div>
        )}
        {content && <Sources citations={citations} />}
      </div>
    </div>
  )
}
