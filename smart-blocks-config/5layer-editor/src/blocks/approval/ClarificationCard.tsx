import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

// Ported from Admin-Portal's no-code builder clarification-card.tsx, decoupled so it can be
// reused as the approval-setup card. Steps through clarifying questions one at a time; the
// answers configure the block. The card controls the sequencing.

export interface ClarQuestion {
  id: string
  prompt: string
  helpText?: string
  slot: 'single' | 'multi' | 'text'
  options?: string[]
}
export interface ClarAnswer {
  questionId: string
  prompt: string
  values: string[]
}

interface QuestionState {
  other: string
  selected: string[]
}
const emptyState = (): QuestionState => ({ other: '', selected: [] })

function resolveValues(state: QuestionState): string[] {
  const values = [...state.selected]
  const other = state.other.trim()
  if (other) values.push(other)
  return values
}

export function ClarificationCard({
  intro,
  questions,
  disabled,
  onComplete,
  onSkip,
  renderExpansion,
}: {
  intro?: string
  questions: ClarQuestion[]
  disabled?: boolean
  onComplete: (answers: ClarAnswer[]) => void
  onSkip: () => void
  // Optional inline content shown under the options for the current question,
  // e.g. a workflow picker when "Another workflow" is selected.
  renderExpansion?: (questionId: string, selectedValue: string | undefined) => React.ReactNode
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [states, setStates] = useState<Record<string, QuestionState>>({})
  const total = questions.length
  const question = questions[stepIndex]
  const qState = states[question.id] ?? emptyState()
  const isLast = stepIndex === total - 1

  const answeredCount = useMemo(
    () => questions.filter((q) => resolveValues(states[q.id] ?? emptyState()).length > 0).length,
    [questions, states],
  )

  function update(next: Partial<QuestionState>) {
    setStates((cur) => ({ ...cur, [question.id]: { ...(cur[question.id] ?? emptyState()), ...next } }))
  }
  function toggleOption(option: string) {
    if (disabled) return
    if (question.slot === 'multi') {
      update({
        selected: qState.selected.includes(option)
          ? qState.selected.filter((v) => v !== option)
          : [...qState.selected, option],
      })
      return
    }
    update({ other: '', selected: [option] })
  }
  function setOther(value: string) {
    update({ other: value, selected: question.slot === 'single' ? [] : qState.selected })
  }
  function complete() {
    const answers = questions
      .map((q) => ({ questionId: q.id, prompt: q.prompt, values: resolveValues(states[q.id] ?? emptyState()) }))
      .filter((a) => a.values.length > 0)
    onComplete(answers)
  }
  function next() {
    if (isLast) {
      complete()
      return
    }
    setStepIndex((c) => Math.min(c + 1, total - 1))
  }

  return (
    <div className="clarify-card">
      {intro && stepIndex === 0 ? <p className="ccc-intro" style={{ margin: 0 }}>{intro}</p> : null}

      <div>
        <p className="clarify-prompt">{question.prompt}</p>
        {question.helpText ? <p className="clarify-help">{question.helpText}</p> : null}
      </div>

      {question.options && question.options.length > 0 ? (
        <div className="clarify-options">
          {question.options.map((option) => {
            const selected = qState.selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggleOption(option)}
                className={`clarify-option${selected ? ' selected' : ''}`}
              >
                <span className={`clarify-ind ${question.slot === 'multi' ? 'multi' : 'single'}`}>
                  {selected ? <Check size={10} strokeWidth={3} /> : null}
                </span>
                <span className="clarify-optlabel">{option}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {renderExpansion ? renderExpansion(question.id, qState.selected[0]) : null}

      <div className={`clarify-other${qState.other.trim() ? ' filled' : ''}`}>
        <Pencil size={14} className="lock-ico" />
        <input
          value={qState.other}
          disabled={disabled}
          onChange={(e) => setOther(e.target.value)}
          placeholder={question.slot === 'text' ? 'Type your answer…' : 'Something else…'}
          aria-label="Type your own answer"
        />
      </div>

      <div className="clarify-foot">
        <div className="clarify-nav">
          <button
            type="button"
            aria-label="Previous question"
            onClick={() => setStepIndex((c) => Math.max(c - 1, 0))}
            disabled={stepIndex === 0 || disabled}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="clarify-count">
            {stepIndex + 1} / {total}
          </span>
          <button
            type="button"
            aria-label="Next question"
            onClick={() => setStepIndex((c) => Math.min(c + 1, total - 1))}
            disabled={isLast || disabled}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="clarify-actions">
          <button type="button" className="btn ghost" onClick={onSkip} disabled={disabled}>
            Skip
          </button>
          <button type="button" className="btn primary" onClick={next} disabled={disabled}>
            {isLast ? (answeredCount > 0 ? 'Build' : 'Build anyway') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
