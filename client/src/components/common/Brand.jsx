const LOGO_SRC = '/brand/logo.jpg';

/**
 * Renders the KitchenLovers logo.
 * - `size` controls the rendered height in Tailwind classes (e.g. 'h-10').
 * - `showText` is kept for back-compat but ignored: the new logo already contains the wordmark.
 * - Pass any extra Tailwind classes via `className`.
 */
export default function Brand({ size = 'h-10', className = '' }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={LOGO_SRC}
        alt="KitchenLovers Cookwares"
        className={`${size} w-auto object-contain select-none`}
        draggable={false}
      />
    </span>
  );
}
