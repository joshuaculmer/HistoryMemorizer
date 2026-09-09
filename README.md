# HistoryMemorizer

Quiz app for the HIST 220 handouts.

**Live:** https://joshuaculmer.github.io/HistoryMemorizer/

Locally: `npm install`, then `npm run dev` and open http://localhost:5173.

## Deploying

`scripts/deploy.sh` builds the app and force-pushes the result to the `gh-pages` branch, which GitHub Pages serves. Two ways to run it, both hitting the same script so they cannot drift:

- **On push.** `.github/workflows/deploy.yml` lints, builds and publishes on every push to `main`. Also runnable from the Actions tab.
- **By hand.** `npm run deploy` from a clean checkout.

The site lives under `/<repo>/` rather than a domain root, so `vite.config.ts` sets `base` from the repo name and `src/util.ts` exports `asset()` for deck images. Use `asset()` for anything you reference from `public/` — a bare `/file.png` resolves to the domain root and 404s in production. `npm run preview` serves the built site at the same subpath, so it reproduces production exactly.

## Material

Decks live in `data/` and are registered in `src/registry.ts`. Two kinds exist.

**Pairs** — two-sided material such as date/event or term/definition.

```ts
export const myDeck: PairDeck = {
  kind: 'pairs',
  id: 'unique-id',
  title: 'Shown on the menu card',
  sideA: 'Date',
  sideB: 'Event',
  items: [{ id: 'x1', a: '1803', b: 'Louisiana Purchase', sort: 1803 }],
}
```

**Map** — pins placed as percentages of an image in `public/`.

```ts
export const myMap: MapDeck = {
  kind: 'map',
  id: 'unique-id',
  title: 'Shown on the menu card',
  image: '/my-map.png',        // blank version, shown while quizzing
  editImage: '/my-map-labelled.png',  // optional, same dimensions, used by Edit pins
  pins: [{ id: 'p1', label: 'Ohio River', category: 'river', x: 67, y: 57 }],
}
```

The quiz shows only the pin it is asking about, so a blank map stays blank. **Show every pin** in the answer rail reveals the rest when you want to browse.

Add the import and one array entry in `src/registry.ts` and the deck appears on the menu.

## Formats

The engine picks formats from the material, so a new deck gets them for free.

| Format | Requires |
| --- | --- |
| Side A to side B (multiple choice) | any pairs deck |
| Side B to side A (multiple choice) | any pairs deck |
| Matching | any pairs deck |
| Ordering | every item has `sort` |
| Label the map (typed) | any map deck |
| Map word bank | any map deck |

Typed answers run through `matches()` in `src/util.ts`, which ignores case, punctuation, and filler words, and allows one or two character typos depending on answer length. Add `aliases` to a pin, or `aliasesA` / `aliasesB` to a pair item, for other accepted names.

## Fixing map pins

Open the map deck and click **Edit pins**. That view swaps in `editImage` — the labelled scan — so you can see what you are aiming at. Drag a pin onto its feature, then **Copy corrected pin list** and paste over the `pins` array in `data/map2023.ts`.

## Progress

Every answer is logged with its timestamp under the `localStorage` key `hist220-attempts-v2`, as `{ deckId: { itemId: [{ t, c }] } }`. The last 40 attempts per item are kept.

The **Progress** tab lists every item in the deck with a GitHub-status-style history bar — one tick per answer filling from the left in the order you answered, so the right end of the run is your most recent attempt. Green is correct, red is missed, and unused slots trail off to the right in grey. Hovering a tick shows when you answered it. Sort by weakest first, most recently answered, or handout order, and filter by text.

**Favor items I miss** weights the question picker toward shaky items, counting recent misses heaviest so an item you have just fixed stops crowding the queue. **Reset progress** clears the current deck.

Counts from the earlier aggregate format (`hist220-progress-v1`) are imported once on first load. Those attempts had no individual timestamps, so they all take the item's last-seen time and render at half opacity.

## Source documents

`2023 US Chronology Master Handout.docx` and `2023 US Map Handout.pdf`. `public/map2023.png` was extracted from that PDF, rotated upright, and trimmed; it keeps the printed labels and now serves as the pin-editing reference. `public/USA_map.png` is the same scan with the labels erased, and is what the quiz shows.
