import { Link } from 'react-router-dom';
import {
  FiHeart, FiTruck, FiShield, FiAward, FiArrowRight, FiTarget, FiUsers,
} from 'react-icons/fi';

const VALUES = [
  { Icon: FiHeart, title: 'Made for cooks', body: 'Every item we stock is chosen because we would use it in our own kitchens.' },
  { Icon: FiAward, title: 'Quality first', body: 'Trusted brands, durable materials, honest descriptions — no gimmicks.' },
  { Icon: FiShield, title: 'Safe shopping', body: 'Secure Paystack checkout, encrypted accounts, transparent pricing.' },
  { Icon: FiTruck, title: 'Quick delivery', body: 'Reliable courier partners deliver across the country.' },
];

export default function About() {
  return (
    <div className="space-y-12">
      <section className="card p-8 md:p-12 bg-gradient-to-br from-primary/10 via-white to-accent/5">
        <p className="uppercase tracking-widest text-xs text-primary font-semibold">Our story</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 max-w-2xl">
          Cookware that earns its place on your shelf.
        </h1>
        <p className="mt-4 text-ink/70 max-w-2xl">
          KitchenLovers began as a simple idea: home cooks deserve professional-quality tools without
          the professional-only price tags. We source cookware, cutlery, bakeware and appliances from
          makers we trust, then deliver them to doorsteps across Ghana.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl mb-2 inline-flex items-center gap-2">
            <FiTarget className="text-primary" /> Our mission
          </h2>
          <p className="text-ink/70">
            To make everyday cooking more joyful by putting beautifully designed, durable kitchen
            essentials within reach of every Ghanaian home. We believe a well-made knife, a heavy
            pan and a thoughtful gadget can transform the way you cook.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl mb-2 inline-flex items-center gap-2">
            <FiUsers className="text-primary" /> Who we serve
          </h2>
          <p className="text-ink/70">
            From the curious beginner experimenting with new recipes, to the seasoned home chef who
            knows exactly which whisk they want — KitchenLovers carries the right tool for the job
            at every level.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-4">What we stand for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map(({ Icon, title, body }) => (
            <div key={title} className="card p-5">
              <div className="text-2xl text-primary mb-2"><Icon /></div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-ink/60 mt-1">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 md:p-8 bg-ink/[0.02]">
        <h2 className="text-xl mb-3">A note from the team</h2>
        <p className="text-ink/70 max-w-3xl">
          We're a small team based in Accra. Every order is packed by hand, every customer message
          gets a real person on the other end. If something arrives that isn't right, we'll make it
          right — fast, no runaround. That's the only way we know how to do business.
        </p>
        <p className="text-ink/70 mt-3 max-w-3xl">
          Thanks for cooking with us.
        </p>
      </section>

      <section className="card p-6 md:p-8 text-center bg-primary/5">
        <h2 className="text-2xl mb-2">Got questions? We'd love to hear from you.</h2>
        <p className="text-ink/70 mb-5">Send us a note or chat with us on WhatsApp.</p>
        <Link to="/contact" className="btn-primary inline-flex items-center gap-2 no-underline">
          Contact us <FiArrowRight />
        </Link>
      </section>
    </div>
  );
}
