import { useEffect, useState, useRef } from 'react';
import { FiArrowRight, FiShoppingBag, FiTruck, FiShield } from 'react-icons/fi';
import { api } from '../../services/api.js';

const SLIDES = [
  {
    Icon: FiShoppingBag,
    eyebrow: 'KitchenLovers Cookwares',
    title: 'Premium cookware for every kitchen.',
    body: 'Curated pots, pans, and appliances from brands we trust.',
  },
  {
    Icon: FiTruck,
    eyebrow: 'Easy shopping',
    title: 'Shop quality products with one tap.',
    body: 'Save favourites, track orders live, and reorder in seconds.',
  },
  {
    Icon: FiShield,
    eyebrow: 'Your peace of mind',
    title: 'Fast delivery. Secure payments. Trusted products.',
    body: 'Encrypted checkout and a hassle-free 7-day return window.',
  },
];

/**
 * 3-slide welcome modal shown on every fresh page load.
 *
 * Behaviour:
 * - Mounts visible on each app start (i.e. every full page refresh).
 * - "Skip" or finishing the last slide hides it for the rest of this page
 *   session, so SPA navigation doesn't keep popping it back up.
 * - No persistent flag: refreshing the page shows it again, per request.
 */
export default function Welcome({ onDismiss }) {
  const [open, setOpen] = useState(true); // visible by default on every fresh mount
  const [step, setStep] = useState(0);
  const [banners, setBanners] = useState([]);
  const sessionDismissed = useRef(false);

  useEffect(() => {
    if (sessionDismissed.current) setOpen(false);
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/banners', { params: { placement: 'welcome' } })
      .then((r) => { if (active) setBanners(r.data.data || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function dismiss() {
    sessionDismissed.current = true;
    setOpen(false);
    onDismiss?.();
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else dismiss();
  }

  if (!open) return null;
  const s = SLIDES[step];
  // Pair banner by sortOrder if set, else fall back to position in the list
  const slideBanner =
    banners.find((b) => Number(b.sortOrder) === step) ||
    banners[step] ||
    null;
  const bgImage = slideBanner?.imageUrl;

  return (
    <div className="fixed inset-0 z-[60] bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="card max-w-md w-full overflow-hidden bg-white">
        <div className="relative h-52 sm:h-60 bg-gradient-to-br from-primary via-primary-600 to-primary-700 flex items-center justify-center overflow-hidden">
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          {bgImage ? (
            <div className="absolute inset-0 bg-gradient-to-b from-ink/10 via-ink/20 to-ink/40" />
          ) : (
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25), transparent 50%)' }} />
          )}
          {!bgImage && <s.Icon className="text-white text-6xl relative z-10 drop-shadow-md" />}
        </div>

        <div className="p-6 sm:p-8 space-y-3 text-center">
          <p className="uppercase tracking-[0.3em] text-[10px] font-bold text-primary">{s.eyebrow}</p>
          <h2 className="text-2xl font-extrabold">{s.title}</h2>
          <p className="text-ink/70 text-sm">{s.body}</p>
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-4">
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-primary' : 'w-2 bg-ink/15'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="btn-ghost flex-1 text-sm"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={next}
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
            >
              {step === SLIDES.length - 1 ? "Let's shop" : 'Next'} <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
