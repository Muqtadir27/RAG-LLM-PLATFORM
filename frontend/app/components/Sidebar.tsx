'use client'

import { useState, useEffect } from 'react'
import { Document, Message } from '../page'
import UploadModal from './UploadModal'
import { getSessionId } from '../lib/session'
import { API_URL } from '../lib/api'

type ActiveTab = 'query' | 'eval'

interface SidebarProps {
  documents: Document[]
  setDocuments: (docs: Document[]) => void
  selectedDoc: Document | null
  setSelectedDoc: (doc: Document | null) => void
  setMessages: (messages: Message[]) => void
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
}

export default function Sidebar({ documents, setDocuments, selectedDoc, setSelectedDoc, setMessages, activeTab, setActiveTab }: SidebarProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { 'X-Session-Id': getSessionId() }
      })
      const data = await res.json()
      setDocuments(data.documents)
    } catch {}
  }

  useEffect(() => { fetchDocuments() }, [])

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'X-Session-Id': getSessionId() }
      })
      if (selectedDoc?.document_id === docId) { setSelectedDoc(null); setMessages([]) }
      await fetchDocuments()
    } catch {}
  }

  return (
    <>
      <aside style={{
        width: 280, minWidth: 280, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(0,8,20,0.97) 0%, rgba(0,4,12,0.99) 100%)',
        borderRight: '1px solid rgba(0,212,255,0.12)', position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.4) 30%, rgba(0,212,255,0.4) 70%, transparent)' }} />

        {/* HEADER */}
        <div style={{ flexShrink: 0, padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,212,255,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10, width: 10, height: 10, borderTop: '1px solid rgba(0,212,255,0.5)', borderLeft: '1px solid rgba(0,212,255,0.5)' }} />
          <div style={{ position: 'absolute', top: 10, right: 22, width: 10, height: 10, borderTop: '1px solid rgba(0,212,255,0.5)', borderRight: '1px solid rgba(0,212,255,0.5)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff, 0 0 16px #00d4ff', animation: 'glow-pulse 2s ease-in-out infinite' }} />
            <h1 className="orbitron" style={{ fontSize: 12, fontWeight: 800, color: '#00d4ff', letterSpacing: 3, textTransform: 'uppercase' }}>RAG.NEXUS</h1>
          </div>
          <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.35)', letterSpacing: 2, marginLeft: 15, fontFamily: 'var(--font-jetbrains)' }}>v2.0 // GLM-4.7 ENGINE</p>
          <div style={{ marginTop: 10, padding: '5px 8px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>SYS.TIME</span>
            <span style={{ fontSize: 8, color: '#00d4ff', fontFamily: 'var(--font-jetbrains)', letterSpacing: 1 }}>{time}</span>
          </div>
        </div>

        {/* MODE TABS */}
        <div style={{ flexShrink: 0, padding: '10px 16px 0', display: 'flex', gap: 4 }}>
          {(['query', 'eval'] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '7px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
              fontSize: 8, letterSpacing: 2, fontFamily: 'var(--font-jetbrains)', textTransform: 'uppercase', fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === tab ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,80,200,0.1))' : 'rgba(0,212,255,0.03)',
              color: activeTab === tab ? '#00d4ff' : 'rgba(0,212,255,0.3)',
              borderBottom: activeTab === tab ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(0,212,255,0.08)',
              boxShadow: activeTab === tab ? '0 0 12px rgba(0,212,255,0.08)' : 'none',
            }}>
              {tab === 'query' ? '⬡ QUERY' : '◈ EVAL'}
            </button>
          ))}
        </div>

        {/* UPLOAD BUTTON */}
        <div style={{ flexShrink: 0, padding: '12px 16px' }}>
          <button
            onClick={() => setShowUpload(true)}
            style={{ width: '100%', padding: '9px 16px', background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,100,200,0.08))', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 6, color: '#00d4ff', fontSize: 9, letterSpacing: 2, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-jetbrains)', textTransform: 'uppercase', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,200,0.15))'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,212,255,0.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,100,200,0.08))'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: 13 }}>⊕</span>
            LOAD DOCUMENT
          </button>
        </div>

        {/* DOCUMENTS LIST */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains)' }}>Neural Index</span>
            <span style={{ fontSize: 7, color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 3, padding: '1px 5px', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>{documents.length} FILES</span>
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.2 }}>◈</div>
              <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.2)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>NO DATA INDEXED</p>
              <p style={{ fontSize: 7, color: 'rgba(0,212,255,0.12)', marginTop: 3, letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>LOAD A DOCUMENT TO BEGIN</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {documents.map((doc, i) => (
                <li
                  key={doc.document_id}
                  onClick={() => {
                    if (selectedDoc?.document_id !== doc.document_id) setMessages([])
                    setSelectedDoc(doc)
                  }}
                  onMouseEnter={() => setHoveredDoc(doc.document_id)}
                  onMouseLeave={() => setHoveredDoc(null)}
                  style={{ padding: '9px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: selectedDoc?.document_id === doc.document_id ? 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,100,255,0.07))' : hoveredDoc === doc.document_id ? 'rgba(0,212,255,0.04)' : 'transparent', border: selectedDoc?.document_id === doc.document_id ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 9, color: selectedDoc?.document_id === doc.document_id ? '#00d4ff' : 'rgba(0,212,255,0.3)', flexShrink: 0 }}>▸</span>
                    <span style={{ fontSize: 10, color: selectedDoc?.document_id === doc.document_id ? '#00d4ff' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.3, fontFamily: 'var(--font-jetbrains)' }}>
                      {doc.filename.replace('.pdf', '')}
                    </span>
                  </div>
                  {hoveredDoc === doc.document_id && (
                    <button onClick={e => handleDelete(doc.document_id, e)} style={{ background: 'none', border: 'none', color: 'rgba(255,60,60,0.6)', cursor: 'pointer', fontSize: 10, padding: '0 2px', flexShrink: 0 }}>✕</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid rgba(0,212,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.25)', letterSpacing: 1.5, fontFamily: 'var(--font-jetbrains)' }}>NEURAL ENGINE ONLINE</span>
        </div>
      </aside>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploadSuccess={() => { setShowUpload(false); fetchDocuments() }}
        />
      )}
    </>
  )
}