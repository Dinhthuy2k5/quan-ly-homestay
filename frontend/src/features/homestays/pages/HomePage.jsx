import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { fetchHomestays } from '../api';
import HomestayCarousel from '../components/HomestayCarousel';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import SkeletonGrid from '../../../components/ui/Skeleton';
import { getErrorMessage } from '../../../lib/errors';

export function HomePage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchHomestays({ page: 0, size: 100 })
      .then((result) => {
        if (!active) return;
        const byProvince = new Map();
        for (const homestay of result.items || []) {
          const province = homestay.province?.trim() || 'Các địa điểm khác';
          if (!byProvince.has(province)) byProvince.set(province, []);
          if (byProvince.get(province).length < 8) byProvince.get(province).push(homestay);
        }
        setGroups([...byProvince.entries()].map(([province, items]) => ({ province, items })));
        setError('');
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="py-5 sm:py-10">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
          <Compass aria-hidden="true" className="h-4 w-4" />
          Mai Châu · Mộc Châu · Sa Pa
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-5xl">
          Khám phá nơi nghỉ cho chuyến đi của bạn
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-body)] sm:text-lg">
          Khám phá nơi nghỉ dưỡng, xem thông tin phòng và liên hệ trực tiếp với homestay.
        </p>
      </section>

      {loading && <SkeletonGrid count={4} />}
      {!loading && error && (
        <ErrorBanner message={error} onRetry={() => { setLoading(true); setReloadKey((key) => key + 1); }} />
      )}
      {!loading && !error && groups.length === 0 && (
        <EmptyState
          title="Chưa có homestay để khám phá"
          description="Danh sách homestay đang được cập nhật. Vui lòng quay lại sau."
        />
      )}
      {!loading && !error && groups.map(({ province, items }) => (
        <HomestayCarousel key={province} province={province} homestays={items} />
      ))}

      <section className="rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] px-6 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Chọn homestay bạn muốn khám phá</h2>
            <p className="mt-1 text-sm text-[var(--color-body)]">Sau khi chọn homestay, bạn có thể tìm phòng theo ngày lưu trú và số khách.</p>
          </div>
          <Link to="/search" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-[var(--radius-pill)] bg-[var(--color-ink)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
            Xem tất cả homestay <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
