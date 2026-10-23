import React from 'react';
import { getAmenityMeta } from '../../../lib/amenities';
import { AmenitySection } from '../../../components/ui/AmenitySection';

/**
 * Hiển thị 1 huy hiệu tiện nghi nhỏ gọn
 */
export function AmenityBadge({ name, className = '' }) {
  const meta = getAmenityMeta(name);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}
      title={meta.label}
    >
      <Icon className="h-3.5 w-3.5 text-gray-600 shrink-0" />
      <span className="truncate max-w-[120px]">{meta.label}</span>
    </span>
  );
}

/**
 * Hiển thị danh mục tiện nghi phong cách Airbnb (2 cột với icon nét rõ ràng, tối đa 8 item, kèm modal xem tất cả)
 */
export function AirbnbAmenityList({ amenities = [] }) {
  return <AmenitySection amenities={amenities} />;
}

export default AmenityBadge;
