'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, uploadDocument, type UploadResult } from '../lib/api'
import { cn, formatBytes, isAbortError } from '../lib/format'
import type { ServerStatus } from '../lib/useServerStatus'
import { Icon, Spinner } from './ui/Icons'

const MAX_BYTES = 50 * 1024 * 1024

type ItemStatus = 'queued' | 'uploading' | 'indexing' | 'done' | 'error'

interface Item {
  id: string
  file: File
  status: ItemStatus
  percent: number
  error?: string
  result?: UploadResult
}

interface UploadModalProps {
  serverStatus: ServerStatus
  onClose: () => void
  /** called once with everything that was indexed successfully */
  onFinished: (uploaded: UploadResult[]) => void
}

let counter = 0
const newId = () => `f${Date.now()}-${counter++}`
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

export default function UploadModal({ serverStatus, onClose, onFinished }: UploadModalProps) {
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [notice, setNotice] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const patch = useCallback((id: string, change: Partial<Item>) => {
    setItems(list => list.map(it => (it.id === id ? { ...it, ...change } : it)))
  }, [])

  const close = useCallback(() => {
    cancelledRef.current = true
    abortRef.current?.abort()
    clearTimeout(closeTimer.current)
    onClose()
  }, [onClose])

  /* focus handling + Escape + simple focus trap */
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  /* ───────────── adding files ───────────── */

  const addFiles = (incoming: FileList | File[]) => {
    const problems: string[] = []
    const accepted: Item[] = []
    const known = new Set(items.map(i => `${i.file.name}:${i.file.size}`))

    for (const file of Array.from(incoming)) {
      if (!isPdf(file)) problems.push(`${file.name} is not a PDF`)
      else if (file.size === 0) problems.push(`${file.name} is empty`)
      else if (file.size > MAX_BYTES) problems.push(`${file.name} is larger than 50 MB`)
      else if (known.has(`${file.name}:${file.size}`)) problems.push(`${file.name} is already in the list`)
      else {
        known.add(`${file.name}:${file.size}`)
        accepted.push({ id: newId(), file, status: 'queued', percent: 0 })
      }
    }
    setNotice(problems.join(' · '))
    if (accepted.length) setItems(list => [...list, ...accepted])
  }

  /* ───────────── uploading ───────────── */

  const start = async () => {
    if (running) return
    cancelledRef.current = false
    setRunning(true)
    setNotice('')

    const todo = items.filter(i => i.status === 'queued' || i.status === 'error')
    const uploaded: UploadResult[] = items.filter(i => i.status === 'done' && i.result).map(i => i.result!)
    let failed = 0

    for (const item of todo) {
      if (cancelledRef.current) break
      const ctrl = new AbortController()
      abortRef.current = ctrl
      patch(item.id, { status: 'uploading', percent: 0, error: undefined })

      try {
        const result = await uploadDocument(
          item.file,
          (phase, percent) => patch(item.id, phase === 'uploading' ? { status: 'uploading', percent } : { status: 'indexing', percent: 100 }),
          ctrl.signal,
        )
        patch(item.id, { status: 'done', percent: 100, result })
        uploaded.push(result)
      } catch (e) {
        if (isAbortError(e)) {
          patch(item.id, { status: 'queued', percent: 0 })
          break
        }
        failed++
        patch(item.id, { status: 'error', error: e instanceof ApiError ? e.message : 'Upload failed. Please try again.' })
      }
    }

    abortRef.current = null
    if (cancelledRef.current) return // dialog already closed
    setRunning(false)

    if (uploaded.length) {
      onFinished(uploaded)
      // everything worked: close shortly after, so the success state is visible
      if (failed === 0) closeTimer.current = setTimeout(onClose, 900)
    }
  }

  const stop = () => {
    cancelledRef.current = true
    abortRef.current?.abort()
    setRunning(false)
    setItems(list => list.map(i => (i.status === 'uploading' || i.status === 'indexing' ? { ...i, status: 'queued', percent: 0 } : i)))
  }

  const pending = items.filter(i => i.status === 'queued' || i.status === 'error').length
  const doneCount = items.filter(i => i.status === 'done').length
  const allDone = items.length > 0 && doneCount === items.length
  const serverBlocked = serverStatus === 'waking' || serverStatus === 'offline'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !running) close()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        className="glass relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl animate-pop"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            <h2 id="upload-title" className="text-lg font-semibold text-white">Add documents</h2>
            <p className="mt-1 text-[13px] text-ink-3">PDFs up to 50 MB. They are read, split into passages and indexed for search.</p>
          </div>
          <button className="icon-btn -mr-2 -mt-1 shrink-0" onClick={close} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-3">
          {/* drop zone */}
          <div
            role="button"
            tabIndex={0}
            data-autofocus
            aria-label="Choose PDF files to upload"
            onClick={() => !running && inputRef.current?.click()}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && !running) {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={e => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              if (!running) addFiles(e.dataTransfer.files)
            }}
            className={cn(
              'cursor-pointer rounded-2xl border border-dashed text-center transition-all',
              items.length ? 'px-4 py-4' : 'px-6 py-10',
              dragOver ? 'border-accent bg-accent/10' : 'border-line-2 bg-white/[0.02] hover:border-accent/50 hover:bg-accent/[0.05]',
              running && 'pointer-events-none opacity-50',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={e => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = '' // allow picking the same file again
              }}
            />
            <div className={cn('flex items-center justify-center gap-3', !items.length && 'flex-col')}>
              <span className={cn('flex items-center justify-center rounded-2xl bg-accent/10 text-accent', items.length ? 'h-9 w-9' : 'h-12 w-12')}>
                <Icon name="upload" size={items.length ? 17 : 22} />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{items.length ? 'Add more files' : 'Drop PDFs here, or click to browse'}</p>
                {!items.length && <p className="mt-1 text-xs text-ink-3">You can select several at once</p>}
              </div>
            </div>
          </div>

          {notice && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-warn/25 bg-warn/[0.07] px-3 py-2 text-xs leading-relaxed text-warn">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" /> {notice}
            </p>
          )}

          {serverBlocked && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2 text-xs leading-relaxed text-ink-2">
              <Spinner size={14} className="mt-0.5 shrink-0 text-accent" />
              {serverStatus === 'waking' ? 'The server is waking up. You can pick your files now; uploading starts working in a moment.' : 'The server is offline right now.'}
            </p>
          )}

          {/* queue */}
          {items.length > 0 && (
            <ul className="mt-4 space-y-2" aria-label="Files">
              {items.map(item => (
                <FileRow
                  key={item.id}
                  item={item}
                  canRemove={!running}
                  onRemove={() => setItems(list => list.filter(i => i.id !== item.id))}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <p className="text-xs text-ink-3" role="status">
            {running ? `Processing ${doneCount + 1} of ${items.length}…` : allDone ? 'All files are indexed.' : items.length ? `${items.length} file${items.length > 1 ? 's' : ''} selected` : ''}
          </p>
          <div className="flex gap-2">
            {running ? (
              <button className="btn btn-ghost" onClick={stop}>Cancel</button>
            ) : (
              <button className="btn btn-ghost" onClick={close}>{allDone ? 'Done' : 'Close'}</button>
            )}
            {!allDone && (
              <button className="btn btn-primary min-w-[8.5rem]" onClick={start} disabled={running || pending === 0 || serverBlocked}>
                {running ? (
                  <>
                    <Spinner size={15} /> Working…
                  </>
                ) : (
                  <>
                    <Icon name="upload" size={15} /> Upload{pending > 1 ? ` ${pending} files` : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileRow({ item, canRemove, onRemove }: { item: Item; canRemove: boolean; onRemove: () => void }) {
  const { file, status, percent, error, result } = item
  const busy = status === 'uploading' || status === 'indexing'

  const statusText =
    status === 'uploading' ? `Uploading ${percent}%` :
    status === 'indexing' ? 'Reading and indexing… large files take a little longer' :
    status === 'done' ? `Indexed${result?.chunks ? ` · ${result.chunks} passages` : ''}` :
    status === 'error' ? error :
    formatBytes(file.size)

  return (
    <li className={cn('rounded-xl border p-3 animate-fade-up', status === 'error' ? 'border-bad/30 bg-bad/[0.05]' : status === 'done' ? 'border-ok/25 bg-ok/[0.05]' : 'border-line bg-white/[0.025]')}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            status === 'done' ? 'bg-ok/15 text-ok' : status === 'error' ? 'bg-bad/15 text-bad' : 'bg-white/[0.06] text-ink-2',
          )}
        >
          {busy ? <Spinner size={16} className="text-accent" /> : <Icon name={status === 'done' ? 'check' : status === 'error' ? 'alert' : 'file'} size={17} strokeWidth={status === 'done' ? 2.4 : 1.8} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white" title={file.name}>{file.name}</p>
          <p className={cn('mt-0.5 text-xs leading-snug', status === 'error' ? 'text-bad' : status === 'done' ? 'text-ok' : 'text-ink-3')}>{statusText}</p>
        </div>
        {canRemove && status !== 'done' && (
          <button className="icon-btn !h-7 !w-7 shrink-0" onClick={onRemove} aria-label={`Remove ${file.name}`}>
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      {busy && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status === 'uploading' ? percent : undefined}>
          {status === 'uploading' ? (
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-200" style={{ width: `${percent}%` }} />
          ) : (
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent to-accent-2 animate-sweep" />
          )}
        </div>
      )}
    </li>
  )
}
