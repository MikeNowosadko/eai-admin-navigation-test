// Request classifier + editor. A natural-language request →
//   (1) WHICH layer it changes, and
//   (2) the concrete edit to the five-layer config.
//
// One swap point, two implementations (mirrors CandidateAnalysis / table-ai.ts):
//   • llmClassifier  — POSTs to /api/llm-classify (real LLM, key server-side)
//   • mockClassifier — deterministic rules that generalise the common cases
// getProposal() tries the LLM and falls back to the mock, so the chat always works.

import {
  redefineColumn,
  relabelColumn,
  setDataSource,
  type ApprovalConfig,
  type Provisioning,
  type SmartTableConfig,
  type SourceBindingKind,
} from './config';

export type Layer = 'Data' | 'Business logic' | 'Access' | 'Actions' | 'Presentation';

export interface LayerEdit {
  layer: Layer;
  summary: string;
  apply: (t: SmartTableConfig, a: ApprovalConfig) => { t: SmartTableConfig; a: ApprovalConfig };
}
export interface Proposal {
  changes: LayerEdit[];
  source: 'llm' | 'mock';
  note?: string;
}
export interface Ctx {
  table: SmartTableConfig;
  approval: ApprovalConfig;
}

// Decision precedence — the higher-stakes layers come first. Used to order a
// multi-part change and to break ties when a request could read two ways.
const LAYER_ORDER: Layer[] = ['Data', 'Business logic', 'Access', 'Actions', 'Presentation'];
const sortByLayer = (edits: LayerEdit[]) => [...edits].sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));

/** The classification rubric — also fed to the LLM as its system guidance. */
export const LAYER_GUIDE = `Classify each request into ONE layer (decision priority, highest first):
1. DATA — what the rows/columns are or where they come from: change the data source, provisioning (author-fixed vs runtime), and REDEFINE a column's meaning (a new criterion → its values must be re-scored). Redefining a column is DATA, not presentation.
2. BUSINESS LOGIC — rules applied to resolved data: ranking/sorting, weights, thresholds, page size, and the approval decision mode / review policy / required comments.
3. ACCESS CONTROL — who sees/does what: hide columns from reviewers, allowed reviewer roles, row-selection permission.
4. ACTIONS — declarative interactions: search, row actions (view resume), confirm-before-deciding.
5. PRESENTATION — display only, NO change to meaning or values: RENAME a column header (same values), compact/striped density, titles. NOT colours/CSS/styling (brand comes from client onboarding).
Decisive test — relabel vs redefine: if only the header text changes and the values stay → PRESENTATION (relabel). If the column's MEANING changes so the cell values must change → DATA (redefine, re-score).`;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// ── column rename vs redefine (the nuanced case) ─────────────────────
function detectColumnEdit(text: string, table: SmartTableConfig): LayerEdit | null {
  const t = text.toLowerCase();
  if (!/(column|rename|relabel|\bcall\b|label|rename)/.test(t)) return null;
  const scoreCols = table.dataConfig.columns.filter((c) => !c.isTotal);
  const col = scoreCols.find((c) => t.includes(c.label.toLowerCase()));
  if (!col) return null;
  const m = text.match(/\b(?:to|called|named|rename(?:d)? (?:it|to)?|as|be|into|=)\s+["']?(.+?)["']?\s*\.?$/i);
  if (!m) return null;
  let newName = m[1].trim().replace(/^(a|an|the)\s+/i, '').replace(/\s+column$/i, '').replace(/[."']+$/g, '').trim();
  if (!newName || newName.toLowerCase() === col.label.toLowerCase()) return null;
  newName = titleCase(newName);
  const oldWords = col.label.toLowerCase().split(/\s+/);
  const relabel = /\b(rename|relabel|call|called|label)\b/.test(t) || oldWords.some((w) => newName.toLowerCase().includes(w));
  if (relabel) {
    return { layer: 'Presentation', summary: `Rename the “${col.label}” header → “${newName}” (values unchanged)`, apply: (tc, a) => ({ t: relabelColumn(tc, col.key, newName), a }) };
  }
  return { layer: 'Data', summary: `Redefine the “${col.label}” column as “${newName}” — the block re-scores that column, and the Total updates`, apply: (tc, a) => ({ t: redefineColumn(tc, col.key, newName), a }) };
}

// ── simple keyword matchers for the other layers ─────────────────────
const MATCHERS: Array<{ re: RegExp; edit: LayerEdit }> = [
  { re: /upstream|receive applications|previous workflow|pull.*workflow/i, edit: { layer: 'Data', summary: 'Bind candidates to the upstream workflow (24)', apply: (t, a) => ({ t: setDataSource(t, 'block-output'), a }) } },
  { re: /talent pool|data source|share ?point/i, edit: { layer: 'Data', summary: 'Bind candidates to the Talent pool data source (12)', apply: (t, a) => ({ t: setDataSource(t, 'object-type'), a }) } },
  { re: /runtime upload|per run|each run|recruiter upload|this run/i, edit: { layer: 'Data', summary: 'Candidates uploaded at runtime (6 this run)', apply: (t, a) => ({ t: setDataSource(t, 'workflow-field'), a }) } },
  { re: /author.?fixed|pin.*(rubric|input)|read.only/i, edit: { layer: 'Data', summary: 'Pin the input as author-fixed (read-only at runtime)', apply: (t, a) => ({ t: { ...t, dataConfig: { ...t.dataConfig, rowsBinding: { ...t.dataConfig.rowsBinding, provisioning: 'author-fixed' as Provisioning } } }, a }) } },
  { re: /(rank|sort).*(total|score)|highest.*first|top.*first|order by total/i, edit: { layer: 'Business logic', summary: 'Rank by Total (high → low)', apply: (t, a) => ({ t: { ...t, businessLogic: { ...t.businessLogic, defaultSort: { column: 'total', direction: 'desc' } } }, a }) } },
  { re: /(don'?t sort|unsorted|original order|upload order|remove ranking)/i, edit: { layer: 'Business logic', summary: 'Keep original order (no ranking)', apply: (t, a) => ({ t: { ...t, businessLogic: { ...t.businessLogic, defaultSort: undefined } }, a }) } },
  { re: /(pick|select|choose|shortlist)\b.*\d|selection mode/i, edit: { layer: 'Business logic', summary: 'Approval: reviewers select 3–5 candidates', apply: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, decisionMode: 'selection', selection: { minSelections: 3, maxSelections: 5 } } } }) } },
  { re: /verdict|approve or reject|whole shortlist|approve all/i, edit: { layer: 'Business logic', summary: 'Approval: one verdict on the whole shortlist', apply: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, decisionMode: 'verdict' } } }) } },
  { re: /per.?item|each candidate|individually|one by one/i, edit: { layer: 'Business logic', summary: 'Approval: decide each candidate individually', apply: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, decisionMode: 'per-item' } } }) } },
  { re: /quorum|two reviewers|2 of 3|second reviewer|multiple reviewers/i, edit: { layer: 'Business logic', summary: 'Approval: quorum — 2 of 3 must agree', apply: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, reviewPolicy: { mode: 'quorum', quorum: 2 } } } }) } },
  { re: /comment on reject|require.*comment|reason.*reject/i, edit: { layer: 'Business logic', summary: 'Approval: require a comment on reject', apply: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, requireCommentOnReject: true } } }) } },
  { re: /hide.*total/i, edit: { layer: 'Access', summary: 'Hide the Total column from reviewers', apply: (t, a) => ({ t: { ...t, accessControl: { ...t.accessControl, hiddenColumns: ['total'] } }, a }) } },
  { re: /show.*total|unhide.*total/i, edit: { layer: 'Access', summary: 'Show the Total column', apply: (t, a) => ({ t: { ...t, accessControl: { ...t.accessControl, hiddenColumns: [] } }, a }) } },
  { re: /search|find a candidate|filter by name/i, edit: { layer: 'Actions', summary: 'Add a search box', apply: (t, a) => ({ t: { ...t, actionsConfig: { ...t.actionsConfig, searchable: true } }, a }) } },
  { re: /view resume|resume link|open resume|row action/i, edit: { layer: 'Actions', summary: 'Add a “View resume” row action', apply: (t, a) => ({ t: { ...t, actionsConfig: { ...t.actionsConfig, rowActions: [{ id: 'view-resume', label: 'View resume' }] } }, a }) } },
  { re: /compact|dense|tighter|condense/i, edit: { layer: 'Presentation', summary: 'Compact the table', apply: (t, a) => ({ t: { ...t, presentationConfig: { ...t.presentationConfig, compact: true } }, a }) } },
  { re: /spacious|comfortable|less dense|not compact/i, edit: { layer: 'Presentation', summary: 'Comfortable density', apply: (t, a) => ({ t: { ...t, presentationConfig: { ...t.presentationConfig, compact: false } }, a }) } },
  { re: /\bstripe|striped|zebra/i, edit: { layer: 'Presentation', summary: 'Stripe the rows', apply: (t, a) => ({ t: { ...t, presentationConfig: { ...t.presentationConfig, striped: true } }, a }) } },
];

function mockPropose(text: string, ctx: Ctx): LayerEdit[] {
  const out: LayerEdit[] = [];
  const colEdit = detectColumnEdit(text, ctx.table);
  if (colEdit) out.push(colEdit);
  const seen = new Set(out.map((e) => e.summary));
  for (const m of MATCHERS) {
    if (m.re.test(text) && !seen.has(m.edit.summary)) {
      seen.add(m.edit.summary);
      out.push(m.edit);
    }
  }
  return sortByLayer(out);
}

// ── LLM op vocabulary → apply (the shape the /api/llm-classify endpoint returns) ──
interface LlmChange { layer: Layer; summary: string; op: string; params?: Record<string, unknown> }
function mapLlmChange(ch: LlmChange): LayerEdit | null {
  const p = ch.params ?? {};
  const s = (k: string) => String(p[k] ?? '');
  const ops: Record<string, (t: SmartTableConfig, a: ApprovalConfig) => { t: SmartTableConfig; a: ApprovalConfig }> = {
    relabelColumn: (t, a) => ({ t: relabelColumn(t, s('key'), s('newLabel')), a }),
    redefineColumn: (t, a) => ({ t: redefineColumn(t, s('key'), s('newLabel')), a }),
    setDataSource: (t, a) => ({ t: setDataSource(t, s('kind') as SourceBindingKind), a }),
    setProvisioning: (t, a) => ({ t: { ...t, dataConfig: { ...t.dataConfig, rowsBinding: { ...t.dataConfig.rowsBinding, provisioning: s('provisioning') as Provisioning } } }, a }),
    setSort: (t, a) => ({ t: { ...t, businessLogic: { ...t.businessLogic, defaultSort: p.column ? { column: s('column'), direction: (s('direction') || 'desc') as 'asc' | 'desc' } : undefined } }, a }),
    setPageSize: (t, a) => ({ t: { ...t, businessLogic: { ...t.businessLogic, pageSize: Number(p.n) || t.businessLogic.pageSize } }, a }),
    setDecisionMode: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, decisionMode: (s('mode') as 'verdict' | 'selection' | 'per-item') || a.businessLogic.decisionMode, selection: s('mode') === 'selection' ? { minSelections: Number(p.min) || 3, maxSelections: Number(p.max) || 5 } : a.businessLogic.selection } } }),
    setReviewPolicy: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, reviewPolicy: s('mode') === 'quorum' ? { mode: 'quorum', quorum: Number(p.quorum) || 2 } : { mode: 'single' } } } }),
    requireCommentOnReject: (t, a) => ({ t, a: { ...a, businessLogic: { ...a.businessLogic, requireCommentOnReject: p.value !== false } } }),
    hideColumn: (t, a) => ({ t: { ...t, accessControl: { ...t.accessControl, hiddenColumns: [...new Set([...(t.accessControl.hiddenColumns ?? []), s('key')])] } }, a }),
    showColumn: (t, a) => ({ t: { ...t, accessControl: { ...t.accessControl, hiddenColumns: (t.accessControl.hiddenColumns ?? []).filter((k) => k !== s('key')) } }, a }),
    setSearchable: (t, a) => ({ t: { ...t, actionsConfig: { ...t.actionsConfig, searchable: p.value !== false } }, a }),
    setRowAction: (t, a) => ({ t: { ...t, actionsConfig: { ...t.actionsConfig, rowActions: p.value === false ? [] : [{ id: 'view-resume', label: s('label') || 'View resume' }] } }, a }),
    setCompact: (t, a) => ({ t: { ...t, presentationConfig: { ...t.presentationConfig, compact: p.value !== false } }, a }),
    setStriped: (t, a) => ({ t: { ...t, presentationConfig: { ...t.presentationConfig, striped: p.value !== false } }, a }),
  };
  const fn = ops[ch.op];
  return fn ? { layer: ch.layer, summary: ch.summary, apply: fn } : null;
}

/** Try the real LLM; fall back to the deterministic mock so chat always responds. */
export async function getProposal(text: string, ctx: Ctx): Promise<Proposal> {
  try {
    const res = await fetch('/api/llm-classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request: text, columns: ctx.table.dataConfig.columns.map((c) => ({ key: c.key, label: c.label, isTotal: c.isTotal })) }),
    });
    if (res.ok) {
      const data = (await res.json()) as { changes?: LlmChange[]; note?: string };
      const changes = (data.changes ?? []).map(mapLlmChange).filter((e): e is LayerEdit => !!e);
      return { changes: sortByLayer(changes), source: 'llm', note: changes.length ? undefined : data.note };
    }
  } catch {
    /* endpoint absent / no key → fall through to mock */
  }
  return { changes: mockPropose(text, ctx), source: 'mock' };
}
