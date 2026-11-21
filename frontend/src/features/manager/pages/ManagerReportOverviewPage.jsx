import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  ClipboardList,
  LogIn,
  LogOut,
  Plus,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import {
  getManagerBookingsApi,
  getManagerReportOverviewApi,
  getManagerRoomsApi,
} from '../api';
import {
  ActionQueueAndRoomsPanel,
  CARD_CLASS,
  DeltaBadge,
  OccupancyHeroCard,
  OperationalScheduleCard,
} from '../components/OperationsWidgets';
import { formatDate } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const EFFECTIVE_BOOKING_STATUSES = new Set(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT']);
const CHECKOUT_STATUSES = new Set(['CHECKED_IN', 'CHECKED_OUT']);

// ─── Date helpers ─────────────────────────────────────────────────────────────

function utcDateString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function getToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${v.year}-${v.month}-${v.day}`;
}

function shiftDate(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

function getPresetRange(preset) {
  const today = getToday();
  const [year, month] = today.split('-').map(Number);
  if (preset === 'today') return { fromDate: today, toDate: today };
  if (preset === 'week') {
    const weekday = new Date(Date.UTC(year, month - 1, Number(today.slice(8, 10)))).getUTCDay();
    const daysFromMonday = (weekday + 6) % 7;
    return { fromDate: shiftDate(today, -daysFromMonday), toDate: today };
  }
  if (preset === 'lastMonth') {
    const start = new Date(Date.UTC(year, month - 2, 1));
    const end = new Date(Date.UTC(year, month - 1, 0));
    return { fromDate: utcDateString(start), toDate: utcDateString(end) };
  }
  return { fromDate: `${year}-${String(month).padStart(2, '0')}-01`, toDate: today };
}

function inclusiveDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return Math.max(0, (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000 + 1);
}

function getPreviousPeriod(fromDate, toDate) {
  const days = inclusiveDays(fromDate, toDate);
  if (days <= 0) return null;
  const prevTo = shiftDate(fromDate, -1);
  const prevFrom = shiftDate(fromDate, -days);
  return { fromDate: prevFrom, toDate: prevTo, days };
}

function displayPeriod(fromDate, toDate) {
  if (!fromDate || !toDate) return '';
  if (fromDate === toDate) return formatDate(fromDate);
  return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerReportOverviewPage() {
  const { homestay } = useOutletContext() || {};
  const todayStr = useMemo(() => getToday(), []);
  const initialRange = useMemo(() => getPresetRange('month'), []);

  // Filter state
  const [filters, setFilters] = useState(initialRange);
  const [appliedFilters, setAppliedFilters] = useState(initialRange);
  const [preset, setPreset] = useState('month');
  const [reload, setReload] = useState(0);

  // Period report & schedule state
  const [report, setReport] = useState(null);
  const [prevReport, setPrevReport] = useState(null);
  const [periodBookings, setPeriodBookings] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  // Live operational snapshot (action queue, in-house guests, room status distribution)
  const [liveLoading, setLiveLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState({ total: 0, items: [] });
  const [pendingDepositCount, setPendingDepositCount] = useState(0);
  const [todayArrivalsCount, setTodayArrivalsCount] = useState(0);
  const [inHouseBookings, setInHouseBookings] = useState([]);
  const [roomStats, setRoomStats] = useState({
    active: 0,
    locked: 0,
    inactive: 0,
    lockedRooms: [],
  });

  // Interactive schedule tab
  const [scheduleTab, setScheduleTab] = useState('arrivals');
  const scheduleSectionRef = useRef(null);

  const prevRange = useMemo(
    () => getPreviousPeriod(appliedFilters.fromDate, appliedFilters.toDate),
    [appliedFilters.fromDate, appliedFilters.toDate]
  );

  // 1. Load period-dependent data (REPORT-MGR-01 current + previous period + bookings in period)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchPeriodData() {
      setReportLoading(true);
      setReportError('');
      setScheduleError('');

      try {
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

        const bookingsPromise = getManagerBookingsApi({
          fromDate: appliedFilters.fromDate,
          toDate: appliedFilters.toDate,
          size: 50,
          sort: 'checkInDate,asc',
          signal,
        }).catch((err) => {
          if (!signal.aborted) {
            setScheduleError(getErrorMessage(err) || 'Không thể tải danh sách lịch đón/tiễn trong kỳ.');
          }
          return { items: [] };
        });

        const [currentData, prevData, bookingsData] = await Promise.all([
          currentPromise,
          prevPromise,
          bookingsPromise,
        ]);

        if (!signal.aborted) {
          setReport(currentData);
          setPrevReport(prevData);
          setPeriodBookings(bookingsData?.items || []);
        }
      } catch (err) {
        if (!signal.aborted) {
          setReportError(getErrorMessage(err) || 'Không thể tải báo cáo tổng quan cơ sở.');
        }
      } finally {
        if (!signal.aborted) {
          setReportLoading(false);
        }
      }
    }

    fetchPeriodData();
    return () => controller.abort();
  }, [appliedFilters, prevRange, reload]);

  // 2. Load live operational snapshot (independent of date filter; refreshes on mount or manual reload)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchLiveSnapshot() {
      setLiveLoading(true);
      try {
        const [
          approvalRes,
          depositRes,
          todayConfirmRes,
          inHouseRes,
          activeRoomsRes,
          lockedRoomsRes,
          inactiveRoomsRes,
        ] = await Promise.all([
          getManagerBookingsApi({ status: 'PENDING_APPROVAL', size: 5, sort: 'createdAt,desc', signal }).catch(() => null),
          getManagerBookingsApi({ status: 'PENDING_DEPOSIT', size: 1, sort: 'createdAt,asc', signal }).catch(() => null),
          getManagerBookingsApi({ status: 'CONFIRMED', fromDate: todayStr, toDate: todayStr, size: 1, signal }).catch(() => null),
          getManagerBookingsApi({ status: 'CHECKED_IN', size: 50, sort: 'checkOutDate,asc', signal }).catch(() => null),
          getManagerRoomsApi({ status: 'ACTIVE', size: 1, signal }).catch(() => null),
          getManagerRoomsApi({ status: 'LOCKED', size: 5, signal }).catch(() => null),
          getManagerRoomsApi({ status: 'INACTIVE', size: 1, signal }).catch(() => null),
        ]);

        if (signal.aborted) return;

        if (approvalRes) {
          setPendingApproval({
            total: approvalRes.meta?.totalElements ?? approvalRes.items.length,
            items: approvalRes.items || [],
          });
        }
        if (depositRes) {
          setPendingDepositCount(depositRes.meta?.totalElements ?? depositRes.items.length);
        }
        if (todayConfirmRes) {
          setTodayArrivalsCount(todayConfirmRes.meta?.totalElements ?? todayConfirmRes.items.length);
        }
        if (inHouseRes) {
          setInHouseBookings(inHouseRes.items || []);
        }
        if (activeRoomsRes || lockedRoomsRes || inactiveRoomsRes) {
          setRoomStats({
            active: activeRoomsRes?.meta?.totalElements ?? 0,
            locked: lockedRoomsRes?.meta?.totalElements ?? 0,
            inactive: inactiveRoomsRes?.meta?.totalElements ?? 0,
            lockedRooms: lockedRoomsRes?.items || [],
          });
        }
      } finally {
        if (!signal.aborted) setLiveLoading(false);
      }
    }

    fetchLiveSnapshot();
    return () => controller.abort();
  }, [todayStr, reload]);

  // Handlers
  const choosePreset = (nextPreset) => {
    const nextRange = getPresetRange(nextPreset);
    setFilters(nextRange);
    setAppliedFilters(nextRange);
    setPreset(nextPreset);
    setReportError('');
  };

  const updateDate = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPreset('custom');
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (!filters.fromDate || !filters.toDate) {
      setReportError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (filters.fromDate > filters.toDate) {
      setReportError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setReportError('');
    setAppliedFilters({ ...filters });
  };

  const jumpToScheduleTab = useCallback((tabKey) => {
    setScheduleTab(tabKey);
    scheduleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Derived period metrics
  const effectiveFrom = report?.fromDate || appliedFilters.fromDate;
  const effectiveTo = report?.toDate || appliedFilters.toDate;
  const periodLabel = displayPeriod(effectiveFrom, effectiveTo);
  const prevPeriodLabel = prevRange ? displayPeriod(prevRange.fromDate, prevRange.toDate) : '';
  const days = inclusiveDays(effectiveFrom, effectiveTo);

  // Derived schedule lists
  const arrivals = useMemo(
    () =>
      periodBookings
        .filter((b) => EFFECTIVE_BOOKING_STATUSES.has(b.status))
        .sort((a, b) => (a.checkInDate || '').localeCompare(b.checkInDate || '')),
    [periodBookings]
  );

  const departures = useMemo(() => {
    const map = new Map();
    const collect = (list) => {
      list.forEach((b) => {
        if (
          CHECKOUT_STATUSES.has(b.status) &&
          b.checkOutDate &&
          b.checkOutDate >= effectiveFrom &&
          b.checkOutDate <= effectiveTo
        ) {
          map.set(b.id, b);
        }
      });
    };
    collect(periodBookings);
    collect(inHouseBookings);
    return Array.from(map.values()).sort((a, b) =>
      (a.checkOutDate || '').localeCompare(b.checkOutDate || '')
    );
  }, [periodBookings, inHouseBookings, effectiveFrom, effectiveTo]);

  const todayDeparturesCount = useMemo(
    () => inHouseBookings.filter((b) => b.checkOutDate === todayStr).length,
    [inHouseBookings, todayStr]
  );

  const totalRooms = roomStats.active + roomStats.locked + roomStats.inactive;
  const isRefreshing = reportLoading || liveLoading;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* ── Top Header & Quick Actions ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                Trung tâm điều hành
              </h1>
              <span className="rounded-full border border-[var(--color-border)] bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--color-body)]">
                Hôm nay, {formatDate(todayStr)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
              {homestay?.name ? `${homestay.name} · ` : ''}
              Theo dõi công suất phòng, lịch đón/tiễn khách và đầu việc ưu tiên.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/manager/bookings/create"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Đặt phòng hộ</span>
          </Link>
          <Link
            to="/manager/expenses/create"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-white px-3.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)]"
          >
            <Receipt className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
            <span>Ghi chi phí</span>
          </Link>
          <button
            type="button"
            onClick={() => setReload((v) => v + 1)}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50"
            title="Tải lại toàn bộ dữ liệu vận hành"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </header>

      {/* ── Compact Period Toolbar ── */}
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
                disabled={reportLoading}
                aria-pressed={preset === value}
                className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition disabled:opacity-60 ${
                  preset === value
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
                disabled={reportLoading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:opacity-60"
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
                disabled={reportLoading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={reportLoading}
              className="min-h-9 rounded-xl bg-[var(--color-ink)] px-4 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
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
            Số liệu chỉ tính booking đã xác nhận / đang ở / đã trả phòng.
          </span>
        </div>
      </section>

      {/* ── Primary Error Banner ── */}
      {reportError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {reportError}
          </span>
          <button
            type="button"
            onClick={() => setReload((v) => v + 1)}
            className="font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Bento Row 1: Hero Occupancy (5 cols) + 2×2 Interactive KPI Cards (7 cols) ── */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <OccupancyHeroCard
            report={report}
            prevReport={prevReport}
            days={days}
            prevDays={prevRange?.days}
            loading={reportLoading}
            periodLabel={periodLabel}
          />
        </div>

        <section
          aria-labelledby="kpi-grid-heading"
          className="grid gap-4 sm:grid-cols-2 xl:col-span-7"
        >
          <h2 id="kpi-grid-heading" className="sr-only">
            Chỉ số vận hành trong kỳ
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
                {!reportLoading && (
                  <DeltaBadge current={report?.bookingCount} previous={prevReport?.bookingCount} />
                )}
                <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Đơn có hiệu lực</p>
              {reportLoading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(report?.bookingCount ?? 0)}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                Có đêm lưu trú trong kỳ · Xem danh sách đơn
              </p>
            </div>
          </Link>

          {/* KPI 2: Lượt nhận phòng */}
          <button
            type="button"
            onClick={() => jumpToScheduleTab('arrivals')}
            className={`${CARD_CLASS} group flex flex-col justify-between p-5 text-left transition hover:border-[var(--color-border-strong)]`}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <LogIn className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-1.5">
                {!reportLoading && (
                  <DeltaBadge current={report?.checkIns} previous={prevReport?.checkIns} />
                )}
                <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Lượt nhận phòng</p>
              {reportLoading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(report?.checkIns ?? 0)}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                {todayArrivalsCount > 0
                  ? `${todayArrivalsCount} đoàn chờ nhận phòng hôm nay`
                  : 'Theo lịch check-in trong kỳ · Xem lịch'}
              </p>
            </div>
          </button>

          {/* KPI 3: Lượt trả phòng */}
          <button
            type="button"
            onClick={() => jumpToScheduleTab('departures')}
            className={`${CARD_CLASS} group flex flex-col justify-between p-5 text-left transition hover:border-[var(--color-border-strong)]`}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-1.5">
                {!reportLoading && (
                  <DeltaBadge current={report?.checkOuts} previous={prevReport?.checkOuts} />
                )}
                <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Lượt trả phòng</p>
              {reportLoading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(report?.checkOuts ?? 0)}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                {todayDeparturesCount > 0
                  ? `${todayDeparturesCount} đoàn dự kiến trả phòng hôm nay`
                  : 'Theo lịch check-out trong kỳ · Xem lịch'}
              </p>
            </div>
          </button>

          {/* KPI 4: Phòng đang mở bán */}
          <Link
            to="/manager/rooms"
            className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition hover:border-[var(--color-border-strong)]`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                <BedDouble className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-1.5">
                {!liveLoading && roomStats.locked > 0 && (
                  <span className="rounded-full bg-[var(--color-warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-warning)]">
                    {roomStats.locked} tạm khóa
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Phòng đang mở bán</p>
              {reportLoading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(report?.activeRooms ?? 0)}
                  {totalRooms > 0 && (
                    <span className="text-base font-semibold text-[var(--color-muted)]">
                      /{NUM_FORMAT.format(totalRooms)}
                    </span>
                  )}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                {inHouseBookings.length > 0
                  ? `${inHouseBookings.length} đơn đang lưu trú · Quản lý phòng`
                  : 'Trạng thái ACTIVE hiện tại · Quản lý phòng'}
              </p>
            </div>
          </Link>
        </section>
      </div>

      {/* ── Bento Row 2: Operational Schedule (7 cols) + Action Queue & Room Health (5 cols) ── */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <OperationalScheduleCard
            activeTab={scheduleTab}
            onTabChange={setScheduleTab}
            arrivals={arrivals}
            departures={departures}
            inHouse={inHouseBookings}
            loading={reportLoading || (scheduleTab === 'inHouse' && liveLoading)}
            error={scheduleError}
            todayStr={todayStr}
            appliedFilters={appliedFilters}
            homestay={homestay}
            sectionRef={scheduleSectionRef}
          />
        </div>

        <div className="xl:col-span-5">
          <ActionQueueAndRoomsPanel
            pendingApproval={pendingApproval}
            pendingDepositCount={pendingDepositCount}
            todayArrivalsCount={todayArrivalsCount}
            todayDeparturesCount={todayDeparturesCount}
            roomStats={roomStats}
            todayStr={todayStr}
            loading={liveLoading}
          />
        </div>
      </div>
    </div>
  );
}
