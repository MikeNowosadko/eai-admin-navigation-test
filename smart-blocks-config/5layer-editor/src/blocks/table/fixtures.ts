import type { TableColumn, TableConfig, TableRow } from './types'

// The rubric defines the columns (step 1). The resumes fill the rows (step 2).

export const RUBRIC_FILE = { name: 'interview-rubric.xlsx' }

// Columns derived from the uploaded rubric.
export const RUBRIC_COLUMNS: TableColumn[] = [
  { key: 'technical', label: 'Technical', type: 'score' },
  { key: 'communication', label: 'Communication', type: 'score' },
  { key: 'culture', label: 'Culture fit', type: 'score' },
  { key: 'experience', label: 'Experience', type: 'score' },
  { key: 'total', label: 'Total', type: 'total' },
]

export const RESUME_COUNT = 24

// Candidate rows produced by extracting + scoring the resumes against the rubric.
export const CANDIDATE_ROWS: TableRow[] = [
  { id: 'c-mara', label: 'Mara Ortiz', initials: 'MO', cells: { technical: 9.2, communication: 8.8, culture: 9.0, experience: 8.2, total: 8.9 } },
  { id: 'c-devin', label: 'Devin Park', initials: 'DP', cells: { technical: 8.6, communication: 9.0, culture: 8.4, experience: 9.2, total: 8.8 } },
  { id: 'c-aria', label: 'Aria Chen', initials: 'AC', cells: { technical: 8.9, communication: 8.1, culture: 8.6, experience: 8.4, total: 8.4 } },
  { id: 'c-rafael', label: 'Rafael Silva', initials: 'RS', cells: { technical: 7.8, communication: 8.6, culture: 8.0, experience: 9.0, total: 8.4 } },
  { id: 'c-priya', label: 'Priya Nair', initials: 'PN', cells: { technical: 8.3, communication: 8.0, culture: 8.7, experience: 7.9, total: 8.2 } },
  { id: 'c-tom', label: 'Tom Becker', initials: 'TB', cells: { technical: 7.9, communication: 7.6, culture: 8.1, experience: 8.3, total: 7.9 } },
]

// The published-app chrome for the job-evaluation workflow (Rubric → Evaluation → Review).
export const CANDIDATE_SCREENING_FRAME = {
  appInitial: 'A',
  appName: 'Adaptovate',
  title: 'Candidate screening',
  tabs: ['Rubric', 'Evaluation', 'Review'],
  assistant: [
    { role: 'them' as const, text: 'Ask me anything about these 24 candidates and how they scored.' },
    { role: 'me' as const, text: "Who's strongest on communication?" },
    { role: 'them' as const, text: 'Devin Park (9.0), then Mara Ortiz (8.8). Want me to re-rank by communication?' },
    { role: 'me' as const, text: 'Why is Mara #1?' },
    { role: 'them' as const, text: 'She leads on the total (8.9) — top scores on Technical (9.2) and Culture fit (9.2).' },
  ],
}

// Other workflows whose OUTPUT can be bound as this table's input.
// Each workflow entry becomes a table row.
export interface WorkflowRef {
  id: string
  name: string
  outputSummary: string
  entryCount: number
  via: 'form' | 'documents' | 'table'
}

export const OTHER_WORKFLOWS: WorkflowRef[] = [
  { id: 'wf-receive-apps', name: 'Receive applications', outputSummary: 'Application entries', entryCount: 24, via: 'form' },
  { id: 'wf-referrals', name: 'Referral intake', outputSummary: 'Referred candidates', entryCount: 8, via: 'form' },
  { id: 'wf-talent-pool', name: 'Talent pool sync', outputSummary: 'Candidate records', entryCount: 142, via: 'table' },
  { id: 'wf-rubric-lib', name: 'Competency rubric library', outputSummary: 'Design competency rubric', entryCount: 6, via: 'documents' },
]

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  columnsSource: { kind: 'document-upload', label: 'Upload a rubric' },
  rowsSource: { kind: 'document-upload', label: 'Resumes (extracted)' },
  extract: true,
  scoreAgainstColumns: true,
}
