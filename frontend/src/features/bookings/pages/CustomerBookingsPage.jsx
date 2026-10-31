import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  RefreshCw,
  Search,
} from 'lucide-react';
import { fetchCustomerBookingsApi } from '../api';
import BookingCard from '../components/BookingCard';
import PaymentInstructionModal from '../components/PaymentInstructionModal';
import { getErrorMessage } from '../../../lib/errors';

const STATUS_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING_DEPOSIT', label: 'Chờ cọc' },
  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'CHECKED_IN', label: 'Đang lưu trú' },
  { key: 'CHECKED_OUT', label: 'Đã trả phòng' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'EXPIRED', label: 'Hết hạn' },
];

function BookingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xs animate-pulse space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
        <div className="h-5 w-44 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-6 w-24 rounded-full bg-[var(--color-surface-soft)]" />
      </div>
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="h-28 w-full sm:w-44 rounded-xl bg-[var(--color-surface-soft)] shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 w-3/4 rounded bg-[var(--color-surface-soft)]" />
          <div className="h-4 w-1/2 rounded bg-[var(--color-surface-soft)]" />
          <div className="h-4 w-1/3 rounded bg-[var(--color-surface-soft)]" />
        </div>
      </div>
    </div>
  );
}

export default function CustomerBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentPage = Math.max(0, Number(searchParams.get('page') || 0));

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [paymentModalBooking, setPaymentModalBooking] = useState(null);

  useEffect(() => {
    let active = true;

    fetchCustomerBookingsApi({
      status: currentStatus || undefined,
      page: currentPage,
      size: 10,
    })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setError(getErrorMessage(err) || 'Không thể tải danh sách đơn đặt phòng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentStatus, currentPage, refreshKey]);

  const updateParam = (key, value) => {
    setLoading(true);
    setError('');
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const handleSelectTab = (key) => {
    updateParam('status', key);
  };

  const handlePageChange = (newPage) => {
    updateParam('page', String(newPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7 py-4 sm:py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="hover:text-[var(--color-ink)] transition-colors">
          Khám phá
        </Link>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-[var(--color-ink)]">Chuyến đi của tôi</span>
      </nav>

      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Chuyến đi của tôi
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Theo dõi trạng thái đặt phòng, thông tin đặt cọc và quản lý kỳ nghỉ của bạn.
          </p>
        </div>

        {/* Nút làm mới */}
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-xs self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--color-border)]/50 pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectTab(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--color-ink)] text-white shadow-xs'
                  : 'bg-white text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Lỗi nếu có */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="font-semibold underline hover:no-underline text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Danh sách booking */}
      {loading ? (
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onOpenPayment={setPaymentModalBooking}
            />
          ))}

          {/* Phân trang */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5">
              <p className="text-xs text-[var(--color-muted)]">
                Hiển thị trang <strong>{meta.page + 1}</strong> trên <strong>{meta.totalPages}</strong> (tổng số {meta.totalElements} đơn)
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={meta.page <= 0}
                  onClick={() => handlePageChange(meta.page - 1)}
                  aria-label="Trang trước"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages - 1}
                  onClick={() => handlePageChange(meta.page + 1)}
                  aria-label="Trang sau"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-[var(--color-border)] bg-white py-16 px-6 text-center shadow-xs">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-muted)]">
            {currentStatus ? <Search className="h-8 w-8 stroke-[1.5]" /> : <Compass className="h-8 w-8 stroke-[1.5]" />}
          </div>

          <h3 className="text-lg font-bold text-[var(--color-ink)]">
            {currentStatus ? 'Không có đơn đặt phòng nào trong mục này' : 'Bạn chưa có chuyến đi nào'}
          </h3>

          <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--color-muted)]">
            {currentStatus
              ? 'Hãy thử chọn mục trạng thái khác hoặc xóa bộ lọc để xem toàn bộ danh sách đơn đặt phòng.'
              : 'Hãy khám phá các cơ sở homestay bản địa mộc mạc và lên kế hoạch cho kỳ nghỉ tuyệt vời của bạn.'}
          </p>

          <div className="mt-6">
            {currentStatus ? (
              <button
                type="button"
                onClick={() => updateParam('status', '')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-ink)] px-5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Xem tất cả đơn
              </button>
            ) : (
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-xs"
              >
                <Compass className="h-4 w-4" />
                <span>Khám phá homestay ngay</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Modal hướng dẫn chuyển khoản cọc */}
      {paymentModalBooking && (
        <PaymentInstructionModal
          booking={paymentModalBooking}
          onClose={() => setPaymentModalBooking(null)}
        />
      )}
    </div>
  );
}
