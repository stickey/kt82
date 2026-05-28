import { createApiClient } from '@kt82/shared'

export const PASSWORD_KEY = 'manager_password'
export const PINS_KEY = 'manager_team_pins'

export function getStoredPins(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) ?? '{}') } catch { return {} }
}

export function storePin(teamId: string, pin: string): void {
  const pins = getStoredPins()
  pins[teamId] = pin
  localStorage.setItem(PINS_KEY, JSON.stringify(pins))
}

export const api = createApiClient('/api', () => {
  const pw = localStorage.getItem(PASSWORD_KEY) ?? ''
  return pw ? { 'X-Admin-Password': pw } : {}
})
