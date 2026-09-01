import { useMemo, useState } from 'react';
import { ChevronLeft, Home, Check, Monitor, Tablet, Smartphone, Pencil, Eye, ArrowRight, Send, Sparkles } from 'lucide-react';
import { ClarificationCard, type ClarAnswer } from '../blocks/approval/ClarificationCard';
import { PublishedFrame, type FrameInfo } from '../blocks/approval/PublishedFrame';
import { TableView } from '../blocks/table/TableView';
import type { TableColumn, TableRow } from '../blocks/table/types';
import { deriveView, describeRowsSource, type ApprovalConfig, type SmartTableConfig, type SourceBindingKind } from './config';
import { getProposal, type LayerEdit } from './classify';

type Step = 'columns' | 'rows' | 'appearance' | 'review' | 'done';

type ThreadEntry =
  | { kind: 'me'; text: string }
  | { kind: 'them'; text: string }
  | { kind: 'sugg'; id: number; changes: LayerEdit[]; source: 'llm' | 'mock'; state: 'pending' | 'applied' | 'dismissed' };

// The candidate-screening editor: staged clarification cards + a working chat that turns
// requests into suggestion cards — every answer writes into the five-layer config, which the
// live preview (and the published app) render from. No separate "edit" drawer.
export function FiveLayerTableEditor({
  table,
  approval,
  onTable,
  onApproval,
  frame,
  onPublish,
  onBack,
}: {
  table: SmartTableConfig;
  approval: ApprovalConfig;
  onTable: (c: SmartTableConfig) => void;
  onApproval: (c: ApprovalConfig) => void;
  frame: FrameInfo;
  onPublish: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>('columns');
  const [results, setResults] = useState<Array<{ title: string; sub: string }>>([]);
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [input, setInput] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');
  const [suggSeq, setSuggSeq] = useState(1);
  const [busy, setBusy] = useState(false);

  const done = step === 'done';
  const pushResult = (title: string, sub: string) => setResults((r) => [...r, { title, sub }]);

  // ── staged step completions ──────────────────────────────────────
  const completeColumns = (ans: ClarAnswer[]) => {
    const v = ans.find((a) => a.questionId === 'columns')?.values[0] ?? 'Upload a rubric';
    pushResult('Step 1 · Columns', v);
    setStep('rows');
  };
  const completeRows = (ans: ClarAnswer[]) => {
    const rows = ans.find((a) => a.questionId === 'rows')?.values[0] ?? 'Runtime upload (6 resumes)';
    const score = ans.find((a) => a.questionId === 'score')?.values[0] ?? 'Yes — rank by Total';
    const kind: SourceBindingKind = /upstream/i.test(rows) ? 'block-output' : /data source|talent/i.test(rows) ? 'object-type' : 'workflow-field';
    const rank = /^yes/i.test(score);
    onTable({
      ...table,
      dataConfig: { ...table.dataConfig, rowsBinding: { kind, label: describeRowsSource(kind).label, provisioning: kind === 'workflow-field' ? 'runtime' : 'author-fixed' } },
      businessLogic: { ...table.businessLogic, defaultSort: rank ? { column: 'total', direction: 'desc' } : undefined },
    });
    pushResult('Step 2 · Rows', `${describeRowsSource(kind).label}${rank ? ' · ranked by Total' : ''}`);
    setStep('appearance');
  };
  const completeAppearance = (ans: ClarAnswer[]) => {
    const picks = ans.find((a) => a.questionId === 'appearance')?.values ?? [];
    const has = (s: string) => picks.some((p) => p.toLowerCase().includes(s));
    onTable({
      ...table,
      presentationConfig: { ...table.presentationConfig, compact: has('compact'), striped: has('striped') || table.presentationConfig.striped },
      accessControl: { ...table.accessControl, hiddenColumns: has('hide total') ? ['total'] : [] },
      actionsConfig: { ...table.actionsConfig, searchable: has('search'), rowActions: has('view resume') ? [{ id: 'view-resume', label: 'View resume' }] : [] },
    });
    pushResult('Step 3 · Look & rules', picks.length ? picks.join(', ') : 'Defaults');
    setStep('review');
  };
  const completeReview = (ans: ClarAnswer[]) => {
    const mode = ans.find((a) => a.questionId === 'mode')?.values[0] ?? 'Selection — pick 3–5';
    const policy = ans.find((a) => a.questionId === 'policy')?.values[0] ?? 'Single reviewer';
    const decisionMode = /verdict/i.test(mode) ? 'verdict' : /per-item|each/i.test(mode) ? 'per-item' : 'selection';
    const quorum = /quorum/i.test(policy);
    onApproval({
      ...approval,
      businessLogic: {
        ...approval.businessLogic,
        decisionMode,
        selection: decisionMode === 'selection' ? { minSelections: 3, maxSelections: 5 } : undefined,
        reviewPolicy: quorum ? { mode: 'quorum', quorum: 2 } : { mode: 'single' },
      },
    });
    pushResult('Step 4 · Review', `${mode} · ${policy}`);
    setStep('done');
  };

  // ── free-text chat → classify → suggestion card ──────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setThread((t) => [...t, { kind: 'me', text }]);
    setBusy(true);
    const proposal = await getProposal(text, { table, approval });
    setBusy(false);
    if (proposal.changes.length === 0) {
      setThread((t) => [...t, { kind: 'them', text: proposal.note ?? "I couldn't map that to a layer change. Try naming a column (“rename the Experience column to Years of experience”, or “change the Experience column to Skill level”), or a rule (“rank by total”, “let reviewers pick 3–5”)." }]);
      return;
    }
    const id = suggSeq;
    setSuggSeq((n) => n + 1);
    setThread((t) => [...t, { kind: 'sugg', id, changes: proposal.changes, source: proposal.source, state: 'pending' }]);
  };
  const applySugg = (id: number, changes: LayerEdit[]) => {
    let t = table;
    let a = approval;
    for (const c of changes) {
      const r = c.apply(t, a);
      t = r.t;
      a = r.a;
    }
    onTable(t);
    onApproval(a);
    setThread((th) => th.map((e) => (e.kind === 'sugg' && e.id === id ? { ...e, state: 'applied' } : e)));
  };
  const dismissSugg = (id: number) =>
    setThread((th) => th.map((e) => (e.kind === 'sugg' && e.id === id ? { ...e, state: 'dismissed' } : e)));

  // ── preview (renders from the five-layer config) ─────────────────
  const previewStage: 0 | 1 | 2 = step === 'columns' ? 0 : step === 'review' || step === 'done' ? 2 : 1;
  const d = useMemo(() => deriveView(table, previewSearch), [table, previewSearch]);
  const cols: TableColumn[] = d.columns.map((c) => ({ key: c.key, label: c.label, type: (c.isTotal ? 'total' : 'score') as TableColumn['type'] }));
  const rows: TableRow[] = d.rows.map((r) => ({ id: r.id, label: r.name, initials: r.initials, cells: r.cells }));
  const p = table.presentationConfig;

  return (
    <div className="builder">
      <div className="builder-topbar">
        <span className="tb-icon" onClick={onBack} style={{ cursor: 'pointer' }}><ChevronLeft size={17} /></span>
        <span className="tb-icon"><Home size={16} /></span>
        <span className="tb-title">Candidate screening</span>
        <span className="draft-pill">Draft</span>
        <div className="tb-right">
          <span className="saved"><Check size={15} /> {done ? 'Saved' : 'Draft — not saved'}</span>
          <button className="btn primary" onClick={onPublish} disabled={!done}>Publish</button>
        </div>
      </div>

      <div className="builder-body">
        <div className="chat-panel">
          <div className="chat-scroll">
            <div className="chat-msg them">
              You've added a <b>Table</b> block. Let's set it up step by step — its columns, its rows, how it looks, then the review. You can also just tell me what to change.
            </div>

            {results.map((r, i) => (
              <ResultLine key={i} title={r.title} sub={r.sub} />
            ))}

            {step === 'columns' && (
              <>
                <div className="chat-msg them"><b>Step 1 — the columns.</b> These define what a good candidate is.</div>
                <ClarificationCard
                  questions={[{ id: 'columns', prompt: "Where do the table's columns come from?", helpText: 'The rubric criteria become the scoring columns.', slot: 'single', options: ['Upload a rubric', 'A previous step', 'Another workflow', 'A data source'] }]}
                  onComplete={completeColumns}
                  onSkip={() => { pushResult('Step 1 · Columns', 'Upload a rubric'); setStep('rows'); }}
                />
              </>
            )}
            {step === 'rows' && (
              <>
                <div className="chat-msg them"><b>Step 2 — the rows.</b> Where do the candidates come from, and how are they ordered?</div>
                <ClarificationCard
                  questions={[
                    { id: 'rows', prompt: 'Where do the candidates come from?', helpText: 'Each entry becomes a row — the adapter resolves them.', slot: 'single', options: ['Runtime upload (6 resumes)', 'Upstream workflow (24)', 'Data source · Talent pool (12)'] },
                    { id: 'score', prompt: 'Rank them against the rubric?', slot: 'single', options: ['Yes — rank by Total', 'No — keep upload order'] },
                  ]}
                  onComplete={completeRows}
                  onSkip={() => setStep('appearance')}
                />
              </>
            )}
            {step === 'appearance' && (
              <>
                <div className="chat-msg them"><b>Step 3 — look & rules.</b> How should the results table appear and behave? (Pick any.)</div>
                <ClarificationCard
                  questions={[{ id: 'appearance', prompt: 'Tune the table', helpText: 'Presentation, access and actions — all layers of the same block.', slot: 'multi', options: ['Compact density', 'Striped rows', 'Hide Total from reviewers', 'Searchable', '“View resume” row action'] }]}
                  onComplete={completeAppearance}
                  onSkip={() => setStep('review')}
                />
              </>
            )}
            {step === 'review' && (
              <>
                <div className="chat-msg them"><b>Step 4 — the review.</b> Once candidates are scored, they go for sign-off. How is the decision made?</div>
                <ClarificationCard
                  questions={[
                    { id: 'mode', prompt: 'How is the shortlist decided?', slot: 'single', options: ['Verdict — approve/reject the shortlist', 'Selection — pick 3–5', 'Per-item — decide each'] },
                    { id: 'policy', prompt: 'Who has to agree?', slot: 'single', options: ['Single reviewer', 'Quorum — 2 of 3 agree'] },
                  ]}
                  onComplete={completeReview}
                  onSkip={() => { pushResult('Step 4 · Review', 'Selection — pick 3–5 · Single reviewer'); setStep('done'); }}
                />
              </>
            )}
            {done && (
              <div className="chat-msg them">
                Done — all four layers are configured, and the preview matches the published app. Ask me to tweak anything (e.g. “make it compact”, “let reviewers pick 3–5”), or Publish.
              </div>
            )}

            {thread.map((e, i) =>
              e.kind === 'me' ? (
                <div key={i} className="chat-msg me">{e.text}</div>
              ) : e.kind === 'them' ? (
                <div key={i} className="chat-msg them">{e.text}</div>
              ) : (
                <SuggestionCard key={i} entry={e} onApply={() => applySugg(e.id, e.changes)} onDismiss={() => dismissSugg(e.id)} />
              ),
            )}
            {busy && <div className="chat-msg them thinking"><Sparkles size={13} /> Reading your request…</div>}
          </div>

          <div className="chat-input">
            <input
              className="fl-chat-box"
              placeholder="Tell the assistant what to change…"
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && send()}
            />
            <button className="send" onClick={send}><ArrowRight size={15} /></button>
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
                <PublishedFrame frame={{ ...frame, activeTabIndex: previewStage }} compactAssistant>
                  {previewStage === 0 && (
                    <div>
                      <h2 className="section-title">Build your evaluation table</h2>
                      <p className="section-sub">Upload the rubric we'll score every candidate against — its criteria become your columns.</p>
                      <div className="file-chip"><span className="file-ico"><Sparkles size={16} /></span><span className="file-name"><strong>interview-rubric.xlsx</strong><br /><span className="muted" style={{ fontSize: 13 }}>{table.dataConfig.rowsBinding.provisioning === 'author-fixed' ? 'Author-fixed · set by the workflow' : '4 criteria derived'}</span></span></div>
                    </div>
                  )}
                  {previewStage === 1 && (
                    <div>
                      <h2 className="section-title">{p.title}</h2>
                      <p className="section-sub">{describeRowsSource(table.dataConfig.rowsBinding.kind).label} · {d.total} candidates</p>
                      {table.actionsConfig.searchable && (
                        <input className="fl-search" placeholder="Search candidates…" value={previewSearch} onChange={(e) => setPreviewSearch(e.target.value)} />
                      )}
                      <TableView columns={cols} rows={rows} itemColumn="Candidate" compact={p.compact} striped={p.striped} rowActions={table.actionsConfig.rowActions} />
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Showing {rows.length} of {d.total}</div>
                    </div>
                  )}
                  {previewStage === 2 && <ReviewPreview approval={approval} />}
                </PublishedFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultLine({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="chat-result">
      <span className="tick"><Check size={13} /></span>
      <div>
        <div className="rtitle">{title}</div>
        <div className="rsub">{sub}</div>
      </div>
    </div>
  );
}

function SuggestionCard({ entry, onApply, onDismiss }: { entry: Extract<ThreadEntry, { kind: 'sugg' }>; onApply: () => void; onDismiss: () => void }) {
  const toneOf: Record<string, string> = { Presentation: 'pres', Data: 'data', 'Business logic': 'logic', Access: 'access', Actions: 'actions' };
  return (
    <div className={`sugg-card${entry.state !== 'pending' ? ' resolved' : ''}`}>
      <div className="sugg-head">
        <Sparkles size={14} /> Suggested change{entry.changes.length > 1 ? 's' : ''}
        <span className="sugg-src">{entry.source === 'llm' ? 'LLM' : 'sample logic'}</span>
      </div>
      <ul className="sugg-list">
        {entry.changes.map((c, i) => (
          <li key={i}><span className={`sugg-chip ${toneOf[c.layer]}`}>{c.layer}</span>{c.summary}</li>
        ))}
      </ul>
      {entry.state === 'pending' ? (
        <div className="sugg-actions">
          <button className="btn ghost" onClick={onDismiss}>Dismiss</button>
          <button className="btn primary" onClick={onApply}>Apply</button>
        </div>
      ) : (
        <div className={`sugg-status ${entry.state}`}>{entry.state === 'applied' ? <><Check size={13} /> Applied</> : 'Dismissed'}</div>
      )}
    </div>
  );
}

function ReviewPreview({ approval }: { approval: ApprovalConfig }) {
  const bl = approval.businessLogic;
  const mode = bl.decisionMode;
  return (
    <div>
      <h2 className="section-title">Review</h2>
      <p className="section-sub">The shortlisted candidates from the previous step, sent for sign-off.</p>
      <label className="field-label">Approver <span className="req">*</span></label>
      <div className="subject-chip" style={{ justifyContent: 'space-between' }}>
        <span className="reviewer-cell">
          <span className="role-pill">{approval.accessControl.allowedReviewerRoles?.[0] ?? 'Reviewer'}</span>
          <span className="muted" style={{ fontStyle: 'italic' }}>
            {bl.reviewPolicy.mode === 'quorum' ? `quorum — ${bl.reviewPolicy.quorum} of 3 must agree` : 'assigned when someone uses the app'}
          </span>
        </span>
      </div>
      <div className="btn-row">
        <span className="muted" style={{ fontSize: 13 }}>
          Decision: {mode === 'verdict' ? 'one verdict on the shortlist' : mode === 'selection' ? `select ${bl.selection?.minSelections}–${bl.selection?.maxSelections}` : 'decide each candidate'}
          {bl.requireCommentOnReject ? ' · comment required on reject' : ''}
        </span>
        <button className="btn primary"><Send size={15} /> Request approval</button>
      </div>
    </div>
  );
}
