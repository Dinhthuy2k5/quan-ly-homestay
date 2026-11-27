import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Lock,
  MapPin,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
  UserCog,
  UserX,
} from 'lucide-react';
import { getDirectorHomestaysApi } from '../api';
import HomestayFormModal from '../components/HomestayFormModal';
import HomestayManagerModal from '../components/HomestayManagerModal';
import HomestayStatusModal from '../components/HomestayStatusModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { getErrorMessage } from '../../../lib/errors';

const CARD_CLASS =
  'rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)]';
const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Tạm ngừng' },
];

/**
 * Trang quản lý cơ sở homestay toàn công ty dành cho Giám đốc (/director/homestays).
 * Kết nối API-DIR-HS-01 (danh sách & tạo mới) và API-DIR-HS-02 (cập nhật & kích hoạt/tạm ngừng).
 */
export function DirectorHomestaysPage() {
  // Danh sách & phân trang
  const [homestays, setHomestays] = useState([]);
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

  // Tổng hợp số lượng toàn công ty (độc lập với bộ lọc hiện tại)
  const [summary, setSummary] = useState({ active: 0, inactive: 0, loading: true });

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState('');
  const [provinceInput, setProvinceInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ province: '', keyword: '' });
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Thông báo & hộp thoại
  const [successMessage, setSuccessMessage] = useState('');
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', homestay: null });
  const [managerModal, setManagerModal] = useState({ open: false, homestay: null });
  const [statusModal, setStatusModal] = useState({ open: false, homestay: null });

  // Tự ẩn thông báo thành công sau 4.5 giây
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  // 1. Tải thống kê số cơ sở ACTIVE / INACTIVE toàn công ty
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchSummary() {
      setSummary((prev) => ({ ...prev, loading: true }));
      try {
        const [activeRes, inactiveRes] = await Promise.all([
          getDirectorHomestaysApi({ status: 'ACTIVE', page: 0, size: 1, signal }),
          getDirectorHomestaysApi({ status: 'INACTIVE', page: 0, size: 1, signal }),
        ]);
        if (!signal.aborted) {
          setSummary({
            active: activeRes.meta?.totalElements ?? 0,
            inactive: inactiveRes.meta?.totalElements ?? 0,
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

  // 2. Tải danh sách homestay theo bộ lọc & trang hiện tại
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchHomestays() {
      setLoading(true);
      setError('');
      try {
        const data = await getDirectorHomestaysApi({
          status: statusFilter || undefined,
          province: appliedSearch.province || undefined,
          keyword: appliedSearch.keyword || undefined,
          page,
          size: PAGE_SIZE,
          signal,
        });
        if (!signal.aborted) {
          setHomestays(data.items);
          setMeta(data.meta);
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(getErrorMessage(err) || 'Không thể tải danh sách cơ sở homestay.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    fetchHomestays();
    return () => controller.abort();
  }, [statusFilter, appliedSearch, page, reloadKey]);

  const totalCompanyHomestays = summary.active + summary.inactive;
  const hasActiveFilters = Boolean(statusFilter || appliedSearch.province || appliedSearch.keyword);

  const handleSelectStatusTab = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(0);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setAppliedSearch({
      province: provinceInput.trim(),
      keyword: keywordInput.trim(),
    });
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setProvinceInput('');
    setKeywordInput('');
    setAppliedSearch({ province: '', keyword: '' });
    setPage(0);
  };

  const handleFormSaved = (saved, mode) => {
    setFormModal({ open: false, mode: 'create', homestay: null });
    if (mode === 'create') {
      setPage(0);
      setSuccessMessage(`Đã tạo cơ sở homestay "${saved?.name || ''}" thành công.`);
    } else {
      setSuccessMessage(`Đã cập nhật thông tin cơ sở "${saved?.name || ''}".`);
    }
    setReloadKey((v) => v + 1);
  };

  const handleStatusUpdated = (updated) => {
    setStatusModal({ open: false, homestay: null });
    const label = updated?.status === 'ACTIVE' ? 'kích hoạt lại' : 'tạm ngừng hoạt động';
    setSuccessMessage(`Đã ${label} cơ sở "${updated?.name || ''}".`);
    setReloadKey((v) => v + 1);
  };

  const handleManagerUpdated = (result, action, homestay) => {
    setManagerModal({ open: false, homestay: null });
    if (action === 'unassign') {
      setSuccessMessage(`Đã gỡ quản lý khỏi cơ sở "${homestay?.name || ''}".`);
    } else if (action === 'replace') {
      setSuccessMessage(
        `Đã đổi quản lý cơ sở "${homestay?.name || ''}" sang ${result?.manager?.fullName || 'quản lý mới'}.`
      );
    } else {
      setSuccessMessage(
        `Đã phân công ${result?.manager?.fullName || 'quản lý mới'} phụ trách cơ sở "${homestay?.name || ''}".`
      );
    }
    setReloadKey((v) => v + 1);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Quản lý cơ sở homestay
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Danh sách toàn bộ cơ sở thuộc công ty, thêm cơ sở mới, cập nhật hotline và trạng thái vận hành.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((v) => v + 1)}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-3.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setFormModal({ open: true, mode: 'create', homestay: null })}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Thêm homestay mới</span>
          </button>
        </div>
      </header>

      {/* ── Thông báo kết quả ── */}
      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

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

      {/* ── Thẻ tổng quan nhanh ── */}
      <section aria-label="Tổng quan cơ sở toàn công ty" className="grid gap-4 sm:grid-cols-3">
        <article className={`${CARD_CLASS} p-5`}>
          <p className="text-xs font-semibold text-[var(--color-muted)]">Tổng số cơ sở</p>
          {summary.loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
          ) : (
            <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
              {NUM_FORMAT.format(totalCompanyHomestays)}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">Toàn bộ cơ sở trong hệ thống</p>
        </article>

        <article className={`${CARD_CLASS} p-5`}>
          <p className="text-xs font-semibold text-[var(--color-muted)]">Đang hoạt động</p>
          {summary.loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
          ) : (
            <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-emerald-700">
              {NUM_FORMAT.format(summary.active)}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">Hiển thị công khai &amp; nhận đặt phòng</p>
        </article>

        <article className={`${CARD_CLASS} p-5`}>
          <p className="text-xs font-semibold text-[var(--color-muted)]">Đang tạm ngừng</p>
          {summary.loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
          ) : (
            <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-body)]">
              {NUM_FORMAT.format(summary.inactive)}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">Tạm ẩn khỏi danh sách công khai</p>
        </article>
      </section>

      {/* ── Thanh bộ lọc & tìm kiếm ── */}
      <section className={`${CARD_CLASS} p-4 sm:p-5`} aria-label="Bộ lọc danh sách cơ sở">
        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
          {/* Lọc trạng thái */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo trạng thái">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || 'ALL'}
                  type="button"
                  onClick={() => handleSelectStatusTab(tab.value)}
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

          {/* Tìm theo tỉnh/thành và từ khóa */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Lọc theo tỉnh hoặc thành phố</span>
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={provinceInput}
                onChange={(e) => setProvinceInput(e.target.value)}
                placeholder="Tỉnh / thành phố..."
                className="min-h-9 w-full sm:w-44 rounded-xl border border-[var(--color-border)] bg-white pl-8 pr-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </label>

            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Tìm theo tên cơ sở, địa chỉ hoặc hotline</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tên cơ sở, địa chỉ, hotline..."
                className="min-h-9 w-full sm:w-60 rounded-xl border border-[var(--color-border)] bg-white pl-8 pr-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="min-h-9 rounded-xl bg-[var(--color-ink)] px-4 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50 cursor-pointer"
            >
              Tìm kiếm
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Xóa lọc</span>
              </button>
            )}
          </form>
        </div>
      </section>

      {/* ── Danh sách cơ sở homestay ── */}
      <section className={`${CARD_CLASS} overflow-hidden`} aria-labelledby="director-homestays-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="director-homestays-list-heading" className="text-base font-bold text-[var(--color-ink)]">
              Danh sách cơ sở
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {loading
                ? 'Đang tải danh sách cơ sở...'
                : `Hiển thị ${homestays.length} trên tổng ${NUM_FORMAT.format(meta.totalElements)} cơ sở phù hợp.`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
            ))}
          </div>
        ) : homestays.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Building2 className="mx-auto h-10 w-10 text-[var(--color-muted)] opacity-50" aria-hidden="true" />
            <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">
              {hasActiveFilters ? 'Không tìm thấy cơ sở phù hợp' : 'Chưa có cơ sở homestay nào'}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {hasActiveFilters
                ? 'Hãy thử thay đổi bộ lọc trạng thái, tỉnh/thành hoặc từ khóa tìm kiếm.'
                : 'Bắt đầu bằng cách thêm cơ sở homestay đầu tiên cho hệ thống.'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Xóa bộ lọc</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormModal({ open: true, mode: 'create', homestay: null })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm homestay mới</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {homestays.map((hs) => {
              const isActive = hs.status === 'ACTIVE';
              return (
                <li
                  key={hs.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-[var(--color-surface-soft)]/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Thông tin chính */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[var(--color-surface-soft)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--color-muted)]">
                        #{hs.id}
                      </span>
                      <h3 className="text-base font-bold text-[var(--color-ink)]">{hs.name}</h3>
                      <StatusBadge type="homestay" status={hs.status} />
                      {isActive && (
                        <Link
                          to={`/homestays/${hs.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          <span>Trang công khai</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-body)]">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                        <span>
                          <strong className="font-semibold text-[var(--color-ink)]">{hs.province}</strong>
                          {' · '}
                          {hs.address}
                        </span>
                      </span>

                      <a
                        href={`tel:${hs.hotlinePhone}`}
                        className="inline-flex items-center gap-1.5 font-mono font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                      >
                        <Phone className="h-3.5 w-3.5 text-[var(--color-muted)]" aria-hidden="true" />
                        <span>{hs.hotlinePhone}</span>
                      </a>
                    </div>

                    {hs.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
                        {hs.description}
                      </p>
                    )}

                    {/* Meta: Manager & Quỹ phòng */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                      {hs.manager ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                            hs.manager.status === 'LOCKED'
                              ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                              : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                          }`}
                        >
                          {hs.manager.status === 'LOCKED' ? (
                            <Lock className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                          )}
                          <span>
                            Quản lý: <strong>{hs.manager.fullName}</strong> ({hs.manager.email})
                            {hs.manager.status === 'LOCKED' ? ' · Đã khóa' : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2.5 py-1 text-[var(--color-muted)]">
                          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Chưa gán quản lý</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-[var(--color-body)] tabular-nums">
                        <BedDouble className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                        <span>
                          <strong>{NUM_FORMAT.format(hs.activeRooms)}</strong>/{NUM_FORMAT.format(hs.totalRooms)} phòng đang mở bán
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Hành động (API-DIR-HS-02 & API-DIR-HS-03) */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end xl:flex-row">
                    <button
                      type="button"
                      onClick={() => setManagerModal({ open: true, homestay: hs })}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 cursor-pointer"
                    >
                      <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{hs.manager ? 'Đổi / gỡ quản lý' : 'Gán quản lý'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormModal({ open: true, mode: 'edit', homestay: hs })}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-3.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusModal({ open: true, homestay: hs })}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tạm ngừng</span>
                        </>
                      ) : (
                        <>
                          <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Kích hoạt lại</span>
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Phân trang */}
        {!loading && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3.5 text-xs text-[var(--color-muted)]">
            <span>
              Trang <strong className="text-[var(--color-ink)]">{meta.page + 1}</strong> / {meta.totalPages} · Tổng{' '}
              {NUM_FORMAT.format(meta.totalElements)} cơ sở
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

      {/* Modals */}
      {formModal.open && (
        <HomestayFormModal
          key={`${formModal.mode}-${formModal.homestay?.id ?? 'new'}`}
          mode={formModal.mode}
          homestay={formModal.homestay}
          onClose={() => setFormModal({ open: false, mode: 'create', homestay: null })}
          onSaved={handleFormSaved}
        />
      )}

      {statusModal.open && statusModal.homestay && (
        <HomestayStatusModal
          key={`${statusModal.homestay.id}-${statusModal.homestay.status}`}
          homestay={statusModal.homestay}
          onClose={() => setStatusModal({ open: false, homestay: null })}
          onUpdated={handleStatusUpdated}
        />
      )}

      {managerModal.open && managerModal.homestay && (
        <HomestayManagerModal
          key={`${managerModal.homestay.id}-${managerModal.homestay.manager?.id ?? 'none'}`}
          homestay={managerModal.homestay}
          onClose={() => setManagerModal({ open: false, homestay: null })}
          onUpdated={handleManagerUpdated}
        />
      )}
    </div>
  );
}

export default DirectorHomestaysPage;
