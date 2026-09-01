// Five-layer Smart Block config — structural copies of the REAL package contract at
// eai-tools/eai-packages → packages/foundation/smart-blocks. This is the "this code" the
// prototype UX now runs on: the Table + Approval blocks are driven by these five layers.

import { CANDIDATE_ROWS, RUBRIC_COLUMNS } from '../blocks/table/fixtures';

// ── Five-layer contract ──────────────────────────────────────────────
export interface SmartBlockLayerConfig<TP, TD, TB, TAc, TAct> {
  presentationConfig: TP;
  dataConfig: TD;
  businessLogic: TB;
  accessControl: TAc;
  actionsConfig: TAct;
}

export type SourceBindingKind =
  | 'workflow-field'
  | 'block-output'
  | 'step-output'
  | 'workflow-output'
  | 'object-type'
  | 'literal';
export type Provisioning = 'author-fixed' | 'runtime';
export interface SourceBinding {
  kind: SourceBindingKind;
  label: string;
  provisioning?: Provisioning;
}

export interface SmartTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  isTotal?: boolean;
}
export interface SmartTablePresentationConfig {
  title?: string;
  description?: string;
  emptyMessage?: string;
  compact?: boolean;
  striped?: boolean;
}
export interface SmartTableDataConfig {
  rowsBinding: SourceBinding;
  columns: SmartTableColumn[];
  rowIdField: string;
}
export interface SmartTableBusinessLogicConfig {
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  pageSize?: number;
}
export interface SmartTableAccessControlConfig {
  hiddenColumns?: string[];
  allowRowSelection?: boolean;
}
export interface SmartTableActionsConfig {
  searchable?: boolean;
  searchPlaceholder?: string;
  rowActions?: Array<{ id: string; label: string }>;
}
export type SmartTableConfig = SmartBlockLayerConfig<
  SmartTablePresentationConfig,
  SmartTableDataConfig,
  SmartTableBusinessLogicConfig,
  SmartTableAccessControlConfig,
  SmartTableActionsConfig
>;

export type ApprovalDecisionMode = 'verdict' | 'selection' | 'per-item';
export interface ApprovalBusinessLogicConfig {
  decisionMode: ApprovalDecisionMode;
  selection?: { minSelections: number; maxSelections?: number };
  reviewPolicy: { mode: 'single' | 'quorum'; quorum?: number };
  requireCommentOnReject?: boolean;
}
export type ApprovalConfig = SmartBlockLayerConfig<
  { title?: string; approveLabel?: string; rejectLabel?: string },
  { subjectBinding: SourceBinding },
  ApprovalBusinessLogicConfig,
  { allowedReviewerRoles?: string[] },
  { requireConfirmation?: boolean }
>;

// ── Row data + the app-side adapter (block stays pure; app resolves rows) ────
export interface FLRow {
  id: string;
  name: string;
  initials: string;
  cells: Record<string, number>;
}

const EXTRA_NAMES = [
  'Jonah Feld', 'Lena Kovac', 'Sam Whitfield', 'Nadia Rahman', 'Tomas Berg', 'Iris Yeung',
  'Marcus Bell', 'Sofia Marin', 'Elias Novak', 'Grace Okoro', 'Leo Fischer', 'Hana Sato',
  'Owen Pryce', 'Zoe Adler', 'Ravi Menon', 'Clara Dubois', 'Noah Reid', 'Amara Diallo',
];
function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
function det(i: number, salt: number) {
  const v = Math.abs(Math.sin((i + 1) * (salt + 3) * 12.9898) * 43758.5453);
  const f = v - Math.floor(v);
  return Math.round((6.5 + f * 3) * 10) / 10;
}
const BASE: FLRow[] = CANDIDATE_ROWS.map((r) => ({
  id: r.id,
  name: r.label,
  initials: r.initials,
  cells: { ...(r.cells as Record<string, number>) },
}));
const GENERATED: FLRow[] = EXTRA_NAMES.map((name, i) => {
  const technical = det(i, 1), communication = det(i, 2), culture = det(i, 3), experience = det(i, 4);
  const total = Math.round(((technical + communication + culture + experience) / 4) * 10) / 10;
  return { id: `g${i}`, name, initials: initials(name), cells: { technical, communication, culture, experience, total } };
});
const POOL: FLRow[] = [...BASE, ...GENERATED]; // 24

export function describeRowsSource(kind: SourceBindingKind): { label: string; count: number } {
  if (kind === 'block-output') return { label: 'Upstream workflow · "Receive applications"', count: POOL.length };
  if (kind === 'object-type') return { label: 'Data source · "Talent pool" (SharePoint)', count: 12 };
  return { label: 'Runtime upload · resumes (this run)', count: 6 };
}
export function resolveRows(binding: SourceBinding): FLRow[] {
  if (binding.kind === 'block-output') return POOL;
  if (binding.kind === 'object-type') return POOL.slice(0, 12);
  return POOL.slice(0, 6);
}

// ── Default candidate-screening five-layer config ────────────────────
export const DEFAULT_TABLE_CONFIG: SmartTableConfig = {
  presentationConfig: {
    title: 'Candidate screening',
    description: "Resumes scored against the rubric's criteria.",
    emptyMessage: 'No resumes uploaded yet — drop them above.',
    compact: false,
    striped: true,
  },
  dataConfig: {
    rowsBinding: { kind: 'workflow-field', label: 'Runtime upload · resumes (this run)', provisioning: 'runtime' },
    columns: RUBRIC_COLUMNS.map((c) => ({ key: c.key, label: c.label, align: 'right', isTotal: c.type === 'total' })),
    rowIdField: 'id',
  },
  businessLogic: { defaultSort: { column: 'total', direction: 'desc' }, pageSize: 8 },
  accessControl: { hiddenColumns: [], allowRowSelection: true },
  actionsConfig: { searchable: false, searchPlaceholder: 'Search candidates…', rowActions: [] },
};

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  presentationConfig: { title: 'Review', approveLabel: 'Approve', rejectLabel: 'Reject' },
  dataConfig: { subjectBinding: { kind: 'block-output', label: 'Shortlist from the Table block' } },
  businessLogic: {
    decisionMode: 'selection',
    selection: { minSelections: 3, maxSelections: 5 },
    reviewPolicy: { mode: 'single' },
    requireCommentOnReject: false,
  },
  accessControl: { allowedReviewerRoles: ['hiring-manager'] },
  actionsConfig: { requireConfirmation: false },
};

// Deterministic score for a (candidate, criterion) pair — lets a REDEFINED column
// (a new criterion key) get fresh, stable values without any backend. A pure relabel
// keeps the same key, so its values (and the Total) never move.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
export function scoreForKey(rowId: string, key: string): number {
  return Math.round((6.5 + hashStr(`${rowId}|${key}`) * 3) * 10) / 10;
}
export const slug = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field';

// ── Column edit helpers — the data-model side of the relabel-vs-redefine rule ──
/** Presentation: change the header text only; key + values unchanged. */
export function relabelColumn(cfg: SmartTableConfig, key: string, newLabel: string): SmartTableConfig {
  return { ...cfg, dataConfig: { ...cfg.dataConfig, columns: cfg.dataConfig.columns.map((c) => (c.key === key ? { ...c, label: newLabel } : c)) } };
}
/** Data: change what the column MEANS (new key) → values re-derive + Total recomputes. */
export function redefineColumn(cfg: SmartTableConfig, key: string, newLabel: string): SmartTableConfig {
  const newKey = slug(newLabel);
  return { ...cfg, dataConfig: { ...cfg.dataConfig, columns: cfg.dataConfig.columns.map((c) => (c.key === key ? { ...c, key: newKey, label: newLabel } : c)) } };
}

/** Apply the five layers to the base data → what the table should render.
 *  Cells are computed over the CURRENT columns, so redefined columns get fresh
 *  values and the Total column always reflects the live set of criteria. */
export function deriveView(cfg: SmartTableConfig, query: string) {
  const cols = cfg.dataConfig.columns;
  const scoreCols = cols.filter((c) => !c.isTotal);
  const totalCol = cols.find((c) => c.isTotal);

  let rows = resolveRows(cfg.dataConfig.rowsBinding).map((r) => {
    const cells: Record<string, number> = {};
    let sum = 0;
    for (const c of scoreCols) {
      const v = r.cells[c.key] !== undefined ? r.cells[c.key] : scoreForKey(r.id, c.key);
      cells[c.key] = v;
      sum += v;
    }
    if (totalCol) cells[totalCol.key] = scoreCols.length ? Math.round((sum / scoreCols.length) * 10) / 10 : 0;
    return { ...r, cells };
  });

  const sort = cfg.businessLogic.defaultSort;
  if (sort) rows.sort((a, b) => ((b.cells[sort.column] ?? 0) - (a.cells[sort.column] ?? 0)) * (sort.direction === 'desc' ? 1 : -1));
  if (cfg.actionsConfig.searchable && query.trim()) {
    const q = query.trim().toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q));
  }

  const hidden = new Set(cfg.accessControl.hiddenColumns ?? []);
  const columns = cols.filter((c) => !hidden.has(c.key));
  const total = describeRowsSource(cfg.dataConfig.rowsBinding.kind).count;
  rows = rows.slice(0, cfg.businessLogic.pageSize ?? rows.length);
  return { columns, rows, total };
}

/** Set the rows data source (kind) with sensible provisioning + label. */
export function setDataSource(cfg: SmartTableConfig, kind: SourceBindingKind): SmartTableConfig {
  return { ...cfg, dataConfig: { ...cfg.dataConfig, rowsBinding: { kind, label: describeRowsSource(kind).label, provisioning: kind === 'workflow-field' ? 'runtime' : 'author-fixed' } } };
}
