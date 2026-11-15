'use client'

import type { ServerStatus } from '../lib/useServerStatus'
import { Icon, Spinner } from './ui/Icons'

/** Explains why nothing is loading yet. Free hosting puts the backend to sleep when idle; waking it takes ~30–60 s. */
export function ServerBanner({ status, onRetry }: { status: ServerStatus; onRetry: () => void }) {
  if (status === 'waking') {
    return (
      <div role="status" className="relative shrink-0 overflow-hidden border-b border-warn/20 bg-warn/[0.07] px-4 py-2.5 animate-fade-in">
        <div className="mx-auto flex max-w-3xl items-center gap-3 text-[13px] text-ink">
          <Spinner size={16} className="shrink-0 text-warn" />
          <p className="leading-snug">
            <span className="font-medium text-white">Waking up the server…</span>{' '}
            <span className="text-ink-2">It sleeps when idle, so the first load can take up to a minute. This only happens after a break.</span>
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="h-full w-1/4 bg-gradient-to-r from-transparent via-warn to-transparent animate-sweep" />
        </div>
      </div>
    )
  }

  if (status === 'offline') {
    return (
      <div role="alert" className="shrink-0 border-b border-bad/25 bg-bad/[0.08] px-4 py-2.5 animate-fade-in">
        <div className="mx-auto flex max-w-3xl items-center gap-3 text-[13px]">
          <Icon name="alert" size={16} className="shrink-0 text-bad" />
          <p className="flex-1 leading-snug text-ink">
            <span className="font-medium text-white">Can’t reach the server.</span> <span className="text-ink-2">Check your connection, or try again in a few minutes.</span>
          </p>
          <button className="btn btn-ghost !px-3 !py-1.5 !text-xs" onClick={onRetry}>
            <Icon name="refresh" size={13} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return null
}
