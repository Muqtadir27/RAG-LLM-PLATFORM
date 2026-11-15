'use client'

import type { Document } from '../../lib/types'
import { stripExt } from '../../lib/format'
import { Icon, Logo } from '../ui/Icons'

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'List the main requirements or action items',
  'Explain this in simple terms',
]

interface EmptyStateProps {
  documents: Document[]
  selectedDoc: Document | null
  loading: boolean
  onUpload: () => void
  onAsk: (q: string) => void
  disabled: boolean
}

export function EmptyState({ documents, selectedDoc, loading, onUpload, onAsk, disabled }: EmptyStateProps) {
  const hasDocs = documents.length > 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-10 text-center">
      <div className="relative mb-7">
        <div className="absolute inset-0 -m-6 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-line-2 bg-surface-2 shadow-[0_20px_60px_-20px_rgb(45_212_238/0.45)]">
          <Logo size={42} glow />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="skeleton mx-auto h-6 w-64" />
          <div className="skeleton mx-auto h-4 w-80 max-w-full" />
        </div>
      ) : hasDocs ? (
        <>
          <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
            {selectedDoc ? <>Ask about <span className="text-accent">{stripExt(selectedDoc.filename)}</span></> : 'Ask anything about your documents'}
          </h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
            {selectedDoc
              ? 'Answers are written from the document and linked back to the exact passages they came from.'
              : `Searching across all ${documents.length} documents. Pick one in the sidebar to focus on it.`}
          </p>
          <div className="mt-8 grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                disabled={disabled}
                onClick={() => onAsk(s)}
                className="glass group flex items-center gap-3 rounded-xl p-3.5 text-left text-sm text-ink-2 transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:text-white disabled:pointer-events-none disabled:opacity-50"
              >
                <Icon name="sparkles" size={16} className="shrink-0 text-accent opacity-70 transition-opacity group-hover:opacity-100" />
                {s}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Chat with your documents</h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
            Upload a PDF, ask questions in plain language, and get answers with sources and a quality score.
          </p>
          <button className="btn btn-primary mt-8 !px-5 !py-3 !text-sm" onClick={onUpload}>
            <Icon name="upload" size={17} /> Upload a PDF
          </button>
          <ol className="mt-10 grid w-full max-w-xl gap-3 text-left sm:grid-cols-3">
            {[
              ['Upload', 'Add a PDF. It is split into passages and indexed.'],
              ['Ask', 'Type a question about anything inside it.'],
              ['Verify', 'Open the sources, then score the answer.'],
            ].map(([title, text], i) => (
              <li key={title} className="rounded-xl border border-line bg-white/[0.025] p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 font-mono text-xs text-accent">{i + 1}</span>
                <p className="mt-3 text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-3">{text}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
