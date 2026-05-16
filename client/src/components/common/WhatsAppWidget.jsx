import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppWidget({
  phone = import.meta.env.VITE_WHATSAPP_NUMBER || '233000000000',
  message = "Hi KitchenLovers! I'd like to ask about a product.",
}) {
  const clean = String(phone).replace(/[^0-9]/g, '');
  const href = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl no-underline hover:scale-110 active:scale-95 transition-transform"
    >
      <FaWhatsapp className="text-3xl" />
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-50 animate-ping" />
    </a>
  );
}
