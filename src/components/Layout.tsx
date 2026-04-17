import { Outlet } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '39000000000';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function Layout() {
  return (
    <div className="min-h-screen bg-cream font-sans">
      <Outlet />

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
