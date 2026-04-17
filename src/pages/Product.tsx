import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useStore } from '@/store/useStore'
import { applyPreOrderDiscount, formatPrice } from '@/lib/marketLogic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShoppingBasket, ChevronLeft, ChevronRight, Leaf, Minus, Plus } from 'lucide-react'

const DECIMAL_UNITS = new Set(['kg', 'l', 'lt', 'litri', 'etto', 'hg', 'g', 'ml', 'cl'])

function getStep(unit: string): number {
  return DECIMAL_UNITS.has(unit.toLowerCase()) ? 0.5 : 1
}

function getPresets(unit: string): number[] {
  if (DECIMAL_UNITS.has(unit.toLowerCase())) {
    return [0.5, 1, 1.5, 2, 3, 5]
  }
  return [1, 2, 3, 5, 10]
}

function formatQuantity(q: number): string {
  return q % 1 === 0 ? String(q) : q.toFixed(1).replace('.', ',')
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  measureUnit: string
  images: string[]
  isAvailable: boolean
}

export default function Product() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToCart = useStore((s) => s.addToCart)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [notFound, setNotFound] = useState(!id)
  const [activeImage, setActiveImage] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!id) return
    const productId = id
    async function fetchProduct() {
      try {
        const ref = doc(db, 'products', productId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setNotFound(true)
        } else {
          const p = { id: snap.id, ...snap.data() } as Product
          setProduct(p)
          setQuantity(getStep(p.measureUnit))
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  function handleAddToCart() {
    if (!product) return
    const { discountedPrice } = applyPreOrderDiscount(product.price)
    addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      price: discountedPrice,
      measureUnit: product.measureUnit,
    })
    setShowDialog(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <Leaf className="h-12 w-12 animate-pulse text-sage" />
          <p className="text-2xl font-semibold text-soil">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
        <ShoppingBasket className="h-20 w-20 text-clay" />
        <p className="text-3xl font-bold text-bark">Prodotto non trovato.</p>
        <Link
          to="/"
          className="rounded-2xl bg-sage px-8 py-4 text-xl font-bold text-cream shadow-md transition-transform active:scale-95 hover:bg-bark"
        >
          Torna ai prodotti
        </Link>
      </div>
    )
  }

  const { discountedPrice, discountLabel, originalPrice } =
    applyPreOrderDiscount(product.price)
  const images = product.images ?? []

  return (
    <div className="min-h-screen bg-cream">
      {/* Back link */}
      <div className="bg-bark px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-lg font-semibold text-straw hover:text-cream"
        >
          <ChevronLeft className="h-5 w-5" />
          Tutti i prodotti
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 pb-28">
        {/* Image Gallery */}
        <div className="mb-8">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-straw shadow-md">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={`${product.name} - immagine ${activeImage + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBasket className="h-24 w-24 text-clay" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImage(
                      (prev) => (prev - 1 + images.length) % images.length
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-md transition-transform active:scale-90"
                  aria-label="Immagine precedente"
                >
                  <ChevronLeft className="h-7 w-7 text-bark" />
                </button>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev + 1) % images.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-md transition-transform active:scale-90"
                  aria-label="Immagine successiva"
                >
                  <ChevronRight className="h-7 w-7 text-bark" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-3 transition-colors ${
                    idx === activeImage
                      ? 'border-terracotta'
                      : 'border-transparent opacity-70'
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product name & description */}
        <div className="mb-6">
          <h1 className="mb-3 text-4xl font-bold leading-tight text-bark md:text-5xl">
            {product.name}
          </h1>
          <p className="text-xl leading-relaxed text-soil">
            {product.description}
          </p>
        </div>

        {/* Pricing card */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-terracotta">
              {formatPrice(discountedPrice, product.measureUnit)}
            </span>
            <span className="rounded-full bg-terracotta px-4 py-1.5 text-base font-bold text-cream">
              {discountLabel} pre-ordine
            </span>
          </div>
          <p className="mt-2 text-base text-clay line-through">
            Prezzo pieno: {formatPrice(originalPrice, product.measureUnit)}
          </p>
          <p className="mt-3 flex items-center gap-2 text-base font-semibold text-sage">
            <Leaf className="h-4 w-4" />
            Sconto applicato automaticamente al pre-ordine
          </p>
        </div>

        {/* Quantity selector */}
        {(() => {
          const step = getStep(product.measureUnit)
          const min = step
          const presets = getPresets(product.measureUnit)
          return (
            <div className="mb-5 space-y-4">
              <span className="text-xl font-bold text-bark">Quantità</span>

              {/* Preset chips */}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quantità predefinite">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuantity(p)}
                    aria-pressed={quantity === p}
                    className={`rounded-2xl border-2 px-5 py-2.5 text-lg font-bold transition-colors ${
                      quantity === p
                        ? 'border-terracotta bg-terracotta text-cream'
                        : 'border-sage bg-cream text-bark hover:border-terracotta hover:bg-straw'
                    }`}
                  >
                    {formatQuantity(p)} {product.measureUnit}
                  </button>
                ))}
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center overflow-hidden rounded-2xl border-2 border-terracotta"
                  role="group"
                  aria-label="Selettore quantità"
                >
                  <button
                    onClick={() => setQuantity((q) => Math.max(min, parseFloat((q - step).toFixed(2))))}
                    disabled={quantity <= min}
                    className="flex items-center justify-center px-5 py-3 text-terracotta transition-colors hover:bg-straw active:bg-straw disabled:opacity-30"
                    aria-label={`Riduci di ${formatQuantity(step)} ${product.measureUnit}`}
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <span
                    className="min-w-[4.5rem] text-center text-2xl font-bold text-bark"
                    aria-live="polite"
                    aria-label={`${formatQuantity(quantity)} ${product.measureUnit}`}
                  >
                    {formatQuantity(quantity)} <span className="text-base font-semibold text-soil">{product.measureUnit}</span>
                  </span>
                  <button
                    onClick={() => setQuantity((q) => parseFloat((q + step).toFixed(2)))}
                    className="flex items-center justify-center px-5 py-3 text-terracotta transition-colors hover:bg-straw active:bg-straw"
                    aria-label={`Aumenta di ${formatQuantity(step)} ${product.measureUnit}`}
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          className="w-full rounded-2xl bg-terracotta py-6 text-2xl font-bold text-cream shadow-lg transition-transform active:scale-[0.98] hover:bg-bark"
        >
          Metti nella mia cassetta 🧺
        </button>
      </div>

      {/* Post-add dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="rounded-2xl bg-cream p-8 sm:max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-bold text-bark">
              Aggiunto! 🎉
            </DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-center text-xl text-soil">
            Vuoi continuare la spesa o preparare la cassetta?
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <button
              onClick={() => {
                setShowDialog(false)
                navigate('/')
              }}
              className="w-full rounded-2xl border-3 border-sage py-5 text-xl font-bold text-sage transition-colors hover:bg-sage hover:text-cream active:bg-sage active:text-cream"
            >
              Continua la spesa
            </button>
            <button
              onClick={() => {
                setShowDialog(false)
                navigate('/checkout')
              }}
              className="w-full rounded-2xl bg-terracotta py-5 text-xl font-bold text-cream transition-colors hover:bg-bark active:bg-bark"
            >
              Prepara la cassetta
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
