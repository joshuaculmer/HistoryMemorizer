import { useCallback, useRef, useState } from 'react'
import type { PairDeck, PairItem } from '../types'
import { shuffle } from '../util'

interface Props {
  deck: PairDeck
  onScore: (itemId: string, correct: boolean) => void
}

const ROUND_SIZE = 6

function buildRound(deck: PairDeck): PairItem[] {
  return shuffle(deck.items).slice(0, ROUND_SIZE)
}

export function Timeline({ deck, onScore }: Props) {
  const [round, setRound] = useState(() => buildRound(deck))
  const [order, setOrder] = useState(() => shuffle(round))
  const [checked, setChecked] = useState(false)
  const dragFrom = useRef<number | null>(null)

  const solution = round.slice().sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0))

  const restart = useCallback(() => {
    const fresh = buildRound(deck)
    setRound(fresh)
    setOrder(shuffle(fresh))
    setChecked(false)
  }, [deck])

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return
    setOrder((current) => {
      const next = current.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const check = () => {
    setChecked(true)
    order.forEach((item, index) => onScore(item.id, solution[index].id === item.id))
  }

  const rightCount = order.filter((item, i) => solution[i].id === item.id).length

  return (
    <div className="quiz">
      <p className="eyebrow">Drag into chronological order, earliest at the top</p>

      <ol className="timeline">
        {order.map((item, index) => {
          const correct = checked && solution[index].id === item.id
          const wrong = checked && !correct
          return (
            <li
              key={item.id}
              className={`tl-row${correct ? ' right' : ''}${wrong ? ' wrong' : ''}`}
              draggable={!checked}
              onDragStart={() => (dragFrom.current = index)}
              onDragOver={(event) => {
                event.preventDefault()
                if (dragFrom.current !== null && dragFrom.current !== index) {
                  move(dragFrom.current, index)
                  dragFrom.current = index
                }
              }}
              onDragEnd={() => (dragFrom.current = null)}
            >
              <span className="tl-handle" aria-hidden="true">
                ⋮⋮
              </span>
              <span className="tl-text">{item.b}</span>
              {checked && <span className="tl-date">{item.a}</span>}
              {!checked && (
                <span className="tl-nudge">
                  <button type="button" onClick={() => move(index, index - 1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(index, index + 1)} aria-label="Move down">
                    ↓
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {!checked ? (
        <button type="button" className="primary" onClick={check}>
          Check order
        </button>
      ) : (
        <>
          <p className="verdict">
            {rightCount} of {order.length} in the right place.
          </p>
          <button type="button" className="primary" onClick={restart} autoFocus>
            New set
          </button>
        </>
      )}
    </div>
  )
}
