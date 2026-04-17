import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { LogOut, Leaf, CalendarX, Plus, Trash2, Loader2 } from 'lucide-react'

export default function AdminSettings() {
  const navigate = useNavigate()

  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDates() {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'settings', 'dates'))
        if (snap.exists()) {
          setExcludedDates((snap.data().excludedDates as string[]) ?? [])
        }
      } catch (err) {
        console.error('Error fetching excluded dates:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDates()
  }, [])

  async function saveDates(dates: string[]) {
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'dates'), { excludedDates: dates }, { merge: true })
      setExcludedDates(dates)
    } catch (err) {
      console.error('Error saving excluded dates:', err)
      setError('Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  function handleAddDate() {
    setError(null)
    if (!newDate) {
      setError('Seleziona una data.')
      return
    }
    if (excludedDates.includes(newDate)) {
      setError('Questa data è già esclusa.')
      return
    }
    const sorted = [...excludedDates, newDate].sort()
    saveDates(sorted)
    setNewDate('')
  }

  function handleRemoveDate(dateStr: string) {
    const updated = excludedDates.filter((d) => d !== dateStr)
    saveDates(updated)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    navigate('/admin', { replace: true })
  }

  const today = startOfDay(new Date())

  const upcomingDates = excludedDates
    .filter((d) => !isBefore(parseISO(d), today))
    .sort()

  const pastDates = excludedDates
    .filter((d) => isBefore(parseISO(d), today))
    .sort()
    .reverse()

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-straw" />
            <div>
              <h1 className="text-3xl font-bold text-cream">Impostazioni</h1>
              <p className="text-base text-straw">Date di mercato escluse</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border-2 border-straw px-4 py-2 text-base font-bold text-straw transition-colors hover:bg-straw hover:text-bark"
          >
            <LogOut className="h-5 w-5" />
            Esci
          </button>
        </div>
      </div>

      {/* Admin nav */}
      <div className="border-b border-straw bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl gap-4 overflow-x-auto">
          {[
            { to: '/admin/dashboard', label: 'Ordini' },
            { to: '/admin/catalog', label: 'Catalogo' },
            { to: '/admin/qr-generator', label: 'QR Code' },
            { to: '/admin/settings', label: 'Impostazioni' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="shrink-0 rounded-xl px-4 py-2 text-base font-bold text-bark transition-colors hover:bg-straw"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        {/* Explanation */}
        <div className="rounded-2xl border-2 border-straw bg-white p-6">
          <div className="flex items-start gap-3">
            <CalendarX className="mt-1 h-6 w-6 shrink-0 text-terracotta" />
            <div>
              <h2 className="text-xl font-bold text-bark">Date Escluse dal Mercato</h2>
              <p className="mt-1 text-base text-soil">
                Le date aggiunte qui non saranno disponibili per il ritiro durante il checkout.
                Utile per festività, chiusure o altri imprevisti.
              </p>
            </div>
          </div>
        </div>

        {/* Add date form */}
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="mb-4 text-lg font-bold text-bark">Aggiungi Data Esclusa</h3>
          <div className="flex gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => { setNewDate(e.target.value); setError(null) }}
              min={format(today, 'yyyy-MM-dd')}
              className="flex-1 rounded-xl border-2 border-sage bg-cream px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
            />
            <button
              onClick={handleAddDate}
              disabled={saving || !newDate}
              className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-base font-bold text-cream transition-colors hover:bg-bark disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Aggiungi
            </button>
          </div>
          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Current excluded dates */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-straw" />
            ))}
          </div>
        ) : (
          <>
            {upcomingDates.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-bold text-bark">
                  Date Future Escluse ({upcomingDates.length})
                </h3>
                <div className="space-y-3">
                  {upcomingDates.map((dateStr) => (
                    <DateRow
                      key={dateStr}
                      dateStr={dateStr}
                      isPast={false}
                      saving={saving}
                      onRemove={handleRemoveDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingDates.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-straw py-12 text-center">
                <CalendarX className="h-12 w-12 text-clay" />
                <p className="text-xl font-bold text-bark">Nessuna data esclusa</p>
                <p className="text-base text-soil">
                  Aggiungi una data sopra per escluderla dal calendario ordini.
                </p>
              </div>
            )}

            {pastDates.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-bold text-soil">
                  Date Passate ({pastDates.length})
                </h3>
                <div className="space-y-3">
                  {pastDates.map((dateStr) => (
                    <DateRow
                      key={dateStr}
                      dateStr={dateStr}
                      isPast={true}
                      saving={saving}
                      onRemove={handleRemoveDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DateRow({
  dateStr,
  isPast,
  saving,
  onRemove,
}: {
  dateStr: string
  isPast: boolean
  saving: boolean
  onRemove: (d: string) => void
}) {
  const parsed = parseISO(dateStr)
  const label = format(parsed, 'EEEE d MMMM yyyy')

  return (
    <div
      className={`flex items-center justify-between rounded-2xl p-4 shadow-sm ${
        isPast ? 'bg-straw/50 opacity-60' : 'bg-white'
      }`}
    >
      <div>
        <p className="text-lg font-bold text-bark capitalize">{label}</p>
        {isPast && (
          <p className="text-sm font-semibold text-clay">Data passata</p>
        )}
      </div>
      <button
        onClick={() => onRemove(dateStr)}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl border-2 border-clay px-3 py-2 text-sm font-bold text-clay transition-colors hover:bg-clay hover:text-cream disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        Rimuovi
      </button>
    </div>
  )
}
