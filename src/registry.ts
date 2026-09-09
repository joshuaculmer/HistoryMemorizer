import { chronology2023 } from '../data/chronology2023'
import { map2023 } from '../data/map2023'
import type { Deck, FormatInfo } from './types'

// Add a deck by importing it and listing it here. Nothing else needs to change.
export const decks: Deck[] = [chronology2023, map2023]

export function itemIdsOf(deck: Deck): string[] {
  return deck.kind === 'pairs' ? deck.items.map((i) => i.id) : deck.pins.map((p) => p.id)
}

export function countOf(deck: Deck): number {
  return deck.kind === 'pairs' ? deck.items.length : deck.pins.length
}

/** Which quiz formats this deck's material can actually feed. */
export function formatsFor(deck: Deck): FormatInfo[] {
  if (deck.kind === 'map') {
    return [
      { id: 'map-type', name: 'Label the map', blurb: 'A pin lights up. Type what it is.' },
      { id: 'map-bank', name: 'Map word bank', blurb: 'Same pins, but pick the name from a list.' },
    ]
  }

  const formats: FormatInfo[] = [
    {
      id: 'mc-a-b',
      name: `${deck.sideA} to ${deck.sideB}`,
      blurb: `Given the ${deck.sideA.toLowerCase()}, pick the ${deck.sideB.toLowerCase()}.`,
    },
    {
      id: 'mc-b-a',
      name: `${deck.sideB} to ${deck.sideA}`,
      blurb: `Given the ${deck.sideB.toLowerCase()}, pick the ${deck.sideA.toLowerCase()}.`,
    },
    { id: 'matching', name: 'Matching', blurb: 'Pair up two columns, eight at a time.' },
  ]

  if (deck.items.every((item) => typeof item.sort === 'number')) {
    formats.push({ id: 'timeline', name: 'Ordering', blurb: 'Drag six shuffled items into sequence.' })
  }

  return formats
}

export interface DeckRow {
  id: string
  primary: string
  secondary: string
}

/** Flattens either deck kind into rows the progress view can list. */
export function rowsOf(deck: Deck): DeckRow[] {
  if (deck.kind === 'map') {
    return deck.pins.map((pin) => ({ id: pin.id, primary: pin.label, secondary: pin.category }))
  }
  return deck.items.map((item) => ({ id: item.id, primary: item.a, secondary: item.b }))
}
