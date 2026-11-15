'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Document, EvalScores, Message } from '../lib/types'
import { ApiError, scoreAnswer } from '../lib/api'
import { cn, hashString, relativeTime } from '../lib/format'
import { loadScores, saveScore, type SavedScore } from '../lib/storage'
import { Icon, Spinner } from './ui/Icons'
import { Markdown } from './ui/Markdown'
import { TopBar } from './ui/TopBar'
import { useToast } from './ui/Toast'

interface EvalPanelProps {
  selectedDoc: Document | null
  messages: Message[]
  onOpenMenu: () => void
  onGoToChat: () => void
}

interface Pair {
  id: string
  question: string
  answer: string
}

const PASS = 70

const tone = (v: number) => (v >= PASS ? 'ok' : v >= 40 ? 'warn' : 'bad')
const TEXT = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' } as const
const BG = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' } as const

const METRICS: { key: 'faithfulness' | 'relevance' | 'hallucination'; label: string; hint: string }[] = [
  { key: 'faithfulness', label: 'Faithfulness', hint: 'Is the answer supported by the retrieved passages?' },
  { key: 'relevance', label: 'Relevance', hint: 'Does the answer actually address the question?' },
  { key: 'hallucination', label: 'Hallucination guard', hint: 'Higher means fewer invented facts.' },
]

/** Question/answer pairs from a chat thread (error notices and unanswered questions are skipped). */
function toPairs(messages: Message[]): Pair[] {
  const pairs: Pair[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    const q = messages[i]
    const a = messages[i + 1]
    if (q.role !== 'user' || a.role !== 'assistant' || a.error || a.content.trimStart().startsWith('⚠')) continue
    pairs.push({ id: hashString(`${q.content}\u0000${a.content}`), question: q.content, answer: a.content })
  }
  return pairs
}

export default function EvalPanel({ selectedDoc, messages, onOpenMenu, onGoToChat }: EvalPanelProps) {
  const toast = useToast()
  const [scores, setScores] = useState<Record<string, SavedScore>>({})
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [batch, setBatch] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    setScores(loadScores())
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const pairs = useMemo(() => toPairs(messages), [messages])
  const docId = selectedDoc?.document_id ?? null

  const run = useCallback(
    async (pair: Pair, quiet = false): Promise<boolean> => {
      setRunning(r => ({ ...r, [pair.id]: true }))
      setErrors(e => {
        const { [pair.id]: _drop, ...rest } = e
        return rest
      })
      try {
        const result: EvalScores = await scoreAnswer(pair.question, pair.answer, docId)
        const saved: SavedScore = { ...result, at: Date.now() }
        saveScore(pair.id, saved)
        if (mounted.current) setScores(s => ({ ...s, [pair.id]: saved }))
        return true
      } catch (e) {
        const message = e instanceof ApiError ? e.message : 'Scoring failed. Please try again.'
        if (mounted.current) setErrors(er => ({ ...er, [pair.id]: message }))
        if (!quiet) toast.error(message)
        return false
      } finally {
        if (mounted.current) setRunning(r => ({ ...r, [pair.id]: false }))
      }
    },
    [docId, toast],
  )

  const unscored = pairs.filter(p => !scores[p.id])

  const runAll = async () => {
    setBatch(true)
    let failed = 0
    for (const pair of unscored) {
      if (!mounted.current) break
      if (!(await run(pair, true))) failed++
    }
    if (mounted.current) setBatch(false)
    if (failed) toast.error(`${failed} answer${failed > 1 ? 's' : ''} could not be scored. Open them to see why.`)
    else toast.success('All answers scored.')
  }

  const scored = pairs.map(p => scores[p.id]).filter(Boolean)
  const avg = scored.length ? Math.round((scored.reduce((sum, s) => sum + s.overall, 0) / scored.length) * 10) / 10 : null
  const passed = scored.filter(s => s.verdict === 'PASS').length

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar title="Evaluate" doc={selectedDoc} onMenu={onOpenMenu}>
        {unscored.length > 1 && (
          <button className="btn btn-primary !px-3 !py-1.5 !text-xs" onClick={runAll} disabled={batch}>
            {batch ? <Spinner size={14} /> : <Icon name="play" size={12} />}
            Score all ({unscored.length})
          </button>
        )}
      </TopBar>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5 py-6">
          {/* how it works */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon name="gauge" size={17} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Answer quality check</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  An AI judge compares each answer with the passages it was written from and scores it from 0 to 100. An overall score of {PASS} or more counts as a pass.
                </p>
                <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-ink-3 sm:grid-cols-3">
                  {METRICS.map(m => (
                    <li key={m.key}>
                      <span className="font-medium text-ink-2">{m.label}</span>
                      <br />
                      {m.hint}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {scored.length > 0 && avg !== null && (
            <div className="grid grid-cols-3 gap-3 animate-fade-up">
              <Stat label="Average score" value={String(avg)} suffix="/100" tone={tone(avg)} />
              <Stat label="Passed" value={`${passed}/${scored.length}`} tone={passed === scored.length ? 'ok' : passed === 0 ? 'bad' : 'warn'} />
              <Stat label="Scored" value={`${scored.length}/${pairs.length}`} />
            </div>
          )}

          {pairs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-2 px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-ink-3">
                <Icon name="chat" size={22} />
              </div>
              <h3 className="mt-4 text-base font-medium text-white">Nothing to evaluate yet</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-3">Ask a question in Chat. Each answer shows up here so you can check its quality.</p>
              <button className="btn btn-primary mt-6" onClick={onGoToChat}>
                <Icon name="chat" size={16} /> Go to Chat
              </button>
            </div>
          ) : (
            <ol className="space-y-4">
              {pairs.map((pair, i) => (
                <PairCard
                  key={pair.id + i}
                  index={i + 1}
                  pair={pair}
                  score={scores[pair.id]}
                  running={!!running[pair.id]}
                  error={errors[pair.id]}
                  onRun={() => run(pair)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, suffix, tone: t }: { label: string; value: string; suffix?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <p className="label !text-[10px]">{label}</p>
      <p className={cn('mt-1.5 font-mono text-2xl font-semibold', t ? TEXT[t] : 'text-white')}>
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-ink-3">{suffix}</span>}
      </p>
    </div>
  )
}

function PairCard({
  index,
  pair,
  score,
  running,
  error,
  onRun,
}: {
  index: number
  pair: Pair
  score?: SavedScore
  running: boolean
  error?: string
  onRun: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const long = pair.answer.length > 320

  return (
    <li className="glass overflow-hidden rounded-2xl animate-fade-up">
      <div className="border-b border-line px-5 py-4">
        <p className="label !text-[10px]">Question {index}</p>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-white">{pair.question}</p>
      </div>

      <div className="border-b border-line bg-black/15 px-5 py-4">
        <p className="label !text-[10px]">Answer</p>
        <div className={cn('relative mt-2', !expanded && long && 'max-h-[7.5rem] overflow-hidden')}>
          <Markdown compact>{pair.answer}</Markdown>
          {!expanded && long && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b1220] to-transparent" />}
        </div>
        {long && (
          <button className="mt-2 flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Show less' : 'Show full answer'}
            <Icon name="chevron" size={13} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {score ? (
          <ScoreView score={score} running={running} onRerun={onRun} />
        ) : (
          <div>
            {error && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-bad/25 bg-bad/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-ink">
                <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-bad" /> {error}
              </p>
            )}
            <button className="btn btn-ghost w-full !py-2.5" onClick={onRun} disabled={running}>
              {running ? (
                <>
                  <Spinner size={15} className="text-accent" /> Judging this answer… usually 5–15 seconds
                </>
              ) : (
                <>
                  <Icon name={error ? 'refresh' : 'play'} size={error ? 15 : 12} /> {error ? 'Try again' : 'Run evaluation'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function ScoreView({ score, running, onRerun }: { score: SavedScore; running: boolean; onRerun: () => void }) {
  const t = tone(score.overall)
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
        <Gauge value={score.overall} />
        <span
          className={cn(
            'rounded-full border px-3 py-1 font-mono text-[11px] font-semibold tracking-wider',
            score.verdict === 'PASS' ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/30 bg-bad/10 text-bad',
          )}
        >
          {score.verdict}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {METRICS.map(m => (
          <MetricBar key={m.key} label={m.label} value={score[m.key]} />
        ))}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-ink-3">Scored {relativeTime(new Date(score.at).toISOString())}</span>
          <button className={cn('flex items-center gap-1.5 text-xs font-medium', running ? 'text-ink-3' : 'text-accent hover:underline')} onClick={onRerun} disabled={running}>
            {running ? <Spinner size={13} /> : <Icon name="refresh" size={13} />} Re-run
          </button>
        </div>
      </div>
      <span className="sr-only">Overall score {score.overall} out of 100, {t === 'ok' ? 'passing' : 'not passing'}.</span>
    </div>
  )
}

function Gauge({ value }: { value: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const r = 38
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const t = tone(value)

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" strokeWidth="7" className="stroke-white/[0.08]" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={shown ? c * (1 - pct / 100) : c}
          className={cn('transition-[stroke-dashoffset] duration-1000 ease-out', t === 'ok' ? 'stroke-ok' : t === 'warn' ? 'stroke-warn' : 'stroke-bad')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-mono text-2xl font-semibold leading-none', TEXT[t])}>{Math.round(value)}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">overall</span>
      </div>
    </div>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const t = tone(value)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={cn('font-mono text-[13px] font-semibold', TEXT[t])}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-out', BG[t])} style={{ width: shown ? `${Math.max(0, Math.min(100, value))}%` : '0%' }} />
      </div>
    </div>
  )
}
