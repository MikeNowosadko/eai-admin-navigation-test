// Approval smart block — types (from approval-block-spec.md §2).
// These are the shapes we'd lift into @enterpriseaigroup/smart-blocks.

// ---- Subject: WHAT is being approved ----
export type ApprovalSubject =
  | { kind: 'step-output'; stepId: string }
  | { kind: 'data-source'; ref: { objectType: string; query?: Record<string, unknown> } }
  | { kind: 'block-output'; blockInstanceId: string }
  | { kind: 'fields'; fieldIds: string[] }
  | { kind: 'document'; documentRef: string }

export interface ApprovalSubjectItem {
  id: string
  label: string
  fields: Record<string, unknown>
}

export interface ResolvedSubject {
  summary: string // "3 shortlisted candidates"
  items: ApprovalSubjectItem[]
  columns: { key: string; label: string }[]
}

// ---- Mode: HOW they decide ----
export type Outcome = 'approve' | 'reject' | 'request-changes' | 'conditional-approve'

export type ApprovalMode =
  | { type: 'verdict'; outcomes: Outcome[] }
  | { type: 'selection'; min?: number; max?: number }
  | { type: 'per-item'; outcomes: Outcome[] }

// ---- Reviewers: WHO approves ----
export interface PersonRef {
  id?: string
  name: string
  email?: string
  initials?: string
}

export type Binding<T> =
  | { mode: 'fixed'; value: T }
  | { mode: 'open' }
  | { mode: 'constrained'; role: string } // assignee only: must hold this role

export interface ReviewerSlot {
  id: string
  role: Binding<string>
  assignee: Binding<PersonRef>
}

export type ReviewerPreset = 'lock-role' | 'lock-person' | 'chooser-picks'

export interface ApprovalReviewerConfig {
  slots: ReviewerSlot[]
  allowAddApprovers: boolean
  quorum?: 'all' | 'any' | number
}

// ---- The persisted decision record (State 2 table row) ----
export type ReviewerStatus =
  | 'unassigned'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes-requested'
  | 'declined'

export interface ReviewerDecision {
  slotId: string
  role: string
  reviewer?: PersonRef
  status: ReviewerStatus
  outcome?: Outcome
  selectedItemIds?: string[]
  comment?: string
  signedAt?: string
  dueAt?: string
  signature?: string
}

// ---- Block config (the props) ----
export interface ApprovalConfig {
  subject: ApprovalSubject
  mode: ApprovalMode
  reviewers: ApprovalReviewerConfig
  message?: { enabled: boolean; default?: string }
  requireComment?: boolean
  requireSignature?: boolean
  dueInDays?: number
  resubmitPolicy?: 'lock' | 'allow' | 'allow-once'
}

// ---- Runtime state ----
export type ApprovalStatus =
  | 'draft'
  | 'requested'
  | 'in-review'
  | 'approved'
  | 'rejected'
  | 'changes-requested'

export interface ApprovalOutput {
  verdict?: Outcome
  approvedItemIds?: string[]
  itemOutcomes?: Record<string, Outcome>
  decidedBy: PersonRef[]
  decidedAt: string
}

export interface ApprovalState {
  status: ApprovalStatus
  message?: string
  decisions: ReviewerDecision[]
  output?: ApprovalOutput
}
