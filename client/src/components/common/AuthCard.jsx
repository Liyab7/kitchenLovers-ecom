export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
  variant = 'customer',
  backgroundImage,
}) {
  const fallbackGradient = {
    customer: 'from-primary/90 via-primary-600/90 to-primary-700/95',
    admin: 'from-ink to-accent/80',
    superadmin: 'from-accent via-ink to-primary-700',
  }[variant];

  return (
    <div className="w-full max-w-3xl lg:max-w-4xl card overflow-hidden grid md:grid-cols-2 shadow-[0_12px_40px_rgb(0,0,0,0.12)] bg-white/95 backdrop-blur-md rounded-2xl">
      <aside className="relative hidden md:flex overflow-hidden min-h-[420px]">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {/* Soft warm wash — keeps the photo readable, just a hint of brand color */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary-600/10 to-primary-700/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
            {/* Subtle inner vignette for polish */}
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.16)' }} />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient}`} />
        )}
      </aside>

      <section className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-ink/60 mt-2 text-sm">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 text-sm text-ink/70 text-center">{footer}</div>}
      </section>
    </div>
  );
}
