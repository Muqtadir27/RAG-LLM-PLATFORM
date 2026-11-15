'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Citation, Document, Message } from '../lib/types'
import type { ServerStatus } from '../lib/useServerStatus'
import { ApiError, streamQuery } from '../lib/api'
import { isAbortError, stripExt } from '../lib/format'
import { Icon } from './ui/Icons'
import { TopBar } from './ui/TopBar'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Composer } from './chat/Composer'
import { EmptyState } from './chat/EmptyState'
import { MessageView, StreamingMessage } from './chat/MessageView'

interface ChatProps {
  selectedDoc: Document | null
  documents: Document[]
  docsLoading: boolean
  messages: Message[]
  /** storage key of the thread being shown; answers are always saved to the thread they were asked in */
  messagesKey: string
  onCommit: (key: string, next: Message[]) => void
  onUpload: () => void
  onOpenMenu: () => void
  serverStatus: ServerStatus
}

interface StreamState {
  content: string
  phase: 'searching' | 'writing'
  citations?: Citation[]
  sources?: string[]
}

export default function Chat({
  selectedDoc,
  documents,
  docsLoading,
  messages,
  messagesKey,
  onCommit,
  onUpload,
  onOpenMenu,
  serverStatus,
}: ChatProps) {
  const [question, setQuestion] = useState('')
  const [stream, setStream] = useState<StreamState | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showJump, setShowJump] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)

  const streaming = stream !== null
  const isEmpty = messages.length === 0 && !streaming

  /* ───────────── scrolling ───────────── */

  const scrollToBottom = useCallback((smooth = false) => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    stickRef.current = nearBottom
    setShowJump(!nearBottom)
  }

  useEffect(() => {
    if (stickRef.current) scrollToBottom()
  }, [messages, stream?.content, stream?.phase, scrollToBottom])

  // new thread: start at the bottom, and stop any answer that is still being written for the old one
  useEffect(() => {
    stickRef.current = true
    setShowJump(false)
    return () => abortRef.current?.abort()
  }, [messagesKey])

  /* ───────────── sending ───────────── */

  const send = useCallback(
    async (text: string, history: Message[] = messages) => {
      const q = text.trim()
      if (!q || abortRef.current) return

      const key = messagesKey
      const withQuestion: Message[] = [...history, { role: 'user', content: q }]
      onCommit(key, withQuestion)
      setQuestion('')
      stickRef.current = true

      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStream({ content: '', phase: 'searching' })

      let content = ''
      let sources: string[] = []
      let citations: Citation[] = []
      let frame = 0
      // tokens arrive faster than the screen refreshes – draw at most once per frame
      const flush = () => {
        frame = 0
        setStream(s => (s ? { ...s, content, phase: 'writing' } : s))
      }

      const answer = (): Message => ({ role: 'assistant', content, sources, citations })

      try {
        await streamQuery({
          question: q,
          documentId: selectedDoc?.document_id ?? null,
          signal: ctrl.signal,
          onMeta: meta => {
            sources = meta.sources
            citations = meta.citations
            setStream(s => (s ? { ...s, sources, citations } : s))
          },
          onToken: t => {
            content += t
            if (!frame) frame = requestAnimationFrame(flush)
          },
        })
        onCommit(
          key,
          content.trim()
            ? [...withQuestion, answer()]
            : [...withQuestion, { role: 'assistant', content: 'The model returned an empty answer. Please try again.', error: true }],
        )
      } catch (e) {
        if (isAbortError(e)) {
          // stopped by the user (or the thread changed): keep whatever was written
          if (content.trim()) onCommit(key, [...withQuestion, answer()])
        } else {
          const message = e instanceof ApiError ? e.message : 'Something went wrong while answering. Please try again.'
          onCommit(key, [...withQuestion, { role: 'assistant', content: message, error: true }])
        }
      } finally {
        if (frame) cancelAnimationFrame(frame)
        abortRef.current = null
        setStream(null)
      }
    },
    [messages, messagesKey, onCommit, selectedDoc?.document_id],
  )

  const regenerate = () => {
    let i = messages.length - 1
    while (i >= 0 && messages[i].role !== 'user') i--
    if (i >= 0) send(messages[i].content, messages.slice(0, i))
  }

  /* ───────────── composer state ───────────── */

  let blockedReason: string | undefined
  if (serverStatus === 'waking') blockedReason = 'The server is waking up — one moment…'
  else if (serverStatus === 'offline') blockedReason = 'The server is offline. Try again in a few minutes.'
  else if (!docsLoading && documents.length === 0) blockedReason = 'Add a document to start chatting'

  const placeholder = selectedDoc ? `Ask about ${stripExt(selectedDoc.filename)}…` : 'Ask about your documents…'

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar title="Chat" doc={selectedDoc} onMenu={onOpenMenu}>
        {messages.length > 0 && !streaming && (
          <button className="btn btn-ghost !border-transparent !bg-transparent !px-2.5 !py-1.5 !text-xs" onClick={() => setConfirmClear(true)}>
            <Icon name="trash" size={14} />
            <span className="hidden sm:inline">Clear chat</span>
          </button>
        )}
      </TopBar>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollerRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto px-4 sm:px-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-7 py-6">
            {isEmpty ? (
              <EmptyState
                documents={documents}
                selectedDoc={selectedDoc}
                loading={docsLoading}
                onUpload={onUpload}
                onAsk={q => send(q)}
                disabled={!!blockedReason}
              />
            ) : (
              messages.map((m, i) => (
                <MessageView key={i} message={m} isLast={i === messages.length - 1} busy={streaming} onRegenerate={regenerate} />
              ))
            )}
            {stream && <StreamingMessage content={stream.content} phase={stream.phase} citations={stream.citations} />}
          </div>
        </div>

        {showJump && (
          <button
            className="btn btn-ghost glass absolute bottom-4 left-1/2 z-10 -translate-x-1/2 !rounded-full !px-3.5 !py-2 !text-xs animate-pop"
            onClick={() => {
              stickRef.current = true
              scrollToBottom(true)
            }}
          >
            <Icon name="arrowDown" size={14} /> Latest
          </button>
        )}
      </div>

      <Composer
        value={question}
        onChange={setQuestion}
        onSend={() => send(question)}
        onStop={() => abortRef.current?.abort()}
        streaming={streaming}
        blockedReason={blockedReason}
        placeholder={placeholder}
        focusKey={messagesKey}
      />

      {confirmClear && (
        <ConfirmDialog
          destructive
          title="Clear this conversation?"
          message="All messages in this chat will be removed from this browser. The document itself stays indexed."
          confirmLabel="Clear chat"
          onConfirm={() => {
            onCommit(messagesKey, [])
            setConfirmClear(false)
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  )
}
