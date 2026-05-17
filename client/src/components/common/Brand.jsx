const LOGO_SRC = '/brand/logo.jpg';

/**
 * KitchenLovers brand lockup: icon image + wordmark + tagline.
 * - `size` controls the rendered icon height (Tailwind class, e.g. 'h-10').
 * - `withText` toggles the wordmark + tagline beside the icon (default true).
 */
export default function Brand({ size = 'h-10', withText = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="KitchenLovers Cookwares"
        className={`${size} w-auto object-contain select-none`}
        draggable={false}
      />
      {withText && (
        <span className="flex flex-col leading-tight">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight">
            <span className="text-ink">Kitchen</span>
            <span className="text-primary">Lovers</span>
          </span>
          <span className="text-[10px] sm:text-[11px] text-ink/55 tracking-wide">
            Love Cooking, Love Life
          </span>
        </span>
      )}
    </span>
  );
}
