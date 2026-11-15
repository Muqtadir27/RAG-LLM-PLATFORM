'use client'

import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/format'

const components: Components = {
  // never let model output navigate the app away or open without protection
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
  // wrap tables so wide ones scroll instead of breaking the layout
  table: ({ node: _node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
}

/** Renders model output as Markdown. Raw HTML is not rendered (react-markdown escapes it by default). */
function MarkdownBase({ children, compact = false, className }: { children: string; compact?: boolean; className?: string }) {
  return (
    <div className={cn(compact ? 'prose-compact' : 'prose-nexus', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const Markdown = memo(MarkdownBase)
