import React from 'react';

export function Chip({ active, onClick, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition border ${
        active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-white text-ink border-ink/15 hover:border-primary hover:text-primary'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, className = '' }) {
  const childArray = React.Children.toArray(children);
  const showCarousel = childArray.length >= 6;

  if (showCarousel) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin snap-x snap-mandatory">
          {children}
        </div>
        {/* Optional: Add navigation arrows for carousel */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border border-ink/10 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            const container = e.target.parentElement.querySelector('div');
            container.scrollBy({ left: -100, behavior: 'smooth' });
          }}
        >
          ‹
        </button>
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border border-ink/10 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            const container = e.target.parentElement.querySelector('div');
            container.scrollBy({ left: 100, behavior: 'smooth' });
          }}
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
}
