import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  quantity: number
  price: number
  measureUnit: string
}

interface CartSlice {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
}

interface UserSlice {
  name: string
  phone: string
  setUser: (name: string, phone: string) => void
  clearUser: () => void
}

type StoreState = CartSlice & UserSlice

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Cart slice
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { cart: [...state.cart, item] }
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.productId !== productId),
        })),
      clearCart: () => set({ cart: [] }),

      // User slice
      name: '',
      phone: '',
      setUser: (name, phone) => set({ name, phone }),
      clearUser: () => set({ name: '', phone: '' }),
    }),
    {
      name: 'farmers-market-store',
      partialize: (state) => ({ name: state.name, phone: state.phone }),
    }
  )
)
