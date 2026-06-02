const KEY = 'kt82_pending_action'

export type PendingAction = {
  resultId: string
  finishedAt: string
  action: 'lap'
}

export function enqueue(action: PendingAction): void {
  localStorage.setItem(KEY, JSON.stringify(action))
}

export function peek(): PendingAction | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as PendingAction }
  catch { return null }
}

export function dequeue(): void {
  localStorage.removeItem(KEY)
}
