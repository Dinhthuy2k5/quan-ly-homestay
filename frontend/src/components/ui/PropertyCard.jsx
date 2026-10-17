import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Home } from 'lucide-react';
import { fileUrl } from '../../lib/api/client';

/**
 * Thẻ cơ sở Homestay theo phong cách Airbnb (mục 6.3).
 * Không viền, không đổ bóng, ảnh tỉ lệ 4:3 bo --radius-lg.
 */
export function PropertyCard({ homestay }) {
  const { id, name, province, hotlinePhone, coverImageUrl } = homestay;
  const fullCoverUrl = fileUrl(coverImageUrl);

  return (
    <Link to={`/homestays/${id}`} className="group block rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] focus-visible:outline-offset-2">
      {/* 4:3 Aspect Image */}
      <div className="aspect-[4/3] w-full rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface-soft)] relative">
        {fullCoverUrl ? (
          <img
            src={fullCoverUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          style={{ display: fullCoverUrl ? 'none' : 'flex' }}
          className="w-full h-full items-center justify-center text-[var(--color-muted)] bg-[var(--color-surface-soft)]"
        >
          <Home className="w-12 h-12 stroke-[1.2]" />
        </div>
      </div>

      {/* Thông tin bên dưới ảnh */}
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--color-ink)] truncate group-hover:text-[var(--color-primary)] transition-colors">
          {name}
        </h3>

        <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] truncate">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{province || 'Toàn quốc'}</span>
        </div>

        {hotlinePhone && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-body)]">
            <Phone className="w-3.5 h-3.5 text-[var(--color-muted)] flex-shrink-0" />
            <span className="font-medium text-xs tracking-wide">{hotlinePhone}</span>
          </div>
        )}

      </div>
    </Link>
  );
}

export default PropertyCard;
