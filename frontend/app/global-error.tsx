'use client'

/** Last-resort boundary (errors in the root layout). Must render its own <html> and <body>. */
export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#04060c',
          color: '#e8effc',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>RAG.NEXUS hit a problem</h1>
          <p style={{ color: '#a9b6cf', lineHeight: 1.6, margin: '0 0 20px' }}>
            Something went wrong while loading the app. Your documents are safe.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: '#2dd4ee',
              color: '#04131c',
              border: 0,
              borderRadius: 12,
              padding: '10px 18px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
