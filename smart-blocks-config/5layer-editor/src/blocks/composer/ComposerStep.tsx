import { ArrowRight, ArrowLeft, Sparkles, RefreshCw, FileText, Check } from 'lucide-react'
import type { ComposerConfig, EmailBrief, EmailDraft } from './types'

// Step 3 — the Composer. Generates the email text. Output = generated copy.
export function ComposerStep({
  brief,
  config,
  draft,
  selectedSubject,
  onGenerate,
  onRegenerate,
  onSelectSubject,
  onSend,
  onBack,
}: {
  brief: EmailBrief
  config: ComposerConfig
  draft: EmailDraft | null
  selectedSubject: number
  onGenerate: () => void
  onRegenerate: () => void
  onSelectSubject: (i: number) => void
  onSend: () => void
  onBack: () => void
}) {
  const assetsLabel = config.assetsSource.label.replace(/^(Data source|Workflow): /, '')
  return (
    <div>
      <h2 className="section-title">Generate your email</h2>
      <p className="section-sub">A {config.tone}, {config.length} {config.outputKind.replace('-', ' ')} from your brief and assets.</p>

      <div className="compose-using">
        <span className="using-chip">
          <FileText size={13} /> {brief.goal}
        </span>
        <span className="using-chip">Assets · {assetsLabel}</span>
        <span className="using-chip">Tone · {config.tone}</span>
      </div>

      {!draft ? (
        <div className="gen-cta">
          <button className="btn primary" onClick={onGenerate}>
            <Sparkles size={16} /> Generate email
          </button>
          <span className="muted" style={{ fontSize: 13 }}>Draws on the brief and your assets</span>
        </div>
      ) : (
        <>
          {config.variants && (
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">Subject line · pick one</label>
              <div className="subject-list">
                {draft.subjectVariants.map((s, i) => {
                  const on = i === selectedSubject
                  return (
                    <button key={i} type="button" className={`subject-opt${on ? ' on' : ''}`} onClick={() => onSelectSubject(i)}>
                      <span className={`clarify-ind single${on ? '' : ''}`} style={on ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' } : undefined}>
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="email-card">
            <div className="email-meta">
              <div className="email-subject">{draft.subjectVariants[selectedSubject]}</div>
              <div className="email-preview">{draft.preview}</div>
            </div>
            <div className="email-body">
              {draft.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <button className="email-cta-btn">{draft.cta}</button>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn ghost" onClick={onRegenerate}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn primary" onClick={onSend}>
              Send for review <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}

      {!draft && (
        <div className="btn-row">
          <button className="btn ghost" onClick={onBack}>
            <ArrowLeft size={15} /> Back
          </button>
          <span />
        </div>
      )}
    </div>
  )
}
