import { useEffect, useMemo, useState } from 'react'
import { Lock, ChevronLeft } from 'lucide-react'
import {
  DEFAULT_TABLE_CONFIG as FL_DEFAULT_TABLE,
  DEFAULT_APPROVAL_CONFIG as FL_DEFAULT_APPROVAL,
  deriveView,
  type SmartTableConfig,
  type ApprovalConfig as FLApprovalConfig,
} from './fiveLayer/config'
import { FiveLayerTableEditor } from './fiveLayer/FiveLayerTableEditor'
import { SCENARIOS } from './fixtures'
import type { Scenario } from './fixtures'
import { MEMBERS } from './fixtures'
import type {
  ApprovalConfig,
  ApprovalOutput,
  ApprovalStatus,
  Outcome,
  PersonRef,
  ResolvedSubject,
  ReviewerDecision,
} from './blocks/approval/types'
import { AssignmentView } from './blocks/approval/AssignmentView'
import { ReviewersTable } from './blocks/approval/ReviewersTable'
import { ReviewDialog, type ReviewSubmission } from './blocks/approval/ReviewDialog'
import { BuilderShell } from './blocks/approval/BuilderShell'
import { PublishedFrame } from './blocks/approval/PublishedFrame'
import { SubjectChip } from './blocks/approval/SubjectRenderer'
import { Launchpad, type LaunchTarget } from './Launchpad'
import { TableStep1 } from './blocks/table/TableStep1'
import { TableStep2 } from './blocks/table/TableStep2'
import { TableBuilderShell } from './blocks/table/TableBuilderShell'
import type { TableColumn, TableConfig, TableRow, TableState } from './blocks/table/types'
import { DEFAULT_TABLE_CONFIG } from './blocks/table/fixtures'
import { getWorkflow } from './blocks/table/workflows'
import type { WorkflowKey, WorkflowType } from './blocks/table/workflows'
import { EMAIL_FRAME, DEFAULT_BRIEF, DEFAULT_COMPOSER_CONFIG, EMAIL_DRAFTS } from './blocks/composer/fixtures'
import type { ComposerConfig, EmailBrief } from './blocks/composer/types'
import { BriefStep } from './blocks/composer/BriefStep'
import { AssetsStep } from './blocks/composer/AssetsStep'
import { ComposerStep } from './blocks/composer/ComposerStep'
import { EmailBuilderShell } from './blocks/composer/EmailBuilderShell'

function buildEmailSubject(draft: (typeof EMAIL_DRAFTS)[number], subjectIdx: number): ResolvedSubject {
  return {
    summary: 'Campaign email · Aurora',
    columns: [{ key: 'field', label: 'Field' }, { key: 'value', label: 'Value' }],
    items: [
      { id: 'subject', label: 'Subject', fields: { field: 'Subject line', value: draft.subjectVariants[subjectIdx] } },
      { id: 'preview', label: 'Preview', fields: { field: 'Preview text', value: draft.preview } },
      { id: 'cta', label: 'CTA', fields: { field: 'Call to action', value: draft.cta } },
      { id: 'body', label: 'Body', fields: { field: 'Body', value: draft.body.slice(1).join(' ').slice(0, 110) + '…' } },
    ],
  }
}

// The table's selected rows become the approval subject (block-output) — real lineage.
function buildTableSubject(columns: TableColumn[], rows: TableRow[], selectedIds: string[], noun: string, itemColumn: string): ResolvedSubject {
  const items = rows
    .filter((r) => selectedIds.includes(r.id))
    .map((r) => ({ id: r.id, label: r.label, fields: { name: r.label, ...r.cells } }))
  return {
    summary: `${items.length} shortlisted ${noun}`,
    items,
    columns: [{ key: 'name', label: itemColumn }, ...columns.map((c) => ({ key: c.key, label: c.label }))],
  }
}

const seededTable = (wf: WorkflowType): TableState => ({ phase: 'columns', columnsFile: wf.rubricFile, columns: wf.columns, rows: [] })

interface WorkflowApproval {
  subject: ResolvedSubject
  config: ApprovalConfig
  decisions: ReviewerDecision[]
  output?: ApprovalOutput
}

type View = 'launchpad' | 'table' | 'approval' | 'email'
type Mode = 'editor' | 'published'
type PublishedAs = 'workflow-user' | 'reviewer'
const TODAY = '13/07/26'

interface RunState {
  config: ApprovalConfig
  configApplied: boolean
  decisions: ReviewerDecision[]
  message: string
  requested: boolean
  status: ApprovalStatus
  output?: ApprovalOutput
}

const REVIEWER_USER: Record<Scenario['key'], PersonRef> = {
  interview: MEMBERS[0],
  leave: { id: 'u-priya', name: 'Priya Nair', initials: 'PN' },
}

function memberRole(p: PersonRef): string | undefined {
  return MEMBERS.find((m) => m.id === p.id)?.role
}
function slotRoleName(slot: ApprovalConfig['reviewers']['slots'][number]): string {
  if (slot.role.mode === 'fixed') return slot.role.value
  if (slot.assignee.mode === 'constrained') return slot.assignee.role
  return 'Approver'
}
function decisionsFromConfig(config: ApprovalConfig): ReviewerDecision[] {
  return config.reviewers.slots.map((slot) => {
    const fixedPerson = slot.assignee.mode === 'fixed' ? slot.assignee.value : undefined
    return {
      slotId: slot.id,
      role: slotRoleName(slot),
      reviewer: fixedPerson,
      status: fixedPerson ? 'pending' : 'unassigned',
      dueAt: TODAY,
    }
  })
}
function initialRun(s: Scenario): RunState {
  const config = structuredClone(s.config)
  return { config, configApplied: false, decisions: decisionsFromConfig(config), message: s.config.message?.default ?? '', requested: false, status: 'draft' }
}

const EMPTY_TABLE: TableState = { phase: 'empty', columns: [], rows: [] }

export function App() {
  const [view, setView] = useState<View>('launchpad')

  // approval state
  const [mode, setMode] = useState<Mode>('editor')
  const [publishedAs, setPublishedAs] = useState<PublishedAs>('workflow-user')
  const [scenarioKey, setScenarioKey] = useState<Scenario['key']>('interview')
  const [runs, setRuns] = useState<Record<string, RunState>>({ interview: initialRun(SCENARIOS.interview), leave: initialRun(SCENARIOS.leave) })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // table state
  const [workflowType, setWorkflowType] = useState<WorkflowKey>('candidates')
  const activeWf = getWorkflow(workflowType)
  const [tableStage, setTableStage] = useState<'rubric' | 'candidates' | 'review'>('rubric')
  const [table, setTable] = useState<TableState>(EMPTY_TABLE)
  const [tableSelected, setTableSelected] = useState<string[]>([])
  const [wf, setWf] = useState<WorkflowApproval | null>(null)
  const [wfDialogOpen, setWfDialogOpen] = useState(false)
  const [tableSurface, setTableSurface] = useState<'editor' | 'published'>('published')
  const [tableConfig, setTableConfig] = useState<TableConfig>(DEFAULT_TABLE_CONFIG)
  const [tableConfigApplied, setTableConfigApplied] = useState(false)
  const [reviewConfig, setReviewConfig] = useState<ApprovalConfig | null>(null)

  // Five-layer editing (candidate screening) — the Table + Approval blocks run on these.
  const [flTable, setFlTable] = useState<SmartTableConfig>(FL_DEFAULT_TABLE)
  const [flApproval, setFlApproval] = useState<FLApprovalConfig>(FL_DEFAULT_APPROVAL)
  const [flQuery, setFlQuery] = useState('')

  // Five-layer view mapped onto the prototype's column/row shapes (candidate screening only).
  const fiveView = useMemo(() => {
    if (workflowType !== 'candidates') return undefined
    const d = deriveView(flTable, flQuery)
    return {
      columns: d.columns.map((c) => ({ key: c.key, label: c.label, type: (c.isTotal ? 'total' : 'score') as TableColumn['type'] })),
      rows: d.rows.map((r) => ({ id: r.id, label: r.name, initials: r.initials, cells: r.cells } as TableRow)),
      compact: flTable.presentationConfig.compact,
      striped: flTable.presentationConfig.striped,
      searchable: flTable.actionsConfig.searchable,
      query: flQuery,
      onQuery: setFlQuery,
      rowActions: flTable.actionsConfig.rowActions,
      total: d.total,
    }
  }, [workflowType, flTable, flQuery])

  // email (composer) state
  const [emailSurface, setEmailSurface] = useState<'editor' | 'published'>('published')
  const [emailStage, setEmailStage] = useState<'brief' | 'assets' | 'compose' | 'review'>('brief')
  const [emailBrief, setEmailBrief] = useState<EmailBrief>(DEFAULT_BRIEF)
  const [composerConfig, setComposerConfig] = useState<ComposerConfig>(DEFAULT_COMPOSER_CONFIG)
  const [composerApplied, setComposerApplied] = useState(false)
  const [emailReviewConfig, setEmailReviewConfig] = useState<ApprovalConfig | null>(null)
  const [emailDraftIdx, setEmailDraftIdx] = useState<number | null>(null)
  const [emailSubjectIdx, setEmailSubjectIdx] = useState(0)

  const scenario = SCENARIOS[scenarioKey]
  const run = runs[scenarioKey]

  const setRun = (partial: Partial<RunState> | ((r: RunState) => RunState)) =>
    setRuns((prev) => ({ ...prev, [scenarioKey]: typeof partial === 'function' ? partial(prev[scenarioKey]) : { ...prev[scenarioKey], ...partial } }))
  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2600)
  }

  useEffect(() => {
    if (view !== 'approval' || mode !== 'published' || publishedAs !== 'reviewer') return
    setRun((r) => {
      const slot = r.config.reviewers.slots[0]
      if (!slot) return r
      const has = r.decisions.find((d) => d.slotId === slot.id)
      if (has?.reviewer) return r
      const user = REVIEWER_USER[scenarioKey]
      const decisions = r.decisions.map((d) => (d.slotId === slot.id ? { ...d, reviewer: user, status: 'pending' as const, dueAt: d.dueAt ?? TODAY } : d))
      return { ...r, decisions, requested: true, status: 'requested' }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mode, publishedAs, scenarioKey])

  // ---- launchpad navigation ----
  const openTarget = (t: LaunchTarget) => {
    if (t === 'approval') {
      setView('approval')
      return
    }
    if (t === 'extraction') {
      setTable(seededTable(activeWf))
      setTableSelected([])
      setTableStage('candidates')
      setTableSurface('published')
      setView('table')
      return
    }
    // table | io → open the editor (configure the source bindings via chat)
    // full → straight into the published runtime
    setTable(EMPTY_TABLE)
    setTableSelected([])
    setWf(null)
    setTableStage('rubric')
    setTableSurface(t === 'full' ? 'published' : 'editor')
    setView('table')
  }

  // Home page: pick a workflow type → start in the editor (configure it), then preview.
  const chooseWorkflow = (key: WorkflowKey) => {
    setWorkflowType(key)
    setTable(EMPTY_TABLE)
    setTableSelected([])
    setWf(null)
    setTableConfigApplied(false)
    setTableStage('rubric')
    setTableSurface('editor')
    setView('table')
  }

  const openEmail = () => {
    setEmailSurface('editor')
    setEmailStage('brief')
    setEmailDraftIdx(null)
    setEmailSubjectIdx(0)
    setComposerApplied(false)
    setWf(null)
    setView('email')
  }

  // Deep-link from marketing / signed-in home template cards (?workflow=candidates|rfp|email).
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get('workflow')
    if (w === 'candidates') chooseWorkflow('candidates')
    else if (w === 'rfp') chooseWorkflow('rfp')
    else if (w === 'email') openEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onApplyComposerConfig = (c: ComposerConfig, review: ApprovalConfig) => {
    setComposerConfig(c)
    setEmailReviewConfig(review)
    setComposerApplied(true)
    flash('Saved — all steps are configured')
  }
  const generateEmail = () => setEmailDraftIdx(0)
  const regenerateEmail = () => {
    setEmailDraftIdx((i) => ((i ?? 0) + 1) % EMAIL_DRAFTS.length)
    setEmailSubjectIdx(0)
    flash('Regenerated — a fresh take')
  }
  const sendEmailForReview = () => {
    const draft = EMAIL_DRAFTS[emailDraftIdx ?? 0]
    const subject = buildEmailSubject(draft, emailSubjectIdx)
    // Use the review config set in the editor (fall back to a Marketing-lead sign-off).
    const config: ApprovalConfig =
      emailReviewConfig ?? {
        subject: { kind: 'block-output', blockInstanceId: 'composer' },
        mode: { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] },
        reviewers: { allowAddApprovers: false, slots: [{ id: 'wf-assessor', role: { mode: 'fixed', value: 'Marketing lead' }, assignee: { mode: 'constrained', role: 'Marketing lead' } }] },
        requireComment: false,
        requireSignature: false,
      }
    const slot = config.reviewers.slots[0]
    const decisions: ReviewerDecision[] = [{ slotId: slot?.id ?? 'wf-assessor', role: slot ? slotRoleName(slot) : 'Marketing lead', reviewer: MEMBERS[0], status: 'pending', dueAt: TODAY }]
    setWf({ subject, config, decisions })
    setEmailStage('review')
    flash('Email sent for sign-off')
  }

  const onApplyTableConfig = (c: TableConfig, review: ApprovalConfig) => {
    setTableConfig(c)
    setReviewConfig(review)
    setTableConfigApplied(true)
    flash('Saved — all three steps are configured')
  }

  // ---- table handlers ----
  const genColumns = () => setTable(seededTable(activeWf))
  const replaceRubric = () => setTable(EMPTY_TABLE)
  const scoreCandidates = () => {
    setTable((t) => ({ ...t, phase: 'filled', rowsFileCount: activeWf.itemCount, rows: activeWf.rows }))
    const src = workflowType === 'candidates' && fiveView ? fiveView.rows : activeWf.rows
    setTableSelected(src.slice(0, 3).map((r) => r.id))
  }
  const toggleRow = (id: string) => setTableSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Step 2 → Review: the selected rows become the approval subject (block-output).
  const sendForReview = () => {
    const useFive = workflowType === 'candidates' && fiveView
    const subjColumns = useFive ? fiveView!.columns : table.columns
    const subjRows = useFive ? fiveView!.rows : table.rows
    const subject = buildTableSubject(subjColumns, subjRows, tableSelected, activeWf.copy.itemNoun, activeWf.copy.itemColumn)
    // Candidate screening: the Approval block runs on the five-layer decisionMode/reviewPolicy.
    const flMode = flApproval.businessLogic.decisionMode
    const role = flApproval.accessControl.allowedReviewerRoles?.[0] ?? 'Assessor'
    const config: ApprovalConfig = useFive
      ? {
          subject: { kind: 'block-output', blockInstanceId: 'table' },
          mode:
            flMode === 'selection'
              ? { type: 'selection', min: flApproval.businessLogic.selection?.minSelections, max: flApproval.businessLogic.selection?.maxSelections }
              : flMode === 'per-item'
                ? { type: 'per-item', outcomes: ['approve', 'reject'] }
                : { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] },
          reviewers: { allowAddApprovers: false, slots: [{ id: 'wf-assessor', role: { mode: 'fixed', value: role }, assignee: { mode: 'constrained', role } }] },
          requireComment: !!flApproval.businessLogic.requireCommentOnReject,
          requireSignature: false,
        }
      : (reviewConfig ?? {
          subject: { kind: 'block-output', blockInstanceId: 'table' },
          mode: { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] },
          reviewers: { allowAddApprovers: false, slots: [{ id: 'wf-assessor', role: { mode: 'fixed', value: 'Assessor' }, assignee: { mode: 'constrained', role: 'Assessor' } }] },
          requireComment: false,
          requireSignature: false,
        })
    const slot = config.reviewers.slots[0]
    const decisions: ReviewerDecision[] = [{ slotId: slot?.id ?? 'wf-assessor', role: slot ? slotRoleName(slot) : 'Assessor', reviewer: MEMBERS[0], status: 'pending', dueAt: TODAY }]
    setWf({ subject, config, decisions })
    setTableStage('review')
    flash(`Sent ${tableSelected.length} ${activeWf.copy.itemNoun} for review`)
  }

  const wfSubmit = (sub: ReviewSubmission) => {
    setWf((w) => {
      if (!w) return w
      let status: ReviewerDecision['status'] = 'approved'
      if (sub.outcome === 'reject') status = 'rejected'
      else if (sub.outcome === 'request-changes') status = 'changes-requested'
      const decisions = w.decisions.map((d) => (d.slotId === 'wf-assessor' ? { ...d, status, outcome: sub.outcome, comment: sub.comment || d.comment, signedAt: TODAY } : d))
      const output: ApprovalOutput = {
        verdict: sub.outcome,
        approvedItemIds: sub.outcome === 'approve' ? w.subject.items.map((i) => i.id) : [],
        decidedBy: [MEMBERS[0]],
        decidedAt: TODAY,
      }
      return { ...w, decisions, output }
    })
    setWfDialogOpen(false)
    flash('Decision recorded')
  }

  // ---- approval handlers ----
  const onApplyConfig = (config: ApprovalConfig) => {
    setRun({ config, configApplied: true, decisions: decisionsFromConfig(config), status: 'draft', requested: false, output: undefined })
    flash('Saved — the published app now uses this configuration')
  }
  const onEditConfig = () => setRun({ configApplied: false })
  const onAssign = (slotId: string, person: PersonRef) =>
    setRun((r) => ({
      ...r,
      decisions: r.decisions.map((d) =>
        d.slotId === slotId
          ? { ...d, reviewer: person, status: 'pending', dueAt: d.dueAt ?? TODAY, role: r.config.reviewers.slots.find((s) => s.id === slotId)?.role.mode === 'open' ? memberRole(person) ?? d.role : d.role }
          : d,
      ),
    }))
  const onAddApprover = (person: PersonRef) =>
    setRun((r) => ({ ...r, decisions: [...r.decisions, { slotId: `added-${person.id ?? person.name}`, role: memberRole(person) ?? 'Peer Reviewer', reviewer: person, status: 'pending', dueAt: TODAY }] }))
  const onInvite = (person: PersonRef) => flash(`Invited ${person.name} — they'll get a link to review (no account needed yet)`)
  const onRequest = () => {
    setRun({ requested: true, status: 'requested' })
    flash('Approval requested — reviewers notified in-platform')
  }
  const onSubmitReview = (sub: ReviewSubmission) => {
    setRun((r) => {
      const m = r.config.mode
      const slotId = r.config.reviewers.slots[0]?.id
      const user = r.decisions.find((d) => d.slotId === slotId)?.reviewer ?? REVIEWER_USER[scenarioKey]
      let status: ReviewerDecision['status'] = 'approved'
      if (sub.outcome === 'reject') status = 'rejected'
      else if (sub.outcome === 'request-changes') status = 'changes-requested'
      const decisions = r.decisions.map((d) => (d.slotId === slotId ? { ...d, status, outcome: sub.outcome, selectedItemIds: sub.selectedItemIds, comment: sub.comment || d.comment, signedAt: TODAY } : d))
      let output: ApprovalOutput
      if (m.type === 'selection') {
        const selected = sub.selectedItemIds ?? []
        const itemOutcomes: Record<string, Outcome> = {}
        scenario.subject.items.forEach((it) => (itemOutcomes[it.id] = selected.includes(it.id) ? 'approve' : 'reject'))
        output = { approvedItemIds: selected, itemOutcomes, decidedBy: [user], decidedAt: TODAY }
      } else {
        output = { verdict: sub.outcome, approvedItemIds: sub.outcome === 'approve' ? scenario.subject.items.map((i) => i.id) : [], decidedBy: [user], decidedAt: TODAY }
      }
      const overall: ApprovalStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'changes-requested'
      return { ...r, decisions, output, status: overall }
    })
    setDialogOpen(false)
    flash('Decision recorded')
  }

  const tableFrame = { ...activeWf.frame, activeTabIndex: tableStage === 'rubric' ? 0 : tableStage === 'candidates' ? 1 : 2 }
  // The published stages honour whatever was configured in the editor.
  const colBound = tableConfig.columnsSource.kind !== 'document-upload' ? { label: tableConfig.columnsSource.label, dataSource: tableConfig.columnsSource.kind === 'data-source' } : undefined
  const rowBound = tableConfig.rowsSource.kind !== 'document-upload' ? { label: tableConfig.rowsSource.label, dataSource: tableConfig.rowsSource.kind === 'data-source' } : undefined

  return (
    <div className="pg-shell">
      <div className="pg-toolbar">
        <span className="pg-brand">Smart Blocks · prototype</span>
        {view !== 'launchpad' && (
          <button className="btn subtle" style={{ padding: '5px 12px' }} onClick={() => setView('launchpad')}>
            <ChevronLeft size={15} /> Launchpad
          </button>
        )}
        {view === 'approval' && (
          <>
            <div className="pg-group">
              <span className="pg-label">Surface</span>
              <div className="pg-segment">
                <button className={mode === 'editor' ? 'active' : ''} onClick={() => setMode('editor')}>Editor (chat)</button>
                <button className={mode === 'published' ? 'active' : ''} onClick={() => setMode('published')}>Published app</button>
              </div>
            </div>
            {mode === 'published' && (
              <div className="pg-group">
                <span className="pg-label">Viewing as</span>
                <div className="pg-segment">
                  <button className={publishedAs === 'workflow-user' ? 'active' : ''} onClick={() => setPublishedAs('workflow-user')}>Workflow user</button>
                  <button className={publishedAs === 'reviewer' ? 'active' : ''} onClick={() => setPublishedAs('reviewer')}>Reviewer</button>
                </div>
              </div>
            )}
          </>
        )}
        {view === 'table' && (
          <>
            <div className="pg-group">
              <span className="pg-label">Surface</span>
              <div className="pg-segment">
                <button className={tableSurface === 'editor' ? 'active' : ''} onClick={() => setTableSurface('editor')}>Editor (chat)</button>
                <button className={tableSurface === 'published' ? 'active' : ''} onClick={() => setTableSurface('published')}>Published app</button>
              </div>
            </div>
            {tableSurface === 'published' && (
              <div className="pg-group">
                <span className="pg-label">Stage</span>
                <div className="pg-segment">
                  <button className={tableStage === 'rubric' ? 'active' : ''} onClick={() => setTableStage('rubric')}>1 · Rubric</button>
                  <button className={tableStage === 'candidates' ? 'active' : ''} onClick={() => { if (table.phase === 'empty') setTable(seededTable(activeWf)); setTableStage('candidates') }}>2 · Candidates</button>
                  <button className={tableStage === 'review' ? 'active' : ''} disabled={!wf} onClick={() => wf && setTableStage('review')}>3 · Review</button>
                </div>
              </div>
            )}
          </>
        )}
        {view === 'email' && (
          <>
            <div className="pg-group">
              <span className="pg-label">Surface</span>
              <div className="pg-segment">
                <button className={emailSurface === 'editor' ? 'active' : ''} onClick={() => setEmailSurface('editor')}>Editor (chat)</button>
                <button className={emailSurface === 'published' ? 'active' : ''} onClick={() => setEmailSurface('published')}>Published app</button>
              </div>
            </div>
            {emailSurface === 'published' && (
              <div className="pg-group">
                <span className="pg-label">Stage</span>
                <div className="pg-segment">
                  <button className={emailStage === 'brief' ? 'active' : ''} onClick={() => setEmailStage('brief')}>1 · Brief</button>
                  <button className={emailStage === 'assets' ? 'active' : ''} onClick={() => setEmailStage('assets')}>2 · Assets</button>
                  <button className={emailStage === 'compose' ? 'active' : ''} onClick={() => setEmailStage('compose')}>3 · Compose</button>
                  <button className={emailStage === 'review' ? 'active' : ''} disabled={!wf} onClick={() => wf && setEmailStage('review')}>4 · Review</button>
                </div>
              </div>
            )}
          </>
        )}
        <span className="pg-hint">No stack · in-memory fixtures</span>
      </div>

      <div className="pg-stage">
        {view === 'launchpad' && <Launchpad onOpen={openTarget} onChooseWorkflow={chooseWorkflow} onChooseEmail={openEmail} />}

        {view === 'table' && tableSurface === 'editor' && workflowType === 'candidates' && (
          <div className="browser" style={{ maxWidth: 1280 }}>
            <FiveLayerTableEditor
              table={flTable}
              approval={flApproval}
              onTable={setFlTable}
              onApproval={setFlApproval}
              frame={activeWf.frame}
              onPublish={() => { setTable(EMPTY_TABLE); setTableStage('rubric'); setTableSurface('published'); flash('Published — now using the app') }}
              onBack={() => setView('launchpad')}
            />
          </div>
        )}

        {view === 'table' && tableSurface === 'editor' && workflowType !== 'candidates' && (
          <div className="browser" style={{ maxWidth: 1280 }}>
            <TableBuilderShell
              wf={activeWf}
              config={tableConfig}
              applied={tableConfigApplied}
              onApply={onApplyTableConfig}
              onEdit={() => setTableConfigApplied(false)}
              onPublish={() => { setTable(EMPTY_TABLE); setTableStage('rubric'); setTableSurface('published'); flash('Published — now using the app') }}
              onBack={() => setView('launchpad')}
            />
          </div>
        )}

        {view === 'table' && tableSurface === 'published' && (
          <div className="browser">
            <div className="browser-bar">
              <div className="dots"><span className="dot r" /><span className="dot y" /><span className="dot g" /></div>
              <div className="url"><Lock size={12} />app.{activeWf.host}.com<span className="path">{activeWf.urlPath}</span></div>
            </div>
            <PublishedFrame frame={tableFrame}>
              {tableStage === 'rubric' && (
                <TableStep1 state={table} copy={activeWf.copy} boundSource={colBound} onGenerate={genColumns} onReplace={replaceRubric} onNext={() => setTableStage('candidates')} onBack={() => setView('launchpad')} />
              )}
              {tableStage === 'candidates' && (
                <TableStep2 state={table} copy={activeWf.copy} selectedIds={tableSelected} boundSource={rowBound} five={fiveView} onScore={scoreCandidates} onAddMore={() => {}} onToggle={toggleRow} onSend={sendForReview} onBack={() => setTableStage('rubric')} />
              )}
              {tableStage === 'review' && wf && (
                <div>
                  <h2 className="section-title">Review</h2>
                  <p className="section-sub">
                    The shortlisted {activeWf.copy.itemNoun} from the previous step, sent for sign-off.{' '}
                    {wf.output && <strong style={{ color: 'var(--success)' }}>· {wf.output.verdict === 'approve' ? 'Approved' : wf.output.verdict === 'reject' ? 'Rejected' : 'Changes requested'}</strong>}
                  </p>
                  <SubjectChip subject={wf.subject} />
                  <ReviewersTable config={wf.config} decisions={wf.decisions} mode="review" currentReviewerSlotId="wf-assessor" onReview={() => setWfDialogOpen(true)} />
                </div>
              )}
            </PublishedFrame>
          </div>
        )}

        {view === 'email' && emailSurface === 'editor' && (
          <div className="browser" style={{ maxWidth: 1280 }}>
            <EmailBuilderShell
              brief={emailBrief}
              config={composerConfig}
              applied={composerApplied}
              onApply={onApplyComposerConfig}
              onEdit={() => setComposerApplied(false)}
              onPublish={() => { setEmailStage('brief'); setEmailDraftIdx(null); setEmailSurface('published'); flash('Published — now using the app') }}
              onBack={() => setView('launchpad')}
            />
          </div>
        )}

        {view === 'email' && emailSurface === 'published' && (
          <div className="browser">
            <div className="browser-bar">
              <div className="dots"><span className="dot r" /><span className="dot y" /><span className="dot g" /></div>
              <div className="url"><Lock size={12} />app.lumina.com<span className="path">/campaign-email</span></div>
            </div>
            <PublishedFrame frame={{ ...EMAIL_FRAME, activeTabIndex: emailStage === 'brief' ? 0 : emailStage === 'assets' ? 1 : emailStage === 'compose' ? 2 : 3 }}>
              {emailStage === 'brief' && (
                <BriefStep brief={emailBrief} onChange={setEmailBrief} onNext={() => setEmailStage('assets')} onBack={() => setView('launchpad')} />
              )}
              {emailStage === 'assets' && (
                <AssetsStep assetsSource={composerConfig.assetsSource} onNext={() => setEmailStage('compose')} onBack={() => setEmailStage('brief')} />
              )}
              {emailStage === 'compose' && (
                <ComposerStep
                  brief={emailBrief}
                  config={composerConfig}
                  draft={emailDraftIdx != null ? EMAIL_DRAFTS[emailDraftIdx] : null}
                  selectedSubject={emailSubjectIdx}
                  onGenerate={generateEmail}
                  onRegenerate={regenerateEmail}
                  onSelectSubject={setEmailSubjectIdx}
                  onSend={sendEmailForReview}
                  onBack={() => setEmailStage('assets')}
                />
              )}
              {emailStage === 'review' && wf && (
                <div>
                  <h2 className="section-title">Review</h2>
                  <p className="section-sub">
                    The generated email, sent for sign-off.{' '}
                    {wf.output && <strong style={{ color: 'var(--success)' }}>· {wf.output.verdict === 'approve' ? 'Approved' : wf.output.verdict === 'reject' ? 'Rejected' : 'Changes requested'}</strong>}
                  </p>
                  <SubjectChip subject={wf.subject} />
                  <ReviewersTable config={wf.config} decisions={wf.decisions} mode="review" currentReviewerSlotId="wf-assessor" onReview={() => setWfDialogOpen(true)} />
                </div>
              )}
            </PublishedFrame>
          </div>
        )}

        {view === 'approval' &&
          (mode === 'editor' ? (
            <div className="browser" style={{ maxWidth: 1280 }}>
              <BuilderShell
                scenario={scenario}
                config={run.config}
                applied={run.configApplied}
                onApply={onApplyConfig}
                onEdit={onEditConfig}
                onPublish={() => { setPublishedAs('workflow-user'); setMode('published'); flash('Published — now using the app as a workflow user') }}
              />
            </div>
          ) : (
            <div className="browser">
              <div className="browser-bar">
                <div className="dots"><span className="dot r" /><span className="dot y" /><span className="dot g" /></div>
                <div className="url"><Lock size={12} />app.{scenario.appName.toLowerCase().replace(/\s/g, '')}.com<span className="path">{scenario.urlPath}</span></div>
              </div>
              <PublishedFrame frame={scenario}>
                {publishedAs === 'workflow-user' ? (
                  <AssignmentView subject={scenario.subject} config={run.config} decisions={run.decisions} message={run.message} requested={run.requested} onAssign={onAssign} onAddApprover={onAddApprover} onInvite={onInvite} onMessageChange={(v) => setRun({ message: v })} onRequest={onRequest} />
                ) : (
                  <>
                    <h2 className="section-title">Approvals</h2>
                    <p className="section-sub">Items waiting on you. Open one to record your decision.</p>
                    <SubjectChip subject={scenario.subject} />
                    <ReviewersTable config={run.config} decisions={run.decisions} mode="review" currentReviewerSlotId={run.config.reviewers.slots[0]?.id} onReview={() => setDialogOpen(true)} />
                  </>
                )}
              </PublishedFrame>
            </div>
          ))}
      </div>

      {dialogOpen && <ReviewDialog subject={scenario.subject} config={run.config} onClose={() => setDialogOpen(false)} onSubmit={onSubmitReview} />}
      {wfDialogOpen && wf && <ReviewDialog subject={wf.subject} config={wf.config} onClose={() => setWfDialogOpen(false)} onSubmit={wfSubmit} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
