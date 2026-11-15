'use client'

import { useEffect, useRef, useState } from 'react'
import type { Citation } from '../../lib/types'
import { cn } from '../../lib/format'
import { Icon } from '../ui/Icons'

/** Source chips under an answer. Clicking a chip reveals the exact passage the answer was grounded in. */
export function Sources({ citations, labels }: { citations?: Citation[]; labels?: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const passageRef = useRef<HTMLElement>(null)

  // an opened passage often lands below the fold, so bring it into view
  useEffect(() => {
    if (open !== null) passageRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  const hasCitations = !!citations?.length
  const items = hasCitations ? citations! : (labels ?? []).map(label => ({ label }) as Citation)
  if (!items.length) return null

  const active = open !== null ? items[open] : null

  return (
    <div className="mt-4">
      <p className="label mb-2 flex items-center gap-1.5">
        <Icon name="file" size={12} /> Sources
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((c, i) => {
          const expandable = !!c.text
          const selected = open === i
          const pct = typeof c.score === 'number' ? Math.round(c.score * 100) : null
          const text = c.filename ? `${c.filename.replace(/\.pdf$/i, '')} · chunk ${c.chunk_index ?? i}` : c.label
          return (
            <button
              key={i}
              type="button"
              disabled={!expandable}
              aria-expanded={expandable ? selected : undefined}
              onClick={() => setOpen(selected ? null : i)}
              className={cn(
                'chip max-w-full !rounded-lg !py-1.5',
                expandable ? 'cursor-pointer' : 'cursor-default hover:!border-line hover:!bg-white/5 hover:!text-ink-2',
                selected && '!border-accent/50 !bg-accent/10 !text-white',
              )}
            >
              <span className="font-mono text-[11px] text-accent">{i + 1}</span>
              <span className="truncate">{text}</span>
              {pct !== null && <span className="shrink-0 font-mono text-[11px] text-ink-3">{pct}%</span>}
              {expandable && <Icon name="chevron" size={13} className={cn('shrink-0 transition-transform', selected && 'rotate-180')} />}
            </button>
          )
        })}
      </div>

      {active?.text && (
        <figure ref={passageRef} className="mt-3 rounded-xl border border-line bg-black/25 p-4 animate-fade-in">
          <figcaption className="label mb-2">Passage from the document</figcaption>
          <blockquote className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{active.text}</blockquote>
        </figure>
      )}
    </div>
  )
}
