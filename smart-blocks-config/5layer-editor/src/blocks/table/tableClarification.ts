import type { ClarAnswer, ClarQuestion } from '../approval/ClarificationCard'
import type { SourceBinding, TableConfig } from './types'
import type { WorkflowRef } from './fixtures'
import type { DataSource, WorkflowCopy } from './workflows'

export const WORKFLOW_OPTION = 'Another workflow'
export const DATA_SOURCE_OPTION = 'A data source'

// The Table block's clarifying questions ARE its source bindings — set via chat.
// Questions are built from the active workflow's copy so wording stays on-domain.

export function columnsQuestions(copy: WorkflowCopy): ClarQuestion[] {
  const singular = copy.itemNoun.replace(/s$/, '')
  return [
    {
      id: 'columns',
      prompt: 'Where do the table’s columns come from?',
      helpText: `This defines what a good ${singular} is.`,
      slot: 'single',
      options: [copy.rubricUploadOption, 'A previous step', WORKFLOW_OPTION, DATA_SOURCE_OPTION],
    },
  ]
}

export function rowsQuestions(copy: WorkflowCopy): ClarQuestion[] {
  return [
    {
      id: 'rows',
      prompt: `Where do the ${copy.itemNoun} come from?`,
      helpText: 'Each entry becomes a row.',
      slot: 'single',
      options: [`User upload (${copy.uploadNoun})`, 'A previous step', WORKFLOW_OPTION, DATA_SOURCE_OPTION],
    },
    { id: 'score', prompt: 'Score each row against the rubric?', slot: 'single', options: ['Yes — score against the rubric', 'No — just collect the values'] },
  ]
}

function mapBinding(v: string, workflow?: WorkflowRef, source?: DataSource): SourceBinding {
  if (v === WORKFLOW_OPTION || /workflow/i.test(v)) {
    return { kind: 'previous-workflow', label: workflow ? `Workflow: ${workflow.name}` : 'Another workflow', ref: workflow?.id }
  }
  if (v === DATA_SOURCE_OPTION || /data source/i.test(v)) {
    return { kind: 'data-source', label: source ? `Data source: ${source.name}` : 'A data source', ref: source?.id }
  }
  if (/rubric|resume|upload|criteria|document/i.test(v)) return { kind: 'document-upload', label: v }
  if (/previous step/i.test(v)) return { kind: 'previous-step-output', label: v }
  return { kind: 'document-upload', label: v }
}

export function answersToTableConfig(
  base: TableConfig,
  answers: ClarAnswer[],
  picked: Record<string, WorkflowRef | undefined> = {},
  pickedSource: Record<string, DataSource | undefined> = {},
): TableConfig {
  const c = structuredClone(base)
  const first = (id: string) => answers.find((a) => a.questionId === id)?.values[0]
  const col = first('columns')
  if (col) c.columnsSource = mapBinding(col, picked.columns, pickedSource.columns)
  const row = first('rows')
  if (row) {
    c.rowsSource = mapBinding(row, picked.rows, pickedSource.rows)
    c.extract = /resume|extract|document|upload/i.test(row)
  }
  const score = first('score')
  if (score) c.scoreAgainstColumns = /^yes/i.test(score)
  return c
}
