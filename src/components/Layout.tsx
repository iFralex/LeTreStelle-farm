import { Link, Outlet } from 'react-router-dom';
import { MessageCircle, ShoppingBasket } from 'lucide-react';
import { useStore } from '@/store/useStore';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '39000000000';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

function ThreeStars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 68 22" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M11,1 L13,7.5 L20,7.5 L14.5,11.5 L16.5,18 L11,14 L5.5,18 L7.5,11.5 L2,7.5 L9,7.5 Z" />
      <path d="M34,1 L36,7.5 L43,7.5 L37.5,11.5 L39.5,18 L34,14 L28.5,18 L30.5,11.5 L25,7.5 L32,7.5 Z" />
      <path d="M57,1 L59,7.5 L66,7.5 L60.5,11.5 L62.5,18 L57,14 L51.5,18 L53.5,11.5 L48,7.5 L55,7.5 Z" />
    </svg>
  );
}

export default function Layout() {
  const cart = useStore((s) => s.cart);
  const cartCount = cart.length;

  return (
    <div className="min-h-screen bg-cream font-sans flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-bark shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link
            to="/"
            className="flex items-center gap-3 text-cream transition-colors hover:text-golden"
          >
            <ThreeStars className="h-5 w-auto" />
            <span className="font-heading text-xl font-bold">Le Tre Stelle Farm</span>
          </Link>

          <Link
            to="/checkout"
            className="group relative flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-cream transition-all hover:bg-terracotta/80 hover:scale-105 active:scale-95"
            aria-label={`Cassetta: ${cartCount} prodotti`}
          >
            <ShoppingBasket className="cart-wiggle h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Cassetta</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-golden text-xs font-bold text-bark">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-bark px-6 py-12 text-center text-cream">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex justify-center text-golden">
            <ThreeStars className="h-6 w-auto" />
          </div>
          <p className="font-heading text-2xl font-bold italic">Le Tre Stelle Farm</p>
          <p className="mt-2 text-base text-straw/70 italic">Dalla terra alla tua tavola</p>
          <div className="mt-6 flex justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-5 py-2 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
            >
              <MessageCircle className="h-4 w-4" />
              Contattaci su WhatsApp
            </a>
          </div>
          <p className="mt-8 text-xs text-clay">
            © {new Date().getFullYear()} Le Tre Stelle Farm. Tutti i diritti riservati.
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-[200] flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-4 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 sm:px-5 sm:py-3"
        aria-label="Contattaci su WhatsApp"
      >
        <MessageCircle className="h-6 w-6 flex-shrink-0" />
        <span className="hidden text-base font-semibold leading-tight sm:inline">
          Contattaci su WhatsApp
        </span>
      </a>
    </div>
  );
}
