import React from 'react';
import { getAmenityMeta, groupAmenities } from '../../../lib/amenities';

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
 * Hiển thị danh mục tiện nghi phong cách Airbnb (2 cột với icon nét rõ ràng)
 */
export function AirbnbAmenityList({ amenities = [] }) {
  if (!amenities || amenities.length === 0) {
    return (
      <p className="text-sm italic text-gray-500">Chưa có danh sách tiện nghi nào được thiết lập.</p>
    );
  }

  return (
    <div className="space-y-6">
      {groupAmenities(amenities).map((group) => (
        <section key={group.name}>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">{group.name}</h3>
          <ul className="divide-y divide-gray-200">
            {group.items.map(({ name, icon: Icon }, index) => (
              <li key={`${name}-${index}`} className="flex min-h-14 items-center gap-4 py-3 text-sm text-gray-800">
                <Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-gray-900" strokeWidth={1.75} />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default AmenityBadge;
