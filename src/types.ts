// The plug-and-play contract. A deck describes its material; the engine derives
// which quiz formats that material can support.

export interface PairItem {
  id: string
  a: string
  b: string

  /** Numeric key that makes ordering formats available. */
  sort?: number

  /** Extra accepted spellings when the side is typed rather than picked. */
  aliasesA?: string[]
  aliasesB?: string[]
}

/** Two-sided material: date/event, term/definition, question/answer. */
export interface PairDeck {
  kind: 'pairs'
  id: string
  title: string
  subtitle?: string

  /** Names for each side, shown in prompts and column headers. */
  sideA: string
  sideB: string

  items: PairItem[]
}

export interface MapPin {
  id: string
  label: string

  /** Position as a percentage of image width and height. */
  x: number
  y: number

  category: MapCategory
  aliases?: string[]
}

export type MapCategory = 'territory' | 'state' | 'city' | 'river' | 'feature'

export interface MapDeck {
  kind: 'map'
  id: string
  title: string
  subtitle?: string
  image: string

  /** Labelled version of the same scan, same dimensions. Used only by the pin editor. */
  editImage?: string

  pins: MapPin[]
}

export type Deck = PairDeck | MapDeck

export type FormatId =
  | 'mc-a-b'
  | 'mc-b-a'
  | 'matching'
  | 'timeline'
  | 'map-type'
  | 'map-bank'

export interface FormatInfo {
  id: FormatId
  name: string
  blurb: string
}
