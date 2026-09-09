// Every answer is logged with its timestamp so the progress view can draw a
// history bar per item. Lives in localStorage; nothing leaves the browser.

export interface Attempt {
  /** Epoch milliseconds. */
  t: number
  /** True when answered correctly. */
  c: boolean
  /** Set on attempts carried over from the pre-log format, whose time is approximate. */
  legacy?: true
}

export type ItemLog = Record<string, Attempt[]>

/** Attempts kept per item. Older ones fall off the front. */
export const MAX_ATTEMPTS = 40

const KEY = 'hist220-attempts-v2'
const LEGACY_KEY = 'hist220-progress-v1'

type AllLogs = Record<string, ItemLog>

function readAll(): AllLogs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as AllLogs
  } catch {
    return {}
  }
}

function writeAll(logs: AllLogs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(logs))
  } catch {
    // Storage blocked or full. Progress just won't persist.
  }
}

/**
 * Carries counts from the aggregate format into the log once. Those attempts had
 * no individual timestamps, so they all take the item's last-seen time and are
 * flagged as legacy.
 */
function migrate(): void {
  let raw: string | null
  try {
    raw = localStorage.getItem(LEGACY_KEY)
  } catch {
    return
  }
  if (!raw) return

  try {
    const old = JSON.parse(raw) as Record<
      string,
      Record<string, { right: number; wrong: number; lastSeen: number }>
    >
    const logs = readAll()
    for (const [deckId, items] of Object.entries(old)) {
      const log = logs[deckId] ?? (logs[deckId] = {})
      for (const [itemId, stat] of Object.entries(items)) {
        if (log[itemId]?.length) continue
        const when = stat.lastSeen || Date.now()
        log[itemId] = [
          ...Array.from({ length: stat.wrong }, () => ({ t: when, c: false, legacy: true as const })),
          ...Array.from({ length: stat.right }, () => ({ t: when, c: true, legacy: true as const })),
        ].slice(-MAX_ATTEMPTS)
      }
    }
    writeAll(logs)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Unreadable legacy data is simply dropped.
  }
}

migrate()

export function getLog(deckId: string): ItemLog {
  return readAll()[deckId] ?? {}
}

export function record(deckId: string, itemId: string, correct: boolean): void {
  const logs = readAll()
  const log = logs[deckId] ?? (logs[deckId] = {})
  const attempts = log[itemId] ?? (log[itemId] = [])
  attempts.push({ t: Date.now(), c: correct })
  if (attempts.length > MAX_ATTEMPTS) attempts.splice(0, attempts.length - MAX_ATTEMPTS)
  writeAll(logs)
}

export function resetDeck(deckId: string): void {
  const logs = readAll()
  delete logs[deckId]
  writeAll(logs)
}

export interface ItemStat {
  right: number
  wrong: number
  lastSeen: number
  /** Wrong answers among the five most recent attempts. */
  recentWrong: number
}

const RECENT = 5

export function statOf(attempts: readonly Attempt[] | undefined): ItemStat | undefined {
  if (!attempts?.length) return undefined
  let right = 0
  let wrong = 0
  for (const attempt of attempts) {
    if (attempt.c) right++
    else wrong++
  }
  const recentWrong = attempts.slice(-RECENT).filter((a) => !a.c).length
  return { right, wrong, lastSeen: attempts[attempts.length - 1].t, recentWrong }
}

export function getDeckStats(deckId: string): Record<string, ItemStat> {
  const out: Record<string, ItemStat> = {}
  for (const [itemId, attempts] of Object.entries(getLog(deckId))) {
    const stat = statOf(attempts)
    if (stat) out[itemId] = stat
  }
  return out
}

/** Higher score means the item is shakier and deserves to come up sooner. */
export function weightOf(stat: ItemStat | undefined): number {
  if (!stat) return 3
  const attempts = stat.right + stat.wrong
  if (attempts === 0) return 3
  // Recent misses dominate, so an item you just fixed stops crowding the queue.
  return 0.4 + (stat.wrong / attempts) * 2 + stat.recentWrong * 1.2
}

export interface DeckSummary {
  attempted: number
  unseen: number
  right: number
  wrong: number
  accuracy: number
  shaky: number
}

export function summarize(deckId: string, itemIds: readonly string[]): DeckSummary {
  const stats = getDeckStats(deckId)
  let right = 0
  let wrong = 0
  let attempted = 0
  let shaky = 0
  for (const id of itemIds) {
    const stat = stats[id]
    if (!stat) continue
    attempted++
    right += stat.right
    wrong += stat.wrong
    if (stat.recentWrong > 0) shaky++
  }
  const total = right + wrong
  return {
    attempted,
    unseen: itemIds.length - attempted,
    right,
    wrong,
    accuracy: total ? right / total : 0,
    shaky,
  }
}
