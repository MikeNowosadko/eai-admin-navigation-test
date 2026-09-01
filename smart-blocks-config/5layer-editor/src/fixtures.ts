import type {
  ApprovalConfig,
  PersonRef,
  ResolvedSubject,
  ReviewerDecision,
} from './blocks/approval/types'

// In-memory only. No backend. This is the fake "step 3 output" and member directory.

export interface Scenario {
  key: 'interview' | 'leave'
  appName: string
  appInitial: string
  urlPath: string
  title: string
  tabs: string[] // stage tabs; last is the active Approvals one
  assistant: { role: 'them' | 'me'; text: string }[]
  subject: ResolvedSubject
  config: ApprovalConfig
  initialDecisions: ReviewerDecision[]
  // which reviewer the "reviewer" role plays as (their slotId)
  reviewerAs: string
}

export const MEMBERS: (PersonRef & { role: string })[] = [
  { id: 'u-gareth', name: 'Gareth Chainey', initials: 'GC', email: 'gareth@adaptovate.com', role: 'Assessor' },
  { id: 'u-maria', name: 'Maria Rodriguez', initials: 'MR', email: 'maria@adaptovate.com', role: 'Peer Reviewer' },
  { id: 'u-devin', name: 'Devin Park', initials: 'DP', email: 'devin@adaptovate.com', role: 'Senior Product Designer' },
  { id: 'u-alex', name: 'Alex Chen', initials: 'AC', email: 'alex@adaptovate.com', role: 'Hiring Manager' },
  { id: 'u-sam', name: 'Sam Okafor', initials: 'SO', email: 'sam@adaptovate.com', role: 'Senior Product Designer' },
]

export const ROLES = [
  'Assessor',
  'Peer Reviewer',
  'Sign-off',
  'Senior Product Designer',
  'Hiring Manager',
]

const interviewSubject: ResolvedSubject = {
  summary: '3 shortlisted candidates',
  columns: [
    { key: 'name', label: 'Candidate' },
    { key: 'role', label: 'Applied for' },
    { key: 'technical', label: 'Technical' },
    { key: 'culture', label: 'Culture fit' },
    { key: 'total', label: 'Total' },
  ],
  items: [
    { id: 'c-mara', label: 'Mara Ortiz', fields: { name: 'Mara Ortiz', role: 'Product Designer', technical: '9.2', culture: '9.2', total: '8.9' } },
    { id: 'c-devin', label: 'Devin Park', fields: { name: 'Devin Park', role: 'Product Designer', technical: '8.7', culture: '8.4', total: '8.6' } },
    { id: 'c-alex', label: 'Alex Chen', fields: { name: 'Alex Chen', role: 'Product Designer', technical: '8.1', culture: '8.8', total: '8.3' } },
  ],
}

const leaveSubject: ResolvedSubject = {
  summary: 'Leave request — Jamie Fox',
  columns: [
    { key: 'field', label: 'Field' },
    { key: 'value', label: 'Value' },
  ],
  items: [
    { id: 'lr-1', label: 'Type', fields: { field: 'Leave type', value: 'Annual leave' } },
    { id: 'lr-2', label: 'From', fields: { field: 'From', value: '21 Jul 2026' } },
    { id: 'lr-3', label: 'To', fields: { field: 'To', value: '28 Jul 2026' } },
    { id: 'lr-4', label: 'Days', fields: { field: 'Working days', value: '6 days' } },
    { id: 'lr-5', label: 'Reason', fields: { field: 'Reason', value: 'Family holiday, booked flights' } },
  ],
}

export const SCENARIOS: Record<Scenario['key'], Scenario> = {
  // Walkthrough A — job interview, selection mode, role-locked Assessor + open structure.
  interview: {
    key: 'interview',
    appName: 'Adaptovate',
    appInitial: 'A',
    urlPath: '/candidate-screening',
    title: 'Candidate screening',
    tabs: ['Evaluation', 'Review', 'Approvals'],
    assistant: [
      { role: 'them', text: 'Ask me anything about these 24 candidates and how they scored.' },
      { role: 'me', text: "Who's strongest on communication?" },
      { role: 'them', text: 'Devin Park (9.0), then Mara Ortiz (8.8). Want me to re-rank by communication?' },
      { role: 'me', text: 'Why is Mara #1?' },
      { role: 'them', text: 'She leads on the total (8.9) — top scores on Technical (9.2) and Culture fit (9.2).' },
    ],
    subject: interviewSubject,
    reviewerAs: 'slot-assessor',
    config: {
      subject: { kind: 'step-output', stepId: 'step-3-shortlist' },
      mode: { type: 'selection', min: 1, max: 3 },
      message: { enabled: true, default: 'Hi Gareth — please sign off on these 3 for first-round interviews by Friday. Scores are against our agreed rubric.' },
      requireComment: false,
      requireSignature: false,
      dueInDays: 7,
      reviewers: {
        allowAddApprovers: true,
        quorum: 'all',
        slots: [
          { id: 'slot-assessor', role: { mode: 'fixed', value: 'Assessor' }, assignee: { mode: 'constrained', role: 'Assessor' } },
        ],
      },
    },
    initialDecisions: [
      { slotId: 'slot-assessor', role: 'Assessor', reviewer: MEMBERS[0], status: 'pending', dueAt: '13/07/26' },
    ],
  },

  // Walkthrough B — leave request, verdict mode, both-open reviewer.
  leave: {
    key: 'leave',
    appName: 'Northwind HR',
    appInitial: 'N',
    urlPath: '/leave-approval',
    title: 'Leave approval',
    tabs: ['Request', 'Details', 'Approval'],
    assistant: [
      { role: 'them', text: 'This request is 6 working days of annual leave. Jamie has 11 days remaining.' },
      { role: 'me', text: 'Any clashes in the team calendar?' },
      { role: 'them', text: 'No overlapping approved leave that week. One pending request from Sam (23–24 Jul).' },
    ],
    subject: leaveSubject,
    reviewerAs: 'slot-approver',
    config: {
      subject: { kind: 'fields', fieldIds: ['leave'] },
      mode: { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] },
      message: { enabled: true, default: 'Please review my leave request for the last week of July.' },
      requireComment: true,
      requireSignature: false,
      dueInDays: 3,
      reviewers: {
        allowAddApprovers: false,
        quorum: 'any',
        slots: [
          { id: 'slot-approver', role: { mode: 'open' }, assignee: { mode: 'open' } },
        ],
      },
    },
    initialDecisions: [
      { slotId: 'slot-approver', role: 'Approver', status: 'unassigned' },
    ],
  },
}
