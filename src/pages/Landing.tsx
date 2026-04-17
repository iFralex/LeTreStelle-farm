import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatPrice } from '@/lib/marketLogic'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ShoppingBasket, Leaf, Sprout } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  measureUnit: string
  images: string[]
  isAvailable: boolean
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
      <section className="px-6 py-16 text-center bg-bark text-cream">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <Sprout className="h-16 w-16 text-sage" />
          </div>
          <h1 className="mb-5 text-5xl font-bold leading-tight md:text-6xl">
            Le Stelle Farm
          </h1>
          <p className="text-xl leading-relaxed text-straw md:text-2xl">
            Prodotti freschi dalla nostra terra, direttamente a te.
            Prenota la tua cassetta con anticipo e ricevi uno{' '}
            <span className="font-bold text-terracotta">sconto del 10%</span>.
          </p>
        </div>
      </section>

      {/* Pre-order callout */}
      <section className="bg-terracotta px-6 py-4 text-center text-cream">
        <p className="text-lg font-semibold md:text-xl">
          Scansiona il QR sulla cassetta e pre-ordina — ritiro al mercato!
        </p>
      </section>

      {/* Products */}
      <section className="px-6 py-12 pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-center gap-3">
            <Leaf className="h-7 w-7 text-sage" />
            <h2 className="text-3xl font-bold text-bark md:text-4xl">
              Prodotti disponibili
            </h2>
            <Leaf className="h-7 w-7 text-sage" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-straw"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <ShoppingBasket className="h-16 w-16 text-clay" />
              <p className="text-2xl font-semibold text-soil">
                Nessun prodotto disponibile al momento.
              </p>
              <p className="text-lg text-clay">
                Torna presto — il raccolto arriva!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/p/${product.id}`}
                  className="group block"
                >
                  <Card className="overflow-hidden border-0 bg-white shadow-md transition-transform group-hover:scale-[1.02] rounded-2xl py-0">
                    <div className="aspect-square overflow-hidden bg-straw">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBasket className="h-16 w-16 text-clay" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-4 pb-2">
                      <h3 className="text-xl font-bold text-bark">
                        {product.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-base text-soil">
                        {product.description}
                      </p>
                    </CardContent>
                    <CardFooter className="border-t border-straw bg-cream px-4 py-3">
                      <span className="text-lg font-bold text-terracotta">
                        {formatPrice(product.price, product.measureUnit)}
                      </span>
                      <span className="ml-auto rounded-full bg-terracotta px-2 py-0.5 text-sm font-bold text-cream">
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
