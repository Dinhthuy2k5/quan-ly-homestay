import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Info,
  LoaderCircle,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { createManagerServiceApi, getManagerServiceCategoriesApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const QUICK_UNITS = ['suất', 'lượt', 'ngày', 'người', 'giờ', 'chuyến', 'chiếc', 'set'];

export default function ManagerCreateServicePage() {
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    unit: 'suất',
    unitPrice: '',
    description: '',
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Categories for homestay
  useEffect(() => {
    let isMounted = true;
    setCategoriesLoading(true);
    getManagerServiceCategoriesApi()
      .then((data) => {
        if (isMounted) {
          const list = data || [];
          setCategories(list);
          if (list.length > 0) {
            setForm((prev) => (prev.categoryId ? prev : { ...prev, categoryId: String(list[0].id) }));
          }
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

  const validate = () => {
    const errors = {};
    if (!form.categoryId) {
      errors.categoryId = 'Vui lòng chọn danh mục dịch vụ.';
    }
    if (!form.name.trim()) {
      errors.name = 'Tên dịch vụ không được để trống.';
    } else if (form.name.trim().length > 150) {
      errors.name = 'Tên dịch vụ không được vượt quá 150 ký tự.';
    }

    if (!form.unit.trim()) {
      errors.unit = 'Vui lòng nhập đơn vị tính.';
    } else if (form.unit.trim().length > 30) {
      errors.unit = 'Đơn vị tính tối đa 30 ký tự.';
    }

    if (form.unitPrice === '' || form.unitPrice === null) {
      errors.unitPrice = 'Vui lòng nhập đơn giá dịch vụ.';
    } else if (!/^\d+$/.test(form.unitPrice)) {
      errors.unitPrice = 'Đơn giá chỉ được chứa các chữ số (0-9).';
    } else {
      const priceNum = Number(form.unitPrice);
      if (priceNum < 0) {
        errors.unitPrice = 'Đơn giá phải lớn hơn hoặc bằng 0.';
      } else if (priceNum > 1000000000) {
        errors.unitPrice = 'Đơn giá không được vượt quá 1.000.000.000 VNĐ.';
      }
    }

    if (form.description && form.description.length > 255) {
      errors.description = 'Mô tả tối đa 255 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sử dụng biểu thức chính quy (Regex): Chỉ cho phép các chữ số (0-9)
  const handlePriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setForm((prev) => ({ ...prev, unitPrice: value }));
      if (fieldErrors.unitPrice) {
        setFieldErrors((prev) => ({ ...prev, unitPrice: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const createdService = await createManagerServiceApi({
        categoryId: form.categoryId,
        name: form.name.trim(),
        unit: form.unit.trim(),
        unitPrice: Number(form.unitPrice),
        description: form.description?.trim() || undefined,
      });

      // Redirect to services list with flash message
      navigate('/manager/services', {
        state: {
          successMessage: `Đã khai báo dịch vụ "${createdService.name}" thành công.`,
        },
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message;
      if (code === 'SERVICE_NAME_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          name: 'Tên dịch vụ này đã tồn tại trong homestay. Vui lòng chọn tên khác.',
        }));
      } else if (code === 'SERVICE_CATEGORY_SCOPE_MISMATCH') {
        setFieldErrors((prev) => ({
          ...prev,
          categoryId: 'Danh mục dịch vụ không thuộc homestay đang quản lý.',
        }));
      } else if (code === 'INVALID_UNIT_PRICE' || (code === 'VALIDATION_ERROR' && message?.includes('unitPrice'))) {
        setFieldErrors((prev) => ({
          ...prev,
          unitPrice: message || 'Đơn giá không hợp lệ.',
        }));
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentPriceNumber = Number(form.unitPrice);
  const isValidPrice = !isNaN(currentPriceNumber) && form.unitPrice !== '' && currentPriceNumber >= 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Top Navigation & Title Header ──────────────────────── */}
      <div className="space-y-2">
        <Link
          to="/manager/services"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại danh sách dịch vụ</span>
        </Link>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                Khai báo dịch vụ mới
              </h1>
              <p className="text-xs text-[var(--color-muted)]">
                Thêm dịch vụ ăn uống, trải nghiệm hoặc tiện ích bổ trợ vào danh mục của homestay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {formError && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-xs text-red-700 border border-red-200 shadow-sm animate-in fade-in duration-150">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Không thể tạo dịch vụ</span>
            <span>{formError}</span>
          </div>
        </div>
      )}

      {/* ── Main 2-Column Form Layout ───────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Fields (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Thông tin cơ bản */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--color-border-subtle)] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
                1. Thông tin dịch vụ
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Tên hiển thị và phân loại dịch vụ cung cấp cho khách lưu trú
              </p>
            </div>

            {/* Danh mục dịch vụ */}
            <div>
              <label
                htmlFor="service-category"
                className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-1.5"
              >
                <span>
                  Danh mục dịch vụ <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-[var(--color-muted)]">
                  {categoriesLoading ? 'Đang tải danh mục...' : `${categories.length} danh mục khả dụng`}
                </span>
              </label>
              <select
                id="service-category"
                disabled={submitting || categoriesLoading}
                value={form.categoryId}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, categoryId: e.target.value }));
                  if (fieldErrors.categoryId) {
                    setFieldErrors((prev) => ({ ...prev, categoryId: null }));
                  }
                }}
                className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 ${
                  fieldErrors.categoryId
                    ? 'border-red-400 focus:ring-red-100'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                }`}
              >
                <option value="" disabled>
                  -- Chọn danh mục dịch vụ --
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.categoryId}</p>
              )}
            </div>

            {/* Tên dịch vụ */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                <label htmlFor="service-name">
                  Tên dịch vụ <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-normal text-[var(--color-muted)]">
                  {form.name.length}/150
                </span>
              </div>
              <input
                id="service-name"
                type="text"
                autoFocus
                maxLength={150}
                disabled={submitting}
                value={form.name}
                placeholder="VD: Bữa sáng xôi nếp nương, Thuê xe máy Honda 110cc, Tiệc nướng BBQ ngoài trời..."
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: null }));
                  }
                }}
                className={`h-11 w-full rounded-xl border bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.name
                    ? 'border-red-400 focus:ring-red-100'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Mô tả dịch vụ */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                <label htmlFor="service-description">
                  Mô tả chi tiết <span className="font-normal text-[var(--color-muted)]">(Tùy chọn)</span>
                </label>
                <span className="text-[11px] font-normal text-[var(--color-muted)]">
                  {form.description.length}/255
                </span>
              </div>
              <textarea
                id="service-description"
                rows={3}
                maxLength={255}
                disabled={submitting}
                value={form.description}
                placeholder="VD: Bữa sáng theo suất phục vụ từ 6:30 - 9:00 tại nhà ăn chính hoặc mang lên phòng. Đặt trước ít nhất 2 giờ..."
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, description: e.target.value }));
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: null }));
                  }
                }}
                className={`w-full rounded-xl border bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.description
                    ? 'border-red-400 focus:ring-red-100'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                }`}
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Card 2: Đơn vị tính & Đơn giá */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--color-border-subtle)] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
                2. Thiết lập giá & Đơn vị tính
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Đơn giá được chốt cố định vào đơn phòng tại thời điểm đặt dịch vụ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Đơn vị tính */}
              <div>
                <label
                  htmlFor="service-unit"
                  className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5"
                >
                  Đơn vị tính <span className="text-red-500">*</span>
                </label>
                <input
                  id="service-unit"
                  type="text"
                  maxLength={30}
                  disabled={submitting}
                  value={form.unit}
                  placeholder="suất, người, ngày, lượt..."
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, unit: e.target.value }));
                    if (fieldErrors.unit) {
                      setFieldErrors((prev) => ({ ...prev, unit: null }));
                    }
                  }}
                  className={`h-11 w-full rounded-xl border bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.unit
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                  }`}
                />
                {/* Quick Unit Chips */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[var(--color-muted)] font-medium mr-0.5">Gợi ý:</span>
                  {QUICK_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, unit: u }));
                        if (fieldErrors.unit) setFieldErrors((prev) => ({ ...prev, unit: null }));
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-medium border transition-colors ${
                        form.unit === u
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                {fieldErrors.unit && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.unit}</p>
                )}
              </div>

              {/* Đơn giá */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                  <label htmlFor="service-price">
                    Đơn giá hiện hành <span className="text-red-500">*</span>
                  </label>
                  {isValidPrice && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {formatVnd(currentPriceNumber)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="service-price"
                    type="text"
                    inputMode="numeric"
                    disabled={submitting}
                    value={form.unitPrice}
                    placeholder="100000"
                    onChange={handlePriceChange}
                    className={`h-11 w-full rounded-xl border bg-[var(--color-surface)] pl-3.5 pr-11 text-sm font-semibold text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                      fieldErrors.unitPrice
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                    }`}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                    VNĐ
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                  Giá này không dùng quy tắc giá tự động (price_rules).
                </p>
                {fieldErrors.unitPrice && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.unitPrice}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Policies & Actions (1/3 width) */}
        <div className="space-y-6">
          {/* Card 3: Thao tác & Điều hướng */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Thao tác
            </h3>
            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang lưu dịch vụ…</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    <span>Khai báo dịch vụ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => navigate('/manager/services')}
                className="w-full h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Hủy bỏ
              </button>
            </div>
          </div>

          {/* Card 4: Thông tin trạng thái & Nghiệp vụ */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Trạng thái ban đầu
              </span>
              <StatusBadge type="service" status="ACTIVE" />
            </div>

            <div className="space-y-3 text-xs text-[var(--color-muted)] leading-relaxed pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Dịch vụ sẽ ở trạng thái <strong>Đang hoạt động (ACTIVE)</strong> ngay sau khi lưu.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Khách hoặc Quản lý có thể chọn dịch vụ này kèm theo từng phòng của đơn đặt phòng.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Khi trả phòng (Check-out), chỉ các dịch vụ đã dùng (<strong>USED</strong>) mới được tính vào công nợ cuối kỳ.
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
