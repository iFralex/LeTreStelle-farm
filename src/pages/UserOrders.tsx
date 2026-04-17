import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useStore } from '@/store/useStore'
import { addDays, isBefore, parseISO, startOfDay, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ShoppingBasket, CheckCircle, XCircle, Clock, LogOut } from 'lucide-react'

interface OrderItem {
  productId: string
  quantity: number
  price: number
  measureUnit: string
}

interface Order {
  id: string
  name: string
  phone: string
  pickupDate: string
  marketId: string
  marketName: string
  items: OrderItem[]
  total: number
  status: string
  createdAt: { toDate?: () => Date } | null
}

const LEAD_TIME_DAYS = 2

function canCancel(pickupDate: string): boolean {
  const pickup = startOfDay(parseISO(pickupDate))
  const deadline = startOfDay(addDays(new Date(), LEAD_TIME_DAYS))
  return isBefore(deadline, pickup)
}

function formatPickupDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: it })
  } catch {
    return dateStr
  }
}

function statusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case 'pending':
      return { text: 'In attesa di ritiro', color: 'text-sage' }
    case 'ritirato':
      return { text: 'Ritirato', color: 'text-bark' }
    case 'non_ritirato':
      return { text: 'Non ritirato', color: 'text-clay' }
    case 'annullato':
      return { text: 'Annullato', color: 'text-clay' }
    default:
      return { text: status, color: 'text-soil' }
  }
}

export default function UserOrders() {
  const { name, phone, clearUser } = useStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(!!phone)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (!phone) {
      return
    }

    async function fetchOrders() {
      try {
        const q = query(collection(db, 'orders'), where('phone', '==', phone))
        const snap = await getDocs(q)
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
        // Sort: pending first, then by pickup date descending
        fetched.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1
          if (a.status !== 'pending' && b.status === 'pending') return 1
          return b.pickupDate.localeCompare(a.pickupDate)
        })
        setOrders(fetched)
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [phone])

  async function handleCancel(orderId: string) {
    setCancellingId(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'annullato' })
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'annullato' } : o))
      )
    } catch (err) {
      console.error('Error cancelling order:', err)
    } finally {
      setCancellingId(null)
    }
  }

  // Not logged in
  if (!phone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
        <ShoppingBasket className="h-20 w-20 text-clay" />
        <p className="text-3xl font-bold text-bark">Accedi per vedere i tuoi ordini</p>
        <Link
          to="/login"
          className="rounded-2xl bg-terracotta px-8 py-4 text-xl font-bold text-cream shadow-md transition-transform active:scale-95 hover:bg-bark"
        >
          Accedi
        </Link>
      </div>
    )
  }

  const pending = orders.filter((o) => o.status === 'pending')
  const past = orders.filter((o) => o.status !== 'pending')

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <h1 className="text-3xl font-bold text-cream">I miei ordini</h1>
        <p className="mt-1 text-lg text-straw">Ciao, {name}!</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-straw" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <ShoppingBasket className="h-16 w-16 text-clay" />
            <p className="text-2xl font-bold text-bark">Nessun ordine trovato.</p>
            <Link
              to="/"
              className="rounded-2xl bg-terracotta px-8 py-4 text-xl font-bold text-cream shadow-md transition-transform active:scale-95 hover:bg-bark"
            >
              Vai ai prodotti
            </Link>
          </div>
        ) : (
          <>
            {/* Pending orders */}
            {pending.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-bark">
                  <Clock className="h-7 w-7 text-sage" />
                  In Consegna
                </h2>
                <div className="space-y-4">
                  {pending.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancel}
                      cancellingId={cancellingId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past orders */}
            {past.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-bark">
                  <CheckCircle className="h-7 w-7 text-clay" />
                  Passati
                </h2>
                <div className="space-y-4">
                  {past.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancel}
                      cancellingId={cancellingId}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Logout */}
        <button
          onClick={clearUser}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-clay py-4 text-xl font-bold text-clay transition-colors hover:bg-clay hover:text-cream"
        >
          <LogOut className="h-6 w-6" />
          Cambia utente
        </button>
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onCancel,
  cancellingId,
}: {
  order: Order
  onCancel: (id: string) => void
  cancellingId: string | null
}) {
  const { text: statusText, color: statusColor } = statusLabel(order.status)
  const showCancelBtn = order.status === 'pending' && canCancel(order.pickupDate)
  const isCancelling = cancellingId === order.id

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      {/* Market + date */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold text-bark">{order.marketName}</p>
          <p className="text-base font-semibold text-soil">{formatPickupDate(order.pickupDate)}</p>
        </div>
        <span className={`shrink-0 text-base font-bold ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* Items */}
      <div className="mb-4 divide-y divide-straw border-t border-straw">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-3">
            <span className="text-base font-semibold text-bark">
              {item.productId}
            </span>
            <span className="text-base text-soil">
              {item.quantity} {item.measureUnit}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between border-t border-straw pt-3 text-xl font-bold text-bark">
        <span>Totale</span>
        <span className="text-terracotta">€ {order.total.toFixed(2).replace('.', ',')}</span>
      </div>

      {/* Cancel button */}
      {showCancelBtn && (
        <button
          onClick={() => onCancel(order.id)}
          disabled={isCancelling}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-400 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          <XCircle className="h-5 w-5" />
          {isCancelling ? 'Annullamento...' : 'Annulla Ordine'}
        </button>
      )}
    </div>
  )
}
