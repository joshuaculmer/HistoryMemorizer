import { useMemo, useState } from 'react'
import type { Deck } from '../types'
import { rowsOf } from '../registry'
import { MAX_ATTEMPTS, getLog, statOf, type Attempt } from '../store'

interface Props {
  deck: Deck
}

type Sort = 'weak' | 'deck' | 'recent'

const SORTS: { id: Sort; name: string }[] = [
  { id: 'weak', name: 'Weakest first' },
  { id: 'recent', name: 'Recently answered' },
  { id: 'deck', name: 'Handout order' },
]

function tickTitle(attempt: Attempt): string {
  const when = new Date(attempt.t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const verdict = attempt.c ? 'Correct' : 'Missed'
  return attempt.legacy ? `${verdict} — imported, time approximate` : `${verdict} — ${when}`
}

/**
 * History bar: attempts fill from the left in the order they happened, so the run
 * of ticks reads as a history growing rightward and its right end is the newest
 * answer. Unused slots trail off to the right in grey.
 */
function HistoryBar({ attempts }: { attempts: Attempt[] }) {
  const shown = attempts.slice(-MAX_ATTEMPTS)
  const blanks = MAX_ATTEMPTS - shown.length

  return (
    <div className="bar" role="img" aria-label={`${shown.length} attempts, oldest first`}>
      {shown.map((attempt, i) => (
        <span
          key={`${attempt.t}-${i}`}
          className={`tick ${attempt.c ? 'hit' : 'miss'}${attempt.legacy ? ' legacy' : ''}`}
          title={tickTitle(attempt)}
        />
      ))}
      {Array.from({ length: blanks }, (_, i) => (
        <span key={`blank-${i}`} className="tick empty" />
      ))}
    </div>
  )
}

export function Progress({ deck }: Props) {
  const [sort, setSort] = useState<Sort>('weak')
  const [filter, setFilter] = useState('')

  const rows = useMemo(() => {
    const log = getLog(deck.id)
    const needle = filter.trim().toLowerCase()

    const built = rowsOf(deck)
      .map((row) => {
        const attempts = log[row.id] ?? []
        return { ...row, attempts, stat: statOf(attempts) }
      })
      .filter(
        (row) =>
          !needle ||
          row.primary.toLowerCase().includes(needle) ||
          row.secondary.toLowerCase().includes(needle),
      )

    if (sort === 'deck') return built
    if (sort === 'recent') {
      return built.slice().sort((x, y) => (y.stat?.lastSeen ?? 0) - (x.stat?.lastSeen ?? 0))
    }
    // Weakest first: lowest accuracy leads, never-attempted items sit mid-pack.
    const rank = (stat: ReturnType<typeof statOf>) =>
      !stat ? 0.5 : stat.right / (stat.right + stat.wrong)
    return built.slice().sort((x, y) => rank(x.stat) - rank(y.stat))
  }, [deck, sort, filter])

  const totals = rows.reduce(
    (acc, row) => {
      if (!row.stat) return { ...acc, unseen: acc.unseen + 1 }
      return {
        right: acc.right + row.stat.right,
        wrong: acc.wrong + row.stat.wrong,
        unseen: acc.unseen,
      }
    },
    { right: 0, wrong: 0, unseen: 0 },
  )
  const answered = totals.right + totals.wrong

  return (
    <div className="progress">
      <div className="prog-head">
        <p className="eyebrow">
          {answered} answers logged · {answered ? Math.round((totals.right / answered) * 100) : 0}%
          correct · {totals.unseen} never attempted
        </p>

        <div className="prog-tools">
          <input
            className="filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter items"
          />
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`fmt small${sort === option.id ? ' on' : ''}`}
              onClick={() => setSort(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <ul className="prog-list">
        {rows.map((row) => {
          const attempts = row.attempts.length
          const pct = row.stat ? Math.round((row.stat.right / attempts) * 100) : null
          return (
            <li key={row.id} className={`prog-row${row.stat ? '' : ' unseen'}`}>
              <div className="prog-text">
                <span className="prog-primary">{row.primary}</span>
                <span className="prog-secondary">{row.secondary}</span>
              </div>
              <HistoryBar attempts={row.attempts} />
              <span className="prog-pct">
                {pct === null ? '—' : `${pct}%`}
                <small>{attempts ? ` ${attempts}` : ''}</small>
              </span>
            </li>
          )
        })}
      </ul>

      {rows.length === 0 && <p className="sub">Nothing matches that filter.</p>}
    </div>
  )
}
