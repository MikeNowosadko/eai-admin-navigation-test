import { useState } from 'react'
import { X, Check, PenLine } from 'lucide-react'
import type { ApprovalConfig, Outcome, ResolvedSubject } from './types'
import { AvatarStack } from './ui'
import { initialsOf } from './ui'
import { SubjectTable } from './SubjectRenderer'

const OUTCOME_LABEL: Record<Outcome, string> = {
  approve: 'Approve',
  reject: 'Reject',
  'request-changes': 'Request changes',
  'conditional-approve': 'Conditional approve',
}
const OUTCOME_CLASS: Record<Outcome, string> = {
  approve: 'primary',
  reject: 'secondary',
  'request-changes': 'ghost',
  'conditional-approve': 'ghost',
}

export interface ReviewSubmission {
  outcome?: Outcome
  selectedItemIds?: string[]
  comment: string
  signed: boolean
}

// The two-column dialog. LEFT column owns header + body + footer (share its width).
// RIGHT column runs the full dialog height and holds the actions.
export function ReviewDialog({
  subject,
  config,
  onClose,
  onSubmit,
}: {
  subject: ResolvedSubject
  config: ApprovalConfig
  onClose: () => void
  onSubmit: (s: ReviewSubmission) => void
}) {
  const mode = config.mode
  const [selected, setSelected] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [signed, setSigned] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (mode.type === 'selection' && mode.max && prev.length >= mode.max) return prev
      return [...prev, id]
    })
  }

  const people = subject.items.slice(0, 4).map((it) => ({ name: it.label, initials: initialsOf(it.label) }))
  const commentOk = !config.requireComment || comment.trim().length > 0
  const signOk = !config.requireSignature || signed

  const selCount = selected.length
  const selectionOk =
    mode.type !== 'selection' ||
    (selCount >= (mode.min ?? 0) && (mode.max == null || selCount <= mode.max))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {/* LEFT column */}
        <div className="dlg-left">
          <div className="dlg-header">
            <AvatarStack people={people} />
            <span className="title">{subject.summary}</span>
          </div>
          <div className="dlg-body">
            {mode.type === 'selection' ? (
              <table className="ctable">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}></th>
                    {subject.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subject.items.map((it) => {
                    const on = selected.includes(it.id)
                    return (
                      <tr key={it.id} className={on ? 'selected' : ''}>
                        <td>
                          <div className={`check${on ? ' on' : ''}`} onClick={() => toggle(it.id)}>
                            {on && <Check size={13} />}
                          </div>
                        </td>
                        {subject.columns.map((c) => (
                          <td key={c.key}>{String(it.fields[c.key] ?? '')}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <SubjectTable subject={subject} />
            )}
          </div>
          <div className="dlg-footer">
            <span>
              {mode.type === 'selection'
                ? `${subject.items.length} items · select ${mode.min ?? 0}–${mode.max ?? subject.items.length}`
                : `${subject.items.length} items`}
            </span>
            <span>Reviewing against the agreed rubric</span>
          </div>
        </div>

        {/* RIGHT column — full height */}
        <div className="dlg-right">
          <div className="dlg-right-head">
            <h3>Decision</h3>
            <button className="dlg-close" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>

          {mode.type === 'selection' && (
            <div className="sel-count">
              <span className="pill-count">{selCount}</span> selected
              {mode.max ? ` of max ${mode.max}` : ''}
            </div>
          )}

          <textarea
            className="textarea"
            rows={5}
            placeholder={config.requireComment ? 'Add a comment (required)…' : 'Add a comment (optional)…'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {config.requireSignature && (
            <label className="radio-row" style={{ cursor: 'pointer' }}>
              <div className={`check${signed ? ' on' : ''}`} onClick={() => setSigned(!signed)}>
                {signed && <Check size={13} />}
              </div>
              <PenLine size={15} className="lock-ico" /> I sign off on this decision
            </label>
          )}

          <div className="spacer" />

          {mode.type === 'selection' ? (
            <button
              className="btn primary"
              style={{ justifyContent: 'center' }}
              disabled={!selectionOk || !commentOk || !signOk}
              onClick={() => onSubmit({ selectedItemIds: selected, comment, signed })}
            >
              Confirm selection ({selCount})
            </button>
          ) : (
            <div className="outcome-btns">
              {mode.outcomes.map((o) => (
                <button
                  key={o}
                  className={`btn ${OUTCOME_CLASS[o]}`}
                  disabled={!commentOk || !signOk}
                  onClick={() => onSubmit({ outcome: o, comment, signed })}
                >
                  {OUTCOME_LABEL[o]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
