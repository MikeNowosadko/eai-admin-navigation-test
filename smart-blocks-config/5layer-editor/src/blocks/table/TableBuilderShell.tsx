import { useState } from 'react'
import { ChevronLeft, Home, Check, Monitor, Tablet, Smartphone, Pencil, Eye, ArrowRight, Send } from 'lucide-react'
import type { TableConfig, TableState } from './types'
import type { ApprovalConfig } from '../approval/types'
import type { ResolvedSubject } from '../approval/types'
import { PublishedFrame } from '../approval/PublishedFrame'
import { ClarificationCard } from '../approval/ClarificationCard'
import { SubjectChip } from '../approval/SubjectRenderer'
import { TableStep1 } from './TableStep1'
import { TableStep2 } from './TableStep2'
import { columnsQuestions, rowsQuestions, answersToTableConfig, WORKFLOW_OPTION, DATA_SOURCE_OPTION } from './tableClarification'
import { approvalQuestions, answersToConfig, modeSummary } from '../approval/approvalClarification'
import { baseReviewConfig, reviewRoleLabel } from './reviewClarification'
import type { WorkflowRef } from './fixtures'
import type { WorkflowType, DataSource } from './workflows'
import { WorkflowPicker } from './WorkflowPicker'
import { DataSourcePicker } from './DataSourcePicker'

type EditorStep = 'columns' | 'rows' | 'review' | 'done'

// Editor for the active workflow: chat (left) configures each step's source binding in
// turn (columns → rows → review); live preview (right) follows the step. Domain content
// (copy, columns, rows, frame) comes from the WorkflowType — the blocks are agnostic.
export function TableBuilderShell({
  wf,
  config,
  applied,
  onApply,
  onEdit,
  onPublish,
  onBack,
}: {
  wf: WorkflowType
  config: TableConfig
  applied: boolean
  onApply: (table: TableConfig, review: ApprovalConfig) => void
  onEdit: () => void
  onPublish: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState<EditorStep>(applied ? 'done' : 'columns')
  const [draft, setDraft] = useState<TableConfig>(config)
  const [reviewDraft, setReviewDraft] = useState<ApprovalConfig>(baseReviewConfig())
  const [picked, setPicked] = useState<Record<string, WorkflowRef | undefined>>({})
  const [pickedSource, setPickedSource] = useState<Record<string, DataSource | undefined>>({})

  const seededPreview: TableState = { phase: 'columns', columnsFile: wf.rubricFile, columns: wf.columns, rows: [] }
  const sampleSubject: ResolvedSubject = {
    summary: `3 shortlisted ${wf.copy.itemNoun}`,
    items: wf.rows.slice(0, 3).map((r) => ({ id: r.id, label: r.label, fields: {} })),
    columns: [],
  }

  const expansion = (qid: string, selected: string | undefined) => {
    if ((qid === 'columns' || qid === 'rows') && selected === WORKFLOW_OPTION) {
      return <WorkflowPicker workflows={wf.relatedWorkflows} selectedId={picked[qid]?.id} onSelect={(w) => setPicked((p) => ({ ...p, [qid]: w }))} />
    }
    if ((qid === 'columns' || qid === 'rows') && selected === DATA_SOURCE_OPTION) {
      return <DataSourcePicker selectedId={pickedSource[qid]?.id} onSelect={(s) => setPickedSource((p) => ({ ...p, [qid]: s }))} />
    }
    return null
  }

  const completeColumns = (answers: Parameters<typeof answersToTableConfig>[1]) => {
    setDraft((d) => answersToTableConfig(d, answers, picked, pickedSource))
    setStep('rows')
  }
  const completeRows = (answers: Parameters<typeof answersToTableConfig>[1]) => {
    setDraft((d) => answersToTableConfig(d, answers, picked, pickedSource))
    setStep('review')
  }
  const completeReview = (answers: Parameters<typeof answersToConfig>[1]) => {
    const rc = answersToConfig(baseReviewConfig(), answers)
    setReviewDraft(rc)
    setStep('done')
    onApply(draft, rc)
  }
  const adjust = () => {
    setStep('columns')
    onEdit()
  }

  const previewStage: 'rubric' | 'candidates' | 'review' = step === 'columns' ? 'rubric' : step === 'rows' ? 'candidates' : 'review'
  const activeTabIndex = previewStage === 'rubric' ? 0 : previewStage === 'candidates' ? 1 : 2
  const rowsBound = draft.rowsSource.kind !== 'document-upload' ? { label: draft.rowsSource.label, dataSource: draft.rowsSource.kind === 'data-source' } : undefined

  return (
    <div className="builder">
      <div className="builder-topbar">
        <span className="tb-icon" onClick={onBack} style={{ cursor: 'pointer' }}>
          <ChevronLeft size={17} />
        </span>
        <span className="tb-icon">
          <Home size={16} />
        </span>
        <span className="tb-title">{wf.label}</span>
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
              You've added a <b>Table</b> block. Let's set up each step in turn — the columns, the rows, then the review.
            </div>

            {/* Step 1 — columns */}
            {step === 'columns' ? (
              <>
                <div className="chat-msg them">
                  <b>Step 1 — the columns.</b> These define what a good {wf.copy.itemNoun.replace(/s$/, '')} is.
                </div>
                <ClarificationCard questions={columnsQuestions(wf.copy)} onComplete={completeColumns} onSkip={() => setStep('rows')} renderExpansion={expansion} />
              </>
            ) : (
              <ResultLine title="Step 1 · Columns" sub={draft.columnsSource.label} />
            )}

            {/* Step 2 — rows */}
            {step === 'rows' && (
              <>
                <div className="chat-msg them">
                  <b>Step 2 — the rows.</b> The table needs {wf.copy.itemNoun} to fill it. Where do they come from?
                </div>
                <ClarificationCard questions={rowsQuestions(wf.copy)} onComplete={completeRows} onSkip={() => setStep('review')} renderExpansion={expansion} />
              </>
            )}
            {(step === 'review' || step === 'done') && (
              <ResultLine title="Step 2 · Rows" sub={`${draft.rowsSource.label}${draft.scoreAgainstColumns ? ' · scored against the rubric' : ''}`} />
            )}

            {/* Step 3 — review */}
            {step === 'review' && (
              <>
                <div className="chat-msg them">
                  <b>Step 3 — the review.</b> Once {wf.copy.itemNoun} are scored, they go for sign-off. Who reviews, and how?
                </div>
                <ClarificationCard
                  questions={approvalQuestions({ subjectSummary: `the shortlisted ${wf.copy.itemNoun}`, collection: true })}
                  onComplete={completeReview}
                  onSkip={() => { setStep('done'); onApply(draft, reviewDraft) }}
                />
              </>
            )}
            {step === 'done' && (
              <>
                <ResultLine title="Step 3 · Review" sub={`${reviewRoleLabel(reviewDraft)} · ${modeSummary(reviewDraft.mode)}`} />
                <div className="chat-msg them">
                  Done — columns from <b>{draft.columnsSource.label}</b>, rows from <b>{draft.rowsSource.label}</b>, reviewed by{' '}
                  <b>{reviewRoleLabel(reviewDraft)}</b>. Publish to try it.
                </div>
                <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={adjust}>
                  <Pencil size={13} /> Adjust
                </button>
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
                <span className="d active"><Monitor size={15} /></span>
                <span className="d"><Tablet size={15} /></span>
                <span className="d"><Smartphone size={15} /></span>
              </div>
            </div>
          </div>
          <div className="preview-viewport">
            <div className="preview-scaler">
              <div className="preview-app">
                <PublishedFrame frame={{ ...wf.frame, activeTabIndex }} compactAssistant>
                  {previewStage === 'rubric' && (
                    <TableStep1 state={{ phase: 'empty', columns: [], rows: [] }} copy={wf.copy} onGenerate={() => {}} onReplace={() => {}} onNext={() => {}} onBack={() => {}} />
                  )}
                  {previewStage === 'candidates' && (
                    <TableStep2 state={seededPreview} copy={wf.copy} selectedIds={[]} boundSource={rowsBound} onScore={() => {}} onAddMore={() => {}} onToggle={() => {}} onSend={() => {}} onBack={() => {}} />
                  )}
                  {previewStage === 'review' && <ReviewPreview review={reviewDraft} subject={sampleSubject} />}
                </PublishedFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultLine({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="chat-result">
      <span className="tick">
        <Check size={13} />
      </span>
      <div>
        <div className="rtitle">{title}</div>
        <div className="rsub">{sub}</div>
      </div>
    </div>
  )
}

function ReviewPreview({ review, subject }: { review: ApprovalConfig; subject: ResolvedSubject }) {
  return (
    <div>
      <h2 className="section-title">Review</h2>
      <p className="section-sub">The shortlisted items from the previous step, sent for sign-off.</p>
      <SubjectChip subject={subject} />
      <label className="field-label">
        Approver <span className="req">*</span>
      </label>
      <div className="subject-chip" style={{ justifyContent: 'space-between' }}>
        <span className="reviewer-cell">
          <span className="role-pill">{reviewRoleLabel(review)}</span>
          <span className="muted" style={{ fontStyle: 'italic' }}>assigned when someone uses the app</span>
        </span>
      </div>
      <div className="btn-row">
        <span className="muted" style={{ fontSize: 13 }}>
          Decision: {modeSummary(review.mode)}
          {review.requireComment ? ' · comment required' : ''}
          {review.requireSignature ? ' · signature required' : ''}
        </span>
        <button className="btn primary">
          <Send size={15} /> Request approval
        </button>
      </div>
    </div>
  )
}
