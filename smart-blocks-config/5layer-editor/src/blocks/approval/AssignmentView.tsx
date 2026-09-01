import { useState } from 'react'
import { Send, ArrowRight, ArrowLeft, X, Plus } from 'lucide-react'
import type { ApprovalConfig, PersonRef, ReviewerDecision } from './types'
import type { ResolvedSubject } from './types'
import { SubjectChip } from './SubjectRenderer'
import { ReviewersTable } from './ReviewersTable'
import { PersonPicker } from './PersonPicker'

// State 1 (empty "Approver *" box) → State 2 (Peer Reviewers table), plus Request approval.
export function AssignmentView({
  subject,
  config,
  decisions,
  message,
  requested,
  onAssign,
  onAddApprover,
  onInvite,
  onMessageChange,
  onRequest,
  onOpenSubject,
}: {
  subject: ResolvedSubject
  config: ApprovalConfig
  decisions: ReviewerDecision[]
  message: string
  requested: boolean
  onAssign: (slotId: string, p: PersonRef) => void
  onAddApprover: (p: PersonRef) => void
  onInvite: (p: PersonRef) => void
  onMessageChange: (v: string) => void
  onRequest: () => void
  onOpenSubject?: () => void
}) {
  const hasAnyAssigned = decisions.some((d) => d.reviewer)
  const [pickerOpen, setPickerOpen] = useState(false)
  const firstSlot = config.reviewers.slots[0]
  const firstConstrain =
    firstSlot?.assignee.mode === 'constrained'
      ? firstSlot.assignee.role
      : firstSlot?.role.mode === 'fixed'
        ? firstSlot.role.value
        : undefined

  return (
    <div>
      <h2 className="section-title">Send for approval</h2>
      <p className="section-sub">
        Route your {subject.summary.toLowerCase()} for sign-off — in-platform, with a due date. No email, no chasing.
      </p>

      <SubjectChip subject={subject} onClick={onOpenSubject} />

      {!hasAnyAssigned ? (
        <div>
          <label className="field-label">
            Approver <span className="req">*</span>
          </label>
          <div className="subject-chip" style={{ justifyContent: 'space-between' }}>
            <div className="picker">
              <button className="btn ghost" onClick={() => setPickerOpen(true)}>
                <Plus size={15} /> Add approver
              </button>
              {pickerOpen && firstSlot && (
                <PersonPicker
                  constrainRole={firstConstrain}
                  onClose={() => setPickerOpen(false)}
                  onPick={(p) => {
                    onAssign(firstSlot.id, p)
                    setPickerOpen(false)
                  }}
                  onInvite={(p) => {
                    onInvite(p)
                    onAssign(firstSlot.id, p)
                    setPickerOpen(false)
                  }}
                />
              )}
            </div>
            <X size={16} className="muted" />
          </div>
        </div>
      ) : (
        <ReviewersTable
          config={config}
          decisions={decisions}
          mode="assign"
          onAssign={onAssign}
          onAddApprover={onAddApprover}
          onInvite={onInvite}
        />
      )}

      {config.message?.enabled && (
        <div style={{ marginTop: 20 }}>
          <label className="field-label">Message (optional)</label>
          <textarea
            className="textarea"
            rows={2}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
          />
        </div>
      )}

      <div className="btn-row">
        <button className="btn ghost">
          <ArrowLeft size={15} /> Back
        </button>
        <button className="btn primary" disabled={!hasAnyAssigned || requested} onClick={onRequest}>
          <Send size={15} /> {requested ? 'Approval requested' : 'Request approval'}
        </button>
      </div>
    </div>
  )
}
