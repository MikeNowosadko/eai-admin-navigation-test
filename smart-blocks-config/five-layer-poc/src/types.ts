// MIRROR: eai-tools/eai-packages → packages/foundation/smart-blocks/src/{types,table,approval}
// These are structural copies of the REAL five-layer contract so this POC exercises the
// same shapes the production block will use. (SourceBinding is normally imported from
// @enterpriseaigroup/generated-app-shared, which is not yet published — see Decision D3.)

/** Five-layer authoring contract — every smart block config splits into these five. */
export interface SmartBlockLayerConfig<TPresentation, TData, TBusinessLogic, TAccessControl, TActions> {
  presentationConfig: TPresentation;
  dataConfig: TData;
  businessLogic: TBusinessLogic;
  accessControl: TAccessControl;
  actionsConfig: TActions;
}

/** Where a value comes from (lineage). Kind vocabulary matches the package manifest. */
export type SourceBindingKind =
  | 'workflow-field'
  | 'block-output'
  | 'step-output'
  | 'workflow-output'
  | 'object-type'
  | 'literal';

/** POC-level provisioning axis layered on the binding (author-fixed vs runtime). */
export type Provisioning = 'author-fixed' | 'runtime';

export interface SourceBinding {
  kind: SourceBindingKind;
  label: string;
  provisioning?: Provisioning;
}

// ── Smart Table (smart.table) ────────────────────────────────────────────────
export interface SmartTableColumn {
  key: string;
  label: string;
  valueType: 'string' | 'number' | 'boolean' | 'date';
  align?: 'left' | 'center' | 'right';
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

// ── Approval (smart.approval) ────────────────────────────────────────────────
export type ApprovalDecisionMode = 'verdict' | 'selection' | 'per-item';
export interface ApprovalBusinessLogicConfig {
  decisionMode: ApprovalDecisionMode;
  selection?: { minSelections: number; maxSelections?: number };
  reviewPolicy: { mode: 'single' | 'quorum'; quorum?: number };
  requireCommentOnReject?: boolean;
}
export interface ApprovalAccessControlConfig {
  allowedReviewerRoles?: string[];
}
export interface ApprovalActionsConfig {
  requireConfirmation?: boolean;
}
export type ApprovalConfig = SmartBlockLayerConfig<
  { title?: string; approveLabel?: string; rejectLabel?: string },
  { subjectBinding: SourceBinding },
  ApprovalBusinessLogicConfig,
  ApprovalAccessControlConfig,
  ApprovalActionsConfig
>;

/** App-side row shape the adapter returns. */
export interface CandidateRow {
  id: string;
  name: string;
  initials: string;
  cells: Record<string, number>;
}

/** The adapter boundary — the APP resolves rows (the package block stays pure). */
export interface SmartTableAdapter {
  resolveRows(binding: SourceBinding): CandidateRow[];
}
