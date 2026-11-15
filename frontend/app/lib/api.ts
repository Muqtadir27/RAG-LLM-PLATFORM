import { getSessionId } from './session'
import type { Citation, Document, EvalScores } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
  console.error(
    '[API] CRITICAL: NEXT_PUBLIC_API_URL is not set in production. ' +
    'API calls will default to localhost and fail. ' +
    'Please set this in your hosting environment variables.'
  )
}

export { API_URL }

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."

export class ApiError extends Error {
  status: number
  /** status 0 means the request never got an HTTP response (network down, server asleep…) */
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
  get isNetwork() {
    return this.status === 0
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === 'string') return data.detail
  } catch { /* body was not JSON */ }
  return res.status >= 500 ? 'The server had a problem. Please try again.' : `Request failed (${res.status}).`
}

type FetchInit = RequestInit & { timeoutMs?: number }

/** fetch + JSON + session header + timeout + readable errors. Caller aborts bubble up as AbortError. */
export async function apiFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const { timeoutMs = 60_000, headers, signal, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort())

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { 'X-Session-Id': getSessionId(), ...headers },
    })
    if (!res.ok) throw new ApiError(await readError(res), res.status)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (signal?.aborted) throw e
    throw new ApiError(NETWORK_MESSAGE, 0)
  } finally {
    clearTimeout(timer)
  }
}

/* ───────────── health ───────────── */

export async function checkHealth(timeoutMs = 8000): Promise<{ status: string; model?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new ApiError('unhealthy', res.status)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/* ───────────── documents ───────────── */

export async function fetchDocuments(): Promise<Document[]> {
  const data = await apiFetch<{ documents: Document[] }>('/documents')
  return Array.isArray(data.documents) ? data.documents : []
}

export async function deleteDocument(id: string): Promise<void> {
  await apiFetch(`/documents/${id}`, { method: 'DELETE' })
}

export interface UploadResult {
  document_id: string
  filename: string
  chunks: number
}

/** Upload with real progress (fetch can't report upload progress, XHR can). */
export function uploadDocument(
  file: File,
  onProgress: (phase: 'uploading' | 'indexing', percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/upload`)
    xhr.setRequestHeader('X-Session-Id', getSessionId())
    xhr.timeout = 10 * 60 * 1000

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress('uploading', Math.round((e.loaded / e.total) * 100))
    }
    // all bytes sent – from here the server is parsing, embedding and indexing
    xhr.upload.onload = () => onProgress('indexing', 100)

    xhr.onload = () => {
      let body: { detail?: string } & Partial<UploadResult> = {}
      try { body = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          document_id: body.document_id ?? '',
          filename: body.filename ?? file.name,
          chunks: body.chunks ?? 0,
        })
      } else {
        const fallback = xhr.status >= 500 ? 'The server had a problem. Please try again.' : `Upload failed (${xhr.status}).`
        reject(new ApiError(typeof body.detail === 'string' ? body.detail : fallback, xhr.status))
      }
    }
    xhr.onerror = () => reject(new ApiError(NETWORK_MESSAGE, 0))
    xhr.ontimeout = () => reject(new ApiError('The upload timed out. Try a smaller file.', 0))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort())

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

/* ───────────── streaming chat ───────────── */

interface StreamOptions {
  question: string
  documentId: string | null
  signal?: AbortSignal
  onMeta?: (meta: { sources: string[]; citations: Citation[] }) => void
  onToken: (text: string) => void
}

function parseSSE(block: string): { event: string; data: any } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!dataLines.length) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}

/** POST /query/stream and feed events to the callbacks. Resolves when the answer is complete. */
export async function streamQuery(opts: StreamOptions): Promise<void> {
  const { question, documentId, signal, onMeta, onToken } = opts

  let res: Response
  try {
    res = await fetch(`${API_URL}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': getSessionId() },
      body: JSON.stringify({ question, document_id: documentId }),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ApiError(NETWORK_MESSAGE, 0)
  }

  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (!res.body) throw new ApiError('Streaming is not supported in this browser.', 0)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false

  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (signal?.aborted) throw e
      throw new ApiError('The connection was lost while the answer was being written.', 0)
    }
    if (chunk.done) break

    buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n')
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const evt = parseSSE(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      if (!evt) continue

      if (evt.event === 'meta') onMeta?.({ sources: evt.data.sources ?? [], citations: evt.data.citations ?? [] })
      else if (evt.event === 'token') onToken(String(evt.data.t ?? ''))
      else if (evt.event === 'error') throw new ApiError(evt.data.detail || 'The answer could not be generated.', 500)
      else if (evt.event === 'done') finished = true
    }
  }

  if (!finished) throw new ApiError('The answer was cut off. Please try again.', 0)
}

/* ───────────── evaluation ───────────── */

export async function scoreAnswer(question: string, answer: string, documentId: string | null): Promise<EvalScores> {
  const data = await apiFetch<{ eval?: { scores?: any } }>('/eval/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, document_id: documentId }),
    timeoutMs: 90_000,
  })
  const s = data.eval?.scores
  if (!s) throw new ApiError('The scorer returned no result. Please try again.', 502)
  const overall = Number(s.overall_score ?? 0)
  return {
    faithfulness: Number(s.faithfulness?.score ?? 0),
    relevance: Number(s.relevance?.score ?? 0),
    hallucination: Number(s.hallucination?.score ?? 0),
    overall,
    verdict: s.verdict === 'PASS' ? 'PASS' : 'FAIL',
  }
}
