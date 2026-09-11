import { useCallback, useMemo, useState } from 'react'
import type { MapCategory, MapDeck, MapPin } from '../types'
import { getDeckStats, weightOf } from '../store'
import { COOLDOWN, asset, matches, sample, shuffle, weightedSample } from '../util'

interface Props {
  deck: MapDeck
  mode: 'type' | 'bank'
  focusMissed: boolean
  categories: Set<MapCategory>
  onScore: (itemId: string, correct: boolean) => void
}

const CATEGORY_NAME: Record<MapCategory, string> = {
  territory: 'territory or acquisition',
  state: 'state',
  city: 'city',
  river: 'river',
  feature: 'landmark or boundary',
}

const BANK_SIZE = 6

// Loupe box, in CSS pixels. Kept here so the background math and the element
// size come from one place.
const LOUPE_W = 320
const LOUPE_H = 240
const ZOOM = 3.2

function accepted(pin: MapPin): string[] {
  return [pin.label, ...(pin.aliases ?? [])]
}

/** Next pin plus the cooldown queue it leaves behind, advanced together as one state. */
function pickPin(
  pins: MapPin[],
  deckId: string,
  focusMissed: boolean,
  recent: readonly string[],
) {
  const stats = focusMissed ? getDeckStats(deckId) : null
  const weight = stats ? (pin: MapPin) => weightOf(stats[pin.id]) : () => 1
  const pin = weightedSample(pins, weight, recent)[0]
  return { pin, recent: [...recent, pin.id].slice(-COOLDOWN) }
}

export function MapQuiz({ deck, mode, focusMissed, categories, onScore }: Props) {
  const pins = useMemo(
    () => deck.pins.filter((pin) => categories.has(pin.category)),
    [deck, categories],
  )

  const [state, setState] = useState(() => pickPin(pins, deck.id, focusMissed, []))
  const target = state.pin
  const [ratio, setRatio] = useState(2200 / 1701)
  const [showAll, setShowAll] = useState(false)
  const [typed, setTyped] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)

  const bank = useMemo(() => {
    if (mode !== 'bank') return null
    const sameKind = deck.pins.filter(
      (pin) => pin.category === target.category && pin.label !== target.label,
    )
    return shuffle([target, ...sample(sameKind, BANK_SIZE - 1)])
  }, [mode, target, deck])

  const next = useCallback(() => {
    setTyped('')
    setPicked(null)
    setResult(null)
    setState((prev) => pickPin(pins, deck.id, focusMissed, prev.recent))
  }, [pins, deck.id, focusMissed])

  const settle = (correct: boolean) => {
    setResult(correct ? 'right' : 'wrong')
    if (!correct) setTyped('')
    onScore(target.id, correct)
  }

  // A miss has to be typed out correctly before the next pin, so the name gets
  // written at least once. The retype is practice, not a second graded attempt.
  const retyping = mode === 'type' && result === 'wrong'

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault()
    if (retyping) {
      if (matches(typed, accepted(target))) next()
      return
    }
    if (result) return next()
    settle(matches(typed, accepted(target)))
  }

  // Loupe magnifies the target region, since single-state pins are small at full
  // width. Percentage background-position aligns the image's x% point to the box's
  // x% point, which only centers at 50%, so the offsets are computed in pixels.
  const scaledW = LOUPE_W * ZOOM
  const scaledH = scaledW / ratio
  const loupe = {
    width: LOUPE_W,
    height: LOUPE_H,
    backgroundImage: `url(${asset(deck.image)})`,
    backgroundSize: `${scaledW}px ${scaledH}px`,
    backgroundPosition: `${LOUPE_W / 2 - (target.x / 100) * scaledW}px ${
      LOUPE_H / 2 - (target.y / 100) * scaledH
    }px`,
  }

  return (
    <div className="quiz map-quiz">
      <p className="eyebrow">
        Name the highlighted {CATEGORY_NAME[target.category]}
      </p>

      <div className="map-stage">
        <div className="map-wrap">
          <img
            src={asset(deck.image)}
            alt={deck.title}
            className="map-img"
            onLoad={(event) => {
              const img = event.currentTarget
              if (img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight)
            }}
          />
          {/* Only the target shows by default, so the blank map stays blank. */}
          {(showAll ? pins : [target]).map((pin) => (
            <span
              key={pin.id}
              className={`pin${pin.id === target.id ? ' target' : ''}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            />
          ))}
        </div>

        <aside className="map-side">
          <div className="loupe" style={loupe} aria-hidden="true">
            <span className="loupe-pin" />
          </div>

          {mode === 'type' ? (
            <form onSubmit={submitTyped}>
              <input
                key={retyping ? 'retype' : 'answer'}
                className="answer-input"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={retyping ? `Type "${target.label}" to continue` : 'Type the name'}
                autoFocus
                readOnly={result === 'right'}
              />
              <button type="submit" className="primary">
                {retyping ? 'Continue' : result ? 'Next' : 'Check'}
              </button>
            </form>
          ) : (
            <div className="bank">
              {(bank ?? []).map((pin) => {
                const isAnswer = pin.id === target.id
                const state = !result
                  ? ''
                  : isAnswer
                    ? ' right'
                    : pin.id === picked
                      ? ' wrong'
                      : ' dim'
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className={`choice${state}`}
                    onClick={() => {
                      if (result) return
                      setPicked(pin.id)
                      settle(matches(pin.label, accepted(target)))
                    }}
                    disabled={result !== null}
                  >
                    {pin.label}
                  </button>
                )
              })}
            </div>
          )}

          {result && (
            <div className={`verdict ${result}`}>
              {result === 'right' ? 'Correct — ' : 'Not quite — '}
              <strong>{target.label}</strong>
              {retyping && <span className="faint"> · type it above to continue</span>}
              {mode === 'bank' && (
                <button type="button" className="primary inline" onClick={next} autoFocus>
                  Next
                </button>
              )}
            </div>
          )}

          <label className="toggle faint">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />
            Show every pin
          </label>
        </aside>
      </div>
    </div>
  )
}
