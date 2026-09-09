export function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function sample<T>(input: readonly T[], n: number): T[] {
  return shuffle(input).slice(0, n)
}

/** Strips case, accents, punctuation and filler words so near-misses count. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|of|river|r)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let corner = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        corner + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      corner = above
    }
  }
  return prev[b.length]
}

/** Accepts a typed answer if it matches any candidate within a small typo budget. */
export function matches(typed: string, candidates: readonly string[]): boolean {
  const guess = normalize(typed)
  if (!guess) return false
  return candidates.some((candidate) => {
    const target = normalize(candidate)
    if (!target) return false
    if (guess === target) return true
    const budget = target.length <= 4 ? 0 : target.length <= 8 ? 1 : 2
    return editDistance(guess, target) <= budget
  })
}

/**
 * Resolves a deck asset against the site's base path. GitHub Pages serves the
 * app from a subfolder, where a leading-slash URL would point at the domain root.
 */
export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path
  return import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
}
