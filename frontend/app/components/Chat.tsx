'use client'

import { useState, useRef, useEffect } from 'react'
import { Document, Message } from '../page'

interface ChatProps {
  selectedDoc: Document | null
  messages: Message[]
  setMessages: (messages: Message[]) => void
}

export default function Chat({ selectedDoc, messages, setMessages }: ChatProps) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Prevent scroll on initial mount
  // Auto-scroll disabled: do nothing on messages change

  const sendMessage = async () => {
    if (!question.trim() || loading) return
    const userMsg: Message = { role: 'user', content: question }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setQuestion('')
    setCharCount(0)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, document_id: selectedDoc?.document_id || null }),
      })
      const data = await res.json()
      setMessages([...updated, { role: 'assistant', content: data.answer, sources: data.sources }])
    } catch {
      setMessages([...updated, { role: 'assistant', content: '⚠ CONNECTION_ERROR: Backend unreachable.' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, height: 52, padding: '0 28px', background: 'rgba(0,4,12,0.9)', borderBottom: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.4)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)' }}>QUERY.INTERFACE //</span>
          {selectedDoc ? (
            <span style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 1, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--font-jetbrains)' }}>{selectedDoc.filename}</span>
          ) : (
            <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.25)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>ALL_DOCUMENTS</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i===0?'#00ff88':i===1?'#ffcc00':'rgba(255,255,255,0.1)', boxShadow: i===0?'0 0 6px #00ff88':i===1?'0 0 6px #ffcc00':'none' }} />)}
          </div>
          <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.25)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)' }}>MSG: {messages.length}</span>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px 28px', gap: 16, justifyContent: isEmpty ? 'center' : 'flex-start', alignItems: isEmpty ? 'center' : 'stretch' }}
      >

        {isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,212,255,0.08)' }}>
                <div style={{ width: 78, height: 78, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'rgba(0,212,255,0.4)' }}>◈</div>
                </div>
              </div>
              <div style={{ position: 'absolute', inset: 0, animation: 'spin 4s linear infinite' }}>
                <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
              </div>
            </div>
            <div>
              <h2 className="orbitron" style={{ fontSize: 16, fontWeight: 800, color: 'rgba(0,212,255,0.7)', letterSpacing: 4, marginBottom: 8, textTransform: 'uppercase' }}>Neural Query Engine</h2>
              <p style={{ fontSize: 9, color: 'rgba(0,212,255,0.3)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)' }}>AWAITING DOCUMENT INPUT</p>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {['UPLOAD PDF','SELECT DOC','ASK QUERY'].map((step, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 10, color: 'rgba(0,212,255,0.4)', fontFamily: 'var(--font-jetbrains)' }}>{i+1}</div>
                  <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.2)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start', animation: 'fadeSlideIn 0.3s ease both', flexShrink: 0, gap: 10, alignItems: 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#00d4ff', flexShrink: 0, background: 'rgba(0,212,255,0.05)', fontFamily: 'var(--font-jetbrains)' }}>AI</div>
            )}
            <div style={{ maxWidth: '68%', padding: '12px 16px', borderRadius: msg.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background: msg.role==='user'?'linear-gradient(135deg,rgba(0,100,255,0.22),rgba(0,212,255,0.12))':'linear-gradient(135deg,rgba(0,8,20,0.92),rgba(0,20,40,0.92))', border: msg.role==='user'?'1px solid rgba(0,212,255,0.28)':'1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(10px)' }}>
              {msg.role==='assistant' && (
                <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-jetbrains)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
                  NEURAL RESPONSE
                </div>
              )}
              <p style={{ fontSize: 12, lineHeight: 1.75, color: msg.role==='user'?'rgba(200,235,255,0.95)':'rgba(185,215,240,0.88)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-jetbrains)' }}>{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,212,255,0.08)' }}>
                  <p style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: 1.5, marginBottom: 4, fontFamily: 'var(--font-jetbrains)' }}>◈ SOURCE NODES</p>
                  {msg.sources.map((src, j) => (
                    <p key={j} style={{ fontSize: 9, color: 'rgba(0,212,255,0.38)', margin: '2px 0', fontFamily: 'var(--font-jetbrains)' }}>[{j}] {src}</p>
                  ))}
                </div>
              )}
            </div>
            {msg.role==='user' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#00d4ff', flexShrink: 0, background: 'rgba(0,100,255,0.1)', fontFamily: 'var(--font-jetbrains)' }}>U</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#00d4ff', background: 'rgba(0,212,255,0.05)', fontFamily: 'var(--font-jetbrains)' }}>AI</div>
            <div style={{ padding: '12px 18px', background: 'rgba(0,8,20,0.92)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '16px 16px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 6px #00d4ff', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.4)', letterSpacing: 2, marginLeft: 6, fontFamily: 'var(--font-jetbrains)' }}>PROCESSING...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{ flexShrink: 0, padding: '12px 24px 16px', background: 'rgba(0,4,12,0.95)', borderTop: '1px solid rgba(0,212,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div
          style={{ position: 'relative', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10, background: 'rgba(0,12,28,0.85)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocusCapture={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(0,212,255,0.5)'; el.style.boxShadow='0 0 20px rgba(0,212,255,0.08)' }}
          onBlurCapture={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(0,212,255,0.18)'; el.style.boxShadow='none' }}
        >
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(0,212,255,0.28)', pointerEvents: 'none', fontFamily: 'var(--font-jetbrains)' }}>&gt;_</div>
          <textarea
            ref={inputRef}
            value={question}
            onChange={e => { setQuestion(e.target.value); setCharCount(e.target.value.length) }}
            onKeyDown={handleKeyDown}
            placeholder={selectedDoc ? `Query: ${selectedDoc.filename}...` : 'Enter neural query...'}
            rows={1}
            style={{ width: '100%', paddingLeft: 42, paddingRight: 56, paddingTop: 12, paddingBottom: 12, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(0,212,255,0.88)', fontSize: 12, letterSpacing: 0.5, resize: 'none', fontFamily: 'var(--font-jetbrains)', caretColor: '#00d4ff', boxSizing: 'border-box' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !question.trim()}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 7, background: question.trim()&&!loading?'linear-gradient(135deg,rgba(0,212,255,0.25),rgba(0,80,200,0.25))':'rgba(255,255,255,0.02)', border: `1px solid ${question.trim()&&!loading?'rgba(0,212,255,0.45)':'rgba(255,255,255,0.04)'}`, color: question.trim()&&!loading?'#00d4ff':'rgba(255,255,255,0.12)', cursor: question.trim()&&!loading?'pointer':'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >{loading ? '◌' : '▶'}</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, padding: '0 2px' }}>
          <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.18)', letterSpacing: 1.5, fontFamily: 'var(--font-jetbrains)' }}>ENTER TO TRANSMIT // SHIFT+ENTER FOR NEWLINE</span>
          <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.18)', fontFamily: 'var(--font-jetbrains)' }}>{charCount}</span>
        </div>
      </div>
    </div>
  )
}