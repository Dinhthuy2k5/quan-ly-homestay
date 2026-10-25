import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BedDouble, MapPin, Phone, Home, Users, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { fetchHomestayDetail, fetchHomestayRoomTypes, fetchHomestayRooms } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import HomestayLocationMap from '../components/HomestayLocationMap';
import { getAmenityMeta } from '../../../lib/amenities';
import { formatVnd } from '../../../lib/format';

function DetailSkeleton() {
  return (
    <div aria-label="Đang tải thông tin homestay" className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-1/2 rounded bg-[var(--color-surface-soft)]" />
      <div className="aspect-[16/7] rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)]" />
      <div className="h-24 rounded bg-[var(--color-surface-soft)]" />
    </div>
  );
}

export function HomestayDetailPage() {
  const { homestayId } = useParams();
  const [homestay, setHomestay] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsPage, setRoomsPage] = useState(0);
  const [roomsMeta, setRoomsMeta] = useState({ page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [priceSort, setPriceSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomTypesError, setRoomTypesError] = useState('');
  const [roomsError, setRoomsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [homestayId]);

  useEffect(() => {
    if (!homestayId) return undefined;
    let active = true;
    Promise.allSettled([fetchHomestayDetail(homestayId), fetchHomestayRoomTypes(homestayId)])
      .then(([detailResult, typesResult]) => {
        if (!active) return;
        if (detailResult.status === 'fulfilled') {
          setHomestay(detailResult.value);
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        else setError(getErrorMessage(detailResult.reason));
        if (typesResult.status === 'fulfilled') setRoomTypes(typesResult.value || []);
        else setRoomTypesError(getErrorMessage(typesResult.reason));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId, reloadKey]);

  useEffect(() => {
    if (!homestayId) return undefined;
    let active = true;
    fetchHomestayRooms(homestayId, { page: roomsPage, size: roomsMeta.size })
      .then((result) => {
        if (!active) return;
        setRooms(result.items || []);
        setRoomsMeta((current) => ({ ...current, ...result }));
        setRoomsError('');
      })
      .catch((roomError) => { if (active) setRoomsError(getErrorMessage(roomError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId, reloadKey, roomsPage, roomsMeta.size]);

  const retry = () => {
    setLoading(true);
    setError('');
    setRoomTypesError('');
    setRoomsError('');
    setReloadKey((key) => key + 1);
  };

  if (loading) return <DetailSkeleton />;
  if (error || !homestay) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <ErrorBanner message={error || 'Không tìm thấy thông tin homestay.'} onRetry={retry} />
        <div className="mt-4 text-center"><Link to="/"><Button variant="secondary">Quay lại khám phá</Button></Link></div>
      </div>
    );
  }

  const media = homestay.media || [];
  const photos = media.slice(0, 5);
  const visibleRooms = rooms
    .filter((room) => !roomTypeFilter || String(room.roomTypeId) === roomTypeFilter || room.roomTypeName === roomTypeFilter)
    .sort((a, b) => priceSort === 'asc'
      ? (a.nightlyPrice ?? Number.MAX_SAFE_INTEGER) - (b.nightlyPrice ?? Number.MAX_SAFE_INTEGER)
      : priceSort === 'desc'
        ? (b.nightlyPrice ?? -1) - (a.nightlyPrice ?? -1)
        : 0);

  return (
    <article className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="rounded-sm hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]">Khám phá</Link>
        <span aria-hidden="true">›</span>
        <span className="truncate font-medium text-[var(--color-ink)]">{homestay.name}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">{homestay.name}</h1>
        <p className="flex items-start gap-2 text-sm text-[var(--color-body)] sm:text-base">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <span>{[homestay.address, homestay.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</span>
        </p>
      </header>

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-[var(--radius-lg)] md:h-[420px] md:grid-cols-4">
          <img src={fileUrl(photos[0].url)} alt={photos[0].caption || homestay.name} fetchPriority="high" className="aspect-[4/3] h-full w-full object-cover md:col-span-2 md:aspect-auto" />
          {photos.slice(1, 5).length > 0 && (
            <div className="hidden grid-cols-2 grid-rows-2 gap-2 md:col-span-2 md:grid">
              {photos.slice(1, 5).map((photo, index) => (
                <img key={photo.id || photo.url || index} src={fileUrl(photo.url)} alt={photo.caption || `${homestay.name}, ảnh ${index + 2}`} loading="lazy" className="h-full min-h-0 w-full object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-[16/7] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
          <Home aria-hidden="true" className="mb-3 h-12 w-12" />
          <p>Homestay chưa có ảnh giới thiệu.</p>
        </div>
      )}

      <div className="space-y-10">
          <section aria-labelledby="homestay-description" className="border-b border-[var(--color-border)] pb-8">
            <h2 id="homestay-description" className="text-xl font-semibold text-[var(--color-ink)]">Giới thiệu cơ sở</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-[var(--color-body)]">{homestay.description || 'Homestay chưa cập nhật phần giới thiệu.'}</p>
          </section>

          <section aria-labelledby="rooms-title" className="scroll-mt-28">
            <div className="mb-5 flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BedDouble aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" />
                  <h2 id="rooms-title" className="text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">Phòng tại {homestay.name}</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{roomsMeta.totalElements} phòng đang được công khai</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="room-type-filter">Lọc theo loại phòng</label>
                <div className="relative">
                  <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <select id="room-type-filter" value={roomTypeFilter} onChange={(event) => setRoomTypeFilter(event.target.value)} className="min-h-11 rounded-full border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm text-[var(--color-ink)]">
                    <option value="">Tất cả loại phòng</option>
                    {roomTypes.map((type) => <option key={type.id} value={String(type.id)}>{type.name}</option>)}
                  </select>
                </div>
                <label className="sr-only" htmlFor="room-price-sort">Sắp xếp giá phòng</label>
                <select id="room-price-sort" value={priceSort} onChange={(event) => setPriceSort(event.target.value)} className="min-h-11 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-ink)]">
                  <option value="">Thứ tự mặc định</option>
                  <option value="asc">Giá thấp đến cao</option>
                  <option value="desc">Giá cao đến thấp</option>
                </select>
              </div>
            </div>

            {roomsError ? <ErrorBanner message={roomsError} onRetry={retry} className="my-4" /> : visibleRooms.length === 0 ? (
              <EmptyState title={rooms.length ? 'Không có phòng phù hợp' : 'Chưa có phòng được công khai'} description={rooms.length ? 'Thử chọn loại phòng khác.' : 'Homestay chưa mở phòng nào để khách xem. Bạn có thể liên hệ trực tiếp để được tư vấn.'} />
            ) : (
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {visibleRooms.map((room) => (
                  <article key={room.id} className="group min-w-0">
                    <Link to={`/rooms/${room.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-surface-soft)]">
                        {room.coverImageUrl ? <img src={fileUrl(room.coverImageUrl)} alt={room.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-[var(--color-muted)]"><BedDouble aria-hidden="true" className="h-10 w-10" /></div>}
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-[var(--color-ink)]">{room.name}</h3>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">{room.roomTypeName || 'Phòng lưu trú'}{homestay.province ? ` · ${homestay.province}` : ''}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-[var(--color-ink)]">{room.nightlyPrice == null ? 'Chưa thiết lập giá' : <>{formatVnd(room.nightlyPrice)} <span className="font-normal text-[var(--color-muted)]">/ đêm</span></>}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-body)]"><Users aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" />Tối đa {room.maxGuests ?? '—'} khách</div>
                      {room.amenities?.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]">
                          {room.amenities.slice(0, 3).map((name) => { const Icon = getAmenityMeta(name).icon; return <li key={name} className="inline-flex items-center gap-1"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{name}</li>; })}
                          {room.amenities.length > 3 && <li>+{room.amenities.length - 3} tiện nghi</li>}
                        </ul>
                      )}
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-muted)]">{room.description || 'Xem thông tin chi tiết và tiện nghi của phòng.'}</p>
                    </Link>
                  </article>
                ))}
              </div>
            )}
            {roomsMeta.totalPages > 1 && (
              <nav aria-label="Phân trang danh sách phòng" className="mt-8 flex items-center justify-center gap-4">
                <button type="button" disabled={roomsMeta.page <= 0} onClick={() => setRoomsPage((page) => Math.max(0, page - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium disabled:opacity-40"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Trước</button>
                <span className="text-sm text-[var(--color-muted)]">Trang {roomsMeta.page + 1} / {roomsMeta.totalPages}</span>
                <button type="button" disabled={roomsMeta.page >= roomsMeta.totalPages - 1} onClick={() => setRoomsPage((page) => page + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium disabled:opacity-40">Sau<ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
              </nav>
            )}
          </section>

          <section aria-labelledby="room-types-title" className="border-t border-[var(--color-border)] pt-8">
            <h2 id="room-types-title" className="text-lg font-semibold text-[var(--color-ink)]">Các loại phòng</h2>
            {roomTypesError ? <ErrorBanner message={roomTypesError} onRetry={retry} className="my-4" /> : roomTypes.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {roomTypes.map((type) => <article key={type.id} className="rounded-2xl border border-[var(--color-border)] p-4"><h3 className="font-semibold text-[var(--color-ink)]">{type.name}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{type.description || 'Chưa có mô tả cho loại phòng này.'}</p></article>)}
              </div>
            ) : <p className="mt-3 text-sm text-[var(--color-muted)]">Chưa có thông tin loại phòng.</p>}
          </section>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-lg font-semibold text-[var(--color-ink)]">Cần tư vấn thêm?</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Gọi homestay để hỏi về phòng và ngày lưu trú mong muốn.</p></div>
              {homestay.hotlinePhone ? <a href={`tel:${homestay.hotlinePhone}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-semibold text-white hover:bg-[var(--color-primary-hover)]"><Phone aria-hidden="true" className="h-4 w-4" />Gọi {homestay.hotlinePhone}</a> : <p className="text-sm text-[var(--color-muted)]">Chưa cập nhật hotline.</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-body)]"><p>Nhận phòng từ {CHECK_IN_TIME}</p><p>Trả phòng đến hết {CHECK_OUT_DEADLINE}</p></div>
          </aside>
      </div>

      <HomestayLocationMap
        address={homestay.address}
        province={homestay.province}
        homestayName={homestay.name}
        hotlinePhone={homestay.hotlinePhone}
        className="border-t border-[var(--color-border)] pt-10"
      />
    </article>
  );
}

export default HomestayDetailPage;
