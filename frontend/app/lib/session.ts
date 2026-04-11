// lib/session.ts
// Generates a unique session ID per browser and persists it in localStorage.
// This is the only thing that isolates one user's documents from another's.

import { v4 as uuidv4 } from 'uuid'

const SESSION_KEY = 'rag_nexus_session_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder'

  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}