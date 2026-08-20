'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [role, setRole] = useState<'agent' | 'admin'>('agent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      role,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid credentials or role mismatch. Please check your email, password, and selected role.')
    } else {
      router.push(role === 'admin' ? '/admin' : '/secretary')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Call Track</h1>
          <p className="text-gray-500 mt-1">Marketing Call & Feedback</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Role Toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole('agent')}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                role === 'agent' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              Secretary
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                role === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base min-h-[44px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Secretary'}`}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
