import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { formatPrice } from '@/lib/marketLogic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LogOut,
  Leaf,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  ImagePlus,
  Package,
  Loader2,
  X,
  Star,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  measureUnit: string
  images: string[]
  isAvailable: boolean
}

type FormData = Omit<Product, 'id' | 'images' | 'isAvailable'>

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  price: 0,
  measureUnit: 'kg',
}

export default function AdminCatalog() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [customProductId, setCustomProductId] = useState('')
  // Gallery: existing URLs to keep + new files pending upload
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'products'))
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
        data.sort((a, b) => a.name.localeCompare(b.name))
        setProducts(data)
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  async function handleToggleAvailable(product: Product) {
    setTogglingId(product.id)
    try {
      await updateDoc(doc(db, 'products', product.id), {
        isAvailable: !product.isAvailable,
      })
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p
        )
      )
    } catch (err) {
      console.error('Error toggling product availability:', err)
    } finally {
      setTogglingId(null)
    }
  }

  function openAddDialog() {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setCustomProductId('')
    setGalleryImages([])
    setPendingFiles([])
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      measureUnit: product.measureUnit,
    })
    setGalleryImages(product.images ?? [])
    setPendingFiles([])
    setFormError(null)
    setDialogOpen(true)
  }

  function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newPending = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPendingFiles((prev) => [...prev, ...newPending])
    e.target.value = ''
  }

  function removeGalleryImage(url: string) {
    setGalleryImages((prev) => prev.filter((u) => u !== url))
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Il nome è obbligatorio.')
      return
    }
    if (form.price <= 0) {
      setFormError('Inserisci un prezzo valido.')
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      // Upload all pending files in parallel
      const uploadedUrls = await Promise.all(
        pendingFiles.map(async ({ file }) => {
          const storageRef = ref(storage, `products/${Date.now()}_${file.name}`)
          await uploadBytes(storageRef, file)
          return getDownloadURL(storageRef)
        })
      )
      const finalImages = [...galleryImages, ...uploadedUrls]

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        measureUnit: form.measureUnit.trim(),
        images: finalImages,
      }

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData)
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id ? { ...p, ...productData } : p
          )
        )
      } else {
        const trimmedId = customProductId.trim()
        if (trimmedId) {
          await setDoc(doc(db, 'products', trimmedId), {
            ...productData,
            isAvailable: true,
          })
          setProducts((prev) =>
            [...prev, { id: trimmedId, ...productData, isAvailable: true }].sort(
              (a, b) => a.name.localeCompare(b.name)
            )
          )
        } else {
          const docRef = await addDoc(collection(db, 'products'), {
            ...productData,
            isAvailable: true,
          })
          setProducts((prev) =>
            [...prev, { id: docRef.id, ...productData, isAvailable: true }].sort(
              (a, b) => a.name.localeCompare(b.name)
            )
          )
        }
      }
      setDialogOpen(false)
    } catch (err) {
      console.error('Error saving product:', err)
      setFormError('Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-bark px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-straw" />
            <div>
              <h1 className="text-3xl font-bold text-cream">Catalogo</h1>
              <p className="text-base text-straw">{products.length} prodotti</p>
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

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Add button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={openAddDialog}
            className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-base font-bold text-cream shadow-md transition-colors hover:bg-bark"
          >
            <Plus className="h-5 w-5" />
            Aggiungi Prodotto
          </button>
        </div>

        {/* Products list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-straw" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Package className="h-16 w-16 text-clay" />
            <p className="text-2xl font-bold text-bark">Nessun prodotto nel catalogo.</p>
            <p className="text-lg text-soil">Clicca "Aggiungi Prodotto" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                togglingId={togglingId}
                onToggle={handleToggleAvailable}
                onEdit={openEditDialog}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-cream p-0 overflow-hidden">
          <DialogHeader className="bg-bark px-6 py-4">
            <DialogTitle className="text-xl font-bold text-cream">
              {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
            {/* Gallery */}
            <div>
              <label className="mb-2 block text-base font-bold text-bark">
                Galleria immagini
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Existing images */}
                {galleryImages.map((url, i) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-straw">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-terracotta px-1.5 py-0.5 text-xs font-bold text-cream">
                        <Star className="h-3 w-3" /> Principale
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(url)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Rimuovi immagine"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Pending files (to upload) */}
                {pendingFiles.map(({ preview }, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-sage bg-straw">
                    <img src={preview} alt="" className="h-full w-full object-cover opacity-80" />
                    <span className="absolute bottom-1 left-1 rounded bg-sage px-1.5 py-0.5 text-xs font-bold text-cream">
                      Nuovo
                    </span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Annulla upload"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Add button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-sage bg-white text-clay transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-xs font-semibold">Aggiungi</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddImages}
              />
              {galleryImages.length + pendingFiles.length > 0 && (
                <p className="mt-1.5 text-xs text-soil">
                  La prima immagine sarà quella principale. Passa il mouse su una foto per eliminarla.
                </p>
              )}
            </div>

            {/* Product ID (solo per nuovi prodotti) */}
            {!editingProduct && (
              <div>
                <label className="mb-1 block text-base font-bold text-bark">
                  ID prodotto
                </label>
                <input
                  type="text"
                  value={customProductId}
                  onChange={(e) => setCustomProductId(e.target.value.replace(/\s/g, '-'))}
                  placeholder="Lascia vuoto per generare automaticamente"
                  className="w-full rounded-xl border-2 border-sage bg-white px-4 py-3 font-mono text-base text-bark outline-none focus:border-terracotta"
                />
                <p className="mt-1 text-xs text-soil">
                  Usato nell'URL del prodotto. Solo lettere, numeri e trattini.
                </p>
              </div>
            )}
            {editingProduct && (
              <div>
                <label className="mb-1 block text-base font-bold text-bark">
                  ID prodotto
                </label>
                <div className="flex items-center gap-2 rounded-xl border-2 border-straw bg-straw/40 px-4 py-3 font-mono text-base text-soil">
                  {editingProduct.id}
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="mb-1 block text-base font-bold text-bark">
                Nome <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Pomodori San Marzano"
                className="w-full rounded-xl border-2 border-sage bg-white px-4 py-3 text-base text-bark outline-none focus:border-terracotta"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-base font-bold text-bark">
                Descrizione
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Breve descrizione del prodotto..."
                rows={3}
                className="w-full resize-none rounded-xl border-2 border-sage bg-white px-4 py-3 text-base text-bark outline-none focus:border-terracotta"
              />
            </div>

            {/* Price + Unit row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-base font-bold text-bark">
                  Prezzo (€) <span className="text-terracotta">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price === 0 ? '' : form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border-2 border-sage bg-white px-4 py-3 text-base text-bark outline-none focus:border-terracotta"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-base font-bold text-bark">
                  Unità
                </label>
                <select
                  value={form.measureUnit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, measureUnit: e.target.value }))
                  }
                  className="w-full rounded-xl border-2 border-sage bg-white px-4 py-3 text-base font-semibold text-bark outline-none focus:border-terracotta"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="pz">pz</option>
                  <option value="mazzo">mazzo</option>
                  <option value="cassetta">cassetta</option>
                  <option value="lt">lt</option>
                </select>
              </div>
            </div>

            {formError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
                {formError}
              </p>
            )}

            {/* Preview */}
            {form.name && form.price > 0 && (
              <div className="rounded-xl border-2 border-straw bg-white px-4 py-3">
                <p className="text-sm font-semibold text-soil">Anteprima prezzo:</p>
                <p className="text-lg font-bold text-terracotta">
                  {formatPrice(form.price, form.measureUnit)}
                  <span className="ml-2 text-sm font-semibold text-sage">
                    (-10% = €{(form.price * 0.9).toFixed(2).replace('.', ',')}/{form.measureUnit})
                  </span>
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="flex-1 rounded-xl border-2 border-soil py-3 text-base font-bold text-soil transition-colors hover:bg-soil hover:text-cream disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-terracotta py-3 text-base font-bold text-cream transition-colors hover:bg-bark disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  'Salva'
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductCard({
  product,
  togglingId,
  onToggle,
  onEdit,
}: {
  product: Product
  togglingId: string | null
  onToggle: (p: Product) => void
  onEdit: (p: Product) => void
}) {
  const isToggling = togglingId === product.id

  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-md transition-opacity ${
        !product.isAvailable ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-straw">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-8 w-8 text-clay" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-bark">{product.name}</h3>
              <p className="text-base font-semibold text-terracotta">
                {formatPrice(product.price, product.measureUnit)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                product.isAvailable
                  ? 'bg-sage/20 text-bark'
                  : 'bg-clay/20 text-clay'
              }`}
            >
              {product.isAvailable ? 'Disponibile' : 'Non disponibile'}
            </span>
          </div>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-base text-soil">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => onEdit(product)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sage py-2.5 text-base font-bold text-bark transition-colors hover:bg-sage hover:text-cream"
        >
          <Pencil className="h-4 w-4" />
          Modifica
        </button>
        <button
          onClick={() => onToggle(product)}
          disabled={isToggling}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-base font-bold transition-colors disabled:opacity-50 ${
            product.isAvailable
              ? 'border-2 border-clay text-clay hover:bg-clay hover:text-cream'
              : 'bg-sage text-cream hover:bg-bark'
          }`}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : product.isAvailable ? (
            <>
              <EyeOff className="h-4 w-4" />
              Nascondi
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Mostra
            </>
          )}
        </button>
      </div>
    </div>
  )
}
