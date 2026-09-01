// Table smart block — its columns come from one source, its rows from another.
// Exercises the INPUT side of the SourceBinding primitive.

export type SourceBindingKind =
  | 'previous-step-output'
  | 'previous-workflow'
  | 'data-source'
  | 'block-output'
  | 'document-upload'
  | 'fields'

export type Provisioning = 'author-fixed' | 'runtime'

export interface FileRef {
  id: string
  name: string
}

export interface DataSourceScope {
  connector: string // 'sharepoint'
  connectorName: string // 'SharePoint'
  container: string // folder path, e.g. 'Brand / Guidelines'
  files: FileRef[] | 'all'
  live: boolean // kept up to date
}

export interface SourceBinding {
  kind: SourceBindingKind
  label: string // human summary, e.g. "Upload a rubric" / "Resumes (extracted)"
  ref?: string
  // Who resolves this input, and when. Undefined = legacy (treated as runtime).
  provisioning?: Provisioning
  files?: FileRef[] // author-fixed upload: the pinned files
  scope?: DataSourceScope // data-source: connector + folder + files + live
}

export interface TableColumn {
  key: string
  label: string
  type: 'text' | 'score' | 'total'
}

export interface TableRow {
  id: string
  label: string
  initials: string
  cells: Record<string, string | number>
  selected?: boolean
}

export interface TableConfig {
  columnsSource: SourceBinding // step 1 — a rubric document → columns
  rowsSource: SourceBinding // step 2 — resume uploads → rows
  extract: boolean // rows filled via document extraction
  scoreAgainstColumns: boolean // score each row against the rubric criteria
}

export type TablePhase = 'empty' | 'columns' | 'scoring' | 'filled'

export interface TableState {
  phase: TablePhase
  columnsFile?: { name: string }
  columns: TableColumn[]
  rowsFileCount?: number
  rows: TableRow[]
}
