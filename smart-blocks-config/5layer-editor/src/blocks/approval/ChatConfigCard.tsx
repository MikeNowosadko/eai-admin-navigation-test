import { useState } from 'react'
import { Sparkles, Check, ArrowRight, Pencil } from 'lucide-react'
import type { ApprovalConfig, ApprovalMode, ReviewerPreset, ReviewerSlot } from './types'
import type { ResolvedSubject } from './types'
import { ROLES, MEMBERS } from '../../fixtures'

function presetOf(slot: ReviewerSlot): ReviewerPreset {
  if (slot.role.mode === 'open' && slot.assignee.mode === 'open') return 'chooser-picks'
  if (slot.assignee.mode === 'fixed') return 'lock-person'
  return 'lock-role'
}
function buildSlot(id: string, preset: ReviewerPreset, role: string): ReviewerSlot {
  if (preset === 'chooser-picks') return { id, role: { mode: 'open' }, assignee: { mode: 'open' } }
  if (preset === 'lock-person') {
    const person = MEMBERS.find((m) => m.role === role) ?? MEMBERS[0]
    return { id, role: { mode: 'fixed', value: role }, assignee: { mode: 'fixed', value: person } }
  }
  return { id, role: { mode: 'fixed', value: role }, assignee: { mode: 'constrained', role } }
}
const PRESET_LABEL: Record<ReviewerPreset, string> = {
  'lock-role': 'a specific role',
  'lock-person': 'a specific person',
  'chooser-picks': 'whoever the user picks',
}

// The prop-config surface as a UI card INSIDE the chat. The LLM has pre-filled
// assumptions from the workflow; this card asks the clarifying questions.
export function ChatConfigCard({
  subject,
  config,
  confirmed,
  onApply,
  onEdit,
}: {
  subject: ResolvedSubject
  config: ApprovalConfig
  confirmed: boolean
  onApply: (c: ApprovalConfig) => void
  onEdit: () => void
}) {
  const [draft, setDraft] = useState<ApprovalConfig>(config)
  const mode = draft.mode
  const slot = draft.reviewers.slots[0]
  const preset = presetOf(slot)
  const role = slot.role.mode === 'fixed' ? slot.role.value : slot.assignee.mode === 'constrained' ? slot.assignee.role : ROLES[0]

  const setMode = (m: ApprovalMode) => setDraft({ ...draft, mode: m })
  const setSlot = (p: ReviewerPreset, r: string) =>
    setDraft({ ...draft, reviewers: { ...draft.reviewers, slots: [buildSlot(slot.id, p, r)] } })

  if (confirmed) {
    const cRole = config.reviewers.slots[0]
    const cPreset = presetOf(cRole)
    const cRoleName = cRole.role.mode === 'fixed' ? cRole.role.value : 'chosen at runtime'
    return (
      <div className="cfg-card-chat">
        <div className="ccc-head">
          <span className="spark">
            <Check size={13} />
          </span>
          Approval step configured
        </div>
        <div className="ccc-confirmed">
          <div className="line">
            <span className="k">Approving</span> {subject.summary}
          </div>
          <div className="line">
            <span className="k">Decision</span>
            {config.mode.type === 'selection'
              ? `pick ${config.mode.min ?? 0}–${config.mode.max ?? subject.items.length}`
              : config.mode.type === 'verdict'
                ? 'approve / reject'
                : 'per-item'}
          </div>
          <div className="line">
            <span className="k">Sign-off</span> {PRESET_LABEL[cPreset]}
            {cPreset !== 'chooser-picks' ? ` — ${cRoleName}` : ''}
          </div>
          <div className="line">
            <span className="k">Signature</span> {config.requireSignature ? 'required' : 'not required'}
          </div>
          <button className="btn ghost" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={onEdit}>
            <Pencil size={13} /> Adjust
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cfg-card-chat">
      <div className="ccc-head">
        <span className="spark">
          <Sparkles size={13} />
        </span>
        Set up the approval
      </div>
      <div className="ccc-body">
        <p className="ccc-intro">
          I've pre-filled these from your workflow — adjust anything, then apply.
        </p>

        <div className="ccc-q">
          <label>What's being approved?</label>
          <div className="ccc-assumed">
            {subject.summary}
            <span className="tag">assumed</span>
          </div>
        </div>

        <div className="ccc-q">
          <label>How do they decide?</label>
          <div className="seg-sm">
            {(['verdict', 'selection', 'per-item'] as const).map((t) => (
              <button
                key={t}
                className={mode.type === t ? 'active' : ''}
                onClick={() =>
                  setMode(
                    t === 'selection'
                      ? { type: 'selection', min: 1, max: 3 }
                      : t === 'per-item'
                        ? { type: 'per-item', outcomes: ['approve', 'reject'] }
                        : { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] },
                  )
                }
              >
                {t}
              </button>
            ))}
          </div>
          {mode.type === 'selection' && (
            <div className="ccc-controls" style={{ marginTop: 4, alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 13 }}>Can pick</span>
              <input className="num-sm" type="number" value={mode.min ?? 0} onChange={(e) => setMode({ ...mode, min: Number(e.target.value) })} />
              <span className="muted" style={{ fontSize: 13 }}>to</span>
              <input className="num-sm" type="number" value={mode.max ?? 0} onChange={(e) => setMode({ ...mode, max: Number(e.target.value) })} />
            </div>
          )}
        </div>

        <div className="ccc-q">
          <label>Who signs off?</label>
          <div className="ccc-controls">
            <select className="select-sm" value={preset} onChange={(e) => setSlot(e.target.value as ReviewerPreset, role)}>
              <option value="lock-role">Lock to a role</option>
              <option value="lock-person">Lock to a person</option>
              <option value="chooser-picks">User picks</option>
            </select>
            {preset !== 'chooser-picks' && (
              <select className="select-sm" value={role} onChange={(e) => setSlot(preset, e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
          <label className="toggle" style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={draft.reviewers.allowAddApprovers}
              onChange={(e) => setDraft({ ...draft, reviewers: { ...draft.reviewers, allowAddApprovers: e.target.checked } })}
            />
            Let users add extra approvers
          </label>
        </div>

        <div className="ccc-q">
          <label>Do they need to sign?</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!draft.requireSignature}
              onChange={(e) => setDraft({ ...draft, requireSignature: e.target.checked })}
            />
            Require a digital signature
          </label>
        </div>
      </div>
      <div className="ccc-foot">
        <button className="btn primary" onClick={() => onApply(draft)}>
          Apply to workflow <ArrowRight size={14} />
        </button>
        <span className="cap">These become the block's props</span>
      </div>
    </div>
  )
}
