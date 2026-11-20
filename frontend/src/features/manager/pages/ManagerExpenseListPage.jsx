import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Plus,
  Receipt,
  RotateCcw,
  Search,
} from 'lucide-react';
import { getManagerExpenseCategoriesApi, getManagerExpensesApi } from '../api';
import ManagerExpenseDetailDialog from '../components/ManagerExpenseDetailDialog';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const PAYMENT_LABELS = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  OTHER: 'Khác',
};

const DOCUMENT_LABELS = {
  INVOICE: 'Hóa đơn',
  RECEIPT: 'Biên nhận',
  BANK_TRANSFER_CONFIRMATION: 'Xác nhận chuyển khoản',
  OTHER: 'Khác',
};

const EMPTY_FILTERS = {
  fromDate: '',
  toDate: '',
  categoryId: '',
  paymentMethod: '',
  supplierName: '',
};

const INPUT_CLASS = 'min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)] focus:ring-2 focus:ring-gray-200';
const CARD_CLASS = 'rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)]';

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getPresetRange(preset) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  if (preset === 'thisMonth') return { fromDate: localDateString(start), toDate: localDateString(today) };
  if (preset === 'lastMonth') {
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return { fromDate: localDateString(lastMonthStart), toDate: localDateString(lastMonthEnd) };
  }
  if (preset === 'last90Days') {
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
    return { fromDate: localDateString(ninetyDaysAgo), toDate: localDateString(today) };
  }
  return { fromDate: '', toDate: '' };
}

function displayPeriod(filters) {
  if (!filters.fromDate && !filters.toDate) return 'Toàn bộ thời gian';
  if (filters.fromDate && filters.toDate) return `${formatDate(filters.fromDate)} – ${formatDate(filters.toDate)}`;
  if (filters.fromDate) return `Từ ${formatDate(filters.fromDate)}`;
  return `Đến ${formatDate(filters.toDate)}`;
}

function FilterField({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[var(--color-body)]">{label}</span>
      {children}
    </label>
  );
}

export default function ManagerExpenseListPage() {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedPreset, setSelectedPreset] = useState('all');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ items: [], meta: { page: 0, size: 20, totalElements: 0, totalPages: 0 } });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    getManagerExpenseCategoriesApi()
      .then((data) => { if (active) setCategories(data); })
      .catch((err) => { if (active) setCategoryError(getErrorMessage(err) || 'Không thể tải danh mục chi phí.'); });
    return () => { active = false; };
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getManagerExpensesApi({ ...appliedFilters, page, size: 20 });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách chi phí.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, reload]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (event.target.name === 'fromDate' || event.target.name === 'toDate') setSelectedPreset('custom');
  };

  const applyFilterValues = (nextFilters, preset = 'custom') => {
    if (nextFilters.fromDate && nextFilters.toDate && nextFilters.fromDate > nextFilters.toDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setError('');
    setSelectedPreset(preset);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(0);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    applyFilterValues({ ...filters }, selectedPreset);
  };

  const resetFilters = () => applyFilterValues({ ...EMPTY_FILTERS }, 'all');

  const choosePreset = (preset) => {
      applyFilterValues({ ...appliedFilters, ...getPresetRange(preset) }, preset);
  };

  const activeFilterCount = useMemo(() => Object.values(appliedFilters).filter(Boolean).length, [appliedFilters]);
  const meta = result.meta || { page, size: 20, totalElements: 0, totalPages: 0 };
  const firstResult = meta.totalElements === 0 ? 0 : page * (meta.size || 20) + 1;
  const lastResult = Math.min((page + 1) * (meta.size || 20), meta.totalElements);

  const setPageSafely = (nextPage) => setPage(Math.max(0, Math.min(nextPage, Math.max(meta.totalPages - 1, 0))));
  const closeExpenseDetail = useCallback(() => setSelectedExpense(null), []);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Receipt className="h-5 w-5" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Chi phí vận hành</h1>
            <p className="mt-1 text-sm text-[var(--color-body)]">Theo dõi khoản chi, nhà cung cấp và chứng từ của homestay.</p>
          </div>
        </div>
        <Link to="/manager/expenses/create" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <Plus className="h-4 w-4" /> Ghi nhận khoản chi
        </Link>
      </header>

      {(error || categoryError) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{error || categoryError}</span>
          {error && <button type="button" onClick={() => setReload((value) => value + 1)} className="min-h-9 font-semibold underline">Tải lại danh sách</button>}
        </div>
      )}

      <section className={`${CARD_CLASS} p-4 sm:p-5`} aria-label="Lọc khoản chi">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]"><Filter className="h-4 w-4 text-[var(--color-body)]" /> Lọc chi phí</h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Chọn kỳ cần đối chiếu hoặc kết hợp các điều kiện lọc.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Khoảng thời gian nhanh">
            {[
              ['thisMonth', 'Tháng này'],
              ['lastMonth', 'Tháng trước'],
              ['last90Days', '90 ngày qua'],
              ['all', 'Toàn bộ'],
            ].map(([preset, label]) => (
              <button key={preset} type="button" onClick={() => choosePreset(preset)} aria-pressed={selectedPreset === preset}
                className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition ${selectedPreset === preset ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-soft)]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={applyFilters} className="mt-5 border-t border-[var(--color-border)] pt-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterField label="Từ ngày">
              <input className={INPUT_CLASS} type="date" name="fromDate" value={filters.fromDate} onChange={updateFilter} />
            </FilterField>
            <FilterField label="Đến ngày">
              <input className={INPUT_CLASS} type="date" name="toDate" value={filters.toDate} onChange={updateFilter} />
            </FilterField>
            <FilterField label="Danh mục">
              <select className={INPUT_CLASS} name="categoryId" value={filters.categoryId} onChange={updateFilter}>
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </FilterField>
            <FilterField label="Phương thức thanh toán">
              <select className={INPUT_CLASS} name="paymentMethod" value={filters.paymentMethod} onChange={updateFilter}>
                <option value="">Tất cả phương thức</option>
                {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Nhà cung cấp">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input className={`${INPUT_CLASS} pl-10`} name="supplierName" value={filters.supplierName} onChange={updateFilter} maxLength={150} placeholder="Nhập tên nhà cung cấp" />
              </div>
            </FilterField>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-[var(--color-body)]"><CalendarDays className="h-4 w-4 text-[var(--color-muted)]" /><span>{displayPeriod(appliedFilters)}</span></p>
            <div className="flex gap-2">
              <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]"><RotateCcw className="h-4 w-4" /> Xóa lọc</button>
              <button type="submit" className="min-h-10 rounded-xl border border-[var(--color-border-strong)] bg-white px-5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Áp dụng bộ lọc</button>
            </div>
          </div>
        </form>
      </section>

      <section className={`${CARD_CLASS} overflow-hidden`} aria-labelledby="expense-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
          <div>
            <h2 id="expense-list-title" className="text-base font-bold text-[var(--color-ink)]">Sổ chi phí</h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{displayPeriod(appliedFilters)}{activeFilterCount > 2 ? ` · ${activeFilterCount - 2} bộ lọc khác` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--color-ink)]">{loading ? 'Đang tải…' : `${meta.totalElements} khoản chi`}</p>
            {!loading && meta.totalElements > 0 && <p className="mt-0.5 text-xs text-[var(--color-muted)]">Đang xem {firstResult}–{lastResult}</p>}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-live="polite"><div className="h-10 animate-pulse rounded-xl bg-gray-100" /><div className="h-16 animate-pulse rounded-xl bg-gray-100" /><div className="h-16 animate-pulse rounded-xl bg-gray-100" /></div>
        ) : result.items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-muted)]"><Receipt className="h-5 w-5" /></div>
            <h3 className="mt-4 font-bold text-[var(--color-ink)]">Chưa có khoản chi phù hợp</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-muted)]">Thử đổi khoảng thời gian hoặc xóa bớt bộ lọc. Bạn cũng có thể ghi nhận khoản chi mới.</p>
            <button type="button" onClick={resetFilters} className="mt-4 min-h-10 rounded-xl px-4 text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">Xóa bộ lọc</button>
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-3.5 text-sm font-bold text-[var(--color-ink)] lg:grid lg:grid-cols-[105px_minmax(180px,1.7fr)_minmax(130px,1fr)_minmax(120px,.9fr)_minmax(130px,1fr)_130px_78px] lg:items-center lg:gap-4">
              <span>Ngày</span>
              <span>Khoản chi</span>
              <span>Nhà cung cấp</span>
              <span>Thanh toán</span>
              <span>Chứng từ</span>
              <span className="text-right">Số tiền</span>
              <span aria-hidden="true" />
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {result.items.map((expense) => (
                <article key={expense.id} className={`grid gap-3 p-4 transition hover:bg-gray-50/70 sm:p-5 lg:grid-cols-[105px_minmax(180px,1.7fr)_minmax(130px,1fr)_minmax(120px,.9fr)_minmax(130px,1fr)_130px_78px] lg:items-center lg:gap-4 ${expense.cancelledAt ? 'bg-gray-50/70' : ''}`}>
                <div className="text-xs font-medium text-[var(--color-muted)] lg:text-sm lg:text-[var(--color-body)]"><span className="mr-1 text-xs text-[var(--color-muted)] lg:hidden">Ngày:</span>{formatDate(expense.expenseDate)}</div>
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[var(--color-ink)]"><span className="mr-1 text-xs font-medium text-[var(--color-muted)] lg:hidden">Khoản chi:</span>{expense.description || expense.categoryName || 'Chi phí vận hành'}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{expense.categoryName || 'Chưa phân loại'}</p>
                  {expense.cancelledAt && <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">Đã hủy{expense.cancelledByName ? ` · ${expense.cancelledByName}` : ''}</span>}
                </div>
                <div className="min-w-0 text-sm text-[var(--color-body)]"><span className="mr-1 text-xs text-[var(--color-muted)] lg:hidden">Nhà cung cấp:</span>{expense.supplierName || '—'}</div>
                <div className="text-sm text-[var(--color-body)]"><span className="mr-1 text-xs text-[var(--color-muted)] lg:hidden">Thanh toán:</span>{PAYMENT_LABELS[expense.paymentMethod] || 'Chưa xác định'}</div>
                <div className="min-w-0 text-sm text-[var(--color-body)]">
                  <span className="mr-1 text-xs text-[var(--color-muted)] lg:hidden">Chứng từ:</span>{expense.documentNumber || DOCUMENT_LABELS[expense.documentType] || '—'}
                  {expense.proofUrl && <a href={fileUrl(expense.proofUrl)} target="_blank" rel="noreferrer" className="ml-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"><FileText className="h-3.5 w-3.5" /> Mở tệp</a>}
                </div>
                <p className={`font-bold tabular-nums lg:text-right ${expense.cancelledAt ? 'text-gray-400 line-through' : 'text-[var(--color-ink)]'}`}><span className="mr-1 text-xs font-medium text-[var(--color-muted)] lg:hidden">Số tiền:</span>{formatVnd(expense.amount)}</p>
                <button type="button" onClick={() => setSelectedExpense(expense)} className="min-h-9 justify-self-start rounded-lg px-2.5 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 lg:justify-self-end">Chi tiết</button>
              </article>
              ))}
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white px-4 py-3.5 sm:px-5">
          <p className="text-xs text-[var(--color-muted)]">{meta.totalElements ? `Trang ${page + 1} / ${meta.totalPages}` : 'Không có dữ liệu'}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPageSafely(page - 1)} disabled={page <= 0 || loading} aria-label="Trang trước" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setPageSafely(page + 1)} disabled={loading || !meta.totalPages || page >= meta.totalPages - 1} aria-label="Trang sau" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </footer>
      </section>

      {selectedExpense && (
        <ManagerExpenseDetailDialog
          expense={selectedExpense}
          categories={categories}
          onClose={closeExpenseDetail}
          onSaved={(updatedExpense) => {
            setSelectedExpense(updatedExpense);
            setReload((value) => value + 1);
          }}
          onCancelled={() => {
            setSelectedExpense(null);
            setReload((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
