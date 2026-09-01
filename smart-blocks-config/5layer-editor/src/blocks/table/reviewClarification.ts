import type { ApprovalConfig, ReviewerSlot } from '../approval/types'

// The workflow's review step reuses the Approval block's canonical questions
// (approvalClarification.approvalQuestions / answersToConfig). This file only
// provides the review-specific base config + a role label helper.

function lockRole(role: string): ReviewerSlot {
  return { id: 'wf-assessor', role: { mode: 'fixed', value: role }, assignee: { mode: 'constrained', role } }
}

export function baseReviewConfig(): ApprovalConfig {
  return {
    subject: { kind: 'block-output', blockInstanceId: 'table' },
    mode: { type: 'verdict', outcomes: ['approve', 'reject'] },
    reviewers: { allowAddApprovers: false, slots: [lockRole('Assessor')] },
    requireComment: false,
    requireSignature: false,
  }
}

export function reviewRoleLabel(c: ApprovalConfig): string {
  const s = c.reviewers.slots[0]
  if (!s) return 'Approver'
  if (s.role.mode === 'fixed') return s.role.value
  if (s.assignee.mode === 'constrained') return s.assignee.role
  return 'Chosen by the user'
}
