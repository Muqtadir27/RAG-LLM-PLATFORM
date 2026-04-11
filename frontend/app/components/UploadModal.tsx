'use client'

import { useState, useRef } from 'react'
import { getSessionId } from '../lib/session'
import { API_URL } from '../lib/api'

interface UploadModalProps {
  onClose: () => void
  onUploadSuccess: () => void
}

export default function UploadModal({ onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress('INITIALIZING NEURAL INGESTION...')
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      setTimeout(() => setProgress('EXTRACTING SEMANTIC VECTORS...'), 800)
      setTimeout(() => setProgress('INDEXING TO CHROMADB...'), 1600)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'X-Session-Id': getSessionId() },
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setProgress('INDEXED ' + data.chunks + ' NEURAL CHUNKS SUCCESSFULLY')
        setTimeout(() => onUploadSuccess(), 1200)
      } else {
        setError(data.detail || 'UPLOAD FAILED')
      }
    } catch {
      setError('CONNECTION ERROR: Backend unreachable')
    }

    setUploading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', animation: 'fadeSlideIn 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: 460, margin: '0 16px', background: 'linear-gradient(135deg, rgba(0,8,20,0.98) 0%, rgba(0,15,35,0.98) 100%)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, boxShadow: '0 0 60px rgba(0,212,255,0.1), 0 0 120px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,212,255,0.1)', overflow: 'hidden', position: 'relative' }}>

        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #00d4ff, rgba(120,0,255,0.8), transparent)' }} />
        <div style={{ position: 'absolute', top: 14, left: 14, width: 12, height: 12, borderTop: '1px solid rgba(0,212,255,0.5)', borderLeft: '1px solid rgba(0,212,255,0.5)' }} />
        <div style={{ position: 'absolute', top: 14, right: 14, width: 12, height: 12, borderTop: '1px solid rgba(0,212,255,0.5)', borderRight: '1px solid rgba(0,212,255,0.5)' }} />

        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 className="orbitron" style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff', letterSpacing: 3, marginBottom: 4 }}>DOCUMENT INGESTION</h2>
              <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: 2 }}>NEURAL INDEXING PROTOCOL v2.0</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(0,212,255,0.15)', color: 'rgba(0,212,255,0.4)', cursor: 'pointer', fontSize: 12, width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && f.name.endsWith('.pdf')) setFile(f) }}
            style={{ border: '1px dashed ' + (dragOver || file ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.15)'), borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(0,212,255,0.07)' : file ? 'rgba(0,212,255,0.04)' : 'rgba(0,212,255,0.02)', transition: 'all 0.3s', marginBottom: 20 }}
          >
            <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
            {file ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 10, color: '#00d4ff' }}>◈</div>
                <p style={{ fontSize: 11, color: '#00d4ff', letterSpacing: 1, marginBottom: 4 }}>{file.name}</p>
                <p style={{ fontSize: 9, color: 'rgba(0,212,255,0.4)', letterSpacing: 1 }}>{(file.size / 1024 / 1024).toFixed(2)} MB // READY FOR INGESTION</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>↑</div>
                <p style={{ fontSize: 10, color: 'rgba(0,212,255,0.4)', letterSpacing: 1.5, marginBottom: 6 }}>DROP PDF OR CLICK TO SELECT</p>
                <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.2)', letterSpacing: 1 }}>SUPPORTED: PDF // MAX: 50MB</p>
              </div>
            )}
          </div>

          {progress && (
            <div style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(0,255,136,0.8)', letterSpacing: 1 }}>{progress}</span>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(255,50,50,0.05)', border: '1px solid rgba(255,50,50,0.15)', borderRadius: 6 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,80,80,0.8)', letterSpacing: 1 }}>! {error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 8, color: 'rgba(0,212,255,0.4)', fontSize: 9, letterSpacing: 2, cursor: 'pointer', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>ABORT</button>
            <button onClick={handleUpload} disabled={!file || uploading} style={{ flex: 2, padding: '10px', background: file && !uploading ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,100,255,0.2))' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (file && !uploading ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.05)'), borderRadius: 8, color: file && !uploading ? '#00d4ff' : 'rgba(255,255,255,0.15)', fontSize: 9, letterSpacing: 2, cursor: file && !uploading ? 'pointer' : 'not-allowed', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', fontWeight: 600, transition: 'all 0.2s' }}>
              {uploading ? 'PROCESSING...' : 'INITIATE INGESTION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}