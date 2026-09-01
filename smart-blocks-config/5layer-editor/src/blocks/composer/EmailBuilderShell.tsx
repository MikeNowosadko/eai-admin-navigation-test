import { useState } from 'react'
import { ChevronLeft, Home, Check, Monitor, Tablet, Smartphone, Pencil, Eye, ArrowRight, Send } from 'lucide-react'
import type { ComposerConfig, EmailBrief } from './types'
import type { ApprovalConfig, ResolvedSubject } from '../approval/types'
import { PublishedFrame } from '../approval/PublishedFrame'
import { ClarificationCard } from '../approval/ClarificationCard'
import { SubjectChip } from '../approval/SubjectRenderer'
import { approvalQuestions, answersToConfig, modeSummary } from '../approval/approvalClarification'
import { reviewRoleLabel } from '../table/reviewClarification'
import { WorkflowPicker } from '../table/WorkflowPicker'
import { DataSourcePicker } from '../table/DataSourcePicker'
import { WORKFLOW_OPTION, DATA_SOURCE_OPTION } from '../table/tableClarification'
import type { WorkflowRef } from '../table/fixtures'
import type { DataSource } from '../table/workflows'
import { DATA_SOURCE_FOLDERS } from '../table/workflows'
import type { FileRef, Provisioning } from '../table/types'
import { AssetsStep } from './AssetsStep'
import { ComposerStep } from './ComposerStep'
import { UploadProvisioning } from './UploadProvisioning'
import { DataSourceScopePicker } from './DataSourceScopePicker'
import { ASSETS_QUESTIONS, COMPOSE_QUESTIONS, applyAssetsAnswer, applyComposeAnswers } from './composerClarification'
import { EMAIL_FRAME, EMAIL_RELATED_WORKFLOWS, EMAIL_DRAFTS } from './fixtures'

type Step = 'assets' | 'compose' | 'review' | 'done'

const EMAIL_ROLES = ['Marketing lead', 'Brand manager', 'Head of Growth']

function baseEmailReview(): ApprovalConfig {
  return {
    subject: { kind: 'block-output', blockInstanceId: 'composer' },
    mode: { type: 'verdict', outcomes: ['approve', 'reject'] },
    reviewers: { allowAddApprovers: false, slots: [{ id: 'wf-assessor', role: { mode: 'fixed', value: 'Marketing lead' }, assignee: { mode: 'constrained', role: 'Marketing lead' } }] },
    requireComment: false,
    requireSignature: false,
  }
}

const SAMPLE_EMAIL_SUBJECT: ResolvedSubject = {
  summary: 'Campaign email · Aurora',
  columns: [{ key: 'field', label: 'Field' }, { key: 'value', label: 'Value' }],
  items: [
    { id: 'subject', label: 'Subject', fields: { field: 'Subject line', value: EMAIL_DRAFTS[0].subjectVariants[0] } },
    { id: 'cta', label: 'CTA', fields: { field: 'Call to action', value: EMAIL_DRAFTS[0].cta } },
  ],
}

// Editor for the EDM email workflow: chat configures the assets source + composer props.
export function EmailBuilderShell({
  brief,
  config,
  applied,
  onApply,
  onEdit,
  onPublish,
  onBack,
}: {
  brief: EmailBrief
  config: ComposerConfig
  applied: boolean
  onApply: (c: ComposerConfig, review: ApprovalConfig) => void
  onEdit: () => void
  onPublish: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState<Step>(applied ? 'done' : 'assets')
  const [draft, setDraft] = useState<ComposerConfig>(config)
  const [reviewDraft, setReviewDraft] = useState<ApprovalConfig>(baseEmailReview())
  const [pickedWf, setPickedWf] = useState<WorkflowRef | undefined>()
  const [pickedSource, setPickedSource] = useState<DataSource | undefined>()
  const [uploadMode, setUploadMode] = useState<Provisioning>('author-fixed')
  const [uploadFiles, setUploadFiles] = useState<FileRef[]>([])
  const [scopeFolderId, setScopeFolderId] = useState<string>(DATA_SOURCE_FOLDERS[0].id)
  const [scopeFileIds, setScopeFileIds] = useState<string[]>(DATA_SOURCE_FOLDERS[0].files.map((f) => f.id))
  const [scopeLive, setScopeLive] = useState(true)

  const expansion = (qid: string, selected: string | undefined) => {
    if (qid !== 'assets') return null
    if (selected === 'User upload') {
      return (
        <UploadProvisioning
          mode={uploadMode}
          files={uploadFiles}
          onMode={setUploadMode}
          onAddFiles={(f) => setUploadFiles(f)}
          onRemoveFile={(id) => setUploadFiles((fs) => fs.filter((x) => x.id !== id))}
        />
      )
    }
    if (selected === WORKFLOW_OPTION) return <WorkflowPicker workflows={EMAIL_RELATED_WORKFLOWS} selectedId={pickedWf?.id} onSelect={setPickedWf} />
    if (selected === DATA_SOURCE_OPTION) {
      return (
        <DataSourcePicker
          selectedId={pickedSource?.id}
          onSelect={setPickedSource}
          renderScope={
            <DataSourceScopePicker
              folderId={scopeFolderId}
              fileIds={scopeFileIds}
              live={scopeLive}
              onFolder={(id) => {
                setScopeFolderId(id)
                const fld = DATA_SOURCE_FOLDERS.find((f) => f.id === id)
                setScopeFileIds(fld ? fld.files.map((f) => f.id) : [])
              }}
              onToggleFile={(id) => setScopeFileIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
              onLive={setScopeLive}
            />
          }
        />
      )
    }
    return null
  }

  const completeAssets = (answers: Parameters<typeof applyAssetsAnswer>[1]) => {
    setDraft((d) => applyAssetsAnswer(d, answers, { workflow: pickedWf, connector: pickedSource, uploadMode, uploadFiles, scopeFolderId, scopeFileIds, scopeLive }))
    setStep('compose')
  }
  const completeCompose = (answers: Parameters<typeof applyComposeAnswers>[1]) => {
    setDraft((d) => applyComposeAnswers(d, answers))
    setStep('review')
  }
  const completeReview = (answers: Parameters<typeof answersToConfig>[1]) => {
    const rc = answersToConfig(baseEmailReview(), answers)
    setReviewDraft(rc)
    setStep('done')
    onApply(draft, rc)
  }

  const previewStage: 'assets' | 'compose' | 'review' = step === 'assets' ? 'assets' : step === 'compose' ? 'compose' : 'review'

  return (
    <div className="builder">
      <div className="builder-topbar">
        <span className="tb-icon" onClick={onBack} style={{ cursor: 'pointer' }}>
          <ChevronLeft size={17} />
        </span>
        <span className="tb-icon">
          <Home size={16} />
        </span>
        <span className="tb-title">Campaign email</span>
        <span className="draft-pill">Draft</span>
        <div className="tb-right">
          <span className="saved">
            <Check size={15} /> {applied ? 'Saved' : 'Draft — not saved'}
          </span>
          <button className="btn primary" onClick={onPublish} disabled={!applied}>
            Publish
          </button>
        </div>
      </div>

      <div className="builder-body">
        <div className="chat-panel">
          <div className="chat-scroll">
            <div className="chat-msg them">
              You've added a <b>Composer</b> block — it writes the email. Let's set up where it draws from, then how it
              should sound.
            </div>

            {step === 'assets' ? (
              <>
                <div className="chat-msg them">
                  <b>Assets.</b> The copy is only as good as its source material. Where does it come from?
                </div>
                <ClarificationCard questions={ASSETS_QUESTIONS} onComplete={completeAssets} onSkip={() => setStep('compose')} renderExpansion={expansion} />
              </>
            ) : (
              <div className="chat-result">
                <span className="tick"><Check size={13} /></span>
                <div>
                  <div className="rtitle">Assets</div>
                  <div className="rsub">{draft.assetsSource.label}</div>
                </div>
              </div>
            )}

            {step === 'compose' && (
              <>
                <div className="chat-msg them">
                  <b>The copy.</b> What should the Composer produce, and how should it sound?
                </div>
                <ClarificationCard questions={COMPOSE_QUESTIONS} onComplete={completeCompose} onSkip={() => setStep('review')} />
              </>
            )}
            {(step === 'review' || step === 'done') && (
              <div className="chat-result">
                <span className="tick"><Check size={13} /></span>
                <div>
                  <div className="rtitle">Composer</div>
                  <div className="rsub">{draft.tone} {draft.outputKind.replace('-', ' ')}{draft.variants ? ' · subject variants' : ''}</div>
                </div>
              </div>
            )}

            {step === 'review' && (
              <>
                <div className="chat-msg them">
                  <b>The review.</b> Before the email goes out, it's signed off. Who approves, and how?
                </div>
                <ClarificationCard
                  questions={approvalQuestions({ subjectSummary: 'the email', collection: false, roles: EMAIL_ROLES })}
                  onComplete={completeReview}
                  onSkip={() => { setStep('done'); onApply(draft, reviewDraft) }}
                />
              </>
            )}
            {step === 'done' && (
              <>
                <div className="chat-result">
                  <span className="tick"><Check size={13} /></span>
                  <div>
                    <div className="rtitle">Review</div>
                    <div className="rsub">{reviewRoleLabel(reviewDraft)} · {modeSummary(reviewDraft.mode)}</div>
                  </div>
                </div>
                <div className="chat-msg them">
                  Done — a <b>{draft.tone}</b> email drawing on <b>{draft.assetsSource.label}</b>, signed off by{' '}
                  <b>{reviewRoleLabel(reviewDraft)}</b>. Publish to try it.
                </div>
                <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { setStep('assets'); onEdit() }}>
                  <Pencil size={13} /> Adjust
                </button>
              </>
            )}
          </div>
          <div className="chat-input">
            <div className="box">Ask the assistant to change this step…</div>
            <button className="send"><ArrowRight size={15} /></button>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-head">
            <span className="ph-title">Workflow Preview</span>
            <div className="ph-tools">
              <div className="toggle-pill">
                <button><Pencil size={13} /> Editor</button>
                <button className="active"><Eye size={13} /> Preview</button>
              </div>
              <div className="device-tools">
                <span className="d active"><Monitor size={15} /></span>
                <span className="d"><Tablet size={15} /></span>
                <span className="d"><Smartphone size={15} /></span>
              </div>
            </div>
          </div>
          <div className="preview-viewport">
            <div className="preview-scaler">
              <div className="preview-app">
                <PublishedFrame frame={{ ...EMAIL_FRAME, activeTabIndex: previewStage === 'assets' ? 1 : previewStage === 'compose' ? 2 : 3 }} compactAssistant>
                  {previewStage === 'assets' && <AssetsStep assetsSource={draft.assetsSource} onNext={() => {}} onBack={() => {}} />}
                  {previewStage === 'compose' && (
                    <ComposerStep brief={brief} config={draft} draft={null} selectedSubject={0} onGenerate={() => {}} onRegenerate={() => {}} onSelectSubject={() => {}} onSend={() => {}} onBack={() => {}} />
                  )}
                  {previewStage === 'review' && (
                    <div>
                      <h2 className="section-title">Review</h2>
                      <p className="section-sub">The generated email, sent for sign-off.</p>
                      <SubjectChip subject={SAMPLE_EMAIL_SUBJECT} />
                      <label className="field-label">Approver <span className="req">*</span></label>
                      <div className="subject-chip" style={{ justifyContent: 'space-between' }}>
                        <span className="reviewer-cell">
                          <span className="role-pill">{reviewRoleLabel(reviewDraft)}</span>
                          <span className="muted" style={{ fontStyle: 'italic' }}>assigned when someone uses the app</span>
                        </span>
                      </div>
                      <div className="btn-row">
                        <span className="muted" style={{ fontSize: 13 }}>Decision: {modeSummary(reviewDraft.mode)}</span>
                        <button className="btn primary"><Send size={15} /> Request approval</button>
                      </div>
                    </div>
                  )}
                </PublishedFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
