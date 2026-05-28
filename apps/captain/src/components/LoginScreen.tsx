import { useState } from 'react'
import { api, TEAM_ID_KEY, PIN_KEY } from '../api'

interface Props {
  onSuccess: () => void
}

export function LoginScreen({ onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { teamId } = await api.post<{ teamId: string }>('/auth/team', { pin })
      localStorage.setItem(PIN_KEY, pin)
      localStorage.setItem(TEAM_ID_KEY, teamId)
      onSuccess()
    } catch {
      setError('Wrong PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">KT82 Captain</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your team PIN to continue</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Team PIN"
            autoFocus
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base font-mono tracking-widest"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 text-base transition-colors"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
