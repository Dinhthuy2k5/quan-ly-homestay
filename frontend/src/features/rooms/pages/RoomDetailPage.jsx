import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AirVent, Check, ChevronLeft, ChevronRight, Clock, Home, MapPin,
  Phone, Sparkles, Tv, Users, Wifi, X,
} from 'lucide-react';
import { fetchRoomDetail } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import Button from '../../../components/ui/Button';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import StatusBadge from '../../../components/ui/StatusBadge';

const AMENITY_ICONS = {
  Wifi, 'Wi-Fi': Wifi, 'Điều hòa': AirVent, TV: Tv, Tivi: Tv,
};

function PhotoGallery({ roomName, media }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const count = media.length;

  const move = useCallback((direction) => setActiveIndex((index) => (index + direction + count) % count), [count]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, move]);

  if (!count) {
    return (
      <div id="photos" className="flex aspect-[16/8] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
        <Home aria-hidden="true" className="mb-3 h-12 w-12" />
        <p>Phòng chưa có ảnh giới thiệu.</p>
      </div>
    );
  }

  return (
    <section id="photos" aria-label="Thư viện ảnh phòng">
      <div className="relative md:hidden">
        <button type="button" onClick={() => setLightboxOpen(true)} aria-label="Mở ảnh toàn màn hình" className="block w-full overflow-hidden rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
          <img src={fileUrl(media[activeIndex].url)} alt={media[activeIndex].caption || roomName} fetchPriority="high" className="aspect-[4/3] w-full object-cover" />
        </button>
        {count > 1 && (
          <>
            <button type="button" onClick={() => move(-1)} aria-label="Ảnh trước" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-1)]"><ChevronLeft aria-hidden="true" /></button>
            <button type="button" onClick={() => move(1)} aria-label="Ảnh tiếp theo" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-1)]"><ChevronRight aria-hidden="true" /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">{activeIndex + 1}/{count}</span>
          </>
        )}
      </div>

      <div className="relative hidden h-[420px] grid-cols-4 gap-2 overflow-hidden rounded-[var(--radius-lg)] md:grid">
        <button type="button" onClick={() => { setActiveIndex(0); setLightboxOpen(true); }} aria-label="Mở ảnh chính toàn màn hình" className={`${count > 1 ? 'col-span-2' : 'col-span-4'} overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--color-ink)]`}>
          <img src={fileUrl(media[0].url)} alt={media[0].caption || roomName} fetchPriority="high" className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]" />
        </button>
        {count > 1 && (
          <div className="col-span-2 grid grid-cols-2 grid-rows-2 gap-2">
            {media.slice(1, 5).map((photo, index) => (
              <button key={photo.id || photo.url || index} type="button" onClick={() => { setActiveIndex(index + 1); setLightboxOpen(true); }} aria-label={`Mở ảnh ${index + 2}`} className="min-h-0 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--color-ink)]">
                <img src={fileUrl(photo.url)} alt={photo.caption || `${roomName}, ảnh ${index + 2}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]" />
              </button>
            ))}
            {count < 5 && Array.from({ length: 5 - count }).map((_, index) => <div key={`empty-${index}`} className="bg-[var(--color-surface-soft)]" />)}
          </div>
        )}
        {count > 1 && (
          <button type="button" onClick={() => { setActiveIndex(0); setLightboxOpen(true); }} className="absolute bottom-4 right-4 min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-ink)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]">
            Hiện tất cả {count} ảnh
          </button>
        )}
      </div>

      {lightboxOpen && (
        <div role="dialog" aria-modal="true" aria-label="Xem ảnh phòng" className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/95 p-4 text-white">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Đóng thư viện ảnh" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/15"><X aria-hidden="true" /></button>
          {count > 1 && <button type="button" onClick={() => move(-1)} aria-label="Ảnh trước" className="absolute left-3 grid h-11 w-11 place-items-center rounded-full hover:bg-white/15 sm:left-8"><ChevronLeft aria-hidden="true" className="h-7 w-7" /></button>}
          <figure className="flex max-h-full max-w-full flex-col items-center gap-3">
            <img src={fileUrl(media[activeIndex].url)} alt={media[activeIndex].caption || roomName} className="max-h-[82vh] max-w-full object-contain" />
            <figcaption className="text-sm text-white/80">{media[activeIndex].caption || roomName} · {activeIndex + 1}/{count}</figcaption>
          </figure>
          {count > 1 && <button type="button" onClick={() => move(1)} aria-label="Ảnh tiếp theo" className="absolute right-3 grid h-11 w-11 place-items-center rounded-full hover:bg-white/15 sm:right-8"><ChevronRight aria-hidden="true" className="h-7 w-7" /></button>}
        </div>
      )}
    </section>
  );
}

function RoomSkeleton() {
  return (
    <div aria-label="Đang tải thông tin phòng" className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-1/2 rounded bg-[var(--color-surface-soft)]" />
      <div className="aspect-[16/7] rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)]" />
      <div className="h-40 rounded bg-[var(--color-surface-soft)]" />
    </div>
  );
}

export function RoomDetailPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);

  useEffect(() => {
    if (!roomId) return undefined;
    let active = true;
    fetchRoomDetail(roomId)
      .then((data) => { if (active) setRoom(data); })
      .catch((err) => { if (active) setError(getErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [roomId, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  };

  if (loading) return <RoomSkeleton />;
  if (error || !room) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <ErrorBanner message={error || 'Không tìm thấy thông tin phòng.'} onRetry={retry} />
        <div className="mt-4 text-center"><Link to="/search"><Button variant="secondary">Quay lại tìm homestay</Button></Link></div>
      </div>
    );
  }

  const homestay = room.homestay || {};
  const roomType = room.roomType || {};
  const media = room.media || [];
  const amenities = room.amenities || [];
  const visibleAmenities = amenitiesExpanded ? amenities : amenities.slice(0, 8);
  const description = [room.description, roomType.description].filter(Boolean).join('\n\n');

  return (
    <article className="mx-auto max-w-6xl space-y-7 pb-24 sm:space-y-9 lg:pb-0">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="hover:text-[var(--color-ink)]">Khám phá</Link><span aria-hidden="true">›</span>
        {homestay.id ? <Link to={`/homestays/${homestay.id}`} className="max-w-[50vw] truncate hover:text-[var(--color-ink)]">{homestay.name}</Link> : <span>Homestay</span>}
        <span aria-hidden="true">›</span><span className="truncate font-medium text-[var(--color-ink)]">{room.name}</span>
      </nav>

      <PhotoGallery roomName={room.name} media={media} />

      <nav aria-label="Mục trên trang phòng" className="sticky top-16 z-[var(--z-sticky)] -mx-4 flex gap-6 overflow-x-auto border-b border-[var(--color-border)] bg-white/95 px-4 py-3 text-sm font-medium text-[var(--color-body)] backdrop-blur sm:top-20 sm:mx-0 sm:px-0">
        <a href="#overview" className="shrink-0 hover:text-[var(--color-ink)]">Tổng quan</a>
        <a href="#amenities" className="shrink-0 hover:text-[var(--color-ink)]">Tiện nghi</a>
        <a href="#location" className="shrink-0 hover:text-[var(--color-ink)]">Vị trí</a>
        <a href="#rules" className="shrink-0 hover:text-[var(--color-ink)]">Quy định</a>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10">
          <section id="overview" className="scroll-mt-36 border-b border-[var(--color-border)] pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">{room.name}</h1>
              <StatusBadge type="room" status="ACTIVE" />
            </div>
            <p className="mt-2 text-base text-[var(--color-body)]">
              {roomType.name ? `Phòng ${roomType.name}` : 'Phòng lưu trú'}{homestay.name ? ` tại ${homestay.name}` : ''}{homestay.province ? `, ${homestay.province}` : ''}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-body)]">
              <Users aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" />
              Tối đa {room.maxGuests ?? '—'} khách
            </div>
          </section>

          <section className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-body)]"><Home aria-hidden="true" className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold text-[var(--color-ink)]">{homestay.name || 'Homestay'}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{[homestay.address, homestay.province].filter(Boolean).join(', ')}</p>
              </div>
            </div>
            {homestay.id && <Link to={`/homestays/${homestay.id}`} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-ink)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-soft)]">Xem homestay</Link>}
          </section>

          <section className="border-b border-[var(--color-border)] pb-8">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Giới thiệu phòng</h2>
            <p className={`mt-4 whitespace-pre-line leading-relaxed text-[var(--color-body)] ${descriptionExpanded ? '' : 'line-clamp-5'}`}>
              {description || 'Homestay chưa cập nhật mô tả cho phòng này.'}
            </p>
            {description.length > 360 && <button type="button" onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="mt-3 min-h-11 font-semibold text-[var(--color-ink)] underline underline-offset-4">{descriptionExpanded ? 'Thu gọn' : 'Xem thêm'}</button>}
          </section>

          <section id="amenities" className="scroll-mt-36 border-b border-[var(--color-border)] pb-8">
            <div className="flex items-center gap-3">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" />
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Phòng này có gì</h2>
            </div>
            {amenities.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-muted)]">Homestay chưa cập nhật tiện nghi.</p>
            ) : (
              <>
                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visibleAmenities.map((amenity, index) => {
                    const Icon = AMENITY_ICONS[amenity] || Check;
                    return <li key={`${amenity}-${index}`} className="flex min-h-11 items-center gap-3 text-[var(--color-body)]"><Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />{amenity}</li>;
                  })}
                </ul>
                {amenities.length > 8 && <button type="button" onClick={() => setAmenitiesExpanded((expanded) => !expanded)} className="mt-5 min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-ink)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-soft)]">{amenitiesExpanded ? 'Thu gọn tiện nghi' : `Hiện tất cả ${amenities.length} tiện nghi`}</button>}
              </>
            )}
          </section>

          <section id="location" className="scroll-mt-36 border-b border-[var(--color-border)] pb-8">
            <div className="flex items-center gap-3"><MapPin aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" /><h2 className="text-xl font-semibold text-[var(--color-ink)]">Bạn sẽ ở đâu</h2></div>
            <p className="mt-4 leading-relaxed text-[var(--color-body)]">{[homestay.address, homestay.province].filter(Boolean).join(', ') || 'Homestay chưa cập nhật địa chỉ.'}</p>
          </section>

          <section id="rules" className="scroll-mt-36">
            <div className="flex items-center gap-3"><Clock aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" /><h2 className="text-xl font-semibold text-[var(--color-ink)]">Quy định lưu trú</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4"><p className="text-sm text-[var(--color-muted)]">Nhận phòng</p><p className="mt-1 font-semibold text-[var(--color-ink)]">Từ {CHECK_IN_TIME}</p></div>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4"><p className="text-sm text-[var(--color-muted)]">Trả phòng</p><p className="mt-1 font-semibold text-[var(--color-ink)]">Đến hết {CHECK_OUT_DEADLINE}</p></div>
            </div>
            <p className="mt-3 text-sm text-[var(--color-muted)]">Hỏi homestay về nội quy và chính sách cọc trước khi xác nhận lưu trú.</p>
          </section>
        </div>

        <aside className="hidden h-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 lg:sticky lg:top-32 lg:block">
          <p className="flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums text-[var(--color-ink)]">{formatVnd(room.nightlyPrice)}</span><span className="text-sm text-[var(--color-muted)]">/ đêm</span></p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Giá cơ bản, giá thực tế có thể thay đổi theo ngày.</p>
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">
            <p className="font-semibold text-[var(--color-ink)]">Liên hệ để hỏi phòng</p>
            <p className="mt-2 text-[var(--color-body)]">Phòng tối đa {room.maxGuests ?? '—'} khách</p>
            <p className="mt-1 text-[var(--color-body)]">Nhận từ {CHECK_IN_TIME} · Trả đến {CHECK_OUT_DEADLINE}</p>
          </div>
          {homestay.hotlinePhone ? <a href={`tel:${homestay.hotlinePhone}`} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 font-semibold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"><Phone aria-hidden="true" className="h-4 w-4" />Gọi homestay</a> : <p className="mt-4 text-sm text-[var(--color-muted)]">Homestay chưa cập nhật hotline.</p>}
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">Tình trạng phòng cần được xác nhận trực tiếp với homestay.</p>
        </aside>
      </div>

      {homestay.hotlinePhone && (
        <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="min-w-0"><p className="truncate font-semibold tabular-nums text-[var(--color-ink)]">{formatVnd(room.nightlyPrice)} <span className="text-sm font-normal text-[var(--color-muted)]">/ đêm</span></p><p className="text-xs text-[var(--color-muted)]">Giá cơ bản</p></div>
          <a href={`tel:${homestay.hotlinePhone}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 text-sm font-semibold text-white"><Phone aria-hidden="true" className="h-4 w-4" />Gọi homestay</a>
        </div>
      )}
    </article>
  );
}

export default RoomDetailPage;
