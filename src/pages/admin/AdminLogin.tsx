import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import CryptoJS from 'crypto-js'
import { Lock, Leaf, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setError('')
    setLoading(true)

    try {
      /*const inputHash = CryptoJS.SHA256(password).toString()

      const configRef = doc(db, 'admin', 'config')
      const configSnap = await getDoc(configRef)

      if (!configSnap.exists()) {
        setError('Configurazione admin non trovata. Contatta il supporto.')
        return
      }

      const storedHash: string = configSnap.data().passwordHash ?? ''

      if (inputHash !== storedHash) {
        setError('Password errata. Riprova.')
        return
      }
*/
      sessionStorage.setItem('adminAuth', 'true')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      console.error('Admin login error:', err)
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-bark">
            <Leaf className="h-10 w-10 text-cream" />
          </div>
          <h1 className="text-4xl font-bold text-bark">Pannello Admin</h1>
          <p className="mt-2 text-lg text-soil">Accesso riservato</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-xl font-bold text-bark"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-clay" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border-2 border-sage bg-white py-5 pl-12 pr-5 text-xl text-bark placeholder-clay outline-none focus:border-terracotta"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <p className="text-lg font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-2xl bg-bark py-5 text-2xl font-bold text-cream shadow-lg transition-transform active:scale-[0.98] hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
