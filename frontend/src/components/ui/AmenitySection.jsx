import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getAmenityMeta, groupAmenities } from '../../lib/amenities';

const PREVIEW_LIMIT = 8;

/**
 * Modal "Tất cả tiện nghi" – hiển thị đầy đủ và nhóm theo từng danh mục chuẩn Airbnb.
 */
function AmenitiesModal({ amenities, onClose }) {
  const groups = groupAmenities(amenities);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nơi này có những gì"
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Nội dung Modal */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden">
        {/* Thanh tiêu đề sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Nơi này có những gì
          </h2>
          <div className="w-9" aria-hidden="true" />
        </div>

        {/* Danh sách các danh mục tiện nghi cuộn dọc */}
        <div className="overflow-y-auto px-6 py-4 divide-y divide-gray-200">
          {groups.map((group) => (
            <section key={group.name} className="py-6 first:pt-2 last:pb-8">
              <h3 className="mb-4 text-base sm:text-lg font-bold text-gray-900">
                {group.name}
              </h3>
              <ul className="space-y-4">
                {group.items.map(({ name, icon: Icon }, idx) => (
                  <li
                    key={`${name}-${idx}`}
                    className="flex items-center gap-4 text-sm sm:text-base text-gray-800"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 text-gray-900"
                      strokeWidth={1.5}
                    />
                    <span className="leading-snug">{name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AmenitySection – dùng chung cho cả trang khách hàng lẫn quản lý.
 *
 * 1. Hiển thị tối đa 8 tiện nghi đầu tiên được dàn đều thành 2 cột phong cách Airbnb.
 * 2. Phía dưới có nút "Hiển thị tất cả X tiện nghi".
 * 3. Khi bấm vào sẽ mở modal hiển thị toàn bộ tiện nghi được phân loại theo danh mục.
 */
export function AmenitySection({ amenities = [] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!amenities || amenities.length === 0) {
    return (
      <p className="text-sm italic text-gray-500">
        Chưa có danh sách tiện nghi nào được thiết lập.
      </p>
    );
  }

  const preview = amenities.slice(0, PREVIEW_LIMIT);
  const hasMore = amenities.length > PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      {/* Lưới 2 cột hiển thị tối đa 8 tiện nghi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
        {preview.map((name, idx) => {
          const meta = getAmenityMeta(name);
          const Icon = meta.icon;
          return (
            <div
              key={`${name}-${idx}`}
              className="flex items-center gap-4 text-sm sm:text-base text-gray-800"
            >
              <Icon
                aria-hidden="true"
                className="h-6 w-6 shrink-0 text-gray-900"
                strokeWidth={1.5}
              />
              <span className="leading-snug">{name}</span>
            </div>
          );
        })}
      </div>

      {/* Nút xem toàn bộ tiện nghi */}
      {hasMore && (
        <div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-900 bg-white px-6 py-3 text-sm sm:text-base font-semibold text-gray-900 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Hiển thị tất cả {amenities.length} tiện nghi
          </button>
        </div>
      )}

      {/* Cửa sổ Modal hiển thị đầy đủ */}
      {modalOpen && (
        <AmenitiesModal
          amenities={amenities}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default AmenitySection;
