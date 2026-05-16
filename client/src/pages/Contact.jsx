import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import {
  FiMail as MI,
  FiPhone as PI,
  FiMapPin as MapI,
  FiClock as ClockI,
  FiSend as SendI,
  FiMessageSquare as MsgI,
  FiUser as UserI,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const WHATSAPP = (import.meta.env.VITE_WHATSAPP_NUMBER || '233000000000').replace(/\D/g, '');

const INFO = [
  { Icon: MI, label: 'Email', value: 'hello@kitchenlovers.local', href: 'mailto:hello@kitchenlovers.local' },
  { Icon: PI, label: 'Phone', value: '+233 (0) 24 000 0000', href: 'tel:+233240000000' },
  { Icon: MapI, label: 'Address', value: 'East Legon, Accra, Ghana' },
  { Icon: ClockI, label: 'Hours', value: 'Mon–Sat, 9am – 6pm GMT' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    setSent(true);
    toast.success('Thanks! We will reply within 1 business day.');
    setForm({ name: '', email: '', message: '' });
  }

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="space-y-10">
      <section className="card p-8 md:p-10 bg-gradient-to-br from-accent/10 via-white to-primary/5">
        <p className="uppercase tracking-widest text-xs text-primary font-semibold">Contact</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2">Let's talk.</h1>
        <p className="mt-3 text-ink/70 max-w-2xl">
          Whether you have a question about a product, need help with an order, or want to suggest
          something we should stock — we read every message.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          {INFO.map(({ Icon, label, value, href }) => (
            <div key={label} className="card p-4 flex items-start gap-3">
              <div className="text-primary text-xl mt-0.5"><Icon /></div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
                {href ? (
                  <a href={href} className="text-ink hover:text-primary no-underline break-all">{value}</a>
                ) : (
                  <p className="text-ink">{value}</p>
                )}
              </div>
            </div>
          ))}
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi KitchenLovers!")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-4 flex items-center gap-3 no-underline text-ink hover:shadow-md transition"
          >
            <FaWhatsapp className="text-2xl text-[#25D366]" />
            <div>
              <p className="font-semibold">WhatsApp</p>
              <p className="text-xs text-ink/60">Fastest way to reach us</p>
            </div>
          </a>
        </div>

        <form onSubmit={submit} className="md:col-span-2 card p-6 space-y-4">
          <h2 className="text-xl">Send us a message</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative">
              <UserI className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input name="name" className="input pl-10" placeholder="Your name" value={form.name} onChange={change} required />
            </div>
            <div className="relative">
              <MI className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input name="email" type="email" className="input pl-10" placeholder="Your email" value={form.email} onChange={change} required />
            </div>
          </div>
          <div className="relative">
            <MsgI className="absolute left-3 top-3 text-ink/40" />
            <textarea
              name="message"
              rows={6}
              className="input pl-10 pt-2"
              placeholder="How can we help?"
              value={form.message}
              onChange={change}
              required
            />
          </div>
          <button className="btn-primary inline-flex items-center gap-2" type="submit">
            <SendI /> {sent ? 'Send another' : 'Send message'}
          </button>
          <p className="text-xs text-ink/50">We typically reply within one business day.</p>
        </form>
      </section>
    </div>
  );
}
