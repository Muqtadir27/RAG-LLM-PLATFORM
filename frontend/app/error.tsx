'use client'

import { useEffect } from 'react'
import { Icon } from './components/ui/Icons'

/** Replaces Next's generic "This page couldn't load" screen. */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded-2xl p-8 text-center animate-pop">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-bad/10 text-bad">
          <Icon name="alert" size={22} />
        </div>
        <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          The interface hit an unexpected error. Your documents and chats are safe, so try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn btn-primary" onClick={() => unstable_retry()}>
            <Icon name="refresh" size={15} /> Try again
          </button>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}
