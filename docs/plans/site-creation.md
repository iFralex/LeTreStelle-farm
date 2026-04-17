# Plan: Farmers Market O2O Platform (Vite + React + Firebase)

## Overview
Create a seamless Offline-to-Online (O2O) web application for an agricultural farm. The system uses physical QR codes on crates to direct users to specific product pages. It features a "frictionless" authentication system (Name + Phone) using `localStorage`, an intelligent pre-order system with % discounts, and order-merging capabilities for returning customers. 
The backend relies on Firebase (Firestore for database, Storage for images). The Admin panel requires a simple hashed-password login to manage the catalog, process orders, exclude specific market dates, and generate customized QR codes. The frontend is built with Vite, React Router, Tailwind CSS, shadcn/ui, and Zustand for state management; Use a natural palette (sage green, terracotta, cream) for Tailwind, rustic-style icons, and large and very readable fonts without light gray texts, because the site will be used outdoors in the sun".

## Validation Commands
- `npm run dev` (to test UI and routing locally)
- `npm run build` (to verify Vite production build)
- `npm run lint`

---

### Task 1: Project Setup & Firebase Initialization
- [x] Install required dependencies: `react-router-dom`, `zustand`, `firebase`, `lucide-react`, `date-fns`, `qrcode.react`, `crypto-js` (for simple admin hashing).
- [x] Initialize shadcn/ui components: `button`, `dialog`, `input`, `label`, `card`, `toast`, `calendar` (if needed for admin).
- [x] Create `src/lib/firebase.ts`. Initialize Firebase App, Firestore, and Storage using environment variables (`VITE_FIREBASE_API_KEY`, etc.). Export `db` and `storage`.
- [x] Set up React Router in `src/App.tsx`. Define routes:
  - Public: `/` (Landing), `/p/:id` (Product), `/checkout` (Cart/Checkout), `/ordini` (User Dashboard), `/login` (User Phone Login).
  - Admin: `/admin` (Login), `/admin/dashboard`, `/admin/catalog`, `/admin/qr-generator`, `/admin/settings`.
- [x] Create a global Layout component that includes the "Contact us on WhatsApp" floating banner.
- [x] Mark completed.

---

### Task 2: State Management (Zustand) & Frictionless Auth Logic
- [x] Create `src/store/useStore.ts` using Zustand.
- [x] Create a `cartSlice` to manage the user's cart (array of objects with `productId`, `quantity`, `price`, `measureUnit`). Include actions: `addToCart`, `removeFromCart`, `clearCart`.
- [x] Create a `userSlice` to handle the frictionless authentication. State should include `name`, `phone`.
- [x] Implement a `persist` middleware in Zustand for the `userSlice` so `name` and `phone` are automatically saved to and loaded from `localStorage`.
- [x] Mark completed.

---

### Task 3: Core Business Logic (Dates & Pricing)
- [x] Create `src/lib/marketLogic.ts`.
- [x] Define a constant configuration for recurring markets (e.g., `[{ id: 'ariccia', name: 'Mercato di Ariccia', dayOfWeek: 0 }, { id: 'velletri', name: 'Mercato di Velletri', dayOfWeek: 3 }]`).
- [x] Write a function `getAvailablePickupDates(excludedDates: string[])`. The logic must:
  - Take the current date and add a **2-day lead time** (minimum notice).
  - Find the next 3-4 available recurring market dates.
  - Filter out any specific dates passed in the `excludedDates` array (fetched from Firestore later).
- [x] Write a formatting function to display prices with the Pre-order Discount (e.g., `-10%`).
- [x] Mark completed.

---

### Task 4: Public UI - Landing & Product Pages
- [ ] Build `src/pages/Landing.tsx`: A simple page explaining the farm's story with a grid of available products (fetched from Firestore `products` collection where `isAvailable == true`).
- [ ] Build `src/pages/Product.tsx` (`/p/:id`). Fetch specific product details from Firestore.
- [ ] Render an image gallery (using URLs from Firebase Storage), Title, Description, and Price per Unit.
- [ ] Add the "Metti nella mia cassetta" (Add to Cart) button.
- [ ] Implement the UX flow: Upon clicking "Add to Cart", show a prominent Dialog or Toast asking: "Aggiunto! Vuoi continuare la spesa o preparare la cassetta?" with buttons leading back to Landing or to `/checkout`.
- [ ] Mark completed.

---

### Task 5: Frictionless Checkout & Order Merging
- [ ] Build `src/pages/Checkout.tsx`. Display cart summary and calculated discount.
- [ ] Fetch `excludedDates` from Firestore `settings/dates` doc, and render giant, easily tappable buttons for Pickup Date/Location selection using `getAvailablePickupDates()`.
- [ ] Authentication block: 
  - If `userSlice` is empty: show inputs for `Nome` and `Numero di Telefono`.
  - If `userSlice` has data: display "Bentornato [Nome]! (Cambia utente)".
- [ ] Implement **Order Merging Logic** on checkout submission:
  - Query Firestore `orders` where `phone == user.phone` AND `status == 'pending'`.
  - If a pending order exists for the *same pickup date*, trigger a shadcn/ui Dialog: "Hai già un ordine in consegna per questa data. Vuoi unire i prodotti nella stessa cassetta?".
  - If yes: Update the existing Firestore document. If no/different date: Create a new document in `orders` collection.
- [ ] Mark completed.

---

### Task 6: Customer Dashboard & Order Management
- [ ] Build `src/pages/UserLogin.tsx`. Simple input for Phone Number. Saves to `localStorage` and redirects to `/ordini`.
- [ ] Build `src/pages/UserOrders.tsx`. Fetch orders by phone number.
- [ ] Group orders into "In Consegna" (Pending/Upcoming) and "Passati" (History).
- [ ] Add a "Annulla Ordine" button for pending orders. Logic check: it must only be visible/active if the current date is > 2 days before the pickup date. Updates Firestore order `status` to `annullato`.
- [ ] Mark completed.

---

### Task 7: Admin Auth & Order Management
- [ ] Build `src/pages/admin/AdminLogin.tsx`. A single password input. Compare the `crypto-js` SHA256 hash of the input against a hardcoded hash in Firestore (`admin/config` document). Store a temporary token/flag in `sessionStorage` upon success to protect admin routes.
- [ ] Build `src/pages/admin/AdminDashboard.tsx`. Fetch all `orders`.
- [ ] Create filters to view orders by specific Market and Date.
- [ ] Add buttons to quickly change order status (`ritirato`, `non_ritirato`).
- [ ] Mark completed.

---

### Task 8: Admin Catalog & Firebase Storage Integrations
- [ ] Build `src/pages/admin/AdminCatalog.tsx` to list all products. Add capability to toggle `isAvailable` boolean.
- [ ] Create a form to Add/Edit products. Fields: `name`, `description`, `price`, `measureUnit`.
- [ ] Integrate Firebase Storage: Add an input type `file` to upload images. Upon selection, upload to `products/{timestamp}_{filename}`, get the Download URL, and save it in the Firestore product document array `images`.
- [ ] Mark completed.

---

### Task 9: Admin QR Code Generator & Excluded Dates Settings
- [ ] Build `src/pages/admin/AdminSettings.tsx`. Create an interface to add specific dates (e.g., standard Datepicker) to an `excludedDates` array in Firestore, preventing customers from selecting them.
- [ ] Build `src/pages/admin/AdminQR.tsx`. Fetch all products to create a dropdown list.
- [ ] Implement `qrcode.react`. Render the QR code pointing to `https://[YOUR_DOMAIN]/p/[PRODUCT_ID]`.
- [ ] Add an image upload field specifically to place a logo/image in the center of the QR code using `imageSettings` prop of `qrcode.react`.
- [ ] Add a "Download PNG" button that captures the rendered QR canvas and triggers a browser download.
- [ ] Mark completed.