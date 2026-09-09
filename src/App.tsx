import { useCallback, useState } from 'react'
import './App.css'
import { decks, countOf, formatsFor, itemIdsOf } from './registry'
import { record, resetDeck, summarize } from './store'
import type { Deck, FormatId, MapCategory } from './types'
import { MultipleChoice } from './formats/MultipleChoice'
import { Matching } from './formats/Matching'
import { Timeline } from './formats/Timeline'
import { MapQuiz } from './formats/MapQuiz'
import { MapEditor } from './formats/MapEditor'
import { Progress } from './components/Progress'

type View = 'quiz' | 'progress' | 'edit'

const ALL_CATEGORIES: MapCategory[] = ['territory', 'state', 'city', 'river', 'feature']

const CATEGORY_LABEL: Record<MapCategory, string> = {
  territory: 'Territories',
  state: 'States',
  city: 'Cities',
  river: 'Rivers',
  feature: 'Landmarks',
}

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [format, setFormat] = useState<FormatId | null>(null)
  const [view, setView] = useState<View>('quiz')
  const [focusMissed, setFocusMissed] = useState(false)
  const [categories, setCategories] = useState<Set<MapCategory>>(new Set(ALL_CATEGORIES))
  const [session, setSession] = useState({ right: 0, wrong: 0 })

  const onScore = useCallback(
    (itemId: string, correct: boolean) => {
      if (!deck) return
      record(deck.id, itemId, correct)
      setSession((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    },
    [deck],
  )

  // Read fresh each render so the all-time line tracks the session as it goes.
  const summary = deck ? summarize(deck.id, itemIdsOf(deck)) : null

  const openDeck = (next: Deck) => {
    setDeck(next)
    setFormat(null)
    setView('quiz')
    setSession({ right: 0, wrong: 0 })
  }

  const toggleCategory = (category: MapCategory) => {
    setCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next.size ? next : current
    })
  }

  if (!deck) {
    return (
      <main className="shell">
        <header className="head">
          <h1>HIST 220 Study</h1>
          <p className="sub">Pick a set of material.</p>
        </header>
        <div className="cards">
          {decks.map((entry) => {
            const stat = summarize(entry.id, itemIdsOf(entry))
            return (
              <button key={entry.id} type="button" className="card" onClick={() => openDeck(entry)}>
                <h2>{entry.title}</h2>
                <p>{entry.subtitle}</p>
                <p className="meta">
                  {countOf(entry)} items · {formatsFor(entry).length} formats
                  {stat.attempted > 0 && ` · ${Math.round(stat.accuracy * 100)}% lifetime`}
                </p>
              </button>
            )
          })}
        </div>
      </main>
    )
  }

  const formats = formatsFor(deck)
  const active = formats.find((f) => f.id === format)
  const quizzing = view === 'quiz'

  return (
    <main className="shell">
      <header className="head">
        <button type="button" className="back" onClick={() => setDeck(null)}>
          ← All material
        </button>
        <h1>{deck.title}</h1>
        <p className="sub">{deck.subtitle}</p>
      </header>

      <nav className="formats">
        {formats.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`fmt${entry.id === format && quizzing ? ' on' : ''}`}
            onClick={() => {
              setFormat(entry.id)
              setView('quiz')
              setSession({ right: 0, wrong: 0 })
            }}
            title={entry.blurb}
          >
            {entry.name}
          </button>
        ))}

        <span className="spacer" />

        <button
          type="button"
          className={`fmt ghost${view === 'progress' ? ' on' : ''}`}
          onClick={() => setView(view === 'progress' ? 'quiz' : 'progress')}
        >
          Progress
        </button>
        {deck.kind === 'map' && (
          <button
            type="button"
            className={`fmt ghost${view === 'edit' ? ' on' : ''}`}
            onClick={() => setView(view === 'edit' ? 'quiz' : 'edit')}
          >
            Edit pins
          </button>
        )}
      </nav>

      <div className="controls">
        {quizzing && (
          <>
            <label className="toggle">
              <input
                type="checkbox"
                checked={focusMissed}
                onChange={(event) => setFocusMissed(event.target.checked)}
              />
              Favor items I miss
            </label>

            {deck.kind === 'map' &&
              ALL_CATEGORIES.map((category) => (
                <label key={category} className="toggle">
                  <input
                    type="checkbox"
                    checked={categories.has(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  {CATEGORY_LABEL[category]}
                </label>
              ))}
          </>
        )}

        <span className="spacer" />

        <span className="score">
          This session {session.right}/{session.right + session.wrong}
        </span>
        {summary && summary.attempted > 0 && (
          <span className="score muted">
            All time {Math.round(summary.accuracy * 100)}% · {summary.shaky} shaky
          </span>
        )}
        <button
          type="button"
          className="reset"
          onClick={() => {
            resetDeck(deck.id)
            setSession({ right: 0, wrong: 0 })
          }}
        >
          Reset progress
        </button>
      </div>

      {view === 'progress' ? (
        <Progress deck={deck} />
      ) : view === 'edit' && deck.kind === 'map' ? (
        <MapEditor deck={deck} />
      ) : !active ? (
        <div className="picker">
          {formats.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="card"
              onClick={() => setFormat(entry.id)}
            >
              <h2>{entry.name}</h2>
              <p>{entry.blurb}</p>
            </button>
          ))}
        </div>
      ) : deck.kind === 'pairs' ? (
        active.id === 'matching' ? (
          <Matching key="m" deck={deck} focusMissed={focusMissed} onScore={onScore} />
        ) : active.id === 'timeline' ? (
          <Timeline key="t" deck={deck} onScore={onScore} />
        ) : (
          <MultipleChoice
            key={active.id}
            deck={deck}
            direction={active.id === 'mc-a-b' ? 'a-b' : 'b-a'}
            focusMissed={focusMissed}
            onScore={onScore}
          />
        )
      ) : (
        <MapQuiz
          key={active.id}
          deck={deck}
          mode={active.id === 'map-bank' ? 'bank' : 'type'}
          focusMissed={focusMissed}
          categories={categories}
          onScore={onScore}
        />
      )}
    </main>
  )
}
