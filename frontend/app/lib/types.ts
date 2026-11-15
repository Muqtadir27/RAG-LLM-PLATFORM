export interface Document {
  document_id: string
  filename: string
  /** number of indexed chunks (newer backends only) */
  chunks?: number
  /** UTC ISO timestamp (newer backends only) */
  uploaded_at?: string | null
}

/** A piece of a document that an answer was grounded in. */
export interface Citation {
  label: string
  filename?: string
  chunk_index?: number
  text?: string
  score?: number | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  /** plain source labels (older messages only have these) */
  sources?: string[]
  citations?: Citation[]
  /** true when this assistant message is an error notice, not a real answer */
  error?: boolean
}

export type ActiveTab = 'query' | 'eval'

export interface EvalScores {
  faithfulness: number
  relevance: number
  hallucination: number
  overall: number
  verdict: 'PASS' | 'FAIL'
}
