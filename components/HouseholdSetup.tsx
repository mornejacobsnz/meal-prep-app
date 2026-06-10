'use client'
import { useState } from 'react'
import { createHousehold, joinHousehold } from '@/lib/household'
import { Users, Plus, LogIn, Copy, Check } from 'lucide-react'

interface Props {
  onReady: (householdId: string, code: string) => void
}

export default function HouseholdSetup({ onReady }: Props) {
  const [mode, setMode] = useState<'choose' | 'join' | 'created'>('choose')
  const [joinCode, setJoinCode] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pendingReady, setPendingReady] = useState<{ householdId: string; code: string } | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    const result = await createHousehold()
    setLoading(false)
    if (!result) { setError('Could not create household. Try again.'); return }
    setCreatedCode(result.code)
    setPendingReady(result)
    setMode('created')
  }

  const handleJoin = async () => {
    if (joinCode.length < 6) { setError('Enter your 6-character code'); return }
    setLoading(true)
    setError('')
    const hid = await joinHousehold(joinCode)
    setLoading(false)
    if (!hid) { setError('Code not found — check it and try again'); return }
    onReady(hid, joinCode.toUpperCase())
  }

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (mode === 'created') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Users size={28} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Household created!</h1>
            <p className="text-gray-500 text-sm">Share this code with your partner so they can join your plan.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="text-4xl font-bold tracking-[0.3em] text-gray-900 mb-3">{createdCode}</div>
            <button onClick={copyCode} className="flex items-center gap-1.5 mx-auto text-sm text-emerald-600 font-medium">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <p className="text-xs text-gray-400">Your partner opens the app and taps "Join household", then enters this code.</p>
          <button
            onClick={() => pendingReady && onReady(pendingReady.householdId, pendingReady.code)}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-lg hover:bg-emerald-600 transition-colors"
          >
            Let's go →
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'join') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
        <div className="w-full max-w-sm space-y-6">
          <button onClick={() => { setMode('choose'); setError('') }} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join a household</h1>
            <p className="text-gray-500 text-sm">Enter the 6-character code from your partner.</p>
          </div>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="w-full text-center text-3xl font-bold tracking-[0.3em] border-2 border-gray-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-400 uppercase"
            autoFocus
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length < 6}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-lg disabled:opacity-50 hover:bg-emerald-600 transition-colors"
          >
            {loading ? 'Joining...' : 'Join household'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <div className="text-5xl mb-4">🥗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meal Prep</h1>
          <p className="text-gray-500 text-sm">Plan meals together. Start by creating a household or joining one your partner set up.</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 text-white font-bold rounded-2xl text-base hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
            Create household
          </button>
          <button
            onClick={() => { setMode('join'); setError('') }}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl text-base hover:bg-gray-200 transition-colors"
          >
            <LogIn size={20} />
            Join household
          </button>
        </div>
      </div>
    </div>
  )
}
