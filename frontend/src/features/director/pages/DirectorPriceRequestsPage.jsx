import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  RefreshCw,
  RotateCcw,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { getDirectorHomestaysApi, getDirectorPriceRequestsApi } from '../api';
import { formatDate, formatDateTime, formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const CARD_CLASS =
  'rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)]';
const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: '', label: 'Tất cả' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const STATUS_META = {
  PENDING_APPROVAL: {
    label: 'Chờ phê duyệt',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};

const REQUEST_TYPE_META = {
  CREATE: {
    label: 'Thêm mới',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  UPDATE: {
    label: 'Cập nhật',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  DEACTIVATE: {
    label: 'Ngừng áp dụng',
    badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
  },
};

const WEEKDAY_LABELS = {
  MON: 'T2',
  TUE: 'T3',
  WED: 'T4',
  THU: 'T5',
  FRI: 'T6',
  SAT: 'T7',
  SUN: 'CN',
};

function formatWeekdays(weekdays) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return '';
  return weekdays.map((day) => WEEKDAY_LABELS[String(day).toUpperCase()] || day).join(', ');
}

function formatRuleHeadline(request) {
  const rule = request.proposedRule;
  if (request.requestType === 'DEACTIVATE') {
    const name = rule?.name || `Quy tắc #${request.targetRuleId}`;
    return { title: name, priceBadge: 'Ngừng áp dụng quy tắc', isBase: rule?.ruleType === 'BASE' };
  }
  if (!rule || typeof rule !== 'object') {
    return { title: 'Không có dữ liệu quy tắc', priceBadge: '', isBase: false };
  }

  const isBase = rule.ruleType === 'BASE';
  if (isBase) {
    return {
      title: rule.name || 'Giá cơ bản theo đêm',
      priceBadge: rule.basePrice != null ? `${formatVnd(rule.basePrice)} / đêm` : '',
      isBase: true,
    };
  }

  let priceBadge = '';
  if (rule.adjustType === 'PERCENT' && rule.adjustValue != null) {
    const val = Number(rule.adjustValue);
    priceBadge = `${val > 0 ? '+' : ''}${val}% so với giá cơ bản`;
  } else if (rule.adjustType === 'FIXED_PRICE' && rule.adjustValue != null) {
    priceBadge = `Cố định ${formatVnd(rule.adjustValue)} / đêm`;
  }

  return {
    title: rule.name || 'Quy tắc điều chỉnh giá',
    priceBadge,
    isBase: false,
  };
}

/**
 * Trang danh sách yêu cầu phê duyệt quy tắc giá toàn công ty (/director/price-requests).
 * Kết nối API-DIR-PRICE-01 (GET /api/v1/director/price-rule-change-requests).
 */
export function DirectorPriceRequestsPage() {
  // Danh sách yêu cầu & phân trang
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Danh sách cơ sở cho dropdown lọc
  const [homestays, setHomestays] = useState([]);

  // Thống kê nhanh theo 3 trạng thái toàn công ty
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    loading: true,
  });

  // Bộ lọc (mặc định lọc PENDING_APPROVAL theo gợi ý tài liệu API)
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [homestayFilter, setHomestayFilter] = useState('');
  const [dateInputs, setDateInputs] = useState({ fromDate: '', toDate: '' });
  const [appliedDates, setAppliedDates] = useState({ fromDate: '', toDate: '' });
  const [dateError, setDateError] = useState('');
  const [sort, setSort] = useState('requestedAt,desc');
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Tải danh sách cơ sở homestay phục vụ dropdown lọc
  useEffect(() => {
    const controller = new AbortController();
    getDirectorHomestaysApi({ page: 0, size: 100, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setHomestays(res.items || []);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // 2. Tải thống kê tổng số yêu cầu theo từng trạng thái
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchSummary() {
      setSummary((prev) => ({ ...prev, loading: true }));
      try {
        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
          getDirectorPriceRequestsApi({ status: 'PENDING_APPROVAL', page: 0, size: 1, signal }),
          getDirectorPriceRequestsApi({ status: 'APPROVED', page: 0, size: 1, signal }),
          getDirectorPriceRequestsApi({ status: 'REJECTED', page: 0, size: 1, signal }),
        ]);
        if (!signal.aborted) {
          setSummary({
            pending: pendingRes.meta?.totalElements ?? 0,
            approved: approvedRes.meta?.totalElements ?? 0,
            rejected: rejectedRes.meta?.totalElements ?? 0,
            loading: false,
          });
        }
      } catch {
        if (!signal.aborted) {
          setSummary((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    fetchSummary();
    return () => controller.abort();
  }, [reloadKey]);

  // 3. Tải danh sách yêu cầu theo bộ lọc hiện hành
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchRequests() {
      setLoading(true);
      setError('');
      try {
        const res = await getDirectorPriceRequestsApi({
          status: statusFilter || undefined,
          homestayId: homestayFilter || undefined,
          fromDate: appliedDates.fromDate || undefined,
          toDate: appliedDates.toDate || undefined,
          page,
          size: PAGE_SIZE,
          sort,
          signal,
        });
        if (!signal.aborted) {
          setRequests(res.items);
          setMeta(res.meta);
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(getErrorMessage(err) || 'Không thể tải danh sách yêu cầu phê duyệt giá.');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRequests();
    return () => controller.abort();
  }, [statusFilter, homestayFilter, appliedDates, page, sort, reloadKey]);

  const hasCustomFilters = Boolean(
    statusFilter !== 'PENDING_APPROVAL' ||
      homestayFilter ||
      appliedDates.fromDate ||
      appliedDates.toDate ||
      sort !== 'requestedAt,desc'
  );

  const handleSelectStatus = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(0);
  };

  const handleApplyDateFilter = (event) => {
    event.preventDefault();
    if (dateInputs.fromDate && dateInputs.toDate && dateInputs.fromDate > dateInputs.toDate) {
      setDateError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setDateError('');
    setPage(0);
    setAppliedDates({ ...dateInputs });
  };

  const handleResetFilters = () => {
    setStatusFilter('PENDING_APPROVAL');
    setHomestayFilter('');
    setDateInputs({ fromDate: '', toDate: '' });
    setAppliedDates({ fromDate: '', toDate: '' });
    setDateError('');
    setSort('requestedAt,desc');
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Phê duyệt quy tắc giá
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Theo dõi các đề xuất thêm mới, cập nhật và ngừng quy tắc giá phòng do Quản lý các cơ sở gửi lên.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((v) => v + 1)}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* ── 3 thẻ thống kê nhanh theo trạng thái ── */}
      <section aria-label="Tổng quan trạng thái yêu cầu giá" className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleSelectStatus('PENDING_APPROVAL')}
          className={`${CARD_CLASS} flex items-center justify-between p-5 text-left transition cursor-pointer ${
            statusFilter === 'PENDING_APPROVAL'
              ? 'border-amber-300 ring-1 ring-amber-300'
              : 'hover:border-[var(--color-border-strong)]'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)]">Đang chờ phê duyệt</p>
            {summary.loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-amber-700">
                {NUM_FORMAT.format(summary.pending)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Yêu cầu chưa áp dụng vào giá bán</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectStatus('APPROVED')}
          className={`${CARD_CLASS} flex items-center justify-between p-5 text-left transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-300 ring-1 ring-emerald-300'
              : 'hover:border-[var(--color-border-strong)]'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)]">Đã phê duyệt</p>
            {summary.loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-emerald-700">
                {NUM_FORMAT.format(summary.approved)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Đã cập nhật vào bảng giá chính thức</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectStatus('REJECTED')}
          className={`${CARD_CLASS} flex items-center justify-between p-5 text-left transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'border-rose-300 ring-1 ring-rose-300'
              : 'hover:border-[var(--color-border-strong)]'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)]">Đã từ chối</p>
            {summary.loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-rose-700">
                {NUM_FORMAT.format(summary.rejected)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Không làm thay đổi giá hiện hành</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
            <XCircle className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      </section>

      {/* ── Thanh bộ lọc ── */}
      <section className={`${CARD_CLASS} p-4 sm:p-5 space-y-3.5`} aria-label="Bộ lọc yêu cầu phê duyệt giá">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Tab trạng thái */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo trạng thái">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || 'ALL'}
                  type="button"
                  onClick={() => handleSelectStatus(tab.value)}
                  disabled={loading}
                  aria-pressed={active}
                  className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition disabled:opacity-60 cursor-pointer ${
                    active
                      ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Lọc cơ sở & sắp xếp */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Lọc theo cơ sở homestay</span>
              <select
                value={homestayFilter}
                onChange={(e) => {
                  setHomestayFilter(e.target.value);
                  setPage(0);
                }}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              >
                <option value="">Tất cả cơ sở</option>
                {homestays.map((hs) => (
                  <option key={hs.id} value={hs.id}>
                    {hs.name} ({hs.province})
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Sắp xếp danh sách</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(0);
                }}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              >
                <option value="requestedAt,desc">Mới gửi nhất</option>
                <option value="requestedAt,asc">Gửi lâu nhất</option>
              </select>
            </label>
          </div>
        </div>

        {/* Lọc khoảng ngày gửi yêu cầu (giờ Việt Nam) */}
        <form
          onSubmit={handleApplyDateFilter}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ngày gửi:</span>
            </span>
            <label className="inline-flex items-center">
              <span className="sr-only">Từ ngày</span>
              <input
                type="date"
                value={dateInputs.fromDate}
                onChange={(e) => {
                  setDateInputs((prev) => ({ ...prev, fromDate: e.target.value }));
                  if (dateError) setDateError('');
                }}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              />
            </label>
            <span className="text-xs text-[var(--color-muted)]" aria-hidden="true">→</span>
            <label className="inline-flex items-center">
              <span className="sr-only">Đến ngày</span>
              <input
                type="date"
                value={dateInputs.toDate}
                onChange={(e) => {
                  setDateInputs((prev) => ({ ...prev, toDate: e.target.value }));
                  if (dateError) setDateError('');
                }}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="min-h-9 rounded-xl bg-[var(--color-ink)] px-4 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50 cursor-pointer"
            >
              Áp dụng
            </button>

            {hasCustomFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mặc định</span>
              </button>
            )}
          </div>

          {dateError && (
            <span role="alert" className="text-xs font-medium text-[var(--color-danger)]">
              {dateError}
            </span>
          )}
        </form>
      </section>

      {/* ── Banner lỗi API ── */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey((v) => v + 1)}
            className="font-semibold underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Danh sách yêu cầu ── */}
      <section className={`${CARD_CLASS} overflow-hidden`} aria-labelledby="director-price-requests-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="director-price-requests-heading" className="text-base font-bold text-[var(--color-ink)]">
              Danh sách yêu cầu thay đổi giá
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {loading
                ? 'Đang tải yêu cầu...'
                : `Hiển thị ${requests.length} trên tổng ${NUM_FORMAT.format(meta.totalElements)} yêu cầu phù hợp.`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CircleDollarSign className="mx-auto h-10 w-10 text-[var(--color-muted)] opacity-50" aria-hidden="true" />
            <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">
              Không có yêu cầu thay đổi giá phù hợp
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {statusFilter === 'PENDING_APPROVAL'
                ? 'Hiện chưa có đề xuất quy tắc giá nào đang chờ phê duyệt theo bộ lọc đã chọn.'
                : 'Hãy thử thay đổi bộ lọc trạng thái, cơ sở hoặc khoảng thời gian.'}
            </p>
            {statusFilter === 'PENDING_APPROVAL' && (summary.approved > 0 || summary.rejected > 0) && (
              <button
                type="button"
                onClick={() => handleSelectStatus('')}
                className="mt-4 inline-flex min-h-9 items-center rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] cursor-pointer"
              >
                Xem tất cả trạng thái
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="py-3 pl-5 pr-3">Yêu cầu</th>
                  <th className="py-3 px-3">Cơ sở &amp; Người gửi</th>
                  <th className="py-3 px-3">Nội dung quy tắc đề xuất</th>
                  <th className="py-3 px-3">Thời gian gửi</th>
                  <th className="py-3 pl-3 pr-5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {requests.map((req) => {
                  const typeMeta = REQUEST_TYPE_META[req.requestType] || {
                    label: req.requestType,
                    badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
                  };
                  const statusMeta = STATUS_META[req.status] || {
                    label: req.status,
                    badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
                  };
                  const headline = formatRuleHeadline(req);
                  const rule = req.proposedRule || {};
                  const weekdaysText = formatWeekdays(rule.weekdays);
                  const scopeLabel = req.roomId
                    ? req.roomName || `Phòng #${req.roomId}`
                    : 'Toàn cơ sở';

                  return (
                    <tr key={req.id} className="align-top transition-colors hover:bg-[var(--color-surface-soft)]/45">
                      {/* Yêu cầu */}
                      <td className="py-4 pl-5 pr-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                            #{req.id}
                          </span>
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.badgeClass}`}>
                            {typeMeta.label}
                          </span>
                          {req.targetRuleId && (
                            <span className="text-[11px] text-[var(--color-muted)]">
                              Quy tắc gốc #{req.targetRuleId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cơ sở & Người gửi */}
                      <td className="py-4 px-3">
                        <div className="space-y-1.5">
                          <p className="inline-flex items-center gap-1.5 font-bold text-[var(--color-ink)]">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                            <span>{req.homestayName || `Homestay #${req.homestayId}`}</span>
                          </p>
                          <div className="flex items-start gap-1.5 text-[var(--color-body)]">
                            <UserIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                            <div>
                              <p className="font-medium text-[var(--color-ink)]">
                                {req.requestedByName || `Manager #${req.requestedBy}`}
                              </p>
                              {req.requestedByEmail && (
                                <p className="text-[11px] text-[var(--color-muted)]">{req.requestedByEmail}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Nội dung quy tắc đề xuất */}
                      <td className="py-4 px-3 max-w-[380px]">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                headline.isBase
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-sky-50 text-sky-800'
                              }`}
                            >
                              {headline.isBase ? 'Giá cơ bản' : 'Điều chỉnh'}
                            </span>
                            <span className="font-bold text-[var(--color-ink)]">{headline.title}</span>
                          </div>

                          {headline.priceBadge && (
                            <p className="font-semibold text-[var(--color-primary)] tabular-nums">
                              {headline.priceBadge}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <BedDouble className="h-3 w-3" aria-hidden="true" />
                              <span>{scopeLabel}</span>
                            </span>
                            {weekdaysText && <span>Thứ: {weekdaysText}</span>}
                            {(rule.startDate || rule.endDate) && (
                              <span>
                                Hiệu lực: {rule.startDate ? formatDate(rule.startDate) : '…'} →{' '}
                                {rule.endDate ? formatDate(rule.endDate) : '…'}
                              </span>
                            )}
                            {rule.priority != null && !headline.isBase && (
                              <span>Ưu tiên: {rule.priority}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Thời gian gửi */}
                      <td className="py-4 px-3 whitespace-nowrap text-[var(--color-body)] tabular-nums">
                        <p className="font-medium text-[var(--color-ink)]">
                          {formatDateTime(req.requestedAt)}
                        </p>
                        {req.reviewedAt && (
                          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                            Xử lý: {formatDateTime(req.reviewedAt)}
                            {req.reviewedByName ? ` · ${req.reviewedByName}` : ''}
                          </p>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 pl-3 pr-5 max-w-[240px]">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-rose-700">
                            Lý do: {req.rejectionReason}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {!loading && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3.5 text-xs text-[var(--color-muted)]">
            <span>
              Trang <strong className="text-[var(--color-ink)]">{meta.page + 1}</strong> / {meta.totalPages} · Tổng{' '}
              {NUM_FORMAT.format(meta.totalElements)} yêu cầu
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={meta.first || page <= 0}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-3 font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.last || page + 1 >= meta.totalPages}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-3 font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-40 cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default DirectorPriceRequestsPage;
