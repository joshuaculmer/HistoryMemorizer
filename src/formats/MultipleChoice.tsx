import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PairDeck, PairItem } from '../types'
import { getDeckStats, weightOf } from '../store'
import { COOLDOWN, collides, sample, shuffle, weightedSample } from '../util'

interface Props {
  deck: PairDeck
  direction: 'a-b' | 'b-a'
  focusMissed: boolean

  /** Seconds the prompt stands alone before the choices appear. 0 shows them at once. */
  revealAfter: number

  onScore: (itemId: string, correct: boolean) => void
}

const CHOICES = 4

/** Distractors drawn from chronological neighbours, so the year alone won't give it away. */
function buildRound(
  deck: PairDeck,
  focusMissed: boolean,
  recent: readonly string[],
): { target: PairItem; options: PairItem[] } {
  const stats = getDeckStats(deck.id)
  const weight = focusMissed ? (item: PairItem) => weightOf(stats[item.id]) : () => 1
  const target = weightedSample(deck.items, weight, recent)[0]

  // An item that reads the same on either side would be a second right answer.
  const pool = deck.items.filter((item) => item.id !== target.id && !collides(item, target))

  const sorted = deck.items.every((i) => typeof i.sort === 'number')
    ? pool.slice().sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0))
    : pool
  const at = sorted.filter((i) => (i.sort ?? 0) < (target.sort ?? 0)).length
  const near = sorted.slice(Math.max(0, at - 4), at + 4)
  const far = pool.filter((i) => !near.includes(i))

  const distractors = [...sample(near, CHOICES - 1), ...sample(far, CHOICES - 1)].slice(0, CHOICES - 1)
  return { target, options: shuffle([target, ...distractors]) }
}

function startHold(id: string, span: number) {
  return { id, span, left: span }
}

/** Round plus the cooldown queue it leaves behind, advanced together as one state. */
function advance(deck: PairDeck, focusMissed: boolean, recent: readonly string[]) {
  const round = buildRound(deck, focusMissed, recent)
  return { round, recent: [...recent, round.target.id].slice(-COOLDOWN) }
}

export function MultipleChoice({ deck, direction, focusMissed, revealAfter, onScore }: Props) {
  const [state, setState] = useState(() => advance(deck, focusMissed, []))
  const [picked, setPicked] = useState<string | null>(null)
  const round = state.round

  // Seconds still owed on the current prompt. Restarting it when the prompt or
  // the delay changes keeps a stale count from carrying into the next question.
  const [hold, setHold] = useState(() => startHold(round.target.id, revealAfter))
  if (hold.id !== round.target.id || hold.span !== revealAfter) {
    setHold(startHold(round.target.id, revealAfter))
  }
  const shown = hold.left <= 0

  const promptSide = direction === 'a-b' ? 'a' : 'b'
  const answerSide = direction === 'a-b' ? 'b' : 'a'
  const promptLabel = direction === 'a-b' ? deck.sideA : deck.sideB

  useEffect(() => {
    if (hold.left <= 0) return
    const tick = window.setTimeout(() => setHold((h) => ({ ...h, left: h.left - 1 })), 1000)
    return () => window.clearTimeout(tick)
  }, [hold])

  const next = useCallback(() => {
    setPicked(null)
    setState((prev) => advance(deck, focusMissed, prev.recent))
  }, [deck, focusMissed])

  const choose = (item: PairItem) => {
    if (picked) return
    setPicked(item.id)
    onScore(round.target.id, item.id === round.target.id)
  }

  const promptText = useMemo(() => round.target[promptSide], [round, promptSide])

  return (
    <div className="quiz">
      <p className="eyebrow">{promptLabel}</p>
      <h2 className="prompt">{promptText}</h2>

      {!shown ? (
        <div className="hold">
          <p className="hold-note">
            Answer it in your head. Choices appear in{' '}
            <span className="hold-count">{hold.left}</span>s.
          </p>
          <button type="button" className="primary" onClick={() => setHold((h) => ({ ...h, left: 0 }))}>
            Show choices now
          </button>
        </div>
      ) : (
        <div className="choices">
          {round.options.map((option) => {
            const isAnswer = option.id === round.target.id
            const state = !picked ? '' : isAnswer ? ' right' : option.id === picked ? ' wrong' : ' dim'
            return (
              <button
                key={option.id}
                type="button"
                className={`choice${state}`}
                onClick={() => choose(option)}
                disabled={picked !== null}
              >
                {option[answerSide]}
              </button>
            )
          })}
        </div>
      )}

      {picked && (
        <button type="button" className="primary" onClick={next} autoFocus>
          Next question
        </button>
      )}
    </div>
  )
}
