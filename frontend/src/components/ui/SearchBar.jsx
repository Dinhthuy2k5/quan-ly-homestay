import React, { useState } from 'react';
import { CalendarDays, MapPin, Search, Users, X } from 'lucide-react';

const TODAY_LOCAL = (() => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
})();

/** Airbnb-inspired search controls backed by API-PUB-03 and API-PUB-05. */
export function SearchBar({
  initialProvince = '',
  initialKeyword = '',
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuestCount = 2,
  onSearch,
  className = '',
  idPrefix = 'search',
}) {
  const [destination, setDestination] = useState(initialProvince || initialKeyword);
  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [guestCount, setGuestCount] = useState(String(initialGuestCount || 2));
  const [dateError, setDateError] = useState('');
  const hasFilter = Boolean(destination.trim() || checkInDate || checkOutDate || Number(guestCount) !== 2);

  const submit = (event) => {
    event.preventDefault();
    setDateError('');
    if (Boolean(checkInDate) !== Boolean(checkOutDate)) {
      setDateError('Vui lòng chọn cả ngày nhận phòng và ngày trả phòng.');
      return;
    }
    if (checkInDate && checkOutDate <= checkInDate) {
      setDateError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    onSearch?.({
      province: '',
      keyword: destination.trim(),
      checkInDate,
      checkOutDate,
      guestCount: Math.max(1, Number(guestCount) || 1),
    });
  };

  const clear = () => {
    setDestination('');
    setCheckInDate('');
    setCheckOutDate('');
    setGuestCount('2');
    setDateError('');
    onSearch?.({ province: '', keyword: '', checkInDate: '', checkOutDate: '', guestCount: 2 });
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Tìm homestay và phòng trống"
      className={`relative flex w-full items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)] ${className}`}
    >
      <div className="min-w-[140px] flex-[1.35] rounded-l-[var(--radius-pill)] px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-4">
        <label htmlFor={`${idPrefix}-province`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Ở đâu</label>
        <div className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input
            id={`${idPrefix}-province`}
            aria-label="Tỉnh, thành phố hoặc homestay"
            type="search"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Tìm điểm đến"
            className="min-w-0 w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:outline-none"
          />
        </div>
      </div>
      <span aria-hidden="true" className="h-9 w-px bg-[var(--color-border)]" />
      <div className="min-w-[108px] flex-1 px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-3">
        <label htmlFor={`${idPrefix}-checkin`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Nhận phòng</label>
        <div className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input id={`${idPrefix}-checkin`} aria-label="Ngày nhận phòng" type="date" min={TODAY_LOCAL} value={checkInDate} onChange={(event) => { setCheckInDate(event.target.value); setDateError(''); }} className="min-w-0 w-full bg-transparent text-xs text-[var(--color-ink)] focus-visible:outline-none" />
        </div>
      </div>
      <span aria-hidden="true" className="h-9 w-px bg-[var(--color-border)]" />
      <div className="min-w-[108px] flex-1 px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-3">
        <label htmlFor={`${idPrefix}-checkout`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Trả phòng</label>
        <div className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input id={`${idPrefix}-checkout`} aria-label="Ngày trả phòng" type="date" min={checkInDate || TODAY_LOCAL} value={checkOutDate} onChange={(event) => { setCheckOutDate(event.target.value); setDateError(''); }} className="min-w-0 w-full bg-transparent text-xs text-[var(--color-ink)] focus-visible:outline-none" />
        </div>
      </div>
      <span aria-hidden="true" className="h-9 w-px bg-[var(--color-border)]" />
      <div className="min-w-[82px] flex-[0.65] px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-soft)] sm:px-3">
        <label htmlFor={`${idPrefix}-guests`} className="mb-0.5 block text-xs font-semibold text-[var(--color-ink)]">Khách</label>
        <div className="flex items-center gap-1.5">
          <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input id={`${idPrefix}-guests`} aria-label="Số lượng khách" type="number" min="1" max="255" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} className="min-w-0 w-full bg-transparent text-sm text-[var(--color-ink)] focus-visible:outline-none" />
        </div>
      </div>
      {hasFilter && (
        <button type="button" onClick={clear} aria-label="Xóa bộ lọc" className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      <button type="submit" aria-label="Tìm homestay và phòng" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
        <Search aria-hidden="true" className="h-4 w-4" />
      </button>
      {dateError && <p role="alert" className="absolute left-4 top-full z-10 mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow">{dateError}</p>}
    </form>
  );
}

export default SearchBar;
