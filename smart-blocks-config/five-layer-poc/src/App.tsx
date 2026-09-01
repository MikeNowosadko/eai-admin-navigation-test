import { useMemo, useState } from 'react';
import type {
  ApprovalConfig,
  ApprovalDecisionMode,
  Provisioning,
  SmartTableConfig,
  SourceBinding,
  SourceBindingKind,
} from './types';
import { BASE_COLUMNS, candidateAdapter, describeRowsSource } from './data';

// ── The knobs the control panel drives (friendly view over the five layers) ──
interface Knobs {
  // Presentation
  compact: boolean;
  striped: boolean;
  relabelCulture: boolean;
  // Data
  rowsSource: SourceBindingKind;
  rubricProvisioning: Provisioning;
  // Business logic
  sortByTotal: boolean;
  pageSize: number;
  decisionMode: ApprovalDecisionMode;
  quorum: boolean;
  requireCommentOnReject: boolean;
  // Access control
  hideTotal: boolean;
  allowRowSelection: boolean;
  // Actions
  searchable: boolean;
  viewResumeAction: boolean;
  requireConfirmation: boolean;
}

const INITIAL: Knobs = {
  compact: false,
  striped: true,
  relabelCulture: false,
  rowsSource: 'workflow-field', // runtime upload
  rubricProvisioning: 'author-fixed',
  sortByTotal: true,
  pageSize: 8,
  decisionMode: 'selection',
  quorum: false,
  requireCommentOnReject: false,
  hideTotal: false,
  allowRowSelection: true,
  searchable: false,
  viewResumeAction: false,
  requireConfirmation: false,
};

// Map friendly knobs → the REAL five-layer SmartTableConfig (what the engineer reviews).
function toTableConfig(k: Knobs): SmartTableConfig {
  const columns = BASE_COLUMNS.map((c) =>
    c.key === 'culture' && k.relabelCulture ? { ...c, label: 'Values alignment' } : c,
  );
  const rowsBinding: SourceBinding = {
    kind: k.rowsSource,
    label: describeRowsSource(k.rowsSource).label,
    provisioning: k.rowsSource === 'workflow-field' ? 'runtime' : 'author-fixed',
  };
  return {
    presentationConfig: {
      title: 'Candidate screening',
      description: "Resumes scored against the rubric's criteria.",
      emptyMessage: 'No resumes uploaded yet — drop them above.',
      compact: k.compact,
      striped: k.striped,
    },
    dataConfig: { rowsBinding, columns, rowIdField: 'id' },
    businessLogic: {
      ...(k.sortByTotal ? { defaultSort: { column: 'total', direction: 'desc' as const } } : {}),
      pageSize: k.pageSize,
    },
    accessControl: {
      hiddenColumns: k.hideTotal ? ['total'] : [],
      allowRowSelection: k.allowRowSelection,
    },
    actionsConfig: {
      searchable: k.searchable,
      searchPlaceholder: 'Search candidates…',
      rowActions: k.viewResumeAction ? [{ id: 'view-resume', label: 'View resume' }] : [],
    },
  };
}

function toApprovalConfig(k: Knobs): ApprovalConfig {
  return {
    presentationConfig: { title: 'Review', approveLabel: 'Approve', rejectLabel: 'Reject' },
    dataConfig: { subjectBinding: { kind: 'block-output', label: 'Shortlist from the Table block' } },
    businessLogic: {
      decisionMode: k.decisionMode,
      ...(k.decisionMode === 'selection' ? { selection: { minSelections: 3, maxSelections: 5 } } : {}),
      reviewPolicy: k.quorum ? { mode: 'quorum', quorum: 2 } : { mode: 'single' },
      requireCommentOnReject: k.requireCommentOnReject,
    },
    accessControl: { allowedReviewerRoles: ['hiring-manager'] },
    actionsConfig: { requireConfirmation: k.requireConfirmation },
  };
}

export function App() {
  const [k, setK] = useState<Knobs>(INITIAL);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showJson, setShowJson] = useState(false);

  const tableConfig = useMemo(() => toTableConfig(k), [k]);
  const approvalConfig = useMemo(() => toApprovalConfig(k), [k]);

  // The adapter resolves rows from the data-layer binding (app owns this, not the block).
  const resolvedRows = useMemo(
    () => candidateAdapter.resolveRows(tableConfig.dataConfig.rowsBinding),
    [tableConfig.dataConfig.rowsBinding],
  );

  const visibleColumns = tableConfig.dataConfig.columns.filter(
    (c) => !(tableConfig.accessControl.hiddenColumns ?? []).includes(c.key),
  );

  const rows = useMemo(() => {
    let r = [...resolvedRows];
    const sort = tableConfig.businessLogic.defaultSort;
    if (sort) {
      r.sort((a, b) => {
        const av = a.cells[sort.column] ?? 0;
        const bv = b.cells[sort.column] ?? 0;
        return sort.direction === 'desc' ? bv - av : av - bv;
      });
    }
    if (tableConfig.actionsConfig.searchable && search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) => row.name.toLowerCase().includes(q));
    }
    return r.slice(0, tableConfig.businessLogic.pageSize ?? r.length);
  }, [resolvedRows, tableConfig, search]);

  const set = (patch: Partial<Knobs>) => setK((prev) => ({ ...prev, ...patch }));
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const source = describeRowsSource(k.rowsSource);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">Smart Blocks · Five-Layer Config POC</div>
          <div className="sub">Candidate screening · change one layer, watch only that layer move</div>
        </div>
        <div className="legend">
          <span className="chip pres">Presentation</span>
          <span className="chip data">Data</span>
          <span className="chip logic">Business logic</span>
          <span className="chip access">Access</span>
          <span className="chip actions">Actions</span>
        </div>
      </header>

      <div className="body">
        {/* ── Controls ─────────────────────────────────────────── */}
        <aside className="controls">
          <Section tone="pres" title="1 · Presentation (UI)" hint="How it looks. Scores never change.">
            <Toggle label="Compact density" checked={k.compact} onChange={(v) => set({ compact: v })} />
            <Toggle label="Striped rows" checked={k.striped} onChange={(v) => set({ striped: v })} />
            <Toggle
              label={'Relabel “Culture fit” → “Values alignment”'}
              checked={k.relabelCulture}
              onChange={(v) => set({ relabelCulture: v })}
            />
          </Section>

          <Section tone="data" title="3 · Data source" hint="Where rows come from. Look & rules unchanged.">
            <Radio
              label="Candidates come from"
              value={k.rowsSource}
              options={[
                { value: 'workflow-field', label: 'Runtime upload (8 resumes)' },
                { value: 'block-output', label: 'Upstream workflow (24)' },
                { value: 'object-type', label: 'Data source · Talent pool (12)' },
              ]}
              onChange={(v) => set({ rowsSource: v as SourceBindingKind })}
            />
            <Radio
              label="Rubric provisioning"
              value={k.rubricProvisioning}
              options={[
                { value: 'author-fixed', label: 'Author-fixed (pinned, read-only)' },
                { value: 'runtime', label: 'Runtime (recruiter uploads each run)' },
              ]}
              onChange={(v) => set({ rubricProvisioning: v as Provisioning })}
            />
          </Section>

          <Section tone="logic" title="2 · Business logic" hint="The rules. Same rows, same look.">
            <Toggle label="Rank by Total (desc)" checked={k.sortByTotal} onChange={(v) => set({ sortByTotal: v })} />
            <Radio
              label="Approval decision mode"
              value={k.decisionMode}
              options={[
                { value: 'verdict', label: 'Verdict (approve/reject the whole shortlist)' },
                { value: 'selection', label: 'Selection (pick 3–5)' },
                { value: 'per-item', label: 'Per-item (decide each candidate)' },
              ]}
              onChange={(v) => set({ decisionMode: v as ApprovalDecisionMode })}
            />
            <Toggle label="Quorum review (2 of 3 must agree)" checked={k.quorum} onChange={(v) => set({ quorum: v })} />
            <Toggle
              label="Require comment on reject"
              checked={k.requireCommentOnReject}
              onChange={(v) => set({ requireCommentOnReject: v })}
            />
          </Section>

          <Section tone="access" title="4 · Access control" hint="Who sees / does what.">
            <Toggle label="Hide Total from reviewers" checked={k.hideTotal} onChange={(v) => set({ hideTotal: v })} />
            <Toggle label="Allow row selection" checked={k.allowRowSelection} onChange={(v) => set({ allowRowSelection: v })} />
          </Section>

          <Section tone="actions" title="5 · Actions" hint="Declarative interactions.">
            <Toggle label="Searchable" checked={k.searchable} onChange={(v) => set({ searchable: v })} />
            <Toggle label={'Row action: “View resume”'} checked={k.viewResumeAction} onChange={(v) => set({ viewResumeAction: v })} />
            <Toggle label="Require confirmation on decision" checked={k.requireConfirmation} onChange={(v) => set({ requireConfirmation: v })} />
          </Section>

          <button className="reset" onClick={() => { setK(INITIAL); setSelected(new Set()); setSearch(''); }}>
            Reset all layers
          </button>
        </aside>

        {/* ── Live block preview ───────────────────────────────── */}
        <main className="preview">
          {/* Data-layer banner: the adapter resolution + provisioning */}
          <div className="databanner">
            <span className="tag data">DATA</span>
            <span>
              Adapter resolved <b>{source.count}</b> candidates from <b>{source.label}</b>.
            </span>
            <span className="prov">
              Rubric:{' '}
              {k.rubricProvisioning === 'author-fixed'
                ? 'interview-rubric.xlsx — set by the workflow (read-only to recruiters)'
                : 'uploaded by the recruiter each run'}
            </span>
          </div>

          {/* Smart Table block */}
          <section className={`block table ${k.compact ? 'compact' : ''}`}>
            <div className="blockhead">
              <h2>{tableConfig.presentationConfig.title}</h2>
              <p>{tableConfig.presentationConfig.description}</p>
            </div>
            {k.searchable && (
              <input
                className="searchbox"
                placeholder={tableConfig.actionsConfig.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <table className={k.striped ? 'striped' : ''}>
              <thead>
                <tr>
                  {k.allowRowSelection && <th className="selcol" />}
                  <th className="namecol">Candidate</th>
                  {visibleColumns.map((c) => (
                    <th key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                      {c.label}
                    </th>
                  ))}
                  {(tableConfig.actionsConfig.rowActions ?? []).length > 0 && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={selected.has(row.id) ? 'sel' : ''}>
                    {k.allowRowSelection && (
                      <td className="selcol">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
                      </td>
                    )}
                    <td className="namecol">
                      <span className="avatar">{row.initials}</span>
                      {row.name}
                    </td>
                    {visibleColumns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align ?? 'left' }} className={c.key === 'total' ? 'total' : ''}>
                        {row.cells[c.key]}
                      </td>
                    ))}
                    {(tableConfig.actionsConfig.rowActions ?? []).length > 0 && (
                      <td>
                        {tableConfig.actionsConfig.rowActions!.map((a) => (
                          <button key={a.id} className="rowaction">{a.label}</button>
                        ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tablefoot">
              Showing {rows.length} of {source.count}
              {k.allowRowSelection ? ` · ${selected.size} shortlisted` : ''}
            </div>
          </section>

          {/* Approval block reflecting business-logic + access + actions */}
          <ApprovalPreview config={approvalConfig} selectedCount={selected.size} />

          {/* Resolved five-layer config for the engineer */}
          <section className="jsonpanel">
            <button className="jsontoggle" onClick={() => setShowJson((v) => !v)}>
              {showJson ? '▾' : '▸'} Resolved five-layer config (SmartTableConfig + ApprovalConfig)
            </button>
            {showJson && (
              <pre>{JSON.stringify({ tableConfig, approvalConfig }, null, 2)}</pre>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function ApprovalPreview({ config, selectedCount }: { config: ApprovalConfig; selectedCount: number }) {
  const bl = config.businessLogic;
  const mode = bl.decisionMode;
  return (
    <section className="block approval">
      <div className="blockhead">
        <h2>{config.presentationConfig.title}</h2>
        <p>
          Reviewer: <span className="role">{config.accessControl.allowedReviewerRoles?.[0]}</span> ·{' '}
          {bl.reviewPolicy.mode === 'quorum' ? `quorum — ${bl.reviewPolicy.quorum} of 3 must agree` : 'single reviewer'}
          {bl.requireCommentOnReject ? ' · comment required on reject' : ''}
          {config.actionsConfig.requireConfirmation ? ' · confirm before deciding' : ''}
        </p>
      </div>
      <div className="approvalbody">
        {mode === 'verdict' && (
          <>
            <span className="modenote">Approve or reject the whole shortlist ({selectedCount} candidates)</span>
            <div className="btnrow">
              <button className="btn approve">{config.presentationConfig.approveLabel}</button>
              <button className="btn reject">{config.presentationConfig.rejectLabel}</button>
              <button className="btn ghost">Request changes</button>
            </div>
          </>
        )}
        {mode === 'selection' && (
          <span className="modenote">
            Pick {bl.selection?.minSelections}–{bl.selection?.maxSelections} candidates to advance
            {' '}(currently {selectedCount} selected)
          </span>
        )}
        {mode === 'per-item' && (
          <span className="modenote">Approve / reject each of the {selectedCount} shortlisted candidates individually</span>
        )}
      </div>
    </section>
  );
}

// ── Little control primitives ────────────────────────────────
function Section({ tone, title, hint, children }: { tone: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className={`section ${tone}`}>
      <div className="sectionhead">
        <span className={`dot ${tone}`} />
        <div>
          <div className="stitle">{title}</div>
          <div className="shint">{hint}</div>
        </div>
      </div>
      <div className="sbody">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Radio({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="radio">
      <div className="rlabel">{label}</div>
      {options.map((o) => (
        <label key={o.value} className={`ropt ${value === o.value ? 'on' : ''}`}>
          <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
