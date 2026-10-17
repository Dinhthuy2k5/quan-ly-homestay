import React, { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';

/** Search controls are limited to province and keyword by API-PUB-05. */
export function SearchBar({ initialProvince = '', initialKeyword = '', onSearch, className = '', idPrefix = 'search' }) {
  const [province, setProvince] = useState(initialProvince);
  const [keyword, setKeyword] = useState(initialKeyword);
  const hasFilter = Boolean(province.trim() || keyword.trim());

  const submit = (event) => {
    event.preventDefault();
    onSearch?.({ province: province.trim(), keyword: keyword.trim() });
  };

  const clear = () => {
    setProvince('');
    setKeyword('');
    onSearch?.({ province: '', keyword: '' });
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Tìm homestay theo địa điểm hoặc tên"
      className={`flex w-full items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)] ${className}`}
    >
      <div className="min-w-0 flex-1 rounded-l-[var(--radius-pill)] px-3 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-5">
        <label htmlFor={`${idPrefix}-province`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Ở đâu</label>
        <div className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input
            id={`${idPrefix}-province`}
            aria-label="Tỉnh hoặc thành phố"
            type="search"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            placeholder="Tỉnh / thành phố"
            className="min-w-0 w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:outline-none"
          />
        </div>
      </div>
      <span aria-hidden="true" className="h-9 w-px bg-[var(--color-border)]" />
      <div className="min-w-0 flex-[1.2] px-3 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-5">
        <label htmlFor={`${idPrefix}-keyword`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Tên homestay</label>
        <input
          id={`${idPrefix}-keyword`}
          aria-label="Tên homestay hoặc từ khóa"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên hoặc từ khóa"
          className="min-w-0 w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:outline-none"
        />
      </div>
      {hasFilter && (
        <button type="button" onClick={clear} aria-label="Xóa bộ lọc" className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      <button type="submit" aria-label="Tìm homestay" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
        <Search aria-hidden="true" className="h-4 w-4" />
      </button>
    </form>
  );
}

export default SearchBar;
