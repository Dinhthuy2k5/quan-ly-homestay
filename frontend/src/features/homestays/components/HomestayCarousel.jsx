import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '../../../components/ui/PropertyCard';
import { PROVINCE_DESCRIPTIONS } from '../../../lib/constants';

export function HomestayCarousel({ province, homestays }) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby={`province-${province}`} className="group/carousel">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={`province-${province}`} className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
            Homestay tại {province}
          </h2>
          {PROVINCE_DESCRIPTIONS[province] && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">{PROVINCE_DESCRIPTIONS[province]}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            to={`/search?province=${encodeURIComponent(province)}`}
            className="hidden items-center gap-1 text-sm font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline sm:inline-flex"
          >
            Xem tất cả <span aria-hidden="true">›</span>
          </Link>
          <div className="hidden gap-2 md:flex">
            <button type="button" onClick={() => scroll(-1)} aria-label={`Cuộn homestay ${province} sang trái`} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white transition-colors hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={`Cuộn homestay ${province} sang phải`} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white transition-colors hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex="0" aria-label={`Homestay tại ${province}`}>
        {homestays.map((homestay) => (
          <div key={homestay.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.5%]">
            <PropertyCard homestay={homestay} />
          </div>
        ))}
      </div>
      <Link
        to={`/search?province=${encodeURIComponent(province)}`}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4 sm:hidden"
      >
        Xem tất cả homestay tại {province}
      </Link>
    </section>
  );
}

export default HomestayCarousel;
