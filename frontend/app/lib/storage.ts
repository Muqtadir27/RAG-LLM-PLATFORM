import type { EvalScores, Message } from './types'

/** Every localStorage access is wrapped: it can throw (private windows, blocked storage, full quota). */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch { /* storage unavailable – the app still works, it just won't remember */ }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch { /* ignore */ }
}

/* ───────────── chat history (one thread per document, plus one for "all documents") ───────────── */

export const messagesKey = (docId: string | null) => `rag_nexus_messages_${docId || 'all'}`

export function loadMessages(key: string): Message[] {
  const raw = read(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMessages(key: string, messages: Message[]) {
  // error notices are transient – don't keep them in history
  const keep = messages.filter(m => !m.error)
  if (keep.length === 0) remove(key)
  else write(key, JSON.stringify(keep))
}

export function deleteMessages(key: string) {
  remove(key)
}

/* ───────────── which document was open last ───────────── */

const SELECTED_KEY = 'rag_nexus_selected_doc'

export const loadSelectedId = (): string | null => read(SELECTED_KEY)
export function saveSelectedId(id: string | null) {
  if (id) write(SELECTED_KEY, id)
  else remove(SELECTED_KEY)
}

/* ───────────── saved eval scores ───────────── */

const EVAL_KEY = 'rag_nexus_eval_scores'

export interface SavedScore extends EvalScores {
  at: number
}

export function loadScores(): Record<string, SavedScore> {
  const raw = read(EVAL_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveScore(id: string, score: SavedScore) {
  const all = loadScores()
  all[id] = score
  // keep the 200 most recent
  const entries = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 200)
  write(EVAL_KEY, JSON.stringify(Object.fromEntries(entries)))
}
