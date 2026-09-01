import { ArrowRight, ArrowLeft } from 'lucide-react'
import type { EmailBrief } from './types'

// Step 1 — the campaign brief. Defines what a good email is (the analog of a rubric).
export function BriefStep({
  brief,
  onChange,
  onNext,
  onBack,
}: {
  brief: EmailBrief
  onChange: (b: EmailBrief) => void
  onNext: () => void
  onBack: () => void
}) {
  const set = (k: keyof EmailBrief, v: string) => onChange({ ...brief, [k]: v })
  return (
    <div>
      <h2 className="section-title">Campaign brief</h2>
      <p className="section-sub">Tell us the goal and the key message — we'll turn it into effective copy.</p>

      <label className="field-label">Goal</label>
      <input className="text-input" value={brief.goal} onChange={(e) => set('goal', e.target.value)} style={{ marginBottom: 16 }} />

      <label className="field-label">Audience</label>
      <input className="text-input" value={brief.audience} onChange={(e) => set('audience', e.target.value)} style={{ marginBottom: 16 }} />

      <label className="field-label">Key message</label>
      <textarea className="textarea" rows={3} value={brief.message} onChange={(e) => set('message', e.target.value)} style={{ marginBottom: 16 }} />

      <label className="field-label">Call to action</label>
      <input className="text-input" value={brief.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />

      <div className="btn-row">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <button className="btn primary" onClick={onNext}>
          Add assets <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
