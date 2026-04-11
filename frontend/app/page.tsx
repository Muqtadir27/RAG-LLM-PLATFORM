'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import EvalPanel from './components/EvalPanel'

export interface Document {
  document_id: string
  filename: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

type ActiveTab = 'query' | 'eval'

const MESSAGES_KEY = (docId: string | null) =>
  `rag_nexus_messages_${docId || 'all'}`

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('query')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load messages from localStorage when selected doc changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = MESSAGES_KEY(selectedDoc?.document_id || null)
    const saved = localStorage.getItem(key)
    if (saved) {
      try { setMessages(JSON.parse(saved)) } catch { setMessages([]) }
    } else {
      setMessages([])
    }
  }, [selectedDoc?.document_id])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (messages.length === 0) return
    const key = MESSAGES_KEY(selectedDoc?.document_id || null)
    localStorage.setItem(key, JSON.stringify(messages))
  }, [messages, selectedDoc?.document_id])

  // Expose a setter that also persists
  const setAndPersistMessages = (newMessages: Message[]) => {
    setMessages(newMessages)
    if (typeof window === 'undefined') return
    const key = MESSAGES_KEY(selectedDoc?.document_id || null)
    if (newMessages.length === 0) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(newMessages))
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }
    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.2 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      hue: Math.random() * 60 + 180,
    }))

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.opacity})`
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x
          const dy = particles[j].y - p.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 90) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `hsla(${p.hue},100%,70%,${0.05 * (1 - d / 90)})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#020408' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '-15%', left: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,0,255,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
        <Sidebar
          documents={documents}
          setDocuments={setDocuments}
          selectedDoc={selectedDoc}
          setSelectedDoc={setSelectedDoc}
          setMessages={setAndPersistMessages}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        {activeTab === 'query'
          ? <Chat selectedDoc={selectedDoc} messages={messages} setMessages={setAndPersistMessages} />
          : <EvalPanel selectedDoc={selectedDoc} messages={messages} />
        }
      </div>
    </div>
  )
}