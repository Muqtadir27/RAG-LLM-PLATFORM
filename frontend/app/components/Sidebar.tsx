'use client'

import { useState } from 'react'
import type { ActiveTab, Document } from '../lib/types'
import type { ServerStatus } from '../lib/useServerStatus'
import { cn, relativeTime, stripExt } from '../lib/format'
import { Icon, Logo, type IconName } from './ui/Icons'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface SidebarProps {
  documents: Document[]
  loading: boolean
  error: string | null
  onRetry: () => void
  selectedId: string | null
  onSelect: (doc: Document | null) => void
  onDelete: (doc: Document) => Promise<void>
  onUpload: () => void
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  status: ServerStatus
  model?: string
  /** mobile drawer state */
  open: boolean
  onClose: () => void
}

const STATUS_UI: Record<ServerStatus, { label: string; dot: string }> = {
  checking: { label: 'Connecting…', dot: 'bg-ink-3' },
  waking: { label: 'Waking up server…', dot: 'bg-warn animate-pulse' },
  online: { label: 'Connected', dot: 'bg-ok shadow-[0_0_8px_var(--color-ok)]' },
  offline: { label: 'Server offline', dot: 'bg-bad' },
}

const TABS: { id: ActiveTab; label: string; icon: IconName }[] = [
  { id: 'query', label: 'Chat', icon: 'chat' },
  { id: 'eval', label: 'Evaluate', icon: 'gauge' },
]

function prettyModel(model?: string) {
  if (!model) return 'RAG engine'
  return model.split('/').pop() ?? model
}

export default function Sidebar(props: SidebarProps) {
  const { documents, loading, error, onRetry, selectedId, onSelect, onDelete, onUpload, activeTab, onTabChange, status, model, open, onClose } = props
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)
  const st = STATUS_UI[status]

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const pick = (doc: Document | null) => {
    onSelect(doc)
    onClose()
  }

  return (
    <>
      {/* mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Documents and navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[300px] max-w-[86vw] flex-col border-r border-line bg-surface/95 backdrop-blur-xl transition-transform duration-300 md:static md:z-auto md:max-w-none md:translate-x-0 md:bg-surface/60',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <Logo size={30} glow />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[15px] font-extrabold leading-none tracking-[0.18em] text-white">RAG.NEXUS</h1>
            <p className="mt-1.5 truncate font-mono text-[11px] text-ink-3" title={model}>
              v2.0 · {prettyModel(model)}
            </p>
          </div>
          <button className="icon-btn md:hidden" onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* mode switch */}
        <div className="px-4">
          <div role="tablist" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-black/25 p-1">
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    onTabChange(tab.id)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium transition-all',
                    active ? 'bg-surface-3 text-white shadow-[0_1px_0_rgb(255_255_255/0.06)_inset]' : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  <Icon name={tab.icon} size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 pb-3 pt-4">
          <button className="btn btn-primary w-full" onClick={() => { onUpload(); onClose() }}>
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Add document
          </button>
        </div>

        {/* documents */}
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <span className="label">Documents</span>
          {!loading && !error && (
            <span className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{documents.length}</span>
          )}
        </div>

        <nav aria-label="Documents" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="space-y-2 px-1 pt-1" aria-busy="true" aria-label="Loading documents">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
                  <div className="skeleton h-9 w-9 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-4/5" />
                    <div className="skeleton h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mx-1 mt-1 rounded-xl border border-bad/25 bg-bad/[0.06] p-4 text-center">
              <Icon name="alert" size={20} className="mx-auto text-bad" />
              <p className="mt-2 text-[13px] leading-snug text-ink-2">{error}</p>
              <button className="btn btn-ghost mt-3 !py-1.5" onClick={onRetry}>
                <Icon name="refresh" size={14} /> Retry
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="mx-1 mt-1 rounded-xl border border-dashed border-line-2 p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon name="file" size={18} />
              </div>
              <p className="mt-3 text-[13px] font-medium text-ink">No documents yet</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-3">Add a PDF to start asking questions about it.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {documents.length > 1 && (
                <li>
                  <button
                    onClick={() => pick(null)}
                    aria-current={selectedId === null}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                      selectedId === null ? 'border-accent/30 bg-accent/[0.08]' : 'border-transparent hover:bg-white/[0.04]',
                    )}
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', selectedId === null ? 'bg-accent/15 text-accent' : 'bg-white/[0.05] text-ink-3')}>
                      <Icon name="layers" size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block truncate text-[13px] font-medium', selectedId === null ? 'text-white' : 'text-ink-2')}>All documents</span>
                      <span className="block text-xs text-ink-3">Search across everything</span>
                    </span>
                  </button>
                </li>
              )}

              {documents.map(doc => {
                const active = selectedId === doc.document_id
                const meta = [doc.chunks ? `${doc.chunks} chunks` : null, relativeTime(doc.uploaded_at) || null].filter(Boolean).join(' · ')
                return (
                  <li key={doc.document_id} className="group relative animate-fade-up">
                    <button
                      onClick={() => pick(doc)}
                      aria-current={active}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-2.5 pr-10 text-left transition-colors',
                        active ? 'border-accent/30 bg-accent/[0.08]' : 'border-transparent hover:bg-white/[0.04]',
                      )}
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-accent/15 text-accent' : 'bg-white/[0.05] text-ink-3')}>
                        <Icon name="file" size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block truncate text-[13px] font-medium', active ? 'text-white' : 'text-ink-2')} title={doc.filename}>
                          {stripExt(doc.filename)}
                        </span>
                        {meta && <span className="block truncate text-xs text-ink-3">{meta}</span>}
                      </span>
                    </button>
                    <button
                      onClick={() => setPendingDelete(doc)}
                      aria-label={`Delete ${doc.filename}`}
                      className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2 opacity-100 hover:!bg-bad/10 hover:!text-bad md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        {/* footer */}
        <div className="border-t border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5" role="status">
            <span className={cn('h-2 w-2 rounded-full', st.dot)} />
            <span className="text-xs text-ink-2">{st.label}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-snug text-ink-3">
            <Icon name="shield" size={12} className="shrink-0" />
            Documents are private to this browser.
          </p>
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          destructive
          busy={deleting}
          title="Delete this document?"
          message={`“${stripExt(pendingDelete.filename)}” and its indexed content will be removed. Your chat history for it will be deleted too.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
