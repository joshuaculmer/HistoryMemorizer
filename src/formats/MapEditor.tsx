import { useRef, useState } from 'react'
import type { MapDeck, MapPin } from '../types'
import { asset } from '../util'

interface Props {
  deck: MapDeck
}

/** Double-quoted TS string literal, so the output pastes straight into the deck file. */
function quote(text: string): string {
  return JSON.stringify(text)
}

function serialize(pins: MapPin[]): string {
  return pins
    .map((pin) => {
      const aliases = pin.aliases?.length
        ? `, aliases: [${pin.aliases.map(quote).join(', ')}]`
        : ''
      return `    { id: ${quote(pin.id)}, category: ${quote(pin.category)}, x: ${pin.x}, y: ${pin.y}, label: ${quote(pin.label)}${aliases} },`
    })
    .join('\n')
}

/** Drag pins to correct their placement, then paste the output back into data/map2023.ts. */
export function MapEditor({ deck }: Props) {
  const [pins, setPins] = useState<MapPin[]>(() => deck.pins.map((pin) => ({ ...pin })))
  const [active, setActive] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  const dragTo = (event: React.MouseEvent) => {
    if (!active || !wrap.current) return
    const box = wrap.current.getBoundingClientRect()
    const x = Math.round(((event.clientX - box.left) / box.width) * 1000) / 10
    const y = Math.round(((event.clientY - box.top) / box.height) * 1000) / 10
    setPins((current) => current.map((pin) => (pin.id === active ? { ...pin, x, y } : pin)))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(serialize(pins))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const moved = pins.filter((pin, i) => pin.x !== deck.pins[i].x || pin.y !== deck.pins[i].y).length

  return (
    <div className="quiz">
      <p className="eyebrow">
        Drag any pin onto the feature it names. {moved} moved so far.
        {deck.editImage && ' Showing the labelled scan.'}
      </p>

      <div
        className="map-wrap editing"
        ref={wrap}
        onMouseMove={dragTo}
        onMouseUp={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        <img
          src={asset(deck.editImage ?? deck.image)}
          alt={deck.title}
          className="map-img"
          draggable={false}
        />
        {pins.map((pin) => (
          <span
            key={pin.id}
            className={`pin edit${active === pin.id ? ' target' : ''}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onMouseDown={() => setActive(pin.id)}
            title={pin.label}
          >
            <span className="pin-label">{pin.label}</span>
          </span>
        ))}
      </div>

      <button type="button" className="primary" onClick={copy}>
        {copied ? 'Copied — paste into data/map2023.ts' : 'Copy corrected pin list'}
      </button>
    </div>
  )
}
