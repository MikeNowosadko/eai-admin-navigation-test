import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ApprovalConfig, PersonRef, ReviewerDecision } from './types'
import { Avatar, StatusBadge } from './ui'
import { PersonPicker } from './PersonPicker'

type Mode = 'assign' | 'track' | 'review'

export function ReviewersTable({
  title = 'Peer Reviewers',
  config,
  decisions,
  mode,
  currentReviewerSlotId,
  onAssign,
  onAddApprover,
  onReview,
  onInvite,
}: {
  title?: string
  config: ApprovalConfig
  decisions: ReviewerDecision[]
  mode: Mode
  currentReviewerSlotId?: string
  onAssign?: (slotId: string, person: PersonRef) => void
  onAddApprover?: (person: PersonRef) => void
  onReview?: (slotId: string) => void
  onInvite?: (person: PersonRef) => void
}) {
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const editable = mode === 'assign'

  const slotFor = (slotId: string) => config.reviewers.slots.find((s) => s.id === slotId)
  const constrainRoleFor = (d: ReviewerDecision): string | undefined => {
    const slot = slotFor(d.slotId)
    if (!slot) return undefined
    if (slot.assignee.mode === 'constrained') return slot.assignee.role
    if (slot.role.mode === 'fixed' && slot.assignee.mode !== 'open') return slot.role.value
    return undefined
  }

  return (
    <>
      <h3 className="rt-title">{title}</h3>
      <table className="rtable">
        <thead>
          <tr>
            <th>Role</th>
            <th>Reviewer</th>
            <th>Status</th>
            <th>Date signed</th>
            <th>Comment</th>
            <th>Due date</th>
            {mode === 'review' && <th></th>}
          </tr>
        </thead>
        <tbody>
          {decisions.map((d) => {
            const isMine = mode === 'review' && d.slotId === currentReviewerSlotId
            return (
              <tr key={d.slotId}>
                <td>
                  <span className="role-pill">{d.role}</span>
                </td>
                <td>
                  {d.reviewer ? (
                    <span className="reviewer-cell">
                      <Avatar person={d.reviewer} sm />
                      {d.reviewer.name}
                    </span>
                  ) : editable ? (
                    <div className="picker">
                      <button className="btn ghost" onClick={() => setOpenPicker(d.slotId)}>
                        <Plus size={15} /> Assign
                      </button>
                      {openPicker === d.slotId && (
                        <PersonPicker
                          constrainRole={constrainRoleFor(d)}
                          onClose={() => setOpenPicker(null)}
                          onPick={(p) => {
                            onAssign?.(d.slotId, p)
                            setOpenPicker(null)
                          }}
                          onInvite={(p) => {
                            onInvite?.(p)
                            onAssign?.(d.slotId, p)
                            setOpenPicker(null)
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="reviewer-cell unassigned">Unassigned</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={d.status} />
                </td>
                <td className="muted">{d.signedAt ?? '—'}</td>
                <td className="muted">{d.comment ? d.comment : '—'}</td>
                <td className="muted">{d.dueAt ?? '—'}</td>
                {mode === 'review' && (
                  <td>
                    {isMine && d.status === 'pending' && (
                      <button className="btn primary" onClick={() => onReview?.(d.slotId)}>
                        Review
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {editable && config.reviewers.allowAddApprovers && (
        <div className="picker" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={() => setOpenPicker('__add__')}>
            <Plus size={15} /> Add approver
          </button>
          {openPicker === '__add__' && (
            <PersonPicker
              onClose={() => setOpenPicker(null)}
              onPick={(p) => {
                onAddApprover?.(p)
                setOpenPicker(null)
              }}
              onInvite={(p) => {
                onInvite?.(p)
                onAddApprover?.(p)
                setOpenPicker(null)
              }}
            />
          )}
        </div>
      )}
    </>
  )
}
