import type { ClarAnswer, ClarQuestion } from '../approval/ClarificationCard'
import type { FileRef, Provisioning, SourceBinding } from '../table/types'
import type { WorkflowRef } from '../table/fixtures'
import type { DataSource } from '../table/workflows'
import { DATA_SOURCE_FOLDERS } from '../table/workflows'
import { WORKFLOW_OPTION, DATA_SOURCE_OPTION } from '../table/tableClarification'
import type { ComposerConfig, Length, OutputKind, Tone } from './types'

export const ASSETS_QUESTIONS: ClarQuestion[] = [
  {
    id: 'assets',
    prompt: 'Where do the assets come from?',
    helpText: 'Brand guidelines, product details, past emails — the raw material for the copy.',
    slot: 'single',
    options: ['User upload', 'A previous step', WORKFLOW_OPTION, DATA_SOURCE_OPTION],
  },
]

export const COMPOSE_QUESTIONS: ClarQuestion[] = [
  { id: 'kind', prompt: 'What should we generate?', slot: 'single', options: ['A marketing email', 'A summary', 'A product description'] },
  { id: 'tone', prompt: 'What tone?', slot: 'single', options: ['Friendly', 'Professional', 'Urgent', 'Playful'] },
  { id: 'variants', prompt: 'Offer subject-line variants to pick from?', slot: 'single', options: ['Yes — give me A/B options', 'No — one subject line'] },
]

export interface AssetsProvisioning {
  workflow?: WorkflowRef
  connector?: DataSource
  uploadMode: Provisioning
  uploadFiles: FileRef[]
  scopeFolderId: string
  scopeFileIds: string[]
  scopeLive: boolean
}

export function applyAssetsAnswer(base: ComposerConfig, answers: ClarAnswer[], p: AssetsProvisioning): ComposerConfig {
  const v = answers.find((a) => a.questionId === 'assets')?.values[0]
  if (!v) return base
  let assetsSource: SourceBinding = base.assetsSource

  if (v === 'User upload' || /user upload/i.test(v)) {
    if (p.uploadMode === 'author-fixed') {
      assetsSource = {
        kind: 'document-upload',
        provisioning: 'author-fixed',
        files: p.uploadFiles,
        label: p.uploadFiles.length ? `${p.uploadFiles.length} pinned files` : 'Pinned assets',
      }
    } else {
      assetsSource = { kind: 'document-upload', provisioning: 'runtime', label: 'Upload assets (per run)' }
    }
  } else if (v === DATA_SOURCE_OPTION || /data source/i.test(v)) {
    const folder = DATA_SOURCE_FOLDERS.find((f) => f.id === p.scopeFolderId) ?? DATA_SOURCE_FOLDERS[0]
    const allSelected = p.scopeFileIds.length === folder.files.length
    const files = allSelected ? ('all' as const) : folder.files.filter((f) => p.scopeFileIds.includes(f.id))
    const name = p.connector?.name ?? 'Data source'
    assetsSource = {
      kind: 'data-source',
      provisioning: 'author-fixed',
      label: `${name} › ${folder.path}`,
      scope: { connector: p.connector?.id ?? 'sharepoint', connectorName: name, container: folder.path, files, live: p.scopeLive },
    }
  } else if (v === WORKFLOW_OPTION || /workflow/i.test(v)) {
    assetsSource = { kind: 'previous-workflow', provisioning: 'author-fixed', label: p.workflow ? `Workflow: ${p.workflow.name}` : 'Another workflow', ref: p.workflow?.id }
  } else if (/previous step/i.test(v)) {
    assetsSource = { kind: 'previous-step-output', provisioning: 'author-fixed', label: 'A previous step' }
  }

  return { ...base, assetsSource }
}

export function applyComposeAnswers(base: ComposerConfig, answers: ClarAnswer[]): ComposerConfig {
  const c = { ...base }
  const first = (id: string) => answers.find((a) => a.questionId === id)?.values[0]
  const kind = first('kind')
  if (kind) c.outputKind = /summary/i.test(kind) ? 'summary' : /description/i.test(kind) ? 'product-description' : ('email' as OutputKind)
  const tone = first('tone')
  if (tone) c.tone = tone.toLowerCase() as Tone
  const variants = first('variants')
  if (variants) c.variants = /^yes/i.test(variants)
  c.length = c.length || ('medium' as Length)
  return c
}
