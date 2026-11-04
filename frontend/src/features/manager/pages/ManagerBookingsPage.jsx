import React, { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Mail,
  Phone,
  RefreshCw,
  Search,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getManagerBookingsApi } from '../api';
import ManagerCreateBookingModal from '../components/ManagerCreateBookingModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';

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
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs animate-pulse space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
        <div className="h-5 w-36 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-6 w-24 rounded-full bg-[var(--color-surface-soft)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-[var(--color-surface-soft)]" />
          <div className="h-4 w-40 rounded bg-[var(--color-surface-soft)]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-[var(--color-surface-soft)]" />
          <div className="h-4 w-48 rounded bg-[var(--color-surface-soft)]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-[var(--color-surface-soft)]" />
          <div className="h-5 w-32 rounded bg-[var(--color-surface-soft)]" />
        </div>
      </div>
    </div>
  );
}

export default function ManagerBookingsPage() {
  const { homestay } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentPage = Math.max(0, Number(searchParams.get('page') || 0));
  const currentKeyword = searchParams.get('keyword') || '';
  const currentFromDate = searchParams.get('fromDate') || '';
  const currentToDate = searchParams.get('toDate') || '';

  // Local filter inputs for search form
  const [keywordInput, setKeywordInput] = useState(currentKeyword);
  const [fromDateInput, setFromDateInput] = useState(currentFromDate);
  const [toDateInput, setToDateInput] = useState(currentToDate);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedCode, setCopiedCode] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdBookingToast, setCreatedBookingToast] = useState(null);

  useEffect(() => {
    let active = true;

    getManagerBookingsApi({
      status: currentStatus || undefined,
      fromDate: currentFromDate || undefined,
      toDate: currentToDate || undefined,
      keyword: currentKeyword || undefined,
      page: currentPage,
      size: 20,
      sort: 'createdAt,desc',
    })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        const code = err.response?.data?.error?.code;
        if (code === 'HOMESTAY_NOT_ASSIGNED') {
          setError('Tài khoản chưa được phân công cơ sở homestay nào.');
        } else if (code === 'INVALID_DATE_RANGE') {
          setError('Khoảng ngày không hợp lệ: Ngày nhận phòng bắt đầu phải trước hoặc bằng ngày kết thúc.');
        } else {
          setError(err.response?.data?.error?.message || 'Không thể tải danh sách đơn đặt phòng.');
        }
        setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentStatus, currentPage, currentKeyword, currentFromDate, currentToDate, reloadKey]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const next = new URLSearchParams(searchParams);
    if (keywordInput.trim()) {
      next.set('keyword', keywordInput.trim());
    } else {
      next.delete('keyword');
    }
    if (fromDateInput) {
      next.set('fromDate', fromDateInput);
    } else {
      next.delete('fromDate');
    }
    if (toDateInput) {
      next.set('toDate', toDateInput);
    } else {
      next.delete('toDate');
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    setFromDateInput('');
    setToDateInput('');
    setLoading(true);
    setError('');
    const next = new URLSearchParams();
    if (currentStatus) {
      next.set('status', currentStatus);
    }
    setSearchParams(next);
  };

  const hasActiveFilters = Boolean(currentKeyword || currentFromDate || currentToDate);

  const handleCopyCode = (code) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-ink)] sm:text-2xl flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-[var(--color-primary)]" />
            <span>Đơn đặt phòng {homestay?.name ? `— ${homestay.name}` : ''}</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Theo dõi, tra cứu và quản lý danh sách đơn đặt phòng của khách tại cơ sở.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Đặt phòng hộ khách</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--color-body)] shadow-xs hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-50"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Success notification banner */}
      {createdBookingToast && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Tạo đơn đặt phòng thành công!</span>
            </div>
            <p className="text-xs text-emerald-800">
              Mã đơn: <strong className="font-mono text-emerald-950 font-bold">{createdBookingToast.code}</strong> • Tiền phòng: <strong>{formatVnd(createdBookingToast.roomTotalPrice)}</strong> • Tiền cọc yêu cầu: <strong>{formatVnd(createdBookingToast.depositAmount)}</strong>
            </p>
            {createdBookingToast.holdExpiresAt && (
              <p className="text-xs text-emerald-700">
                Hạn thanh toán cọc giữ phòng: <span className="font-medium">{formatDateTime(createdBookingToast.holdExpiresAt)}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreatedBookingToast(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--color-border)] no-scrollbar gap-1">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateParam('status', tab.key)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                  : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Date filter controls */}
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-xs space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Keyword Search */}
          <div className="lg:col-span-5 space-y-1">
            <label htmlFor="search-keyword" className="block text-xs font-semibold text-[var(--color-muted)]">
              Từ khóa tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
              <input
                id="search-keyword"
                type="text"
                placeholder="Mã đơn (VD: BK-...), SĐT, tên khách..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {keywordInput && (
                <button
                  type="button"
                  onClick={() => setKeywordInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  title="Xóa từ khóa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* From Date */}
          <div className="lg:col-span-3 space-y-1">
            <label htmlFor="filter-from-date" className="block text-xs font-semibold text-[var(--color-muted)]">
              Nhận phòng từ ngày
            </label>
            <input
              id="filter-from-date"
              type="date"
              value={fromDateInput}
              onChange={(e) => setFromDateInput(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* To Date */}
          <div className="lg:col-span-3 space-y-1">
            <label htmlFor="filter-to-date" className="block text-xs font-semibold text-[var(--color-muted)]">
              Đến ngày
            </label>
            <input
              id="filter-to-date"
              type="date"
              value={toDateInput}
              onChange={(e) => setToDateInput(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-1 flex gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
              title="Tìm kiếm"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Đang lọc:</span>
              {currentKeyword && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-soft)] px-2 py-0.5 font-medium text-[var(--color-ink)]">
                  Từ khóa: &quot;{currentKeyword}&quot;
                </span>
              )}
              {currentFromDate && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-soft)] px-2 py-0.5 font-medium text-[var(--color-ink)]">
                  Từ: {formatDate(currentFromDate)}
                </span>
              )}
              {currentToDate && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-soft)] px-2 py-0.5 font-medium text-[var(--color-ink)]">
                  Đến: {formatDate(currentToDate)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline font-medium"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </form>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi tải dữ liệu</p>
            <p className="mt-0.5 text-red-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Total count and status note */}
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)] px-1">
        <div>
          Tổng số: <span className="font-semibold text-[var(--color-ink)]">{meta.totalElements}</span> đơn đặt phòng
        </div>
        {meta.totalPages > 1 && (
          <div>
            Trang {meta.page + 1} / {meta.totalPages}
          </div>
        )}
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-12 text-center">
          <CalendarCheck className="mx-auto h-12 w-12 text-[var(--color-muted)] opacity-60" />
          <h3 className="mt-4 text-base font-semibold text-[var(--color-ink)]">
            {hasActiveFilters || currentStatus ? 'Không có đơn đặt phòng nào phù hợp' : 'Chưa có đơn đặt phòng nào'}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)] max-w-md mx-auto">
            {hasActiveFilters || currentStatus
              ? 'Thử thay đổi hoặc xóa các tiêu chí tìm kiếm, lọc theo ngày hoặc trạng thái để xem các đơn khác.'
              : 'Hiện chưa có lượt đặt phòng nào được ghi nhận tại homestay này.'}
          </p>
          {(hasActiveFilters || currentStatus) && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  handleResetFilters();
                  updateParam('status', '');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] shadow-xs hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Xem tất cả đơn đặt phòng</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((booking) => {
            const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
            const isCopied = copiedCode === booking.code;

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs hover:border-[var(--color-primary-soft)] transition-colors space-y-4"
              >
                {/* Header line of card: Code + Creation Date + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-base font-bold text-[var(--color-ink)]">
                      #{booking.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(booking.code)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] transition-colors"
                      title="Sao chép mã đơn"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Chép mã</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs text-[var(--color-muted)]">
                      • Đặt lúc: {formatDateTime(booking.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge type="booking" status={booking.status} />
                    <Link
                      to={`/manager/bookings/${booking.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                      title="Xem toàn bộ thông tin chi tiết đơn đặt phòng"
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Details grid: Customer info, Booking period & rooms, Price info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Thông tin khách hàng
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      <User className="h-4 w-4 text-[var(--color-muted)] shrink-0" />
                      <span>{booking.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                      <Phone className="h-4 w-4 text-[var(--color-muted)] shrink-0" />
                      <a
                        href={`tel:${booking.contactPhone}`}
                        className="hover:text-[var(--color-primary)] hover:underline font-mono"
                      >
                        {booking.contactPhone}
                      </a>
                    </div>
                    {booking.contactEmail && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-body)] truncate">
                        <Mail className="h-4 w-4 text-[var(--color-muted)] shrink-0" />
                        <span className="truncate">{booking.contactEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] pt-1">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>Số khách dự kiến: <strong className="text-[var(--color-ink)]">{booking.guestCount}</strong> khách</span>
                    </div>
                  </div>

                  {/* Stay & Room details */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Thời gian & Phòng
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--color-ink)] font-medium">
                      <Calendar className="h-4 w-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <div>
                        <div>
                          {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                        </div>
                        <div className="text-xs text-[var(--color-muted)] font-normal">
                          ({nights} đêm)
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="text-xs text-[var(--color-muted)] mb-1">Các phòng đã đặt ({booking.rooms?.length || 0}):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {booking.rooms && booking.rooms.length > 0 ? (
                          booking.rooms.map((room) => (
                            <span
                              key={room.roomId}
                              className="inline-flex items-center rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]"
                            >
                              {room.roomName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--color-muted)] italic">Không có thông tin phòng</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financials & Hold expiry */}
                  <div className="space-y-2 md:border-l md:border-[var(--color-border)] md:pl-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Thanh toán
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-muted)]">Tổng tiền phòng</div>
                      <div className="text-base font-bold text-[var(--color-ink)]">
                        {formatVnd(booking.roomTotalPrice)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[var(--color-muted)]">Tiền đặt cọc</div>
                      <div className="text-sm font-semibold text-[var(--color-primary)]">
                        {formatVnd(booking.depositAmount)}
                      </div>
                    </div>

                    {booking.status === 'PENDING_DEPOSIT' && booking.holdExpiresAt && (
                      <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Hạn nộp tiền cọc:</span>
                        </div>
                        <div className="mt-0.5 font-medium pl-5">
                          {formatDateTime(booking.holdExpiresAt)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={() => updateParam('page', currentPage - 1)}
            disabled={currentPage <= 0 || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-body)] shadow-xs hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Trang trước</span>
          </button>

          <div className="text-sm text-[var(--color-muted)]">
            Trang <span className="font-semibold text-[var(--color-ink)]">{currentPage + 1}</span> / {meta.totalPages}
          </div>

          <button
            type="button"
            onClick={() => updateParam('page', currentPage + 1)}
            disabled={currentPage >= meta.totalPages - 1 || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-body)] shadow-xs hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-40"
          >
            <span>Trang sau</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Create Booking Modal */}
      {createModalOpen && (
        <ManagerCreateBookingModal
          homestay={homestay}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(created) => {
            setCreateModalOpen(false);
            setCreatedBookingToast(created);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
