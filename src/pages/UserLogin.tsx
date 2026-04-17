import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { normalizePhone, isValidPhone } from '@/lib/phone'
import { Phone } from 'lucide-react'

export default function UserLogin() {
  const { setUser } = useStore()
  const navigate = useNavigate()

  const [inputPhone, setInputPhone] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPhone(inputPhone)) {
      setError('Inserisci un numero di telefono valido.')
      return
    }
    setUser('', normalizePhone(inputPhone))
    navigate('/ordini')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-bark">I miei ordini</h1>
          <p className="mt-2 text-xl text-soil">
            Inserisci il tuo numero di telefono per vedere i tuoi ordini
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-8 shadow-md">
          <div>
            <label htmlFor="login-phone" className="mb-2 block text-xl font-bold text-bark">
              <span className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-sage" />
                Numero di Telefono
              </span>
            </label>
            <input
              id="login-phone"
              type="tel"
              value={inputPhone}
              onChange={(e) => { setInputPhone(e.target.value); setError('') }}
              placeholder="3XX XXX XXXX"
              className="w-full rounded-2xl border-2 border-sage bg-cream px-5 py-4 text-xl text-bark placeholder-clay outline-none focus:border-terracotta"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-base font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-terracotta py-5 text-xl font-bold text-cream shadow-md transition-transform active:scale-[0.98] hover:bg-bark"
          >
            Vedi i miei ordini
          </button>
        </form>
      </div>
    </div>
  )
}
