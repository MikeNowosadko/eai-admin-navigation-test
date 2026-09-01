import type { ApprovalConfig, ApprovalMode, ReviewerSlot } from './types'
import type { ClarAnswer, ClarQuestion } from './ClarificationCard'

// The Approval block's configurable PROPS, expressed as clarifying questions.
// This is the SINGLE source of truth — every place that configures an approval
// (the standalone block, or a workflow's review step) walks this same list.
//
// Each question maps 1:1 to an ApprovalConfig prop:
//   decide   → mode           howmany → mode.min/max
//   who      → reviewers       evidence → requireComment / requireSignature

const APPROVAL_ROLES = ['Assessor', 'Hiring Manager', 'Senior Product Designer']

export function approvalQuestions({
  subjectSummary,
  collection,
  roles,
}: {
  subjectSummary: string
  collection: boolean
  roles?: string[] // domain-relevant sign-off roles; defaults to the generic set
}): ClarQuestion[] {
  // A single-item subject can only be a verdict; a collection can be picked / per-item.
  const decide: ClarQuestion = collection
    ? {
        id: 'decide',
        prompt: `What should the approver do with ${subjectSummary}?`,
        helpText: 'This sets how they make the decision.',
        slot: 'single',
        options: ['Pick which ones pass', 'Approve or reject the whole set', 'Decide on each one'],
      }
    : {
        id: 'decide',
        prompt: 'How should the approver respond?',
        helpText: 'This becomes the set of decisions they can make.',
        slot: 'single',
        options: ['Approve or reject', 'Approve, reject or request changes'],
      }

  const questions: ClarQuestion[] = [decide]
  if (collection) {
    questions.push({ id: 'howmany', prompt: 'How many can they pass?', slot: 'single', options: ['Up to 3', 'Exactly 3', 'No limit'] })
  }
  questions.push({
    id: 'who',
    prompt: 'Who should sign off?',
    helpText: 'Pick a role to lock it, or let the person running the app choose.',
    slot: 'single',
    options: [...(roles ?? APPROVAL_ROLES), 'Whoever the user picks'],
  })
  questions.push({ id: 'evidence', prompt: 'What must they provide with the decision?', slot: 'multi', options: ['A comment', 'A digital signature'] })
  return questions
}

function lockRole(id: string, role: string): ReviewerSlot {
  return { id, role: { mode: 'fixed', value: role }, assignee: { mode: 'constrained', role } }
}
function openSlot(id: string): ReviewerSlot {
  return { id, role: { mode: 'open' }, assignee: { mode: 'open' } }
}

export function answersToConfig(base: ApprovalConfig, answers: ClarAnswer[]): ApprovalConfig {
  const config: ApprovalConfig = structuredClone(base)
  const get = (id: string) => answers.find((a) => a.questionId === id)?.values ?? []
  const first = (id: string) => get(id)[0]
  const slotId = base.reviewers.slots[0]?.id ?? 'slot-1'

  // decide → mode
  const decide = first('decide')
  if (decide) {
    let mode: ApprovalMode = config.mode
    if (/pick which/i.test(decide)) mode = { type: 'selection', min: 1, max: 3 }
    else if (/each one/i.test(decide)) mode = { type: 'per-item', outcomes: ['approve', 'reject'] }
    else if (/request changes/i.test(decide)) mode = { type: 'verdict', outcomes: ['approve', 'reject', 'request-changes'] }
    else if (/whole set|approve or reject/i.test(decide)) mode = { type: 'verdict', outcomes: ['approve', 'reject'] }
    config.mode = mode
  }

  // howmany → min/max (only meaningful for selection)
  const howmany = first('howmany')
  if (howmany && config.mode.type === 'selection') {
    if (/up to 3/i.test(howmany)) config.mode = { type: 'selection', min: 1, max: 3 }
    else if (/exactly 3/i.test(howmany)) config.mode = { type: 'selection', min: 3, max: 3 }
    else if (/no limit/i.test(howmany)) config.mode = { type: 'selection', min: 1 }
  }

  // who → reviewer slot
  const who = first('who')
  if (who) {
    if (/whoever|user pick/i.test(who)) config.reviewers.slots = [openSlot(slotId)]
    else config.reviewers.slots = [lockRole(slotId, who)]
  }

  // evidence (multi) → requireComment / requireSignature
  const evidence = get('evidence')
  if (evidence.length) {
    config.requireComment = evidence.some((v) => /comment/i.test(v))
    config.requireSignature = evidence.some((v) => /signature/i.test(v))
  }

  return config
}

// Human summary of the decision mode (used in confirmed cards / previews).
export function modeSummary(mode: ApprovalMode): string {
  if (mode.type === 'selection') return `pick ${mode.min ?? 0}${mode.max ? `–${mode.max}` : '+'}`
  if (mode.type === 'per-item') return 'decide on each one'
  return mode.outcomes.map((o) => o.replace(/-/g, ' ')).join(' / ')
}
