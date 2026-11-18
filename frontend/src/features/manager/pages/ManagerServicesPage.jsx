import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  LayoutGrid,
  List,
  LoaderCircle,
  PauseCircle,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Tags,
  X,
} from 'lucide-react';
import { getManagerServiceCategoriesApi, getManagerServicesApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

export default function ManagerServicesPage() {
  const location = useLocation();

  // Services & Categories state
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast state
  const [successToast, setSuccessToast] = useState('');

  // View mode: 'grid' or 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Filters & Pagination state (quản lý chỉ lọc theo service status và category id)
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSort, setSelectedSort] = useState('name,asc');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const [pagination, setPagination] = useState({
    page: 0,
    size: pageSize,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true,
  });

  // Load Categories for homestay
  useEffect(() => {
    let isMounted = true;
    setCategoriesLoading(true);
    getManagerServiceCategoriesApi()
      .then((data) => {
        if (isMounted) {
          setCategories(data || []);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải danh mục dịch vụ:', err);
      })
      .finally(() => {
        if (isMounted) setCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch services whenever status, category, page or sort changes
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getManagerServicesApi({
        status: selectedStatus || undefined,
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        page,
        size: pageSize,
        sort: selectedSort,
      });

      setServices(res.items || []);
      setPagination(res.meta || {
        page: 0,
        size: pageSize,
        totalElements: res.items?.length || 0,
        totalPages: 1,
        first: true,
        last: true,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedCategory, page, selectedSort]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Listen for flash success message from subpages (e.g. create service page)
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessToast(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-dismiss success toast after 4s
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(''), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedStatus('');
    setSelectedCategory('');
    setSelectedSort('name,asc');
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    selectedStatus || selectedCategory || selectedSort !== 'name,asc'
  );

  // Stats calculation
  const stats = useMemo(() => {
    const total = pagination.totalElements;
    return {
      total,
      categoriesCount: categories.length,
    };
  }, [pagination.totalElements, categories.length]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
            <span>Quản lý</span>
            <span>/</span>
            <span className="text-[var(--color-primary)]">Dịch vụ</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Quản lý dịch vụ cơ sở
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Danh mục các dịch vụ ăn uống, trải nghiệm, phương tiện phục vụ khách lưu trú tại homestay.
          </p>
        </div>

        {/* Actions & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
              title="Xem dạng lưới thẻ"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
              title="Xem dạng bảng chi tiết"
            >
              <List className="h-4 w-4" />
              <span>Bảng</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            <Link
              to="/manager/services/categories"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] transition-colors"
              title="Quản lý danh mục dịch vụ"
            >
              <Tags className="h-3.5 w-3.5" />
              <span>Quản lý danh mục</span>
            </Link>
            <Link
              to="/manager/services/create"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Khai báo dịch vụ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Success Toast Alert ─────────────────────────────────── */}
      {successToast && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast('')}
            className="text-emerald-700 hover:text-emerald-900 ml-3"
            title="Đóng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── KPI / Overview Highlights ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-muted)]">Tổng dịch vụ</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-ink)]">
              {pagination.totalElements}
            </span>
            <span className="text-xs text-[var(--color-muted)]">dịch vụ</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-muted)]">Danh mục</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Tags className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-ink)]">
              {stats.categoriesCount}
            </span>
            <span className="text-xs text-[var(--color-muted)]">phân loại</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-muted)]">Đang phục vụ</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {selectedStatus === 'ACTIVE'
                ? pagination.totalElements
                : services.filter((s) => s.status === 'ACTIVE').length}
            </span>
            <span className="text-xs text-[var(--color-muted)]">khả dụng</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-muted)]">Tạm ngừng</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <PauseCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {selectedStatus === 'INACTIVE'
                ? pagination.totalElements
                : services.filter((s) => s.status === 'INACTIVE').length}
            </span>
            <span className="text-xs text-[var(--color-muted)]">tạm khóa</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Filter Panel (Lọc theo Trạng thái & Danh mục) ── */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('');
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedStatus === ''
                  ? 'bg-white text-[var(--color-primary)] shadow-sm font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Tất cả trạng thái
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('ACTIVE');
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedStatus === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Đang phục vụ
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('INACTIVE');
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedStatus === 'INACTIVE'
                  ? 'bg-white text-amber-700 shadow-sm font-semibold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Tạm dừng
            </button>
          </div>

          {/* Category & Sort controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="service-category-select" className="text-xs font-medium text-[var(--color-muted)]">
                Danh mục:
              </label>
              <select
                id="service-category-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(0);
                }}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)]"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="service-sort-select" className="text-xs font-medium text-[var(--color-muted)]">
                Sắp xếp:
              </label>
              <select
                id="service-sort-select"
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  setPage(0);
                }}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)]"
              >
                <option value="name,asc">Tên (A → Z)</option>
                <option value="name,desc">Tên (Z → A)</option>
                <option value="unitPrice,asc">Giá tăng dần</option>
                <option value="unitPrice,desc">Giá giảm dần</option>
                <option value="id,desc">Mới nhất</option>
              </select>
            </div>

            {/* Reset button if active filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-muted)] hover:border-red-300 hover:text-red-600 transition-colors"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Applied filter pills bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-muted)]">
            <span className="font-medium text-[var(--color-ink)]">Đang áp dụng:</span>
            {selectedStatus && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-ink)] border border-[var(--color-border)]">
                Trạng thái: <strong>{selectedStatus === 'ACTIVE' ? 'Đang phục vụ' : 'Tạm dừng'}</strong>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('')}
                  className="ml-1 text-[var(--color-muted)] hover:text-red-500"
                  title="Bỏ lọc trạng thái"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-ink)] border border-[var(--color-border)]">
                Danh mục:{' '}
                <strong>
                  {categories.find((c) => String(c.id) === String(selectedCategory))?.name || selectedCategory}
                </strong>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className="ml-1 text-[var(--color-muted)] hover:text-red-500"
                  title="Bỏ lọc danh mục"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedSort !== 'name,asc' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-ink)] border border-[var(--color-border)]">
                Sắp xếp:{' '}
                <strong>
                  {selectedSort === 'name,desc'
                    ? 'Tên (Z → A)'
                    : selectedSort === 'unitPrice,asc'
                    ? 'Giá tăng dần'
                    : selectedSort === 'unitPrice,desc'
                    ? 'Giá giảm dần'
                    : 'Mới nhất'}
                </strong>
                <button
                  type="button"
                  onClick={() => setSelectedSort('name,asc')}
                  className="ml-1 text-[var(--color-muted)] hover:text-red-500"
                  title="Về sắp xếp mặc định"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <ErrorBanner
          message={error}
          action={
            <button
              type="button"
              onClick={fetchServices}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Thử lại
            </button>
          }
        />
      )}

      {/* ── Main Content Area ───────────────────────────────────── */}
      {loading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded-md bg-gray-200" />
                <div className="h-5 w-24 rounded-full bg-gray-200" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-3/4 rounded-md bg-gray-200" />
                <div className="h-4 w-full rounded-md bg-gray-100" />
                <div className="h-4 w-2/3 rounded-md bg-gray-100" />
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="h-6 w-28 rounded-md bg-gray-200" />
                <div className="h-4 w-12 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-12 text-center">
          <EmptyState
            title="Không tìm thấy dịch vụ nào"
            description={
              hasActiveFilters
                ? 'Không có dịch vụ nào phù hợp với bộ lọc hiện tại. Bạn có thể chọn danh mục hoặc trạng thái khác.'
                : 'Cơ sở homestay này hiện chưa có dịch vụ nào trong danh mục.'
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              ) : (
                <Link
                  to="/manager/services/create"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Khai báo dịch vụ đầu tiên</span>
                </Link>
              )
            }
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ────────────────────────────────────────── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[var(--color-primary-light)] hover:shadow-md"
            >
              <div className="space-y-3">
                {/* Category & Status Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] border border-[var(--color-border-subtle)]">
                    <Tag className="h-3 w-3 text-[var(--color-primary)]" />
                    <span>{service.categoryName || 'Khác'}</span>
                  </span>
                  <StatusBadge type="service" status={service.status} />
                </div>

                {/* Service Name */}
                <div>
                  <h3 className="text-base font-bold text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors">
                    {service.name}
                  </h3>
                  {service.description ? (
                    <p className="mt-1.5 text-xs text-[var(--color-muted)] line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs italic text-gray-400">
                      Chưa có mô tả chi tiết cho dịch vụ này
                    </p>
                  )}
                </div>
              </div>

              {/* Price & Unit Box */}
              <div className="mt-4 pt-3.5 border-t border-[var(--color-border)] flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] block">
                    Đơn giá hiện hành
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-extrabold text-[var(--color-primary)]">
                      {formatVnd(service.unitPrice)}
                    </span>
                    <span className="text-xs text-[var(--color-muted)] font-medium">
                      / {service.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/manager/services/${service.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-xs transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Sửa</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Table View ───────────────────────────────────────── */
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-ink)]">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-5 py-3.5">Mã</th>
                  <th className="px-5 py-3.5">Tên dịch vụ</th>
                  <th className="px-5 py-3.5">Danh mục</th>
                  <th className="px-5 py-3.5">Đơn vị</th>
                  <th className="px-5 py-3.5 text-right">Đơn giá</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-[var(--color-muted)]">
                      #{service.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm text-[var(--color-ink)]">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-xs text-[var(--color-muted)] line-clamp-1 mt-0.5">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-muted)] border border-[var(--color-border-subtle)]">
                        <Tag className="h-3 w-3 text-[var(--color-primary)]" />
                        <span>{service.categoryName || 'Khác'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-muted)]">
                      {service.unit}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-sm text-[var(--color-primary)]">
                      {formatVnd(service.unitPrice)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge type="service" status={service.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/manager/services/${service.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] shadow-xs transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Sửa</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination Controls ─────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-border)] bg-white px-5 py-3.5 shadow-sm text-xs text-[var(--color-muted)]">
          <div>
            Hiển thị{' '}
            <strong className="font-semibold text-[var(--color-ink)]">
              {pagination.page * pagination.size + 1}
            </strong>{' '}
            -{' '}
            <strong className="font-semibold text-[var(--color-ink)]">
              {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)}
            </strong>{' '}
            trong tổng số{' '}
            <strong className="font-semibold text-[var(--color-ink)]">
              {pagination.totalElements}
            </strong>{' '}
            dịch vụ
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              disabled={pagination.first || page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex h-8 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>

            {/* Page number indicators */}
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }).map((_, i) => {
                if (
                  i === 0 ||
                  i === pagination.totalPages - 1 ||
                  (i >= page - 1 && i <= page + 1)
                ) {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        page === i
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                }
                if (i === page - 2 || i === page + 2) {
                  return (
                    <span key={i} className="px-1 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              type="button"
              disabled={pagination.last || page >= pagination.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
