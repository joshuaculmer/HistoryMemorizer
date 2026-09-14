// Preferences that outlive a session. Same localStorage-only rule as progress.

export interface Settings {
  /** Seconds a multiple-choice prompt stands alone before the choices appear. */
  revealDelay: number
}

export const DEFAULTS: Settings = { revealDelay: 5 }

export const MIN_DELAY = 1
export const MAX_DELAY = 60

const KEY = 'hist220-settings-v1'

export function readSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    const delay = Number(raw.revealDelay)
    return {
      revealDelay: Number.isFinite(delay)
        ? Math.min(MAX_DELAY, Math.max(MIN_DELAY, Math.round(delay)))
        : DEFAULTS.revealDelay,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeSettings(next: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked or full. The choice just won't stick.
  }
}
