import { Sparkles } from 'lucide-react'
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
  'lock-role': 'Lock to a role',
  'lock-person': 'Lock to a specific person',
  'chooser-picks': 'Require approval — chooser picks',
}

export function EditorConfigPanel({
  subject,
  config,
  onChange,
}: {
  subject: ResolvedSubject
  config: ApprovalConfig
  onChange: (c: ApprovalConfig) => void
}) {
  const mode = config.mode
  const setMode = (m: ApprovalMode) => onChange({ ...config, mode: m })

  return (
    <div className="cfg">
      <div className="banner">
        <Sparkles size={16} />
        This is what the workflow author configures. Switch to <b style={{ margin: '0 4px' }}>Workflow user</b> to see the
        published behaviour change.
      </div>

      {/* WHAT */}
      <div className="cfg-card">
        <h4>What is being approved</h4>
        <p className="hint">The subject binding — resolved at runtime. LLM-configurable.</p>
        <div className="row-inline">
          <select className="select" value={config.subject.kind} onChange={() => {}}>
            <option value="step-output">Output of a previous step</option>
            <option value="data-source">A data source</option>
            <option value="fields">Specific fields</option>
            <option value="block-output">Another block's output</option>
          </select>
          <span className="muted">→ resolves to “{subject.summary}” ({subject.items.length} items)</span>
        </div>
      </div>

      {/* HOW */}
      <div className="cfg-card">
        <h4>How they decide</h4>
        <p className="hint">Constrained by the subject: a single item can only use a verdict.</p>
        <div className="seg">
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
          <div className="row-inline" style={{ marginTop: 12 }}>
            <label className="muted">Min</label>
            <input
              className="select"
              type="number"
              style={{ width: 70 }}
              value={mode.min ?? 0}
              onChange={(e) => setMode({ ...mode, min: Number(e.target.value) })}
            />
            <label className="muted">Max</label>
            <input
              className="select"
              type="number"
              style={{ width: 70 }}
              value={mode.max ?? 0}
              onChange={(e) => setMode({ ...mode, max: Number(e.target.value) })}
            />
          </div>
        )}
      </div>

      {/* WHO */}
      <div className="cfg-card">
        <h4>Who approves</h4>
        <p className="hint">Each slot: how locked is it? General model, presets on top.</p>
        {config.reviewers.slots.map((slot, i) => {
          const preset = presetOf(slot)
          const role = slot.role.mode === 'fixed' ? slot.role.value : slot.assignee.mode === 'constrained' ? slot.assignee.role : ROLES[0]
          return (
            <div className="slot-editor" key={slot.id}>
              <span className="muted">Slot {i + 1}</span>
              <select
                className="select"
                value={preset}
                onChange={(e) => {
                  const next = [...config.reviewers.slots]
                  next[i] = buildSlot(slot.id, e.target.value as ReviewerPreset, role)
                  onChange({ ...config, reviewers: { ...config.reviewers, slots: next } })
                }}
              >
                {(Object.keys(PRESET_LABEL) as ReviewerPreset[]).map((p) => (
                  <option key={p} value={p}>
                    {PRESET_LABEL[p]}
                  </option>
                ))}
              </select>
              {preset !== 'chooser-picks' && (
                <select
                  className="select"
                  value={role}
                  onChange={(e) => {
                    const next = [...config.reviewers.slots]
                    next[i] = buildSlot(slot.id, preset, e.target.value)
                    onChange({ ...config, reviewers: { ...config.reviewers, slots: next } })
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
        <label className="radio-row" style={{ cursor: 'pointer', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={config.reviewers.allowAddApprovers}
            onChange={(e) =>
              onChange({ ...config, reviewers: { ...config.reviewers, allowAddApprovers: e.target.checked } })
            }
          />
          Let users add extra approvers at runtime
        </label>
      </div>

      {/* OPTIONS */}
      <div className="cfg-card">
        <h4>Options</h4>
        <label className="radio-row" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!config.requireComment}
            onChange={(e) => onChange({ ...config, requireComment: e.target.checked })}
          />
          Require a comment
        </label>
        <label className="radio-row" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!config.requireSignature}
            onChange={(e) => onChange({ ...config, requireSignature: e.target.checked })}
          />
          Require a digital signature
        </label>
      </div>
    </div>
  )
}
