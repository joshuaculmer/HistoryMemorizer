import { useCallback, useState } from 'react'
import type { PairDeck, PairItem } from '../types'
import { getDeckStats, weightOf } from '../store'
import { collides, shuffle, weightedSample } from '../util'

interface Props {
  deck: PairDeck
  focusMissed: boolean
  onScore: (itemId: string, correct: boolean) => void
}

const ROUND_SIZE = 8

/**
 * Draws a round, holding back the items just played so a board doesn't repeat.
 * Overdraws and then skips any item that reads the same as one already kept,
 * since two identical cells would make the board unanswerable.
 */
function buildRound(
  deck: PairDeck,
  focusMissed: boolean,
  recent: readonly string[] = [],
): PairItem[] {
  const stats = focusMissed ? getDeckStats(deck.id) : null
  const weight = stats ? (item: PairItem) => weightOf(stats[item.id]) : () => 1
  const draw = weightedSample(deck.items, weight, recent, Math.min(deck.items.length, ROUND_SIZE * 3))

  const round: PairItem[] = []
  for (const item of draw) {
    if (round.length === ROUND_SIZE) break
    if (round.some((kept) => collides(kept, item))) continue
    round.push(item)
  }
  return round
}

export function Matching({ deck, focusMissed, onScore }: Props) {
  const [items, setItems] = useState(() => buildRound(deck, focusMissed))
  const [left, setLeft] = useState(() => shuffle(items))
  const [right, setRight] = useState(() => shuffle(items))
  const [selected, setSelected] = useState<string | null>(null)
  const [solved, setSolved] = useState<string[]>([])
  const [missed, setMissed] = useState<string | null>(null)

  const restart = useCallback(() => {
    const fresh = buildRound(deck, focusMissed, items.map((item) => item.id))
    setItems(fresh)
    setLeft(shuffle(fresh))
    setRight(shuffle(fresh))
    setSelected(null)
    setSolved([])
    setMissed(null)
  }, [deck, focusMissed, items])

  const pickRight = (id: string) => {
    if (!selected || solved.includes(id)) return
    const correct = id === selected
    onScore(selected, correct)
    if (correct) {
      setSolved((done) => [...done, id])
      setSelected(null)
      setMissed(null)
    } else {
      setMissed(id)
      window.setTimeout(() => setMissed(null), 450)
    }
  }

  const done = solved.length === items.length

  return (
    <div className="quiz">
      <p className="eyebrow">
        Match each {deck.sideA.toLowerCase()} to its {deck.sideB.toLowerCase()} — {solved.length} of{' '}
        {items.length}
      </p>

      <div className="match-grid">
        <div className="match-col">
          {left.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`match-cell${solved.includes(item.id) ? ' solved' : ''}${
                selected === item.id ? ' active' : ''
              }`}
              onClick={() => !solved.includes(item.id) && setSelected(item.id)}
              disabled={solved.includes(item.id)}
            >
              {item.a}
            </button>
          ))}
        </div>

        <div className="match-col wide">
          {right.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`match-cell${solved.includes(item.id) ? ' solved' : ''}${
                missed === item.id ? ' wrong' : ''
              }`}
              onClick={() => pickRight(item.id)}
              disabled={solved.includes(item.id) || !selected}
            >
              {item.b}
            </button>
          ))}
        </div>
      </div>

      {done && (
        <button type="button" className="primary" onClick={restart} autoFocus>
          New set
        </button>
      )}
    </div>
  )
}
