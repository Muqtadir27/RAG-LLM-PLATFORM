'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import EvalPanel from './components/EvalPanel'
import UploadModal from './components/UploadModal'
import { ServerBanner } from './components/ServerBanner'
import { Backdrop } from './components/ui/Backdrop'
import { useToast } from './components/ui/Toast'
import { ApiError, deleteDocument, fetchDocuments, type UploadResult } from './lib/api'
import { cn, stripExt } from './lib/format'
import { deleteMessages, loadMessages, loadSelectedId, messagesKey, saveMessages, saveSelectedId } from './lib/storage'
import type { ActiveTab, Document, Message } from './lib/types'
import { useServerStatus } from './lib/useServerStatus'

export default function Home() {
  const toast = useToast()
  const { status, model, wokeUp, clearWokeUp, retry } = useServerStatus()

  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('query')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const selectedDoc = documents.find(d => d.document_id === selectedId) ?? null

  /* ───────────── documents ───────────── */

  const loadDocuments = useCallback(async () => {
    setDocsError(null)
    try {
      const docs = await fetchDocuments()
      setDocuments(docs)
      return docs
    } catch (e) {
      setDocsError(e instanceof ApiError ? e.message : 'Could not load your documents.')
      return null
    } finally {
      setDocsLoading(false)
    }
  }, [])

  const restored = useRef(false)
  useEffect(() => {
    if (status === 'offline') {
      setDocsLoading(false)
      setDocsError('The server is offline, so documents can’t be loaded.')
      return
    }
    if (status !== 'online') return // still connecting or waking: keep showing the loading state
    setDocsLoading(true)
    loadDocuments().then(docs => {
      // reopen the document that was open last time
      if (docs && !restored.current) {
        restored.current = true
        const last = loadSelectedId()
        if (last && docs.some(d => d.document_id === last)) setSelectedId(last)
      }
    })
  }, [status, loadDocuments])

  // once docs are loaded, forget a selection that no longer exists (e.g. deleted elsewhere)
  useEffect(() => {
    if (!docsLoading && !docsError && selectedId && !documents.some(d => d.document_id === selectedId)) setSelectedId(null)
  }, [documents, docsLoading, docsError, selectedId])

  useEffect(() => {
    if (restored.current) saveSelectedId(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (wokeUp) {
      toast.success('The server is ready.')
      clearWokeUp()
    }
  }, [wokeUp, clearWokeUp, toast])

  const handleDelete = useCallback(
    async (doc: Document) => {
      try {
        await deleteDocument(doc.document_id)
        deleteMessages(messagesKey(doc.document_id))
        setDocuments(list => list.filter(d => d.document_id !== doc.document_id))
        setSelectedId(cur => (cur === doc.document_id ? null : cur))
        toast.success(`Deleted “${stripExt(doc.filename)}”.`)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not delete the document.')
      }
    },
    [toast],
  )

  const handleUploaded = useCallback(
    async (uploaded: UploadResult[]) => {
      await loadDocuments()
      restored.current = true
      const last = uploaded[uploaded.length - 1]
      if (last?.document_id) setSelectedId(last.document_id)
      setActiveTab('query')
      toast.success(
        uploaded.length === 1
          ? `“${stripExt(uploaded[0].filename)}” is ready${uploaded[0].chunks ? ` · ${uploaded[0].chunks} passages indexed` : ''}.`
          : `${uploaded.length} documents are ready.`,
      )
    },
    [loadDocuments, toast],
  )

  /* ───────────── chat history ─────────────
     Each document has its own thread, saved in this browser. State and storage are updated together,
     and a thread is only shown while its key matches, so switching documents can never mix threads up. */

  const key = messagesKey(selectedId)
  const keyRef = useRef(key)
  keyRef.current = key

  const [thread, setThread] = useState<{ key: string | null; messages: Message[] }>({ key: null, messages: [] })
  useEffect(() => {
    setThread({ key, messages: loadMessages(key) })
  }, [key])
  const messages = thread.key === key ? thread.messages : []

  const commitMessages = useCallback((forKey: string, next: Message[]) => {
    saveMessages(forKey, next)
    if (keyRef.current === forKey) setThread({ key: forKey, messages: next })
  }, [])

  /* ───────────── layout ───────────── */

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-bg">
      <Backdrop />

      <div className="relative z-10 flex h-full w-full">
        <Sidebar
          documents={documents}
          loading={docsLoading}
          error={docsError}
          onRetry={() => {
            if (status === 'offline') retry()
            else {
              setDocsLoading(true)
              loadDocuments()
            }
          }}
          selectedId={selectedId}
          onSelect={doc => setSelectedId(doc?.document_id ?? null)}
          onDelete={handleDelete}
          onUpload={() => setShowUpload(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          status={status}
          model={model}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <ServerBanner status={status} onRetry={retry} />

          {/* both screens stay mounted so drafts, scroll position and running answers survive switching tabs */}
          <div className={cn('min-h-0 flex-1 flex-col', activeTab === 'query' ? 'flex' : 'hidden')}>
            <Chat
              selectedDoc={selectedDoc}
              documents={documents}
              docsLoading={docsLoading}
              messages={messages}
              messagesKey={key}
              onCommit={commitMessages}
              onUpload={() => setShowUpload(true)}
              onOpenMenu={() => setSidebarOpen(true)}
              serverStatus={status}
            />
          </div>
          <div className={cn('min-h-0 flex-1 flex-col', activeTab === 'eval' ? 'flex' : 'hidden')}>
            <EvalPanel
              selectedDoc={selectedDoc}
              messages={messages}
              onOpenMenu={() => setSidebarOpen(true)}
              onGoToChat={() => setActiveTab('query')}
            />
          </div>
        </main>
      </div>

      {showUpload && <UploadModal serverStatus={status} onClose={() => setShowUpload(false)} onFinished={handleUploaded} />}
    </div>
  )
}
