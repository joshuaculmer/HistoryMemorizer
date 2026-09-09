import { useCallback, useMemo, useState } from 'react'
import type { PairDeck, PairItem } from '../types'
import { getDeckStats, weightOf } from '../store'
import { sample, shuffle } from '../util'

interface Props {
  deck: PairDeck
  direction: 'a-b' | 'b-a'
  focusMissed: boolean
  onScore: (itemId: string, correct: boolean) => void
}

const CHOICES = 4

/** Distractors drawn from chronological neighbours, so the year alone won't give it away. */
function buildRound(deck: PairDeck, focusMissed: boolean): { target: PairItem; options: PairItem[] } {
  const stats = getDeckStats(deck.id)
  const pool = focusMissed
    ? deck.items.flatMap((item) => Array<PairItem>(Math.ceil(weightOf(stats[item.id]))).fill(item))
    : deck.items
  const target = pool[Math.floor(Math.random() * pool.length)]

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

export function MultipleChoice({ deck, direction, focusMissed, onScore }: Props) {
  const [round, setRound] = useState(() => buildRound(deck, focusMissed))
  const [picked, setPicked] = useState<string | null>(null)

  const promptSide = direction === 'a-b' ? 'a' : 'b'
  const answerSide = direction === 'a-b' ? 'b' : 'a'
  const promptLabel = direction === 'a-b' ? deck.sideA : deck.sideB

  const next = useCallback(() => {
    setPicked(null)
    setRound(buildRound(deck, focusMissed))
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
