import { Icon } from './Icons'
import type { Document } from '../../lib/types'
import { stripExt } from '../../lib/format'

interface TopBarProps {
  title: string
  doc: Document | null
  onMenu: () => void
  children?: React.ReactNode
}

/** Header shared by the Chat and Evaluate screens. */
export function TopBar({ title, doc, onMenu, children }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/50 px-4 backdrop-blur-xl sm:px-6">
      <button className="icon-btn md:hidden" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" size={20} />
      </button>
      <h2 className="text-[15px] font-semibold text-white">{title}</h2>
      <span className="hidden h-4 w-px bg-line-2 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <Icon name={doc ? 'file' : 'layers'} size={15} className="shrink-0 text-accent" />
        <span className="truncate text-ink-2" title={doc?.filename}>
          {doc ? stripExt(doc.filename) : 'All documents'}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1">{children}</div>
    </header>
  )
}
