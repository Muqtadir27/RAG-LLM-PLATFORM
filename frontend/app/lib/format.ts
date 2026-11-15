/** Join class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function stripExt(name: string): string {
  return name.replace(/\.pdf$/i, '')
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** The backend stores naive UTC timestamps ("2026-11-14T15:20:43.123"); treat them as UTC. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return ''
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(iso)
  const then = new Date(hasZone ? iso : `${iso}Z`).getTime()
  if (Number.isNaN(then)) return ''
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}

/** Small stable string hash (djb2) – used to key saved eval results to a Q&A pair. */
export function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
