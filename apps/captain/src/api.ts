import { createApiClient } from '@kt82/shared'

export const TEAM_ID_KEY = 'captain_team_id'
export const PIN_KEY = 'captain_pin'

export function getTeamId(): string | null {
  return localStorage.getItem(TEAM_ID_KEY)
}

export const api = createApiClient('/api', () => {
  const pin = localStorage.getItem(PIN_KEY)
  const headers: Record<string, string> = {}
  if (pin) headers['X-Team-Pin'] = pin
  return headers
})

export async function deleteWithBody(path: string, body: unknown): Promise<void> {
  const pin = localStorage.getItem(PIN_KEY) ?? ''
  const res = await fetch(`/api${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(pin ? { 'X-Team-Pin': pin } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DELETE ${path} → ${res.status}: ${text}`)
  }
}
