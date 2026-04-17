import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { QRCodeCanvas } from 'qrcode.react'
import { LogOut, Leaf, QrCode, Download, ImagePlus, Package, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  measureUnit: string
  images: string[]
}

const QR_SIZE = 300

export default function AdminQR() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [domain, setDomain] = useState(window.location.origin)

  const qrRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'products'))
        const data = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          measureUnit: d.data().measureUnit as string,
          images: (d.data().images as string[]) ?? [],
        }))
        data.sort((a, b) => a.name.localeCompare(b.name))
        setProducts(data)
        if (data.length > 0) setSelectedId(data[0].id)
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoSrc(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleDownload() {
    const canvas = qrRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    const product = products.find((p) => p.id === selectedId)
    const filename = product
      ? `qr-${product.name.replace(/\s+/g, '-').toLowerCase()}.png`
      : 'qr-code.png'
    a.download = filename
    a.click()
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    navigate('/admin', { replace: true })
  }

  const selectedProduct = products.find((p) => p.id === selectedId)
  const qrValue = selectedId ? `${domain}/p/${selectedId}` : 'https://example.com'

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-straw" />
            <div>
              <h1 className="text-3xl font-bold text-cream">Generatore QR</h1>
              <p className="text-base text-straw">Crea QR code per ogni prodotto</p>
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

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-terracotta" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Package className="h-16 w-16 text-clay" />
            <p className="text-2xl font-bold text-bark">Nessun prodotto trovato.</p>
            <p className="text-lg text-soil">Aggiungi prodotti nel catalogo prima di generare QR code.</p>
          </div>
        ) : (
          <>
            {/* Product selector */}
            <div className="rounded-2xl bg-white p-6 shadow-md space-y-4">
              <h2 className="text-xl font-bold text-bark">Seleziona Prodotto</h2>

              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-xl border-2 border-sage bg-cream px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-xl bg-straw/40 px-4 py-3">
                  {selectedProduct.images?.[0] ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-straw">
                      <Package className="h-6 w-6 text-clay" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-bold text-bark">{selectedProduct.name}</p>
                    <p className="text-sm font-semibold text-soil break-all">{qrValue}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Domain override */}
            <div className="rounded-2xl bg-white p-6 shadow-md space-y-3">
              <h2 className="text-xl font-bold text-bark">Dominio</h2>
              <p className="text-sm text-soil">
                Modifica il dominio se stai generando QR code per produzione.
              </p>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.replace(/\/$/, ''))}
                placeholder="https://tuodominio.it"
                className="w-full rounded-xl border-2 border-sage bg-cream px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
              />
            </div>

            {/* Logo upload */}
            <div className="rounded-2xl bg-white p-6 shadow-md space-y-3">
              <h2 className="text-xl font-bold text-bark">Logo Centrale (opzionale)</h2>
              <p className="text-sm text-soil">
                Carica un logo da inserire al centro del QR code.
              </p>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sage bg-cream py-6 transition-colors hover:border-terracotta"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt="logo preview"
                    className="h-16 w-16 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-clay" />
                    <span className="text-base font-semibold text-soil">
                      Clicca per caricare il logo
                    </span>
                  </>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              {logoSrc && (
                <button
                  type="button"
                  onClick={() => setLogoSrc(null)}
                  className="text-sm font-semibold text-clay underline"
                >
                  Rimuovi logo
                </button>
              )}
            </div>

            {/* QR Preview */}
            <div className="rounded-2xl bg-white p-6 shadow-md space-y-5">
              <h2 className="text-xl font-bold text-bark">Anteprima QR Code</h2>

              <div className="flex justify-center">
                <div className="rounded-2xl border-4 border-straw bg-white p-4 shadow-lg">
                  <QRCodeCanvas
                    ref={qrRef}
                    value={qrValue}
                    size={QR_SIZE}
                    level="H"
                    marginSize={2}
                    imageSettings={
                      logoSrc
                        ? {
                            src: logoSrc,
                            height: 60,
                            width: 60,
                            excavate: true,
                          }
                        : undefined
                    }
                  />
                </div>
              </div>

              {selectedProduct && (
                <p className="text-center text-base font-semibold text-soil">
                  {selectedProduct.name}
                </p>
              )}

              <button
                onClick={handleDownload}
                disabled={!selectedId}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-terracotta py-4 text-xl font-bold text-cream shadow-md transition-colors hover:bg-bark disabled:opacity-50"
              >
                <Download className="h-6 w-6" />
                Scarica PNG
              </button>

              <p className="text-center text-sm text-soil">
                Il file verrà salvato come PNG ad alta qualità ({QR_SIZE}x{QR_SIZE}px).
              </p>
            </div>

            {/* Info about using QR codes */}
            <div className="rounded-2xl border-2 border-straw bg-white p-5">
              <div className="flex items-start gap-3">
                <QrCode className="mt-1 h-6 w-6 shrink-0 text-terracotta" />
                <div>
                  <p className="text-base font-bold text-bark">Come usare i QR code</p>
                  <p className="mt-1 text-sm text-soil">
                    Stampa il QR code e attaccalo alle cassette fisiche. I clienti lo scansioneranno
                    con il telefono per accedere direttamente alla pagina del prodotto e ordinare.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
