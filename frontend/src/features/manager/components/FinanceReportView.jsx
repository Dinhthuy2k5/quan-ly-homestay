import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Filter,
  Landmark,
  Receipt,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { getManagerReportFinanceApi } from '../api';
import { CARD_CLASS, DeltaBadge } from './OperationsWidgets';
import {
  displayPeriod,
  getPresetRange,
  getPreviousPeriod,
  inclusiveDays,
} from '../utils/dateRange';
import { formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

// Định dạng số nguyên và số thập phân (1 chữ số sau dấu phẩy) theo chuẩn Việt Nam
const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const DEC_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

// Danh sách lựa chọn cho dropdown lọc phương thức thanh toán
const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
  { value: 'OTHER', label: 'Khác' },
];

// Ánh xạ mã phương thức từ backend sang nhãn tiếng Việt và icon tương ứng
const PAYMENT_METHOD_META = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: Landmark },
  CARD: { label: 'Thẻ', icon: CreditCard },
  OTHER: { label: 'Khác', icon: Wallet },
  UNSPECIFIED: { label: 'Chưa phân loại', icon: Wallet },
};

/** Định dạng tiền có dấu +/- phía trước cho các chỉ số có thể âm (lợi nhuận, dòng tiền ròng). */
function formatSignedVnd(amount) {
  const value = Number(amount || 0);
  if (value > 0) return `+${formatVnd(value)}`;
  if (value < 0) return `-${formatVnd(Math.abs(value))}`;
  return formatVnd(0);
}

/**
 * Giao diện tab "Tài chính cơ sở" (API-REPORT-MGR-02).
 * @param {number} reloadKey - Tăng giá trị khi bấm nút "Làm mới" ở header cha để tải lại dữ liệu.
 * @param {(loading: boolean) => void} onLoadingChange - Báo trạng thái đang tải lên component cha.
 */
export default function FinanceReportView({ reloadKey = 0, onLoadingChange }) {
  // Khoảng ngày mặc định ban đầu: từ mùng 1 tháng hiện tại đến hôm nay
  const initialRange = useMemo(() => getPresetRange('month'), []);

  // --- NHÓM STATE BỘ LỌC ---
  // filters: giá trị đang hiển thị trên các ô nhập liệu (có thể chưa bấm "Áp dụng")
  const [filters, setFilters] = useState({
    ...initialRange,
    paymentMethod: '',
  });
  // appliedFilters: bộ lọc thực tế đang được dùng để gọi API
  const [appliedFilters, setAppliedFilters] = useState({
    ...initialRange,
    paymentMethod: '',
  });
  // preset: nút chọn nhanh đang active ('today' | 'week' | 'month' | 'lastMonth' | 'custom')
  const [preset, setPreset] = useState('month');

  // --- NHÓM STATE DỮ LIỆU API ---
  const [report, setReport] = useState(null);       // Dữ liệu tài chính kỳ đang xem
  const [prevReport, setPrevReport] = useState(null); // Dữ liệu kỳ liền trước cùng số ngày (để hiện % tăng/giảm)
  const [loading, setLoading] = useState(true);     // Đang gọi API hay không
  const [error, setError] = useState('');           // Thông báo lỗi nếu tải thất bại hoặc ngày không hợp lệ
  const [localReload, setLocalReload] = useState(0); // Dùng cho nút "Thử lại" trong banner lỗi

  // Tính khoảng ngày kỳ liền trước (ví dụ xem 20 ngày thì lấy 20 ngày ngay trước đó để so sánh)
  const prevRange = useMemo(
    () => getPreviousPeriod(appliedFilters.fromDate, appliedFilters.toDate),
    [appliedFilters.fromDate, appliedFilters.toDate]
  );

  // Đồng bộ trạng thái loading lên header của trang Báo cáo (xoay icon nút Làm mới)
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Gọi API-REPORT-MGR-02 song song cho kỳ hiện tại và kỳ liền trước
  useEffect(() => {
    // AbortController giúp hủy request cũ nếu người dùng đổi bộ lọc liên tục
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchFinance() {
      setLoading(true);
      setError('');

      try {
        // Request chính: dữ liệu kỳ đang chọn
        const currentPromise = getManagerReportFinanceApi({
          fromDate: appliedFilters.fromDate,
          toDate: appliedFilters.toDate,
          paymentMethod: appliedFilters.paymentMethod || undefined,
          signal,
        });

        // Request phụ: dữ liệu kỳ liền trước để tính DeltaBadge (nếu lỗi thì bỏ qua, không chặn báo cáo chính)
        const prevPromise = prevRange
          ? getManagerReportFinanceApi({
              fromDate: prevRange.fromDate,
              toDate: prevRange.toDate,
              paymentMethod: appliedFilters.paymentMethod || undefined,
              signal,
            }).catch(() => null)
          : Promise.resolve(null);

        const [currentData, prevData] = await Promise.all([currentPromise, prevPromise]);
        if (!signal.aborted) {
          setReport(currentData);
          setPrevReport(prevData);
        }
      } catch (requestError) {
        if (!signal.aborted) {
          setError(getErrorMessage(requestError) || 'Không thể tải báo cáo tài chính cơ sở.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    fetchFinance();
    return () => controller.abort();
  }, [appliedFilters, prevRange, reloadKey, localReload]);

  // --- CÁC HÀM XỬ LÝ TƯƠNG TÁC BỘ LỌC ---

  /** Chọn nhanh kỳ báo cáo (Hôm nay / Tuần này / Tháng này / Tháng trước) và tải lại ngay. */
  const choosePreset = (nextPreset) => {
    const nextRange = getPresetRange(nextPreset);
    setFilters((prev) => ({ ...prev, ...nextRange }));
    setAppliedFilters((prev) => ({ ...prev, ...nextRange }));
    setPreset(nextPreset);
    setError('');
  };

  /** Cập nhật ô ngày hoặc dropdown phương thức thanh toán. */
  const updateField = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name === 'fromDate' || name === 'toDate') {
      // Đổi tay ngày bắt đầu/kết thúc -> chờ người dùng bấm nút "Áp dụng"
      setPreset('custom');
    } else {
      // Đổi dropdown danh mục hoặc phương thức -> áp dụng lọc ngay lập tức
      setAppliedFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  /** Kiểm tra hợp lệ khoảng ngày rồi áp dụng bộ lọc. */
  const applyDateFilters = (event) => {
    event.preventDefault();
    if (!filters.fromDate || !filters.toDate) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (filters.fromDate > filters.toDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setError('');
    setAppliedFilters({ ...filters });
  };

  /** Xóa bộ lọc phương thức thanh toán, giữ nguyên khoảng ngày. */
  const resetSecondaryFilters = () => {
    setFilters((prev) => ({ ...prev, paymentMethod: '' }));
    setAppliedFilters((prev) => ({ ...prev, paymentMethod: '' }));
  };

  /** Bấm vào 1 dòng phương thức trong bảng để bật/tắt lọc theo phương thức đó. */
  const toggleMethodFilter = (method) => {
    if (!method || method === 'UNSPECIFIED') return;
    const nextValue = appliedFilters.paymentMethod === method ? '' : method;
    setFilters((prev) => ({ ...prev, paymentMethod: nextValue }));
    setAppliedFilters((prev) => ({ ...prev, paymentMethod: nextValue }));
  };

  // --- CÁC BIẾN DẪN XUẤT TỪ DỮ LIỆU BÁO CÁO (để hiển thị gọn trong JSX) ---
  const effectiveFrom = report?.fromDate || appliedFilters.fromDate;
  const effectiveTo = report?.toDate || appliedFilters.toDate;
  const periodLabel = displayPeriod(effectiveFrom, effectiveTo); // Chuỗi ngày hiển thị, vd: "01/11/2026 – 22/11/2026"
  const prevPeriodLabel = prevRange ? displayPeriod(prevRange.fromDate, prevRange.toDate) : '';
  const days = inclusiveDays(effectiveFrom, effectiveTo); // Tổng số ngày trong kỳ (tính cả đầu & cuối)

  // Các số liệu tài chính chính (mặc định 0 khi chưa có dữ liệu)
  const revenue = report?.revenue ?? 0;                       // Tiền thực thu ròng = grossReceipts - refunds
  const grossReceipts = report?.grossReceipts ?? 0;           // Tổng tiền thu vào (cọc + thanh toán)
  const depositReceipts = report?.depositReceipts ?? 0;       // Riêng tiền đặt cọc
  const settlementReceipts = report?.settlementReceipts ?? 0; // Riêng tiền thanh toán trả phòng/bổ sung
  const refunds = report?.refunds ?? 0;                       // Tổng tiền hoàn trả khách
  const expense = report?.expense ?? 0;                       // Tổng chi phí vận hành
  const profit = report?.profit ?? 0;                         // Lợi nhuận ròng = revenue - expense

  // Chỉ số phần trăm tính thêm trên frontend (chỉ tính khi thực thu > 0 để tránh chia cho 0)
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : null;  // Biên lợi nhuận (%)
  const expenseRatio = revenue > 0 ? (expense / revenue) * 100 : null; // Tỷ lệ chi phí trên thực thu (%)

  // Danh sách chi tiết và cờ kiểm tra bộ lọc phụ / trạng thái rỗng
  const expensesByCategory = report?.expensesByCategory || [];
  const byPaymentMethod = report?.byPaymentMethod || [];
  const hasSecondaryFilter = Boolean(appliedFilters.paymentMethod);
  const hasAnyActivity = Boolean(
    report && (report.receiptCount > 0 || report.refundCount > 0 || report.expenseCount > 0)
  );

  return (
    <div className="space-y-5">
      {/* ── Thanh bộ lọc kỳ báo cáo và phương thức thanh toán ── */}
      <section className={`${CARD_CLASS} px-4 py-3.5 sm:px-5`} aria-label="Bộ lọc báo cáo tài chính">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn nhanh kỳ báo cáo">
            {[
              ['today', 'Hôm nay'],
              ['week', 'Tuần này'],
              ['month', 'Tháng này'],
              ['lastMonth', 'Tháng trước'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => choosePreset(value)}
                disabled={loading}
                aria-pressed={preset === value}
                className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition disabled:opacity-60 cursor-pointer ${
                  preset === value
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={applyDateFilters} className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center text-xs font-semibold text-[var(--color-body)]">
              <span className="sr-only">Từ ngày</span>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={updateField}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              />
            </label>
            <span className="text-xs text-[var(--color-muted)]" aria-hidden="true">→</span>
            <label className="inline-flex items-center text-xs font-semibold text-[var(--color-body)]">
              <span className="sr-only">Đến ngày</span>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={updateField}
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
          </form>
        </div>

        {/* Hàng lọc phụ: Phương thức thanh toán */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Lọc theo phương thức:</span>
            </span>
            <label className="inline-flex items-center">
              <span className="sr-only">Phương thức thanh toán</span>
              <select
                name="paymentMethod"
                value={filters.paymentMethod}
                onChange={updateField}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {hasSecondaryFilter && (
              <button
                type="button"
                onClick={resetSecondaryFilters}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            Kỳ: <strong className="font-semibold text-[var(--color-ink)]">{periodLabel}</strong> ({days} ngày)
            {prevPeriodLabel && (
              <>
                {' '}· So với <span className="font-medium text-[var(--color-body)]">{prevPeriodLabel}</span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* ── Banner lỗi khi gọi API thất bại hoặc chọn ngày sai ── */}
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
            onClick={() => setLocalReload((v) => v + 1)}
            className="font-semibold underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Hàng 1: 3 thẻ KPI tài chính chính (Thực thu ròng / Chi phí / Lợi nhuận) ── */}
      <section aria-labelledby="finance-kpi-heading" className="grid gap-4 md:grid-cols-3">
        <h2 id="finance-kpi-heading" className="sr-only">
          Tổng hợp thực thu, chi phí và lợi nhuận
        </h2>

        {/* Thẻ 1: Tiền thực thu ròng */}
        <article className={`${CARD_CLASS} flex flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Tiền thực thu ròng</p>
              {loading ? (
                <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 whitespace-nowrap text-xl xl:text-2xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {formatVnd(revenue)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
              <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)] tabular-nums">
              Thu gộp {formatVnd(grossReceipts)}
              {refunds > 0 ? ` · Hoàn -${formatVnd(refunds)}` : ''}
            </span>
            {!loading && <DeltaBadge current={revenue} previous={prevReport?.revenue} mode="currency" />}
          </div>
        </article>

        {/* Thẻ 2: Chi phí vận hành */}
        <article className={`${CARD_CLASS} flex flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--color-muted)]">
                Chi phí vận hành
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 whitespace-nowrap text-xl xl:text-2xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {formatVnd(expense)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-body)]">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)] tabular-nums">
              {NUM_FORMAT.format(report?.expenseCount ?? 0)} khoản chi hiệu lực
              {expenseRatio !== null ? ` · ${DEC_FORMAT.format(expenseRatio)}% thực thu` : ''}
            </span>
            {!loading && (
              <DeltaBadge current={expense} previous={prevReport?.expense} mode="currency" invertTone />
            )}
          </div>
        </article>

        {/* Thẻ 3: Lợi nhuận ròng (điểm nhấn chính) */}
        <article className={`${CARD_CLASS} flex flex-col justify-between border-[var(--color-border-strong)] p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Lợi nhuận ròng</p>
              {loading ? (
                <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p
                  className={`mt-1.5 whitespace-nowrap text-xl xl:text-2xl font-extrabold tracking-tight tabular-nums ${
                    profit > 0
                      ? 'text-[var(--color-success)]'
                      : profit < 0
                      ? 'text-[var(--color-danger)]'
                      : 'text-[var(--color-ink)]'
                  }`}
                >
                  {formatSignedVnd(profit)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-ink)] text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)] tabular-nums">
              {profitMargin !== null
                ? `Biên lợi nhuận: ${DEC_FORMAT.format(profitMargin)}%`
                : 'Thực thu ròng − Chi phí vận hành'}
            </span>
            {!loading && <DeltaBadge current={profit} previous={prevReport?.profit} mode="currency" />}
          </div>
        </article>
      </section>

      {/* ── Hàng 2: Chi tiết nguồn thu (Đặt cọc / Thanh toán bổ sung / Hoàn tiền) ── */}
      <section aria-labelledby="receipt-structure-heading" className={`${CARD_CLASS} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="receipt-structure-heading" className="text-sm font-bold text-[var(--color-ink)]">
            Chi tiết dòng thu đã xác nhận
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            Chỉ tính giao dịch đã xác nhận (CONFIRMED) theo ngày xác nhận giờ Việt Nam.
          </span>
        </div>

        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">Tiền đặt cọc (DEPOSIT)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
              {loading ? '—' : formatVnd(depositReceipts)}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">Thanh toán trả phòng / bổ sung</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
              {loading ? '—' : formatVnd(settlementReceipts)}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">
              Hoàn tiền cho khách ({NUM_FORMAT.format(report?.refundCount ?? 0)} lượt)
            </p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                refunds > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {loading ? '—' : refunds > 0 ? `-${formatVnd(refunds)}` : formatVnd(0)}
            </p>
          </div>
        </div>
      </section>

      {/* ── Hàng 3: 2 bảng phân tích chi tiết (Trái: Phương thức thanh toán | Phải: Danh mục chi phí) ── */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Cột trái (7 cột): Dòng thu & hoàn tiền theo phương thức thanh toán */}
        <section
          aria-labelledby="finance-method-heading"
          className={`${CARD_CLASS} flex flex-col p-5 sm:p-6 xl:col-span-7`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h2 id="finance-method-heading" className="text-base font-bold text-[var(--color-ink)]">
                Dòng thu theo phương thức thanh toán
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Bấm vào từng phương thức để lọc nhanh báo cáo theo kênh thanh toán tương ứng.
              </p>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-x-auto">
            {loading ? (
              <div className="space-y-2.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
                ))}
              </div>
            ) : byPaymentMethod.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-8 text-center text-xs text-[var(--color-muted)]">
                Chưa có giao dịch thu hoặc hoàn tiền đã xác nhận trong kỳ lọc hiện tại.
              </p>
            ) : (
              <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    <th className="py-2.5 pr-3">Phương thức</th>
                    <th className="py-2.5 px-2 text-right">Thu vào</th>
                    <th className="py-2.5 px-2 text-right">Hoàn tiền</th>
                    <th className="py-2.5 pl-2 text-right">Thực thu ròng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {byPaymentMethod.map((row) => {
                    const meta = PAYMENT_METHOD_META[row.paymentMethod] || PAYMENT_METHOD_META.OTHER;
                    const Icon = meta.icon;
                    const isSelected = appliedFilters.paymentMethod === row.paymentMethod;

                    return (
                      <tr
                        key={row.paymentMethod}
                        onClick={() => toggleMethodFilter(row.paymentMethod)}
                        className={`cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)] ${
                          isSelected ? 'bg-[var(--color-surface-soft)]' : ''
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-body)]">
                              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="font-semibold text-[var(--color-ink)]">{meta.label}</p>
                              <p className="text-[11px] text-[var(--color-muted)] tabular-nums">
                                {row.receiptCount} lượt thu{row.refundCount > 0 ? ` · ${row.refundCount} lượt hoàn` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-medium tabular-nums text-[var(--color-ink)]">
                          {formatVnd(row.grossReceipts)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium tabular-nums text-[var(--color-muted)]">
                          {row.refunds > 0 ? `-${formatVnd(row.refunds)}` : '0 ₫'}
                        </td>
                        <td
                          className={`py-3 pl-2 text-right font-bold tabular-nums ${
                            row.netRevenue > 0
                              ? 'text-[var(--color-success)]'
                              : row.netRevenue < 0
                              ? 'text-[var(--color-danger)]'
                              : 'text-[var(--color-ink)]'
                          }`}
                        >
                          {formatVnd(row.netRevenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-bold text-[var(--color-ink)]">
                    <td className="pt-3 pr-3">Tổng cộng</td>
                    <td className="pt-3 px-2 text-right tabular-nums">{formatVnd(grossReceipts)}</td>
                    <td className="pt-3 px-2 text-right tabular-nums">
                      {refunds > 0 ? `-${formatVnd(refunds)}` : '0 ₫'}
                    </td>
                    <td className="pt-3 pl-2 text-right tabular-nums">{formatVnd(revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </section>

        {/* Cột phải (5 cột): Tỷ trọng chi phí theo từng danh mục */}
        <section
          aria-labelledby="finance-category-heading"
          className={`${CARD_CLASS} flex flex-col p-5 sm:p-6 xl:col-span-5`}
        >
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h2 id="finance-category-heading" className="text-base font-bold text-[var(--color-ink)]">
                Chi phí theo danh mục
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Chỉ tính khoản chi còn hiệu lực (không gồm khoản đã hủy).
              </p>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-body)]">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 flex-1">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
                ))}
              </div>
            ) : expensesByCategory.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-8 text-center text-xs text-[var(--color-muted)]">
                Không có khoản chi phí nào phát sinh trong kỳ này.
              </p>
            ) : (
              <ul className="space-y-3">
                {expensesByCategory.map((item) => {
                  // Tỷ lệ phần trăm của danh mục này trên tổng chi phí kỳ báo cáo
                  const pct = expense > 0 ? (item.totalAmount / expense) * 100 : 0;

                  return (
                    <li key={item.categoryId}>
                      <div className="w-full rounded-xl border border-[var(--color-border)] bg-white p-3 text-left">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="truncate font-semibold text-[var(--color-ink)]">
                            {item.categoryName}
                          </span>
                          <span className="shrink-0 font-bold tabular-nums text-[var(--color-ink)]">
                            {formatVnd(item.totalAmount)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-ink)] transition-all"
                            style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--color-muted)] tabular-nums">
                          <span>{NUM_FORMAT.format(item.expenseCount)} khoản chi</span>
                          <span>{DEC_FORMAT.format(pct)}%</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)]">
              Sắp xếp giảm dần theo chi phí
            </span>
            <Link
              to="/manager/expenses"
              className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
            >
              <span>Sổ chi phí</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* Trạng thái rỗng khi kỳ lọc không có giao dịch thu hay chi nào */}
      {!loading && report && !hasAnyActivity && !error && (
        <p
          role="status"
          className={`${CARD_CLASS} px-5 py-6 text-center text-sm text-[var(--color-muted)]`}
        >
          Chưa có giao dịch tài chính nào phát sinh trong kỳ {periodLabel}.
        </p>
      )}
    </div>
  );
}
