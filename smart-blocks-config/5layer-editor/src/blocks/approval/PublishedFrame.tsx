import { Sparkles, ArrowRight } from 'lucide-react'
import type { ApprovalOutput } from './types'

// Minimal shape the app chrome needs — both the approval scenarios and the table
// workflow satisfy this structurally.
export interface FrameInfo {
  appInitial: string
  appName: string
  title: string
  tabs: string[]
  activeTabIndex?: number
  assistant: { role: 'them' | 'me'; text: string }[]
}

// The published app chrome: blue header, stage tabs, content slot, assistant panel.
export function PublishedFrame({
  frame,
  children,
  compactAssistant,
}: {
  frame: FrameInfo
  children: React.ReactNode
  compactAssistant?: boolean
}) {
  const activeIndex = frame.activeTabIndex ?? frame.tabs.length - 1
  return (
    <div className="app">
      <div className="app-main">
        <div className="app-header">
          <span className="app-logo">{frame.appInitial}</span>
          <strong>{frame.appName}</strong>
        </div>
        <div className="app-body">
          <div className="app-title">{frame.title}</div>
          <div className="tabs">
            {frame.tabs.map((t, i) => {
              const active = i === activeIndex
              return (
                <div key={t} className={`tab${active ? ' active' : ''}`}>
                  <span className="ring">{active ? String(i + 1) : '○'}</span>
                  {t}
                </div>
              )
            })}
          </div>
          {children}
        </div>
      </div>
      <Assistant frame={frame} compact={compactAssistant} />
    </div>
  )
}

export function Assistant({ frame, compact }: { frame: FrameInfo; compact?: boolean }) {
  const lines = compact ? frame.assistant.slice(0, 3) : frame.assistant
  return (
    <div className="assistant">
      <div className="assistant-head">
        <span className="spark">
          <Sparkles size={15} />
        </span>
        Assistant <span className="sub">· ask about your results</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} className={`bubble ${l.role}`}>
          {l.text}
        </div>
      ))}
      <div className="assistant-input">
        Ask about your results…
        <span className="send">
          <ArrowRight size={15} />
        </span>
      </div>
    </div>
  )
}

export function OutputBox({ output }: { output: ApprovalOutput }) {
  return (
    <div className="output-box">
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
        <ArrowRight size={15} /> Block output → next step
      </div>
      {JSON.stringify(output, null, 2)}
    </div>
  )
}
