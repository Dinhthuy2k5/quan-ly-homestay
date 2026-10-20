import React, { useMemo, useState } from 'react';
import { Check, CircleHelp, Search, X } from 'lucide-react';
import { AMENITY_CATEGORIES } from '../../../lib/amenities';

export function AmenityPicker({ value = [], onChange }) {
  const [query, setQuery] = useState('');
  const selected = new Set(value);
  const toggle = (name) => {
    onChange(selected.has(name) ? value.filter((item) => item !== name) : [...value, name]);
  };
  const knownNames = new Set(AMENITY_CATEGORIES.flatMap((category) => category.items.map(([name]) => name)));
  const customItems = value.filter((name) => !knownNames.has(name));
  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return AMENITY_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter(([name]) => !normalizedQuery || name.toLocaleLowerCase('vi').includes(normalizedQuery)),
    })).filter((category) => category.items.length > 0);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tiện nghi"
          aria-label="Tìm tiện nghi"
          className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-9 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa nội dung tìm tiện nghi" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:bg-gray-100"><X aria-hidden="true" className="h-4 w-4" /></button>}
      </div>

      {value.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">Đã chọn {value.length} tiện nghi</p>
          <div className="flex flex-wrap gap-2">
            {value.slice(0, 6).map((name) => (
              <button key={name} type="button" onClick={() => toggle(name)} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs text-gray-800 hover:border-gray-700">
                <span>{name}</span><X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ))}
            {value.length > 6 && <span className="self-center text-xs text-gray-500">và {value.length - 6} tiện nghi khác</span>}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
      {filteredCategories.length === 0 && customItems.length === 0 && <p className="p-4 text-sm text-gray-500">Không tìm thấy tiện nghi phù hợp.</p>}
      {filteredCategories.map((category) => (
        <details key={category.name} open={Boolean(query)} className="group px-4 first:rounded-t-xl last:rounded-b-xl">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{category.name}</span>
            <span className="text-xs font-normal text-gray-500">
              {category.items.filter(([name]) => selected.has(name)).length > 0 && `${category.items.filter(([name]) => selected.has(name)).length} đã chọn · `}
              {category.items.length} tiện nghi
            </span>
            <span aria-hidden="true" className="text-gray-500 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2">
            {category.items.map(([name, Icon]) => {
              const isSelected = selected.has(name);
              return (
                <button
                  key={`${category.name}-${name}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(name)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-500'}`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-800" strokeWidth={1.75} />
                  <span className="flex-1 text-gray-800">{name}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </details>
      ))}
      {customItems.length > 0 && (
        <section aria-labelledby="amenity-category-custom" className="p-4">
          <h3 id="amenity-category-custom" className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Tiện nghi khác đã thêm</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customItems.map((name) => (
              <button key={name} type="button" aria-pressed="true" onClick={() => toggle(name)} className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-900 bg-gray-50 px-3 py-2.5 text-left text-sm">
                <CircleHelp aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-800" strokeWidth={1.75} />
                <span className="flex-1 text-gray-800">{name}</span>
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

export default AmenityPicker;
