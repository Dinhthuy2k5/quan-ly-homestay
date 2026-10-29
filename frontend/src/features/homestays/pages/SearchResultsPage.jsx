import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BedDouble, MapPin, Users } from 'lucide-react';
import { fetchHomestays, searchAvailableRooms } from '../api';
import PropertyCard from '../../../components/ui/PropertyCard';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import SkeletonGrid from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import { getErrorMessage } from '../../../lib/errors';
import { fileUrl } from '../../../lib/api/client';
import { formatVnd } from '../../../lib/format';
import { Search } from 'lucide-react';

const PAGE_SIZE = 12;

function AvailableRoomCard({ room, checkIn, checkOut, guests }) {
  const nights = room.quotedNights || [];
  const detailQuery = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  return (
    <Link to={`/rooms/${room.roomId}?${detailQuery}`} className="group block rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] focus-visible:outline-offset-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)]">
        {room.coverImageUrl ? <img src={fileUrl(room.coverImageUrl)} alt={room.roomName} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[var(--color-muted)]"><BedDouble className="h-12 w-12 stroke-[1.2]" /></div>}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="truncate font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">{room.roomName}</h2>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatVnd(room.roomTotalPrice)}</span>
        </div>
        <p className="flex items-center gap-1 text-sm text-[var(--color-muted)]"><MapPin className="h-3.5 w-3.5 shrink-0" />{room.homestayName} · {room.roomTypeName}</p>
        <p className="flex items-center gap-1 text-sm text-[var(--color-muted)]"><Users className="h-3.5 w-3.5" />Tối đa {room.maxGuests} khách <span aria-hidden="true">·</span> {nights.length} đêm</p>
        {room.amenities?.length > 0 && <p className="truncate pt-1 text-xs text-[var(--color-body)]">{room.amenities.slice(0, 3).join(' · ')}{room.amenities.length > 3 ? ` · +${room.amenities.length - 3}` : ''}</p>}
        <p className="pt-1 text-xs text-[var(--color-muted)]">{nights.length ? `${formatVnd(room.roomTotalPrice)} tổng cộng · ${formatVnd(Math.round(room.roomTotalPrice / nights.length))} trung bình/đêm` : 'Giá theo ngày lưu trú'}</p>
      </div>
    </Link>
  );
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const province = searchParams.get('province')?.trim() || '';
  const keyword = searchParams.get('keyword')?.trim() || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = Math.max(1, Number(searchParams.get('guests') || 2));
  const homestayId = searchParams.get('homestayId') || '';
  const hasDates = Boolean(checkIn && checkOut);
  const incompleteDates = Boolean(checkIn) !== Boolean(checkOut);
  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const search = useCallback((page = 0) => hasDates
    ? searchAvailableRooms({ province, keyword, homestayId: homestayId || undefined, checkInDate: checkIn, checkOutDate: checkOut, guestCount: guests, page, size: PAGE_SIZE })
    : fetchHomestays({ province, keyword, page, size: PAGE_SIZE }),
  [hasDates, province, keyword, homestayId, checkIn, checkOut, guests]);

  useEffect(() => {
    let active = true;
    if (incompleteDates) {
      return () => { active = false; };
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await search(0);
        if (!active) return;
        setItems(result.items || []);
        setTotalElements(result.totalElements || 0);
        setNextPage(1);
        setHasMore((result.totalPages || 0) > 1);
      } catch (err) {
        if (!active) return;
        setItems([]); setTotalElements(0); setError(getErrorMessage(err));
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [search, incompleteDates, reloadKey]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true); setError('');
    try {
      const result = await search(nextPage);
      setItems((current) => [...current, ...(result.items || [])]);
      setNextPage((page) => page + 1);
      setHasMore(nextPage + 1 < (result.totalPages || 0));
    } catch (err) { setError(getErrorMessage(err)); } finally { setLoadingMore(false); }
  };

  const homestays = useMemo(() => {
    const map = new Map();
    if (hasDates) items.forEach((room) => map.set(room.homestayId, { id: room.homestayId, name: room.homestayName }));
    return [...map.values()];
  }, [items, hasDates]);
  const queryLabel = [province, keyword].filter(Boolean).join(' · ');

  const updateHomestayFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('homestayId', value); else next.delete('homestayId');
    next.set('page', '0');
    setSearchParams(next);
  };

  return (
    <main className="space-y-7">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]"><Search aria-hidden="true" className="h-4 w-4" />{queryLabel ? 'Kết quả tìm kiếm' : 'Khám phá homestay'}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">{queryLabel || 'Tất cả homestay'}</h1>
        {!loading && !error && !incompleteDates && <p className="text-sm text-[var(--color-muted)]">{totalElements} {hasDates ? 'phòng còn trống' : 'homestay đang hoạt động'}{hasDates && ` · ${checkIn} – ${checkOut} · ${guests} khách`}</p>}
      </header>

      {hasDates && homestays.length > 1 && <div className="flex flex-wrap items-center gap-3"><label htmlFor="homestay-filter" className="text-sm font-medium">Homestay</label><select id="homestay-filter" value={homestayId} onChange={(e) => updateHomestayFilter(e.target.value)} className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm"><option value="">Tất cả homestay</option>{homestays.map((home) => <option key={home.id} value={home.id}>{home.name}</option>)}</select></div>}
      {incompleteDates && <ErrorBanner message="Vui lòng chọn cả ngày nhận phòng và ngày trả phòng để tìm phòng trống." onRetry={() => { const next = new URLSearchParams(searchParams); next.delete('checkIn'); next.delete('checkOut'); setSearchParams(next); }} />}
      {loading && !incompleteDates && <SkeletonGrid count={8} />}
      {!loading && error && <ErrorBanner message={error} onRetry={() => { setLoading(true); setError(''); setReloadKey((key) => key + 1); }} />}
      {!loading && !error && !incompleteDates && items.length === 0 && <EmptyState title={hasDates ? 'Không có phòng trống trong khoảng ngày này' : 'Không tìm thấy homestay phù hợp'} description={hasDates ? 'Thử ngày khác, giảm số khách hoặc xóa bộ lọc để xem thêm lựa chọn.' : 'Thử một tỉnh hoặc từ khóa khác để mở rộng kết quả.'} actionLabel="Xóa bộ lọc" onAction={() => setSearchParams({}, { replace: true })} />}
      {!loading && !error && items.length > 0 && <>
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => hasDates ? <AvailableRoomCard key={item.roomId} room={item} checkIn={checkIn} checkOut={checkOut} guests={guests} /> : <PropertyCard key={item.id} homestay={item} />)}</div>
        {error && <ErrorBanner message={error} onRetry={loadMore} />}
        {hasMore && <div className="flex justify-center py-4"><Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Đang tải…' : 'Xem thêm'}</Button></div>}
      </>}
    </main>
  );
}

export default SearchResultsPage;
