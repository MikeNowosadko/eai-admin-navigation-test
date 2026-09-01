import { ChevronLeft, Home, Check, Monitor, Tablet, Smartphone, Pencil, Eye, ArrowRight, Plus } from 'lucide-react'
import type { ApprovalConfig } from './types'
import type { Scenario } from '../../fixtures'
import { PublishedFrame } from './PublishedFrame'
import { SubjectChip } from './SubjectRenderer'
import { ChatConfigCard } from './ChatConfigCard'
import { ClarificationCard } from './ClarificationCard'
import { approvalQuestions, answersToConfig } from './approvalClarification'

// Editor experience: chat (left) drives the workflow; live app preview (right).
export function BuilderShell({
  scenario,
  config,
  applied,
  onApply,
  onEdit,
  onPublish,
}: {
  scenario: Scenario
  config: ApprovalConfig
  applied: boolean
  onApply: (c: ApprovalConfig) => void
  onEdit: () => void
  onPublish: () => void
}) {
  return (
    <div className="builder">
      <div className="builder-topbar">
        <span className="tb-icon">
          <ChevronLeft size={17} />
        </span>
        <span className="tb-icon">
          <Home size={16} />
        </span>
        <span className="tb-title">{scenario.title}</span>
        <span className="draft-pill">Draft</span>
        <div className="tb-right">
          <span className="saved">
            <Check size={15} /> {applied ? 'Saved' : 'Draft — not saved'}
          </span>
          <button className="btn primary" onClick={onPublish} disabled={!applied} title={applied ? 'Open the published app' : 'Answer the setup questions first'}>
            Publish
          </button>
        </div>
      </div>

      <div className="builder-body">
        {/* CHAT — edits the workflow */}
        <div className="chat-panel">
          <div className="chat-scroll">
            <div className="chat-msg them">
              You've added an <b>Approvals</b> step. From the workflow, I'll route your{' '}
              {scenario.subject.summary.toLowerCase()} for sign-off. Let's answer a few quick
              questions to set it up:
            </div>

            {applied ? (
              <ChatConfigCard
                subject={scenario.subject}
                config={config}
                confirmed
                onApply={onApply}
                onEdit={onEdit}
              />
            ) : (
              <ClarificationCard
                intro="I've suggested defaults from your workflow — change any answer, or skip to accept them."
                questions={approvalQuestions({ subjectSummary: scenario.subject.summary.toLowerCase(), collection: scenario.subject.items.length > 1 })}
                onComplete={(answers) => onApply(answersToConfig(config, answers))}
                onSkip={() => onApply(config)}
              />
            )}

            {applied && (
              <>
                <div className="chat-msg them">
                  Done — the approval step is live in the preview. Want approvers to also add a peer reviewer, or set a
                  due date?
                </div>
                <div className="chat-result">
                  <span className="tick">
                    <Check size={13} />
                  </span>
                  <div>
                    <div className="rtitle">Step added · Approvals</div>
                    <div className="rsub">Own step · props saved to the block</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="chat-input">
            <div className="box">Ask the assistant to change this step…</div>
            <button className="send">
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* PREVIEW — the live published app */}
        <div className="preview-panel">
          <div className="preview-head">
            <span className="ph-title">Workflow Preview</span>
            <div className="ph-tools">
              <div className="toggle-pill">
                <button>
                  <Pencil size={13} /> Editor
                </button>
                <button className="active">
                  <Eye size={13} /> Preview
                </button>
              </div>
              <div className="device-tools">
                <span className="d active">
                  <Monitor size={15} />
                </span>
                <span className="d">
                  <Tablet size={15} />
                </span>
                <span className="d">
                  <Smartphone size={15} />
                </span>
              </div>
            </div>
          </div>
          <div className="preview-viewport">
            <div className="preview-scaler">
              <div className="preview-app">
                <PublishedFrame frame={scenario} compactAssistant>
                  <PreviewApprovalStep scenario={scenario} config={config} />
                </PublishedFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// A live, non-interactive preview of the published approval step, reflecting config.
function PreviewApprovalStep({ scenario, config }: { scenario: Scenario; config: ApprovalConfig }) {
  const slot = config.reviewers.slots[0]
  const roleLabel =
    slot.role.mode === 'fixed'
      ? slot.role.value
      : slot.assignee.mode === 'constrained'
        ? slot.assignee.role
        : 'Chosen by the user'
  const openPerson = slot.assignee.mode !== 'fixed'
  const mode = config.mode

  return (
    <div>
      <h2 className="section-title">Send for approval</h2>
      <p className="section-sub">
        Route your {scenario.subject.summary.toLowerCase()} for sign-off — in-platform, with a due date.
      </p>
      <SubjectChip subject={scenario.subject} />

      <label className="field-label">
        Approver <span className="req">*</span>
      </label>
      <div className="subject-chip" style={{ justifyContent: 'space-between' }}>
        <span className="reviewer-cell">
          <span className="role-pill">{roleLabel}</span>
          <span className="muted" style={{ fontStyle: 'italic' }}>
            {openPerson ? 'assigned when someone uses the app' : 'fixed by the author'}
          </span>
        </span>
      </div>
      {config.reviewers.allowAddApprovers && (
        <button className="btn ghost" style={{ marginTop: 10 }}>
          <Plus size={15} /> Add approver
        </button>
      )}

      <div className="btn-row">
        <span className="muted" style={{ fontSize: 13 }}>
          {mode.type === 'selection'
            ? `Reviewer picks ${mode.min ?? 0}–${mode.max ?? scenario.subject.items.length}`
            : mode.type === 'verdict'
              ? 'Reviewer approves or rejects'
              : 'Reviewer decides each item'}
          {config.requireSignature ? ' · signature required' : ''}
        </span>
        <button className="btn primary">
          <ArrowRight size={15} /> Request approval
        </button>
      </div>
    </div>
  )
}
