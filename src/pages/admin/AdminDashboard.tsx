import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MARKETS } from '@/lib/marketLogic'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LogOut,
  ShoppingBasket,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Leaf,
  Package,
} from 'lucide-react'

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

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: it })
  } catch {
    return dateStr
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { text: 'In attesa', bg: 'bg-sage/20 text-bark', icon: Clock }
    case 'ritirato':
      return { text: 'Ritirato', bg: 'bg-green-100 text-green-800', icon: CheckCircle }
    case 'non_ritirato':
      return { text: 'Non ritirato', bg: 'bg-red-100 text-red-800', icon: XCircle }
    case 'annullato':
      return { text: 'Annullato', bg: 'bg-clay/20 text-clay', icon: XCircle }
    default:
      return { text: status, bg: 'bg-straw text-soil', icon: Package }
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Filters
  const [filterMarket, setFilterMarket] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')

  useEffect(() => {
    async function fetchOrders() {
      try {
        const snap = await getDocs(collection(db, 'orders'))
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
  }, [])

  async function handleStatusChange(orderId: string, newStatus: 'ritirato' | 'non_ritirato') {
    setUpdatingId(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus })
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } catch (err) {
      console.error('Error updating order status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    navigate('/admin', { replace: true })
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterMarket !== 'all' && o.marketId !== filterMarket) return false
      if (filterDate && o.pickupDate !== filterDate) return false
      return true
    })
  }, [orders, filterMarket, filterDate])

  // Unique pickup dates for the date filter dropdown
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(orders.map((o) => o.pickupDate))).sort().reverse()
    return dates
  }, [orders])

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-straw" />
            <div>
              <h1 className="text-3xl font-bold text-cream">Dashboard Ordini</h1>
              <p className="text-base text-straw">{orders.length} ordini totali</p>
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

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">

        {/* Filters */}
        <section className="rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-5 w-5 text-clay" />
            <h2 className="text-xl font-bold text-bark">Filtra ordini</h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Market filter */}
            <div className="flex-1">
              <label className="mb-1 block text-base font-semibold text-soil">
                Mercato
              </label>
              <select
                value={filterMarket}
                onChange={(e) => setFilterMarket(e.target.value)}
                className="w-full rounded-xl border-2 border-sage bg-cream px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
              >
                <option value="all">Tutti i mercati</option>
                {MARKETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="flex-1">
              <label className="mb-1 block text-base font-semibold text-soil">
                Data di ritiro
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-xl border-2 border-sage bg-cream px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
              >
                <option value="">Tutte le date</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDate(d)}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset filters */}
            {(filterMarket !== 'all' || filterDate !== '') && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterMarket('all')
                    setFilterDate('')
                  }}
                  className="rounded-xl border-2 border-clay px-4 py-3 text-base font-bold text-clay transition-colors hover:bg-clay hover:text-cream"
                >
                  Azzera
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="mt-3 text-base font-semibold text-soil">
            {filteredOrders.length} ordini visualizzati
          </p>
        </section>

        {/* Orders list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-straw" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <ShoppingBasket className="h-16 w-16 text-clay" />
            <p className="text-2xl font-bold text-bark">Nessun ordine trovato.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                updatingId={updatingId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminOrderCard({
  order,
  updatingId,
  onStatusChange,
}: {
  order: Order
  updatingId: string | null
  onStatusChange: (id: string, status: 'ritirato' | 'non_ritirato') => void
}) {
  const { text, bg, icon: StatusIcon } = statusBadge(order.status)
  const isUpdating = updatingId === order.id

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-bark">{order.marketName}</p>
          <p className="text-base font-semibold text-soil">{formatDate(order.pickupDate)}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${bg}`}>
          <StatusIcon className="h-4 w-4" />
          {text}
        </span>
      </div>

      {/* Customer */}
      <div className="mb-4 rounded-xl bg-cream px-4 py-3">
        <p className="text-lg font-bold text-bark">{order.name}</p>
        <p className="text-base text-soil">{order.phone}</p>
      </div>

      {/* Items */}
      <div className="mb-4 divide-y divide-straw border-t border-straw">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <span className="text-base font-semibold text-bark">{item.productId}</span>
            <span className="text-base text-soil">
              {item.quantity} {item.measureUnit}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mb-4 flex justify-between border-t border-straw pt-3 text-xl font-bold text-bark">
        <span>Totale</span>
        <span className="text-terracotta">€ {order.total.toFixed(2).replace('.', ',')}</span>
      </div>

      {/* Status action buttons (only for pending orders) */}
      {order.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => onStatusChange(order.id, 'ritirato')}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage py-3 text-base font-bold text-cream transition-colors hover:bg-bark disabled:opacity-60"
          >
            <CheckCircle className="h-5 w-5" />
            {isUpdating ? '...' : 'Ritirato'}
          </button>
          <button
            onClick={() => onStatusChange(order.id, 'non_ritirato')}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-clay py-3 text-base font-bold text-clay transition-colors hover:bg-clay hover:text-cream disabled:opacity-60"
          >
            <XCircle className="h-5 w-5" />
            {isUpdating ? '...' : 'Non ritirato'}
          </button>
        </div>
      )}
    </div>
  )
}
