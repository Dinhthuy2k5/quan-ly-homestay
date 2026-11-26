import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  PieChart,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { getManagerReportOverviewApi } from '../api';
import {
  CARD_CLASS,
  DeltaBadge,
  OccupancyHeroCard,
} from '../components/OperationsWidgets';
import FinanceReportView from '../components/FinanceReportView';
import OccupancyReportView from '../components/OccupancyReportView';
import {
  displayPeriod,
  getPresetRange,
  getPreviousPeriod,
  inclusiveDays,
} from '../utils/dateRange';
import { getErrorMessage } from '../../../lib/errors';

const NUM_FORMAT = new Intl.NumberFormat('vi-VN');

// Cấu hình 3 tab báo cáo của Manager theo đúng tài liệu thiết kế (MGR-01, MGR-02, MGR-03)
const REPORT_TABS = [
  {
    key: 'overview',
    label: 'Tổng quan cơ sở',
    apiCode: 'API-REPORT-MGR-01',
    endpoint: 'GET /api/v1/manager/reports/overview',
    icon: BarChart3,
    ready: true,
  },
  {
    key: 'finance',
    label: 'Tài chính cơ sở',
    apiCode: 'API-REPORT-MGR-02',
    endpoint: 'GET /api/v1/manager/reports/finance',
    icon: Wallet,
    ready: true,
  },
  {
    key: 'occupancy',
    label: 'Công suất phòng',
    apiCode: 'API-REPORT-MGR-03',
    endpoint: 'GET /api/v1/manager/reports/occupancy',
    icon: PieChart,
    ready: true,
  },
];

// Tập hợp các key tab hợp lệ dùng để kiểm tra tham số ?tab=... trên URL
const VALID_TAB_KEYS = new Set(REPORT_TABS.map((t) => t.key));

/**
 * Trang Báo cáo cơ sở (/manager/reports).
 * Gồm 3 tab: Tổng quan (MGR-01), Tài chính (MGR-02) và Công suất phòng (MGR-03).
 */
export default function ManagerReportOverviewPage() {
  const { homestay } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();

  // Khoảng ngày mặc định: từ đầu tháng hiện tại đến hôm nay
  const initialRange = useMemo(() => getPresetRange('month'), []);

  // Đọc tab hiện tại từ URL (?tab=finance), mặc định là 'overview'
  const rawTab = searchParams.get('tab');
  const activeReportTab = VALID_TAB_KEYS.has(rawTab) ? rawTab : 'overview';

  // --- STATE BỘ LỌC & DỮ LIỆU CHO TAB TỔNG QUAN (API-REPORT-MGR-01) ---
  const [filters, setFilters] = useState(initialRange);               // Ngày đang nhập trên form
  const [appliedFilters, setAppliedFilters] = useState(initialRange); // Ngày đã áp dụng để gọi API
  const [preset, setPreset] = useState('month');                      // Nút chọn nhanh đang active
  const [reload, setReload] = useState(0);                            // Tăng giá trị khi bấm "Làm mới"

  const [report, setReport] = useState(null);             // Dữ liệu tổng quan kỳ hiện tại
  const [prevReport, setPrevReport] = useState(null);     // Dữ liệu kỳ liền trước để so sánh % tăng/giảm
  const [loading, setLoading] = useState(true);              // Trạng thái tải của tab Tổng quan
  const [financeLoading, setFinanceLoading] = useState(false); // Trạng thái tải báo lên từ tab Tài chính
  const [occupancyLoading, setOccupancyLoading] = useState(false); // Trạng thái tải báo lên từ tab Công suất
  const [error, setError] = useState('');

  /** Chuyển tab báo cáo và cập nhật query ?tab=... trên URL để F5 không bị mất tab đang xem. */
  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', nextTab);
    }
    setSearchParams(next, { replace: true });
  };

  const handleFinanceLoadingChange = useCallback((isBusy) => {
    setFinanceLoading(isBusy);
  }, []);

  const handleOccupancyLoadingChange = useCallback((isBusy) => {
    setOccupancyLoading(isBusy);
  }, []);

  // Kỳ liền trước cùng số ngày (dùng để so sánh tăng/giảm với kỳ đang xem)
  const prevRange = useMemo(
    () => getPreviousPeriod(appliedFilters.fromDate, appliedFilters.toDate),
    [appliedFilters.fromDate, appliedFilters.toDate]
  );

  // Chỉ gọi API-REPORT-MGR-01 khi đang mở tab Tổng quan cơ sở
  useEffect(() => {
    if (activeReportTab !== 'overview') return undefined;

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchOverviewReport() {
      setLoading(true);
      setError('');

      try {
        // Gọi song song báo cáo kỳ hiện tại và kỳ liền trước
        const currentPromise = getManagerReportOverviewApi({
          fromDate: appliedFilters.fromDate,
          toDate: appliedFilters.toDate,
          signal,
        });

        const prevPromise = prevRange
          ? getManagerReportOverviewApi({
            fromDate: prevRange.fromDate,
            toDate: prevRange.toDate,
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
          setError(getErrorMessage(requestError) || 'Không thể tải báo cáo tổng quan cơ sở.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    fetchOverviewReport();
    return () => controller.abort();
  }, [activeReportTab, appliedFilters, prevRange, reload]);

  /** Chọn nhanh kỳ báo cáo và áp dụng luôn. */
  const choosePreset = (nextPreset) => {
    const nextRange = getPresetRange(nextPreset);
    setFilters(nextRange);
    setAppliedFilters(nextRange);
    setPreset(nextPreset);
    setError('');
  };

  /** Cập nhật ô ngày khi chọn thủ công. */
  const updateDate = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPreset('custom');
  };

  /** Kiểm tra khoảng ngày hợp lệ rồi áp dụng lọc. */
  const applyFilters = (event) => {
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

  // --- BIẾN DẪN XUẤT HIỂN THỊ CHO TAB TỔNG QUAN ---
  const effectiveFrom = report?.fromDate || appliedFilters.fromDate;
  const effectiveTo = report?.toDate || appliedFilters.toDate;
  const periodLabel = displayPeriod(effectiveFrom, effectiveTo);
  const prevPeriodLabel = prevRange ? displayPeriod(prevRange.fromDate, prevRange.toDate) : '';
  const days = inclusiveDays(effectiveFrom, effectiveTo);
  const hasActivity = Boolean(
    report &&
    (report.bookingCount > 0 ||
      report.checkIns > 0 ||
      report.checkOuts > 0 ||
      report.occupiedRoomNights > 0)
  );

  // Thông tin tab đang chọn và cờ khóa nút "Làm mới" khi tab hiện tại đang tải
  const selectedTabMeta = REPORT_TABS.find((t) => t.key === activeReportTab) || REPORT_TABS[0];
  const isCurrentTabBusy =
    (activeReportTab === 'overview' && loading) ||
    (activeReportTab === 'finance' && financeLoading) ||
    (activeReportTab === 'occupancy' && occupancyLoading);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* ── Header trang Báo cáo ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Báo cáo cơ sở
            </h1>
            <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
              {homestay?.name ? `${homestay.name} · ` : ''}
              Thống kê tổng quan, tài chính và công suất khai thác theo kỳ.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/manager/dashboard"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
          >
            <LayoutDashboard className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
            <span>Trung tâm điều hành</span>
          </Link>
          {selectedTabMeta.ready && (
            <button
              type="button"
              onClick={() => setReload((v) => v + 1)}
              disabled={isCurrentTabBusy}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isCurrentTabBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Thanh 3 tab báo cáo (MGR-01 / MGR-02 / MGR-03) ── */}
      <nav
        aria-label="Danh mục báo cáo cơ sở"
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
      >
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition cursor-pointer ${isActive
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white shadow-xs'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]'
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
              {!tab.ready && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]'
                    }`}
                >
                  Sắp có
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Nội dung từng tab ── */}
      {activeReportTab === 'finance' ? (
        <FinanceReportView reloadKey={reload} onLoadingChange={handleFinanceLoadingChange} />
      ) : activeReportTab === 'occupancy' ? (
        <OccupancyReportView reloadKey={reload} onLoadingChange={handleOccupancyLoadingChange} />
      ) : (
        <>
          {/* Thanh lọc kỳ cho tab Tổng quan */}
          <section className={`${CARD_CLASS} px-4 py-3.5 sm:px-5`} aria-label="Lọc kỳ báo cáo">
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
                    className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition disabled:opacity-60 cursor-pointer ${preset === value
                        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                        : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-body)]">
                  <span className="sr-only">Từ ngày</span>
                  <input
                    type="date"
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={updateDate}
                    disabled={loading}
                    className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
                  />
                </label>
                <span className="text-xs text-[var(--color-muted)]" aria-hidden="true">→</span>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-body)]">
                  <span className="sr-only">Đến ngày</span>
                  <input
                    type="date"
                    name="toDate"
                    value={filters.toDate}
                    onChange={updateDate}
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

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-muted)]">
              <span>
                Kỳ đang xem: <strong className="font-semibold text-[var(--color-ink)]">{periodLabel}</strong>
                {' '}({days} ngày)
                {prevPeriodLabel && (
                  <>
                    {' '}· So sánh với <span className="font-medium text-[var(--color-body)]">{prevPeriodLabel}</span>
                  </>
                )}
              </span>
              <span className="hidden sm:inline">
                Tính trên booking đã xác nhận / đang ở / đã trả phòng; kỳ tính gồm cả ngày đầu và ngày cuối.
              </span>
            </div>
          </section>

          {/* Banner báo lỗi */}
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
                onClick={() => setReload((v) => v + 1)}
                className="font-semibold underline cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Bố cục chính: Tỷ lệ lấp đầy (5 cột) + 4 thẻ KPI (7 cột) */}
          <div className="grid gap-5 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <OccupancyHeroCard
                report={report}
                prevReport={prevReport}
                days={days}
                prevDays={prevRange?.days}
                loading={loading}
                periodLabel={periodLabel}
              />
            </div>

            <section
              aria-labelledby="report-kpi-heading"
              className="grid gap-4 sm:grid-cols-2 xl:col-span-7"
            >
              <h2 id="report-kpi-heading" className="sr-only">
                Chỉ số báo cáo tổng quan cơ sở
              </h2>

              {/* KPI 1: Đơn có hiệu lực */}
              <Link
                to={`/manager/bookings?fromDate=${effectiveFrom}&toDate=${effectiveTo}`}
                className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition hover:border-[var(--color-border-strong)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                    <ClipboardList className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!loading && (
                      <DeltaBadge current={report?.bookingCount} previous={prevReport?.bookingCount} />
                    )}
                    <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[var(--color-muted)]">Đơn có hiệu lực</p>
                  {loading ? (
                    <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
                  ) : (
                    <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                      {NUM_FORMAT.format(report?.bookingCount ?? 0)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    Booking có đêm lưu trú trong kỳ · Xem danh sách
                  </p>
                </div>
              </Link>

              {/* KPI 2: Lượt nhận phòng */}
              <Link
                to={`/manager/bookings?fromDate=${effectiveFrom}&toDate=${effectiveTo}`}
                className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition hover:border-[var(--color-border-strong)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!loading && (
                      <DeltaBadge current={report?.checkIns} previous={prevReport?.checkIns} />
                    )}
                    <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[var(--color-muted)]">Lượt nhận phòng</p>
                  {loading ? (
                    <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
                  ) : (
                    <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                      {NUM_FORMAT.format(report?.checkIns ?? 0)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    Theo ngày nhận phòng trên booking trong kỳ
                  </p>
                </div>
              </Link>

              {/* KPI 3: Lượt trả phòng */}
              <Link
                to="/manager/bookings"
                className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition hover:border-[var(--color-border-strong)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!loading && (
                      <DeltaBadge current={report?.checkOuts} previous={prevReport?.checkOuts} />
                    )}
                    <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[var(--color-muted)]">Lượt trả phòng</p>
                  {loading ? (
                    <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
                  ) : (
                    <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                      {NUM_FORMAT.format(report?.checkOuts ?? 0)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    Theo ngày trả phòng trên booking trong kỳ
                  </p>
                </div>
              </Link>

              {/* KPI 4: Phòng đang mở bán */}
              <Link
                to="/manager/rooms"
                className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition hover:border-[var(--color-border-strong)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                    <BedDouble className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[var(--color-muted)]">Phòng đang mở bán</p>
                  {loading ? (
                    <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
                  ) : (
                    <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                      {NUM_FORMAT.format(report?.activeRooms ?? 0)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    {!loading && report
                      ? `ACTIVE trên tổng ${NUM_FORMAT.format(report.totalRooms ?? report.activeRooms ?? 0)} phòng · Quản lý phòng`
                      : 'Số phòng trạng thái ACTIVE hiện tại · Quản lý phòng'}
                  </p>
                </div>
              </Link>
            </section>
          </div>

          {/* Trạng thái rỗng */}
          {!loading && report && !hasActivity && !error && (
            <p
              role="status"
              className={`${CARD_CLASS} px-5 py-6 text-center text-sm text-[var(--color-muted)]`}
            >
              Chưa có booking hoặc đêm-phòng khai thác trong kỳ {periodLabel}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
