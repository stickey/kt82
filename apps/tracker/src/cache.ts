export function setCache(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }))
}

export function getCache<T>(key: string): { data: T; ageMs: number } | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const { data, savedAt } = JSON.parse(raw)
    if (typeof savedAt !== 'number') return null
    return { data: data as T, ageMs: Date.now() - savedAt }
  } catch {
    return null
  }
}
