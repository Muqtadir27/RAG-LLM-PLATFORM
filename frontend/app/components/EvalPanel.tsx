'use client'

import { useState } from 'react'
import { Document, Message } from '../page'
import { getSessionId } from '../lib/session'
import { API_URL } from '../lib/api'

interface EvalPanelProps {
  selectedDoc: Document | null
  messages: Message[]
}

interface ScoreResult {
  faithfulness: number
  relevance: number
  hallucination: number
  overall: number
  verdict: string
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.45)', letterSpacing: 1.5, fontFamily: 'var(--font-jetbrains)' }}>{label}</span>
        <span style={{ fontSize: 9, color, fontFamily: 'var(--font-jetbrains)', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}66`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const isPass = verdict === 'PASS'
  const color = isPass ? '#00ff88' : '#ff4444'
  return (
    <span style={{ fontSize: 8, color, border: `1px solid ${color}`, padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--font-jetbrains)', letterSpacing: 1, flexShrink: 0 }}>
      {verdict}
    </span>
  )
}

export default function EvalPanel({ selectedDoc, messages }: EvalPanelProps) {
  const [scores, setScores] = useState<Record<number, ScoreResult>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})

  const pairs: { index: number; question: string; answer: string }[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
      pairs.push({ index: i, question: messages[i].content, answer: messages[i + 1].content })
    }
  }

  const scoreColor = (v: number) => v >= 70 ? '#00ff88' : v >= 40 ? '#ffcc00' : '#ff4444'

  const runEval = async (pair: { index: number; question: string; answer: string }) => {
    setLoading(prev => ({ ...prev, [pair.index]: true }))
    try {
      const res = await fetch(`${API_URL}/eval/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': getSessionId() },
        body: JSON.stringify({
          question: pair.question,
          answer: pair.answer,
          document_id: selectedDoc?.document_id || null
        })
      })
      const data = await res.json()
      const s = data.eval?.scores
      if (s) {
        setScores(prev => ({
          ...prev,
          [pair.index]: {
            faithfulness: s.faithfulness?.score ?? 0,
            relevance: s.relevance?.score ?? 0,
            hallucination: s.hallucination?.score ?? 0,
            overall: s.overall_score ?? 0,
            verdict: s.verdict ?? 'FAIL'
          }
        }))
      }
    } catch (e) {
      console.error('Eval failed:', e)
    }
    setLoading(prev => ({ ...prev, [pair.index]: false }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, height: 52, padding: '0 28px', background: 'rgba(0,4,12,0.9)', borderBottom: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.4)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)' }}>EVAL.PIPELINE //</span>
          {selectedDoc
            ? <span style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 1, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--font-jetbrains)' }}>{selectedDoc.filename}</span>
            : <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.25)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>ALL_DOCUMENTS</span>
          }
        </div>
        <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)' }}>◈ SCORE</span>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px' }}>
        {pairs.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 32, opacity: 0.15, marginBottom: 16 }}>◈</div>
            <p style={{ fontSize: 10, color: 'rgba(0,212,255,0.3)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)', marginBottom: 8 }}>NO MESSAGES YET</p>
            <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.18)', letterSpacing: 1, fontFamily: 'var(--font-jetbrains)' }}>ASK QUESTIONS IN THE QUERY TAB THEN SCORE HERE</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: 2, fontFamily: 'var(--font-jetbrains)', marginBottom: 4 }}>
              {pairs.length} MESSAGE PAIR{pairs.length !== 1 ? 'S' : ''}
            </p>

            {pairs.map((pair, pairNum) => {
              const result = scores[pair.index]
              const isLoading = loading[pair.index]

              return (
                <div key={pair.index} style={{ border: '1px solid rgba(0,212,255,0.1)', borderRadius: 10, overflow: 'hidden', background: 'rgba(0,8,20,0.6)' }}>

                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                    <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: 1.5, marginBottom: 5, fontFamily: 'var(--font-jetbrains)' }}>Q{pairNum + 1}</div>
                    <p style={{ fontSize: 11, color: 'rgba(200,235,255,0.85)', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-jetbrains)' }}>{pair.question}</p>
                  </div>

                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,212,255,0.06)', background: 'rgba(0,212,255,0.02)' }}>
                    <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.25)', letterSpacing: 1.5, marginBottom: 4, fontFamily: 'var(--font-jetbrains)' }}>ANSWER</div>
                    <p style={{ fontSize: 10, color: 'rgba(185,215,240,0.65)', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-jetbrains)' }}>
                      {pair.answer.length > 200 ? pair.answer.slice(0, 200) + '...' : pair.answer}
                    </p>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    {result ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: 1.5, marginBottom: 4, fontFamily: 'var(--font-jetbrains)' }}>OVERALL</div>
                            <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor(result.overall), fontFamily: 'var(--font-jetbrains)' }}>{result.overall}</span>
                            <span style={{ fontSize: 10, color: 'rgba(0,212,255,0.3)', marginLeft: 4, fontFamily: 'var(--font-jetbrains)' }}>/100</span>
                          </div>
                          <VerdictBadge verdict={result.verdict} />
                        </div>
                        <ScoreBar label="FAITHFULNESS" value={result.faithfulness} color="#00d4ff" />
                        <ScoreBar label="RELEVANCE" value={result.relevance} color="#7b61ff" />
                        <ScoreBar label="HALLUCINATION GUARD" value={result.hallucination} color="#00ff88" />
                      </>
                    ) : (
                      <button
                        onClick={() => runEval(pair)}
                        disabled={isLoading}
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 6, color: isLoading ? 'rgba(0,212,255,0.3)' : '#00d4ff', fontSize: 9, letterSpacing: 2, fontFamily: 'var(--font-jetbrains)', cursor: isLoading ? 'not-allowed' : 'pointer' }}
                      >
                        {isLoading ? '◈ SCORING...' : '◈ RUN EVAL'}
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}