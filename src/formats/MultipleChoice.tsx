import { useCallback, useMemo, useState } from 'react'
import type { PairDeck, PairItem } from '../types'
import { getDeckStats, weightOf } from '../store'
import { COOLDOWN, sample, shuffle, weightedSample } from '../util'

interface Props {
  deck: PairDeck
  direction: 'a-b' | 'b-a'
  focusMissed: boolean
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

  const ordered = deck.items.every((i) => typeof i.sort === 'number')
    ? deck.items.slice().sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0))
    : deck.items
  const at = ordered.findIndex((i) => i.id === target.id)
  const near = ordered
    .slice(Math.max(0, at - 4), at + 5)
    .filter((i) => i.id !== target.id)
  const far = deck.items.filter((i) => i.id !== target.id && !near.includes(i))

  const distractors = [...sample(near, CHOICES - 1), ...sample(far, CHOICES - 1)].slice(0, CHOICES - 1)
  return { target, options: shuffle([target, ...distractors]) }
}

/** Round plus the cooldown queue it leaves behind, advanced together as one state. */
function advance(deck: PairDeck, focusMissed: boolean, recent: readonly string[]) {
  const round = buildRound(deck, focusMissed, recent)
  return { round, recent: [...recent, round.target.id].slice(-COOLDOWN) }
}

export function MultipleChoice({ deck, direction, focusMissed, onScore }: Props) {
  const [state, setState] = useState(() => advance(deck, focusMissed, []))
  const [picked, setPicked] = useState<string | null>(null)
  const round = state.round

  const promptSide = direction === 'a-b' ? 'a' : 'b'
  const answerSide = direction === 'a-b' ? 'b' : 'a'
  const promptLabel = direction === 'a-b' ? deck.sideA : deck.sideB

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

      {picked && (
        <button type="button" className="primary" onClick={next} autoFocus>
          Next question
        </button>
      )}
    </div>
  )
}
