import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchHomestays } from '../api';
import PropertyCard from '../../../components/ui/PropertyCard';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import SkeletonGrid from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import { getErrorMessage } from '../../../lib/errors';
import { Search } from 'lucide-react';

const PAGE_SIZE = 12;

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const province = searchParams.get('province')?.trim() || '';
  const keyword = searchParams.get('keyword')?.trim() || '';
  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchHomestays({ province, keyword, page: 0, size: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setTotalElements(result.totalElements || 0);
        setNextPage(1);
        setHasMore((result.totalPages || 0) > 1);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setTotalElements(0);
        setError(getErrorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [province, keyword, reloadKey]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const result = await fetchHomestays({ province, keyword, page: nextPage, size: PAGE_SIZE });
      setItems((current) => [...current, ...(result.items || [])]);
      setNextPage((page) => page + 1);
      setHasMore(nextPage + 1 < (result.totalPages || 0));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const queryLabel = [province, keyword].filter(Boolean).join(' · ');

  return (
    <main className="space-y-7">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
          <Search aria-hidden="true" className="h-4 w-4" />
          {queryLabel ? 'Kết quả tìm kiếm' : 'Khám phá homestay'}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          {queryLabel || 'Tất cả homestay'}
        </h1>
        {!loading && !error && (
          <p className="text-sm text-[var(--color-muted)]">{totalElements} homestay đang hoạt động</p>
        )}
      </header>

      {loading && <SkeletonGrid count={8} />}
      {!loading && error && (
        <ErrorBanner message={error} onRetry={() => { setLoading(true); setError(''); setReloadKey((key) => key + 1); }} />
      )}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Không tìm thấy homestay phù hợp"
          description="Thử một tỉnh hoặc từ khóa khác để mở rộng kết quả."
          actionLabel="Xóa bộ lọc"
          onAction={() => setSearchParams({}, { replace: true })}
        />
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((homestay) => <PropertyCard key={homestay.id} homestay={homestay} />)}
          </div>
          {error && <ErrorBanner message={error} onRetry={loadMore} />}
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Đang tải…' : 'Xem thêm'}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default SearchResultsPage;
