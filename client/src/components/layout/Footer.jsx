import { Link } from 'react-router-dom';
import { FiShield, FiTruck, FiRefreshCw, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import Brand from '../common/Brand.jsx';

const SHOP_LINKS = [
  { to: '/products', label: 'All products' },
  { to: '/products?sort=-createdAt', label: 'New arrivals' },
  { to: '/products?sort=-salesCount', label: 'Best sellers' },
  { to: '/products?tag=deals', label: 'Deals' },
  { to: '/products?tag=bulk', label: 'Bulk orders' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
  { to: '/orders', label: 'Track your order' },
  { to: '/refunds', label: 'Refunds' },
];

const PROMISES = [
  { Icon: FiTruck, label: 'Fast nationwide delivery' },
  { Icon: FiShield, label: 'Secure encrypted payments' },
  { Icon: FiRefreshCw, label: '7-day easy returns' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-ink/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-12 text-sm">
        <div className="md:col-span-4 space-y-3">
          <Brand size="h-12" />
          <p className="text-ink/65 leading-relaxed">
            Cookware, cutlery and appliances for people who love cooking. Curated kitchen essentials, delivered fast.
          </p>
          <ul className="space-y-1.5 text-ink/70 pt-2">
            <li className="inline-flex items-center gap-2"><FiMail className="text-primary" /> support@kitchenlovers.store</li>
            <li className="inline-flex items-center gap-2"><FiPhone className="text-primary" /> +233 24 000 0000</li>
            <li className="inline-flex items-center gap-2"><FiMapPin className="text-primary" /> Accra, Ghana</li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-semibold mb-3 text-ink">Shop</h4>
          <ul className="space-y-2 text-ink/65">
            {SHOP_LINKS.map((l) => (
              <li key={l.to + l.label}>
                <Link to={l.to} className="no-underline hover:text-primary">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-semibold mb-3 text-ink">Company</h4>
          <ul className="space-y-2 text-ink/65">
            {COMPANY_LINKS.map((l) => (
              <li key={l.to + l.label}>
                <Link to={l.to} className="no-underline hover:text-primary">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="font-semibold mb-3 text-ink">We promise</h4>
          <ul className="space-y-2.5 text-ink/65">
            {PROMISES.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-ink/55">
          <p>&copy; {year} KitchenLovers. All rights reserved.</p>
          <p>Made with care for home chefs.</p>
        </div>
      </div>
    </footer>
  );
}
