import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useStore } from '@/store/useStore'
import {
  getAvailablePickupDates,
  getPickupDatesForMarket,
  MARKETS,
  applyPreOrderDiscount,
  formatPrice,
  type PickupDate,
} from '@/lib/marketLogic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShoppingBasket, Leaf, CheckCircle, UserCheck, AlertCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { normalizePhone, isValidPhone } from '@/lib/phone'

export default function Checkout() {
  const { cart, clearCart, removeFromCart, name, phone, setUser, clearUser } = useStore()

  // Pickup date state
  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<PickupDate | null>(null)
  const [datesLoading, setDatesLoading] = useState(true)

  // Advanced selection state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedMarketId, setAdvancedMarketId] = useState<string>(MARKETS[0].id)

  // User form state
  const [inputName, setInputName] = useState('')
  const [inputPhone, setInputPhone] = useState('')
  const [showChangeUser, setShowChangeUser] = useState(false)

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Merge dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [pendingSubmitData, setPendingSubmitData] = useState<Record<string, unknown> | null>(null)

  // Fetch excluded dates from Firestore
  useEffect(() => {
    async function fetchExcludedDates() {
      try {
        const ref = doc(db, 'settings', 'dates')
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          setExcludedDates(data.excludedDates ?? [])
        }
      } catch (err) {
        console.error('Error fetching excluded dates:', err)
      } finally {
        setDatesLoading(false)
      }
    }
    fetchExcludedDates()
  }, [])

  // Compute available pickup dates derived from excludedDates
  const pickupDates = useMemo(
    () => (datesLoading ? [] : getAvailablePickupDates(excludedDates)),
    [excludedDates, datesLoading]
  )

  // Advanced picker dates for selected market
  const advancedDates = useMemo(
    () => (datesLoading ? [] : getPickupDatesForMarket(advancedMarketId, excludedDates, 12)),
    [advancedMarketId, excludedDates, datesLoading]
  )

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const originalSubtotal = cart.reduce((item_sum, item) => {
    const { originalPrice } = applyPreOrderDiscount(item.price / (1 - 0.1))
    return item_sum + originalPrice * item.quantity
  }, 0)
  const savings = originalSubtotal - subtotal

  // Effective user data (either stored or from form)
  // phone-only login: phone is set but name may be empty
  const effectiveUser = showChangeUser || !phone
    ? { name: inputName.trim(), phone: normalizePhone(inputPhone) }
    : { name: name || inputName.trim(), phone }

  function validateForm(): string {
    if (!selectedDate) return 'Seleziona una data di ritiro.'
    if (!effectiveUser.name) return 'Inserisci il tuo nome.'
    if (!isValidPhone(effectiveUser.phone))
      return 'Inserisci un numero di telefono valido.'
    if (cart.length === 0) return 'Il carrello è vuoto.'
    return ''
  }

  async function handleSubmit() {
    const error = validateForm()
    if (error) {
      setSubmitError(error)
      return
    }
    setSubmitError('')
    setSubmitting(true)

    const user = effectiveUser
    const orderItems = cart.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      measureUnit: item.measureUnit,
    }))

    const orderData = {
      name: user.name,
      phone: user.phone,
      pickupDate: selectedDate!.dateStr,
      marketId: selectedDate!.market.id,
      marketName: selectedDate!.market.name,
      items: orderItems,
      total: subtotal,
      status: 'pending',
      createdAt: serverTimestamp(),
    }

    try {
      // Check for existing pending order for same phone + same pickup date
      const q = query(
        collection(db, 'orders'),
        where('phone', '==', user.phone),
        where('status', '==', 'pending')
      )
      const snap = await getDocs(q)

      const sameDate = snap.docs.find(
        (d) => d.data().pickupDate === selectedDate!.dateStr
      )

      if (sameDate) {
        // Ask user if they want to merge
        setPendingOrderId(sameDate.id)
        setPendingSubmitData(orderData)
        setMergeDialogOpen(true)
        setSubmitting(false)
        return
      }

      // No conflict — create new order
      await createNewOrder(orderData, user)
    } catch (err) {
      console.error('Error submitting order:', err)
      setSubmitError('Errore durante l\'invio. Riprova.')
      setSubmitting(false)
    }
  }

  async function createNewOrder(
    orderData: Record<string, unknown>,
    user: { name: string; phone: string }
  ) {
    await addDoc(collection(db, 'orders'), orderData)
    setUser(user.name, user.phone)
    clearCart()
    setOrderSuccess(true)
    setSubmitting(false)
  }

  async function handleMergeYes() {
    if (!pendingOrderId || !pendingSubmitData) return
    setMergeDialogOpen(false)
    setSubmitting(true)
    try {
      const orderRef = doc(db, 'orders', pendingOrderId)
      const newItems = (pendingSubmitData.items as unknown[]) ?? []
      await updateDoc(orderRef, {
        items: arrayUnion(...newItems),
        total: (pendingSubmitData.total as number) ?? 0,
      })
      setUser(effectiveUser.name, effectiveUser.phone)
      clearCart()
      setOrderSuccess(true)
    } catch (err) {
      console.error('Error merging order:', err)
      setSubmitError('Errore durante l\'unione dell\'ordine. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMergeNo() {
    if (!pendingSubmitData) return
    setMergeDialogOpen(false)
    setSubmitting(true)
    try {
      await createNewOrder(pendingSubmitData, effectiveUser)
    } catch (err) {
      console.error('Error creating separate order:', err)
      setSubmitError('Errore durante l\'invio. Riprova.')
      setSubmitting(false)
    }
  }

  // Success screen
  if (orderSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cream px-6 text-center">
        <CheckCircle className="h-24 w-24 text-sage" />
        <h1 className="text-4xl font-bold text-bark">Ordine inviato!</h1>
        <p className="text-xl text-soil">
          Grazie {effectiveUser.name || name}! Ci vediamo al mercato.
        </p>
        <p className="text-lg font-semibold text-terracotta">
          {selectedDate?.label}
        </p>
        <Link
          to="/"
          className="rounded-2xl bg-sage px-10 py-5 text-xl font-bold text-cream shadow-md transition-transform active:scale-95 hover:bg-bark"
        >
          Torna ai prodotti
        </Link>
      </div>
    )
  }

  // Empty cart screen
  if (cart.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
        <ShoppingBasket className="h-20 w-20 text-clay" />
        <p className="text-3xl font-bold text-bark">La tua cassetta è vuota.</p>
        <Link
          to="/"
          className="rounded-2xl bg-terracotta px-8 py-4 text-xl font-bold text-cream shadow-md transition-transform active:scale-95 hover:bg-bark"
        >
          Vai ai prodotti
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <h1 className="text-3xl font-bold text-cream">La tua cassetta</h1>
        <p className="mt-1 text-lg text-straw">Riepilogo e ritiro</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">

        {/* Cart summary */}
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-bark">
            Prodotti selezionati
          </h2>
          <div className="divide-y divide-straw">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBasket className="h-7 w-7 text-clay" />
                  <div>
                    <p className="text-lg font-semibold text-bark">
                      {item.productName}
                    </p>
                    <p className="text-base text-soil">
                      {item.quantity} {item.measureUnit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-terracotta">
                    {formatPrice(item.price * item.quantity, '')}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    aria-label={`Rimuovi ${item.productName}`}
                    className="rounded-xl p-2 text-clay transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t border-straw pt-4">
            <div className="flex justify-between text-base text-clay line-through">
              <span>Prezzo pieno</span>
              <span>€ {originalSubtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-sage">
              <span className="flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Sconto pre-ordine (-10%)
              </span>
              <span>- € {savings.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-bark">
              <span>Totale</span>
              <span className="text-terracotta">
                € {subtotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </section>

        {/* Pickup date selection */}
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-bark">
            Scegli data e mercato
          </h2>
          {datesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-straw" />
              ))}
            </div>
          ) : pickupDates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-10 w-10 text-clay" />
              <p className="text-lg font-semibold text-soil">
                Nessuna data disponibile al momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pickupDates.map((pd) => (
                <DateButton
                  key={pd.dateStr}
                  pd={pd}
                  isSelected={selectedDate?.dateStr === pd.dateStr}
                  onSelect={setSelectedDate}
                />
              ))}
            </div>
          )}

          {/* Advanced selection toggle */}
          {!datesLoading && (
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sage py-3 text-base font-bold text-soil transition-colors hover:border-terracotta hover:text-bark"
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="h-5 w-5" />
                  Nascondi selezione avanzata
                </>
              ) : (
                <>
                  <ChevronDown className="h-5 w-5" />
                  Selezione avanzata
                </>
              )}
            </button>
          )}

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="mt-4 space-y-4 border-t border-straw pt-4">
              {/* Market chips */}
              <div>
                <p className="mb-2 text-base font-bold text-bark">Mercato</p>
                <div className="flex flex-wrap gap-2">
                  {MARKETS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setAdvancedMarketId(m.id)}
                      aria-pressed={advancedMarketId === m.id}
                      className={`rounded-2xl border-2 px-5 py-2.5 text-base font-bold transition-colors ${
                        advancedMarketId === m.id
                          ? 'border-terracotta bg-terracotta text-cream'
                          : 'border-sage bg-cream text-bark hover:border-terracotta hover:bg-straw'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates for selected market */}
              <div>
                <p className="mb-2 text-base font-bold text-bark">Data</p>
                {advancedDates.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-straw/50 px-4 py-3 text-base text-soil">
                    <AlertCircle className="h-5 w-5 shrink-0 text-clay" />
                    Nessuna data disponibile per questo mercato.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {advancedDates.map((pd) => (
                      <DateButton
                        key={pd.dateStr}
                        pd={pd}
                        isSelected={selectedDate?.dateStr === pd.dateStr}
                        onSelect={(pd) => {
                          setSelectedDate(pd)
                          setShowAdvanced(false)
                        }}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Authentication block */}
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-bark">I tuoi dati</h2>

          {phone && !showChangeUser ? (
            /* Returning user (phone known, name may or may not be set) */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-2xl bg-sage/10 p-5">
                <UserCheck className="h-10 w-10 text-sage" />
                <div>
                  <p className="text-2xl font-bold text-bark">
                    {name ? `Bentornato, ${name}!` : 'Bentornato!'}
                  </p>
                  <p className="text-lg text-soil">{phone}</p>
                </div>
              </div>

              {/* Ask for name if not yet stored */}
              {!name && (
                <div>
                  <label
                    htmlFor="checkout-name-returning"
                    className="mb-2 block text-xl font-bold text-bark"
                  >
                    Come ti chiami?
                  </label>
                  <input
                    id="checkout-name-returning"
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="w-full rounded-2xl border-2 border-sage bg-cream px-5 py-4 text-xl text-bark placeholder-clay outline-none focus:border-terracotta"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  setShowChangeUser(true)
                  setInputName(name)
                  setInputPhone(phone)
                }}
                className="text-base font-semibold text-clay underline underline-offset-2 hover:text-bark"
              >
                Cambia utente
              </button>
            </div>
          ) : (
            /* New user or changing user */
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="mb-2 block text-xl font-bold text-bark"
                >
                  Nome
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full rounded-2xl border-2 border-sage bg-cream px-5 py-4 text-xl text-bark placeholder-clay outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label
                  htmlFor="checkout-phone"
                  className="mb-2 block text-xl font-bold text-bark"
                >
                  Numero di Telefono
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="3XX XXX XXXX"
                  className="w-full rounded-2xl border-2 border-sage bg-cream px-5 py-4 text-xl text-bark placeholder-clay outline-none focus:border-terracotta"
                />
              </div>
              {showChangeUser && (
                <button
                  onClick={() => {
                    clearUser()
                    setShowChangeUser(false)
                    setInputName('')
                    setInputPhone('')
                  }}
                  className="text-base font-semibold text-clay underline underline-offset-2 hover:text-bark"
                >
                  Annulla
                </button>
              )}
            </div>
          )}
        </section>

        {/* Error message */}
        {submitError && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-lg font-semibold">{submitError}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-terracotta py-6 text-2xl font-bold text-cream shadow-lg transition-transform active:scale-[0.98] hover:bg-bark disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Invio in corso...' : 'Conferma il pre-ordine'}
        </button>
      </div>

      {/* Order merge dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent
          className="rounded-2xl bg-cream p-8 sm:max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-bark">
              Hai già un ordine!
            </DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-center text-lg text-soil">
            Hai già un ordine in consegna per questa data. Vuoi unire i prodotti
            nella stessa cassetta?
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <button
              onClick={handleMergeYes}
              className="w-full rounded-2xl bg-terracotta py-5 text-xl font-bold text-cream transition-colors hover:bg-bark active:bg-bark"
            >
              Sì, unisci la cassetta
            </button>
            <button
              onClick={handleMergeNo}
              className="w-full rounded-2xl border-3 border-sage py-5 text-xl font-bold text-sage transition-colors hover:bg-sage hover:text-cream active:bg-sage active:text-cream"
            >
              No, crea un nuovo ordine
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DateButton({
  pd,
  isSelected,
  onSelect,
  compact = false,
}: {
  pd: PickupDate
  isSelected: boolean
  onSelect: (pd: PickupDate) => void
  compact?: boolean
}) {
  const datePart = pd.label.split('—')[1]?.trim() ?? ''
  return (
    <button
      onClick={() => onSelect(pd)}
      className={`w-full rounded-2xl border-3 text-left font-bold transition-all active:scale-[0.98] ${
        compact ? 'px-4 py-3' : 'px-6 py-5'
      } ${
        isSelected
          ? 'border-terracotta bg-terracotta text-cream shadow-lg'
          : 'border-sage bg-cream text-bark hover:border-terracotta hover:bg-straw'
      }`}
    >
      <span className={`block font-bold ${compact ? 'text-lg' : 'text-2xl'}`}>
        {pd.market.name}
      </span>
      <span className={`block font-semibold capitalize ${isSelected ? 'text-straw' : 'text-soil'} ${compact ? 'text-base' : 'text-lg'}`}>
        {datePart}
      </span>
    </button>
  )
}
