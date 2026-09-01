import type { TableColumn, TableRow } from './types'
import type { FrameInfo } from '../approval/PublishedFrame'
import type { WorkflowRef } from './fixtures'
import { RUBRIC_COLUMNS, CANDIDATE_ROWS, RESUME_COUNT, CANDIDATE_SCREENING_FRAME } from './fixtures'

// Common enterprise data sources / connectors a block can pull from.
export interface DataSource {
  id: string
  name: string
  detail: string
}
// Folders inside a connected data source, each with files (for scoping).
export interface DsFolder {
  id: string
  path: string
  files: { id: string; name: string }[]
}
export const DATA_SOURCE_FOLDERS: DsFolder[] = [
  {
    id: 'brand-guidelines',
    path: 'Brand / Guidelines',
    files: [
      { id: 'f1', name: 'brand-guidelines.md' },
      { id: 'f2', name: 'tone-of-voice.md' },
      { id: 'f3', name: 'messaging-pillars.md' },
      { id: 'f4', name: 'product-facts.md' },
      { id: 'f5', name: 'boilerplate.md' },
      { id: 'f6', name: 'legal-disclaimers.md' },
    ],
  },
  { id: 'campaigns', path: 'Marketing / Campaigns', files: [{ id: 'c1', name: 'past-campaigns.md' }, { id: 'c2', name: 'winning-subject-lines.md' }] },
  { id: 'products', path: 'Products / Aurora', files: [{ id: 'p1', name: 'aurora-spec.md' }, { id: 'p2', name: 'clinical-results.md' }] },
]

export const DATA_SOURCES: DataSource[] = [
  { id: 'sharepoint', name: 'SharePoint', detail: 'Microsoft 365 · document libraries & lists' },
  { id: 'gdrive', name: 'Google Drive', detail: 'Docs, Sheets & files' },
  { id: 'salesforce', name: 'Salesforce', detail: 'CRM records & objects' },
  { id: 'snowflake', name: 'Snowflake', detail: 'Data warehouse · SQL' },
  { id: 'airtable', name: 'Airtable', detail: 'Bases & tables' },
  { id: 'box', name: 'Box', detail: 'Enterprise file storage' },
  { id: 'hubspot', name: 'HubSpot', detail: 'CRM & contacts' },
  { id: 'sql', name: 'SQL database', detail: 'Postgres / MySQL / SQL Server' },
]

// A "workflow type" is the same step-based scenario (Table → Table → Approval) with
// different domain content. Proves the blocks are use-case agnostic.

export type WorkflowKey = 'candidates' | 'rfp'

export interface WorkflowCopy {
  step1Title: string
  step1Sub: string
  rubricLabel: string
  rubricUploadOption: string // "Upload a rubric" / "Upload the criteria"
  rubricDropTitle: string
  rubricDropSub: string
  step2Title: string
  step2Sub: string
  uploadTitle: string
  uploadSub: string
  uploadNoun: string // "resumes" / "RFP documents"
  itemColumn: string // "Candidate" / "Submission"
  itemNoun: string // "candidates" / "submissions"
  uploadedLabel: string // "24 resumes uploaded" / "18 submissions received"
  scoreCta: string // "Score candidates" / "Score submissions"
  sendCta: string // "Send for review" / "Send for decision"
}

export interface WorkflowType {
  key: WorkflowKey
  label: string
  blurb: string
  host: string
  urlPath: string
  frame: FrameInfo
  rubricFile: { name: string }
  columns: TableColumn[]
  rows: TableRow[]
  itemCount: number
  relatedWorkflows: WorkflowRef[] // other workflows whose output is relevant as input
  copy: WorkflowCopy
}

const CANDIDATES: WorkflowType = {
  key: 'candidates',
  label: 'Candidate screening',
  blurb: 'Evaluate job applications against a rubric, shortlist, and sign off.',
  host: 'adaptovate',
  urlPath: '/candidate-screening',
  frame: CANDIDATE_SCREENING_FRAME,
  rubricFile: { name: 'interview-rubric.xlsx' },
  columns: RUBRIC_COLUMNS,
  rows: CANDIDATE_ROWS,
  itemCount: RESUME_COUNT,
  relatedWorkflows: [
    { id: 'wf-receive-apps', name: 'Receive applications', outputSummary: 'application entries', entryCount: 24, via: 'form' },
    { id: 'wf-referrals', name: 'Referral intake', outputSummary: 'referred candidates', entryCount: 8, via: 'form' },
    { id: 'wf-talent-pool', name: 'Talent pool sync', outputSummary: 'candidate records', entryCount: 142, via: 'table' },
    { id: 'wf-rubric-lib', name: 'Competency rubric library', outputSummary: 'design competency rubric', entryCount: 6, via: 'documents' },
  ],
  copy: {
    step1Title: 'Build your evaluation table',
    step1Sub: "Upload the rubric we'll score every candidate against — we'll turn its criteria into your scoring table.",
    rubricLabel: 'Your rubric',
    rubricUploadOption: 'Upload a rubric',
    rubricDropTitle: 'Drag your rubric here, or browse',
    rubricDropSub: 'XLSX, CSV or PDF · one file',
    step2Title: 'Add your candidates',
    step2Sub: "Upload the resumes and we'll score each one into your table.",
    uploadTitle: 'Drag resumes here, or browse',
    uploadSub: 'PDF or DOCX · upload as many as you like',
    uploadNoun: 'resumes',
    itemColumn: 'Candidate',
    itemNoun: 'candidates',
    uploadedLabel: `${RESUME_COUNT} resumes uploaded`,
    scoreCta: 'Score candidates',
    sendCta: 'Send for review',
  },
}

const RFP_COLUMNS: TableColumn[] = [
  { key: 'technical', label: 'Technical fit', type: 'score' },
  { key: 'cost', label: 'Cost', type: 'score' },
  { key: 'delivery', label: 'Delivery', type: 'score' },
  { key: 'compliance', label: 'Compliance', type: 'score' },
  { key: 'total', label: 'Total', type: 'total' },
]

const RFP_ROWS: TableRow[] = [
  { id: 'v-apex', label: 'Apex Systems', initials: 'AS', cells: { technical: 9.1, cost: 7.8, delivery: 9.0, compliance: 9.0, total: 8.7 } },
  { id: 'v-northwind', label: 'Northwind Digital', initials: 'ND', cells: { technical: 8.4, cost: 9.2, delivery: 8.1, compliance: 8.5, total: 8.6 } },
  { id: 'v-bluesky', label: 'BlueSky Consulting', initials: 'BC', cells: { technical: 8.8, cost: 8.0, delivery: 9.0, compliance: 7.9, total: 8.4 } },
  { id: 'v-vertex', label: 'Vertex Solutions', initials: 'VS', cells: { technical: 7.6, cost: 8.9, delivery: 8.3, compliance: 8.7, total: 8.3 } },
  { id: 'v-orbit', label: 'Orbit Partners', initials: 'OP', cells: { technical: 8.2, cost: 7.5, delivery: 8.0, compliance: 8.4, total: 8.0 } },
  { id: 'v-cobalt', label: 'Cobalt Group', initials: 'CG', cells: { technical: 7.9, cost: 8.3, delivery: 7.7, compliance: 8.1, total: 8.0 } },
]

const RFP: WorkflowType = {
  key: 'rfp',
  label: 'RFP evaluation',
  blurb: 'Score vendor RFP submissions against your criteria, shortlist, and decide.',
  host: 'meridian',
  urlPath: '/rfp-evaluation',
  frame: {
    appInitial: 'M',
    appName: 'Meridian Procurement',
    title: 'RFP evaluation',
    tabs: ['Criteria', 'Evaluation', 'Decision'],
    assistant: [
      { role: 'them', text: 'Ask me anything about these 18 submissions and how they scored.' },
      { role: 'me', text: "Who's strongest on delivery?" },
      { role: 'them', text: 'Apex Systems (9.0), tied with BlueSky Consulting (9.0). Want me to re-rank by delivery?' },
      { role: 'me', text: 'Why is Apex #1?' },
      { role: 'them', text: 'It leads on the total (8.7) — top scores on Technical fit (9.1) and Compliance (9.0).' },
    ],
  },
  rubricFile: { name: 'rfp-scoring-criteria.xlsx' },
  columns: RFP_COLUMNS,
  rows: RFP_ROWS,
  itemCount: 18,
  relatedWorkflows: [
    { id: 'wf-receive-rfp', name: 'Receive RFP submissions', outputSummary: 'RFP submissions', entryCount: 18, via: 'form' },
    { id: 'wf-prequal', name: 'Vendor prequalification', outputSummary: 'qualified vendors', entryCount: 12, via: 'form' },
    { id: 'wf-tender-inbox', name: 'Tender inbox', outputSummary: 'tender responses', entryCount: 24, via: 'documents' },
    { id: 'wf-supplier-registry', name: 'Supplier registry', outputSummary: 'supplier records', entryCount: 86, via: 'table' },
  ],
  copy: {
    step1Title: 'Build your scoring table',
    step1Sub: "Upload the criteria we'll score every submission against — we'll turn it into your scoring table.",
    rubricLabel: 'Your scoring criteria',
    rubricUploadOption: 'Upload the criteria',
    rubricDropTitle: 'Drag your criteria here, or browse',
    rubricDropSub: 'XLSX, CSV or PDF · one file',
    step2Title: 'Add the RFP submissions',
    step2Sub: "Upload the submissions and we'll score each one into your table.",
    uploadTitle: 'Drag RFP documents here, or browse',
    uploadSub: 'PDF or DOCX · upload as many as you like',
    uploadNoun: 'RFP documents',
    itemColumn: 'Submission',
    itemNoun: 'submissions',
    uploadedLabel: '18 submissions received',
    scoreCta: 'Score submissions',
    sendCta: 'Send for decision',
  },
}

export const WORKFLOWS: Record<WorkflowKey, WorkflowType> = { candidates: CANDIDATES, rfp: RFP }
export const WORKFLOW_LIST: WorkflowType[] = [CANDIDATES, RFP]
export const getWorkflow = (key: WorkflowKey): WorkflowType => WORKFLOWS[key]
