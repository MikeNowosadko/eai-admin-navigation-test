import type { FrameInfo } from '../approval/PublishedFrame'
import type { WorkflowRef } from '../table/fixtures'
import type { ComposerConfig, EmailBrief, EmailDraft } from './types'

// Files an author pins as the workflow's permanent assets.
export const AUTHOR_UPLOAD_FILES = [
  { id: 'u1', name: 'brand-guide.pdf' },
  { id: 'u2', name: 'tone-of-voice.docx' },
  { id: 'u3', name: 'product-photos.zip' },
]

// Workflows relevant as an asset source for a campaign email.
export const EMAIL_RELATED_WORKFLOWS: WorkflowRef[] = [
  { id: 'wf-catalogue', name: 'Product catalogue sync', outputSummary: 'product records', entryCount: 212, via: 'table' },
  { id: 'wf-brand-lib', name: 'Brand asset library', outputSummary: 'brand assets', entryCount: 48, via: 'documents' },
  { id: 'wf-past-campaigns', name: 'Past campaigns', outputSummary: 'sent emails', entryCount: 36, via: 'documents' },
]

export const EMAIL_FRAME: FrameInfo = {
  appInitial: 'L',
  appName: 'Lumina',
  title: 'Campaign email',
  tabs: ['Brief', 'Assets', 'Compose', 'Review'],
  assistant: [
    { role: 'them', text: "I can help sharpen this email — subject lines, tone, or length. Just ask." },
    { role: 'me', text: 'Which subject line will get the most opens?' },
    { role: 'them', text: '“14 days to visibly brighter skin” tends to win — it leads with a concrete result.' },
    { role: 'me', text: 'Make the body a touch shorter?' },
    { role: 'them', text: 'Done — trimmed to three tight paragraphs and kept the CTA prominent.' },
  ],
}

export const DEFAULT_BRIEF: EmailBrief = {
  goal: 'Announce a new product — Aurora Serum',
  audience: 'Existing customers on the newsletter',
  message: 'Vitamin-C serum for visibly brighter skin in 14 days. Launch offer: 20% off first order.',
  ctaLabel: 'Shop Aurora',
}

export const DEFAULT_COMPOSER_CONFIG: ComposerConfig = {
  outputKind: 'email',
  tone: 'friendly',
  length: 'medium',
  variants: true,
  assetsSource: { kind: 'document-upload', label: 'Upload assets' },
}

// Canned drafts the composer cycles through on "Regenerate".
export const EMAIL_DRAFTS: EmailDraft[] = [
  {
    id: 'd1',
    subjectVariants: ["Meet Aurora: your skin's new morning ritual", 'New: Aurora Serum is here ✨', 'Your glow, upgraded'],
    preview: "A vitamin-C serum built for visible radiance in 14 days — 20% off to celebrate.",
    body: [
      'Hi {first_name},',
      "Say hello to Aurora — our brightest breakthrough yet. One daily drop of stabilised vitamin C, formulated for a visibly brighter, more even complexion in just 14 days.",
      "We spent two years getting the formula right so you don't have to think twice. Lightweight, fast-absorbing, and layers beautifully under everything else in your routine.",
      "To celebrate launch, you get 20% off your first bottle — this week only.",
    ],
    cta: 'Shop Aurora',
  },
  {
    id: 'd2',
    subjectVariants: ['14 days to visibly brighter skin', "The serum everyone's about to talk about", 'Radiance, bottled.'],
    preview: 'Clinically-tested vitamin C for a visible glow — now 20% off.',
    body: [
      'Hi {first_name},',
      'Brighter skin in two weeks? That was the brief. Aurora Serum is the answer — a clinically-tested vitamin-C formula that targets dullness and uneven tone, day by day.',
      'In our trial, 9 in 10 saw a visible improvement in radiance by week two. No sting, no heaviness — just glow.',
      'Your launch gift: 20% off your first bottle. Offer ends Sunday.',
    ],
    cta: 'Get the glow',
  },
  {
    id: 'd3',
    subjectVariants: ['An exclusive first look at Aurora', 'Be the first to try Aurora Serum', 'Early access: Aurora is live'],
    preview: "You're on the list — here's your early access to Aurora.",
    body: [
      'Hi {first_name},',
      "Because you're one of our most loyal customers, you get Aurora first. Our new vitamin-C serum for visibly brighter skin is live — and it's yours before anyone else.",
      "It's the routine upgrade we've been quietly perfecting: a single daily drop for radiance you can see in 14 days.",
      'Enjoy 20% off as our thank-you. Early access ends when we open to everyone on Friday.',
    ],
    cta: 'Unlock early access',
  },
]
