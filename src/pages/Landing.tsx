import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatPrice } from '@/lib/marketLogic'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ShoppingBasket, Leaf } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  measureUnit: string
  images: string[]
  isAvailable: boolean
}

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.match(/pomodor/)) return '🍅'
  if (n.match(/zucch/)) return '🥒'
  if (n.match(/fragol/)) return '🍓'
  if (n.match(/insalat|lattug/)) return '🥬'
  if (n.match(/carota/)) return '🥕'
  if (n.match(/cipoll/)) return '🧅'
  if (n.match(/aglio/)) return '🧄'
  if (n.match(/\bmela\b/)) return '🍎'
  if (n.match(/\bpera\b/)) return '🍐'
  if (n.match(/uva/)) return '🍇'
  if (n.match(/peperone/)) return '🫑'
  if (n.match(/patata/)) return '🥔'
  if (n.match(/mais|granturco/)) return '🌽'
  if (n.match(/miele/)) return '🍯'
  if (n.match(/uov/)) return '🥚'
  if (n.match(/basilic|prezzeml|rosmar/)) return '🌿'
  return '🌱'
}

function BotanicalBranch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="30" y1="158" x2="30" y2="10" />
      <path d="M30,130 Q12,112 4,122" />
      <path d="M30,100 Q48,82 56,92" />
      <path d="M30,72 Q10,54 6,38" />
      <path d="M30,48 Q50,30 54,14" />
      <circle cx="30" cy="10" r="3" fill="currentColor" />
      <circle cx="4" cy="122" r="2" fill="currentColor" />
      <circle cx="56" cy="92" r="2" fill="currentColor" />
      <circle cx="6" cy="38" r="2" fill="currentColor" />
      <circle cx="54" cy="14" r="2" fill="currentColor" />
    </svg>
  )
}

export default function Landing() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, 'products'),
          where('isAvailable', '==', true)
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
        setProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-bark px-6 pt-14 pb-0 text-center text-cream">
        {/* Botanical side decorations */}
        <BotanicalBranch className="absolute left-6 bottom-8 hidden h-44 text-sage/30 sm:block" />
        <BotanicalBranch className="absolute right-6 bottom-8 hidden h-44 -scale-x-100 text-sage/30 sm:block" />

        <div className="relative mx-auto max-w-2xl pb-16">
          {/* 3 stars accent */}
          <div className="mb-5 flex justify-center gap-3 text-golden text-2xl tracking-widest">
            ★ ★ ★
          </div>

          {/* Animated "Fresco di campo!" badge */}
          <div className="mb-6 flex justify-center">
            <span className="badge-bounce inline-flex items-center gap-2 rounded-full border-2 border-golden/50 bg-golden/15 px-5 py-2 text-sm font-bold text-golden">
              🌻 Fresco di campo!
            </span>
          </div>

          <h1 className="mb-5 font-heading text-5xl font-bold italic leading-tight md:text-6xl">
            Le Tre Stelle Farm
          </h1>
          <p className="text-xl leading-relaxed text-straw/90 md:text-2xl">
            Prodotti freschi dalla nostra terra, direttamente a te.
            Prenota la tua cassetta con anticipo e ricevi uno{' '}
            <span className="font-bold text-golden">sconto del 10%</span>.
          </p>
        </div>

        {/* Bark → Terracotta wave */}
        <div className="pointer-events-none -mb-px">
          <svg
            viewBox="0 0 1440 56"
            preserveAspectRatio="none"
            className="block h-14 w-full"
            style={{ fill: '#C4633A' }}
          >
            <path d="M0,28 C180,56 360,0 540,28 C720,56 900,0 1080,28 C1260,56 1380,14 1440,28 L1440,56 L0,56 Z" />
          </svg>
        </div>
      </section>

      {/* Pre-order callout */}
      <section className="relative bg-terracotta px-6 py-6 text-center text-cream">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3">
          <span className="text-2xl" aria-hidden="true">🧺</span>
          <p className="text-lg font-semibold md:text-xl">
            Scansiona il QR sulla cassetta e pre-ordina — ritiro al mercato!
          </p>
        </div>

        {/* Terracotta → Cream wave */}
        <div className="pointer-events-none -mb-px mt-6">
          <svg
            viewBox="0 0 1440 48"
            preserveAspectRatio="none"
            className="block h-12 w-full"
            style={{ fill: '#F5F0E8' }}
          >
            <path d="M0,24 C360,48 720,0 1080,24 C1260,36 1380,12 1440,24 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

      {/* Products */}
      <section className="px-6 pt-8 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center justify-center gap-3">
            <Leaf className="h-6 w-6 text-sage" />
            <h2 className="font-heading text-3xl font-bold italic text-bark md:text-4xl">
              Prodotti disponibili
            </h2>
            <Leaf className="h-6 w-6 text-sage" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-md">
                  <div className="aspect-square animate-pulse bg-straw" />
                  <div className="space-y-2 p-4">
                    <div className="h-6 w-3/4 animate-pulse rounded-lg bg-straw" />
                    <div className="h-4 w-full animate-pulse rounded-lg bg-straw/70" />
                    <div className="h-4 w-2/3 animate-pulse rounded-lg bg-straw/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <ShoppingBasket className="h-16 w-16 text-clay" />
              <p className="font-heading text-2xl font-bold italic text-soil">
                Nessun prodotto disponibile al momento.
              </p>
              <p className="text-lg text-clay">Torna presto — il raccolto arriva! 🌱</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/p/${product.id}`}
                  className="group block"
                >
                  <Card className="overflow-hidden border-0 bg-white shadow-md transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl rounded-2xl py-0">
                    <div className="relative aspect-square overflow-hidden bg-straw">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBasket className="h-16 w-16 text-clay" />
                        </div>
                      )}

                      {/* Category emoji badge */}
                      <span
                        className="absolute left-3 top-3 select-none text-2xl drop-shadow"
                        aria-hidden="true"
                      >
                        {getCategoryEmoji(product.name)}
                      </span>

                      {/* Disponibile badge */}
                      <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-sage/90 px-2.5 py-1 text-xs font-bold text-cream backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-cream" />
                        Disponibile
                      </span>
                    </div>

                    <CardContent className="pb-2 pt-4">
                      <h3 className="font-heading text-xl font-bold italic text-bark">
                        {product.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-soil">
                        {product.description}
                      </p>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between border-t border-straw bg-cream/60 px-4 py-3">
                      <span className="text-lg font-bold text-terracotta">
                        {formatPrice(product.price, product.measureUnit)}
                      </span>
                      <span className="rounded-full border border-golden/40 bg-golden/20 px-3 py-0.5 text-xs font-bold text-bark">
                        -10% pre-ordine
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
