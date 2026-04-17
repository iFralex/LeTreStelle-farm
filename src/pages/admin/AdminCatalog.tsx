import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  collection,
  getDocs,
  doc,
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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
    setImageFile(null)
    setImagePreview(null)
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
    setImageFile(null)
    setImagePreview(product.images?.[0] ?? null)
    setFormError(null)
    setDialogOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
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
      let imageUrl: string | null = null

      if (imageFile) {
        const storageRef = ref(
          storage,
          `products/${Date.now()}_${imageFile.name}`
        )
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      if (editingProduct) {
        // Update existing product
        const updates: Partial<Product> = {
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          measureUnit: form.measureUnit.trim(),
        }
        if (imageUrl) {
          updates.images = [imageUrl, ...(editingProduct.images ?? [])]
        }
        await updateDoc(doc(db, 'products', editingProduct.id), updates)
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id ? { ...p, ...updates } : p
          )
        )
      } else {
        // Add new product
        const newProduct = {
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          measureUnit: form.measureUnit.trim(),
          images: imageUrl ? [imageUrl] : [],
          isAvailable: true,
        }
        const docRef = await addDoc(collection(db, 'products'), newProduct)
        setProducts((prev) =>
          [...prev, { id: docRef.id, ...newProduct }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        )
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

          <div className="space-y-4 px-6 py-5">
            {/* Image upload */}
            <div>
              <label className="mb-2 block text-base font-bold text-bark">
                Immagine
              </label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sage bg-white py-6 transition-colors hover:border-terracotta"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-32 w-32 rounded-xl object-cover shadow"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-clay" />
                    <span className="text-base font-semibold text-soil">
                      Clicca per caricare un'immagine
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm font-semibold text-clay underline"
                >
                  Cambia immagine
                </button>
              )}
            </div>

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
