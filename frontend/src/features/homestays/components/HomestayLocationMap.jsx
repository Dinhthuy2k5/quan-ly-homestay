import React, { useState } from 'react';
import {
  Car,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  PhoneCall,
  Sparkles,
} from 'lucide-react';

/**
 * Component hiển thị Bản đồ vị trí homestay và Hướng dẫn đường đi chi tiết.
 * Lấy cảm hứng từ giao diện "Nơi bạn sẽ đến" trên Airbnb.
 * Sử dụng Google Maps Embed (không cần API key trả phí) dựa trên chuỗi địa chỉ của homestay.
 */
export function HomestayLocationMap({
  address,
  province,
  homestayName = 'Homestay',
  hotlinePhone = '',
  className = '',
}) {
  const [mapLoaded, setMapLoaded] = useState(false);

  const fullAddress = [address, province].filter(Boolean).join(', ');

  // URL nhúng bản đồ Google Maps (hoạt động với địa chỉ dạng chuỗi mà không cần Google Cloud billing)
  const embedUrl = fullAddress
    ? `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : '';

  // URL chỉ đường trực tiếp trên Google Maps (khởi động tính năng Directions từ vị trí hiện tại của khách)
  const directionsUrl = fullAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    : '';

  // URL xem bản đồ kích thước đầy đủ trên Google Maps
  const viewMapUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : '';

  return (
    <section
      id="location"
      aria-labelledby="location-title"
      className={`space-y-6 scroll-mt-28 ${className}`}
    >
      {/* Tiêu đề mục giống Airbnb */}
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          <h2 id="location-title" className="text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
            Nơi bạn sẽ đến
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted)] sm:text-base">
          {fullAddress || 'Đang cập nhật địa chỉ homestay'}
        </p>
      </div>

      {/* Khung bản đồ */}
      {fullAddress ? (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-1)]">
          <div className="relative aspect-[16/10] w-full sm:aspect-[21/9] min-h-[300px]">
            {!mapLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
                <Compass className="h-8 w-8 animate-spin opacity-40 mb-2" aria-hidden="true" />
                <span className="text-sm font-medium">Đang tải bản đồ khu vực...</span>
              </div>
            )}
            <iframe
              title={`Bản đồ vị trí của ${homestayName}`}
              src={embedUrl}
              onLoad={() => setMapLoaded(true)}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          {/* Thanh công cụ thao tác bản đồ */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white p-4 sm:px-6">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
              <span>{homestayName}</span>
              <span className="text-[var(--color-muted)]">·</span>
              <span className="text-[var(--color-muted)] line-clamp-1">{province || address}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Chỉ đường trên Google Maps
                </a>
              )}
              {viewMapUrl && (
                <a
                  href={viewMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                  Mở bản đồ lớn
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[16/7] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center text-[var(--color-muted)]">
          <MapPin className="mb-2 h-10 w-10 text-[var(--color-muted)]" aria-hidden="true" />
          <p className="font-medium text-[var(--color-ink)]">Chưa có thông tin định vị chính xác</p>
          <p className="mt-1 text-xs">Vui lòng liên hệ với homestay để nhận hướng dẫn đường đi chi tiết.</p>
        </div>
      )}

      {/* Hướng dẫn đường đi đến Homestay (Transportation Guide) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-1)] sm:p-7">
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
          <h3 className="text-base font-semibold text-[var(--color-ink)]">
            Hướng dẫn di chuyển & tiếp cận homestay
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Hướng dẫn Taxi & Đặt xe công nghệ */}
          <div className="flex gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Car className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Taxi & Xe công nghệ (Grab, Be, Xanh SM)</h4>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                Nhập điểm đến là <span className="font-medium text-[var(--color-ink)]">"{fullAddress || homestayName}"</span>. Tài xế có thể đưa bạn đến tận cửa cơ sở lưu trú.
              </p>
            </div>
          </div>

          {/* Hướng dẫn Xe máy / Ô tô cá nhân */}
          <div className="flex gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Xe máy & Ô tô cá nhân</h4>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                Bấm nút <span className="font-medium text-[var(--color-ink)]">"Chỉ đường trên Google Maps"</span> phía trên để hệ thống tự động dẫn đường theo tuyến ngắn nhất và tránh điểm tắc đường theo thời gian thực.
              </p>
            </div>
          </div>
        </div>

        {/* Hỗ trợ đón tiếp qua hotline */}
        {hotlinePhone && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <PhoneCall className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <span>Gặp khó khăn khi tìm đường hoặc cần chủ nhà đón tại đầu ngõ?</span>
            </div>
            <a
              href={`tel:${hotlinePhone}`}
              className="inline-flex items-center font-semibold text-[var(--color-primary)] hover:underline"
            >
              Gọi hotline: {hotlinePhone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default HomestayLocationMap;
