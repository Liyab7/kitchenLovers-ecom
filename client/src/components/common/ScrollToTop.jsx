import { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';

/**
 * Mobile-only floating "scroll to top" button.
 *
 * Appears after the user scrolls past `showAfter` pixels. Positioned above the
 * fixed bottom nav (bottom-20) and on the right edge. Smooth-scrolls to top
 * when tapped. Hidden entirely on md+ screens since desktop users have other
 * navigation affordances.
 */
export default function ScrollToTop({ showAfter = 320 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVisible(window.scrollY > showAfter);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [showAfter]);

  function scrollUp() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`md:hidden fixed right-4 bottom-20 z-40 w-11 h-11 rounded-full
                  bg-primary text-white shadow-lg shadow-primary/30
                  flex items-center justify-center
                  transition-all duration-300 ease-out
                  hover:bg-primary-600 active:scale-95
                  ${visible
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <FiArrowUp className="text-lg" />
    </button>
  );
}
