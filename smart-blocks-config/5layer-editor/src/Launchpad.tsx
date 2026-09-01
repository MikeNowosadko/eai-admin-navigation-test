import { BadgeCheck, Table2, FileScan, ArrowRightLeft, Users, FileText, Mail, ArrowRight } from 'lucide-react'
import type { ComponentType } from 'react'
import { WORKFLOW_LIST, type WorkflowKey } from './blocks/table/workflows'

export type LaunchTarget = 'full' | 'table' | 'extraction' | 'approval' | 'io'

const WORKFLOW_ICON: Record<WorkflowKey, ComponentType<{ size?: number }>> = { candidates: Users, rfp: FileText }

interface BlockCard {
  target: LaunchTarget
  name: string
  purpose: string
  icon: ComponentType<{ size?: number }>
  status: 'beta' | 'placeholder' | 'concept'
}

const BLOCKS: BlockCard[] = [
  {
    target: 'table',
    name: 'Table',
    purpose: 'Builds an evaluation table — columns from a rubric, rows from resumes.',
    icon: Table2,
    status: 'beta',
  },
  {
    target: 'extraction',
    name: 'Document extraction',
    purpose: 'Pulls structured fields from uploaded resumes to fill the table.',
    icon: FileScan,
    status: 'placeholder',
  },
  {
    target: 'approval',
    name: 'Approval',
    purpose: 'Route the selected candidates for sign-off, in-platform.',
    icon: BadgeCheck,
    status: 'beta',
  },
  {
    target: 'io',
    name: 'Input / Output',
    purpose: 'Where a block’s data comes from and goes — the source binding.',
    icon: ArrowRightLeft,
    status: 'concept',
  },
]

const STATUS_LABEL: Record<BlockCard['status'], string> = {
  beta: 'Beta',
  placeholder: 'Placeholder',
  concept: 'Concept',
}

export function Launchpad({
  onOpen,
  onChooseWorkflow,
  onChooseEmail,
}: {
  onOpen: (t: LaunchTarget) => void
  onChooseWorkflow: (key: WorkflowKey) => void
  onChooseEmail: () => void
}) {
  return (
    <div className="launchpad">
      <div className="lp-head">
        <h1>Smart Blocks</h1>
        <p>
          The same step-based workflow — the same smart blocks — for any use case. Pick a workflow to run
          it end-to-end, or try a single block.
        </p>
      </div>

      <div className="lp-section-label">Pick your workflow</div>
      <div className="lp-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {WORKFLOW_LIST.map((w) => {
          const Icon = WORKFLOW_ICON[w.key]
          return (
            <button key={w.key} className="lp-card lp-workflow" onClick={() => onChooseWorkflow(w.key)}>
              <span className="lp-card-top">
                <span className="lp-card-ico brand">
                  <Icon size={20} />
                </span>
                <span className="lp-full-go">
                  Start <ArrowRight size={15} />
                </span>
              </span>
              <span className="lp-card-name">{w.label}</span>
              <span className="lp-card-purpose">{w.blurb}</span>
            </button>
          )
        })}
        <button className="lp-card lp-workflow" onClick={onChooseEmail}>
          <span className="lp-card-top">
            <span className="lp-card-ico brand">
              <Mail size={20} />
            </span>
            <span className="lp-full-go">
              Start <ArrowRight size={15} />
            </span>
          </span>
          <span className="lp-card-name">EDM email</span>
          <span className="lp-card-purpose">Generate an effective marketing email from a brief and assets — output is AI-written text.</span>
        </button>
      </div>

      <div className="lp-section-label">Or try a single block</div>
      <div className="lp-grid">
        {BLOCKS.map((b) => {
          const Icon = b.icon
          return (
            <button key={b.target} className="lp-card" onClick={() => onOpen(b.target)}>
              <span className="lp-card-top">
                <span className="lp-card-ico">
                  <Icon size={20} />
                </span>
                <span className={`lp-status ${b.status}`}>{STATUS_LABEL[b.status]}</span>
              </span>
              <span className="lp-card-name">{b.name}</span>
              <span className="lp-card-purpose">{b.purpose}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
