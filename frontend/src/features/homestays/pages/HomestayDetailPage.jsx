import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BedDouble, MapPin, Phone, Home } from 'lucide-react';
import { fetchHomestayDetail, fetchHomestayRoomTypes } from '../api';
import { fileUrl } from '../../../lib/api/client';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomTypesError, setRoomTypesError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!homestayId) return undefined;
    let active = true;
    Promise.allSettled([fetchHomestayDetail(homestayId), fetchHomestayRoomTypes(homestayId)])
      .then(([detailResult, typesResult]) => {
        if (!active) return;
        if (detailResult.status === 'fulfilled') setHomestay(detailResult.value);
        else setError(getErrorMessage(detailResult.reason));
        if (typesResult.status === 'fulfilled') setRoomTypes(typesResult.value || []);
        else setRoomTypesError(getErrorMessage(typesResult.reason));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError('');
    setRoomTypesError('');
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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <section aria-labelledby="homestay-description" className="border-b border-[var(--color-border)] pb-8">
            <h2 id="homestay-description" className="text-xl font-semibold text-[var(--color-ink)]">Giới thiệu cơ sở</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-[var(--color-body)]">{homestay.description || 'Homestay chưa cập nhật phần giới thiệu.'}</p>
          </section>

          <section aria-labelledby="room-types-title">
            <div className="mb-5 flex items-center gap-3">
              <BedDouble aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" />
              <h2 id="room-types-title" className="text-xl font-semibold text-[var(--color-ink)]">Loại phòng tại homestay</h2>
            </div>
            {roomTypesError ? (
              <ErrorBanner message={roomTypesError} onRetry={retry} className="my-4" />
            ) : roomTypes.length === 0 ? (
              <EmptyState title="Chưa có loại phòng được công khai" description="Vui lòng liên hệ homestay để được tư vấn về phòng lưu trú." />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {roomTypes.map((type) => (
                  <article key={type.id} className="py-5 first:pt-0 last:pb-0">
                    <h3 className="font-semibold text-[var(--color-ink)]">{type.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-body)]">{type.description || 'Chưa có mô tả cho loại phòng này.'}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Liên hệ homestay</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">Gọi trực tiếp để hỏi về phòng, giá và tình trạng trống trong ngày bạn dự định lưu trú.</p>
          {homestay.hotlinePhone ? (
            <a href={`tel:${homestay.hotlinePhone}`} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
              <Phone aria-hidden="true" className="h-4 w-4" />
              Gọi {homestay.hotlinePhone}
            </a>
          ) : (
            <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-muted)]">Homestay chưa cập nhật số hotline.</p>
          )}
          <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-body)]">
            <p>Nhận phòng từ {CHECK_IN_TIME}</p>
            <p>Trả phòng đến hết {CHECK_OUT_DEADLINE}</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

export default HomestayDetailPage;
