import type { SourceBinding } from '../table/types'

// The Composer block — a smart block whose OUTPUT is generated text.
// (Approval outputs a decision, Table outputs rows, Composer outputs text.)

export type OutputKind = 'email' | 'summary' | 'product-description'
export type Tone = 'professional' | 'friendly' | 'urgent' | 'playful'
export type Length = 'short' | 'medium' | 'long'

export interface ComposerConfig {
  outputKind: OutputKind
  tone: Tone
  length: Length
  variants: boolean // offer subject-line A/B variants
  assetsSource: SourceBinding // where the raw material comes from
}

export interface EmailBrief {
  goal: string
  audience: string
  message: string
  ctaLabel: string
}

export interface EmailDraft {
  id: string
  subjectVariants: string[]
  preview: string
  body: string[]
  cta: string
}
