import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { getManagerBookingsApi, getManagerRoomsApi } from '../api';
import {
  ActionQueueAndRoomsPanel,
  CARD_CLASS,
  OperationalScheduleCard,
} from '../components/OperationsWidgets';
import { displayPeriod, getToday, shiftDate } from '../utils/dateRange';
import { formatDate } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const NUM_FORMAT = new Intl.NumberFormat('vi-VN');

export default function ManagerDashboardPage() {
  const { homestay } = useOutletContext() || {};
  const todayStr = useMemo(() => getToday(), []);

  // Schedule window: 'today' or 'next7Days'
  const [scheduleScope, setScheduleScope] = useState('today');
  const [scheduleTab, setScheduleTab] = useState('arrivals');
  const [reload, setReload] = useState(0);

  const scheduleRange = useMemo(() => {
    if (scheduleScope === 'next7Days') {
      return { fromDate: todayStr, toDate: shiftDate(todayStr, 6) };
    }
    return { fromDate: todayStr, toDate: todayStr };
  }, [scheduleScope, todayStr]);

  // Schedule bookings state
  const [scopeBookings, setScopeBookings] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');

  // Live operational snapshot state
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState('');
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

  const scheduleSectionRef = useRef(null);

  // 1. Load pending arrivals (status = CONFIRMED) for selected operational window ('today' or 'next7Days')
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchScheduleBookings() {
      setScheduleLoading(true);
      setScheduleError('');
      try {
        const res = await getManagerBookingsApi({
          status: 'CONFIRMED',
          fromDate: scheduleRange.fromDate,
          toDate: scheduleRange.toDate,
          size: 50,
          sort: 'checkInDate,asc',
          signal,
        });
        if (!signal.aborted) {
          setScopeBookings(res?.items || []);
        }
      } catch (err) {
        if (!signal.aborted) {
          setScheduleError(getErrorMessage(err) || 'Không thể tải lịch đón/tiễn khách.');
        }
      } finally {
        if (!signal.aborted) setScheduleLoading(false);
      }
    }

    fetchScheduleBookings();
    return () => controller.abort();
  }, [scheduleRange, reload]);

  // 2. Load live snapshot (action queue, in-house guests, room status distribution)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchLiveSnapshot() {
      setLiveLoading(true);
      setLiveError('');
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
          getManagerBookingsApi({ status: 'PENDING_APPROVAL', size: 5, sort: 'createdAt,desc', signal }),
          getManagerBookingsApi({ status: 'PENDING_DEPOSIT', size: 1, sort: 'createdAt,asc', signal }),
          getManagerBookingsApi({ status: 'CONFIRMED', fromDate: todayStr, toDate: todayStr, size: 1, signal }),
          getManagerBookingsApi({ status: 'CHECKED_IN', size: 50, sort: 'checkOutDate,asc', signal }),
          getManagerRoomsApi({ status: 'ACTIVE', size: 1, signal }),
          getManagerRoomsApi({ status: 'LOCKED', size: 5, signal }),
          getManagerRoomsApi({ status: 'INACTIVE', size: 1, signal }),
        ]);

        if (signal.aborted) return;

        setPendingApproval({
          total: approvalRes.meta?.totalElements ?? approvalRes.items.length,
          items: approvalRes.items || [],
        });
        setPendingDepositCount(depositRes.meta?.totalElements ?? depositRes.items.length);
        setTodayArrivalsCount(todayConfirmRes.meta?.totalElements ?? todayConfirmRes.items.length);
        setInHouseBookings(inHouseRes.items || []);
        setRoomStats({
          active: activeRoomsRes.meta?.totalElements ?? 0,
          locked: lockedRoomsRes.meta?.totalElements ?? 0,
          inactive: inactiveRoomsRes.meta?.totalElements ?? 0,
          lockedRooms: lockedRoomsRes.items || [],
        });
      } catch (err) {
        if (!signal.aborted) {
          setLiveError(getErrorMessage(err) || 'Không thể tải dữ liệu điều hành trực tiếp.');
        }
      } finally {
        if (!signal.aborted) setLiveLoading(false);
      }
    }

    fetchLiveSnapshot();
    return () => controller.abort();
  }, [todayStr, reload]);

  const jumpToSchedule = useCallback((tabKey, scope = null) => {
    if (scope) setScheduleScope(scope);
    setScheduleTab(tabKey);
    scheduleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Derived operational schedule lists — strictly live & non-overlapping:
  // • Chờ nhận phòng: chỉ đơn CONFIRMED chưa check-in trong phạm vi đang chọn
  // • Chờ trả phòng: chỉ đơn CHECKED_IN dự kiến trả phòng trong phạm vi đang chọn
  // • Đang lưu trú: tất cả đơn CHECKED_IN hiện có mặt tại cơ sở
  const arrivals = useMemo(
    () =>
      scopeBookings
        .filter((b) => b.status === 'CONFIRMED')
        .sort((a, b) => (a.checkInDate || '').localeCompare(b.checkInDate || '')),
    [scopeBookings]
  );

  const departures = useMemo(
    () =>
      inHouseBookings
        .filter(
          (b) =>
            b.status === 'CHECKED_IN' &&
            b.checkOutDate &&
            b.checkOutDate >= scheduleRange.fromDate &&
            b.checkOutDate <= scheduleRange.toDate
        )
        .sort((a, b) => (a.checkOutDate || '').localeCompare(b.checkOutDate || '')),
    [inHouseBookings, scheduleRange]
  );

  const todayDeparturesCount = useMemo(
    () => inHouseBookings.filter((b) => b.checkOutDate === todayStr).length,
    [inHouseBookings, todayStr]
  );

  const isRefreshing = scheduleLoading || liveLoading;
  const scopeLabel =
    scheduleScope === 'today'
      ? `trong hôm nay (${formatDate(todayStr)})`
      : `trong 7 ngày tới (${displayPeriod(scheduleRange.fromDate, scheduleRange.toDate)})`;

  const rangeControls = (
    <div
      className="inline-flex rounded-full border border-[var(--color-border)] bg-white p-0.5"
      role="group"
      aria-label="Phạm vi lịch vận hành"
    >
      {[
        ['today', 'Hôm nay'],
        ['next7Days', '7 ngày tới'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setScheduleScope(value)}
          aria-pressed={scheduleScope === value}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            scheduleScope === value
              ? 'bg-[var(--color-ink)] text-white'
              : 'text-[var(--color-body)] hover:text-[var(--color-ink)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      {/* ── Header & Quick Actions ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
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
              Điều phối đón/tiễn khách, duyệt cọc và theo dõi tình trạng quỹ phòng hằng ngày.
            </p>
          </div>
        </div>

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
          <Link
            to="/manager/reports"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
          >
            <BarChart3 className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
            <span>Báo cáo</span>
          </Link>
          <button
            type="button"
            onClick={() => setReload((v) => v + 1)}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50"
            title="Tải lại dữ liệu điều hành"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden md:inline">Làm mới</span>
          </button>
        </div>
      </header>

      {/* ── Live Error Banner ── */}
      {liveError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {liveError}
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

      {/* ── Row 1: 4 Live Operational Summary Cards ── */}
      <section aria-labelledby="live-summary-heading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="live-summary-heading" className="sr-only">
          Tóm tắt vận hành hôm nay
        </h2>

        {/* Card 1: Chờ nhận phòng hôm nay */}
        <button
          type="button"
          onClick={() => jumpToSchedule('arrivals', 'today')}
          className={`${CARD_CLASS} group flex flex-col justify-between p-5 text-left transition hover:border-[var(--color-border-strong)]`}
        >
          <div className="flex w-full items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <LogIn className="h-5 w-5" aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-muted)]">Chờ nhận phòng hôm nay</p>
            {liveLoading ? (
              <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                {NUM_FORMAT.format(todayArrivalsCount)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Đơn đã xác nhận đến hôm nay</p>
          </div>
        </button>

        {/* Card 2: Trả phòng hôm nay */}
        <button
          type="button"
          onClick={() => jumpToSchedule('departures', 'today')}
          className={`${CARD_CLASS} group flex flex-col justify-between p-5 text-left transition hover:border-[var(--color-border-strong)]`}
        >
          <div className="flex w-full items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-muted)]">Trả phòng hôm nay</p>
            {liveLoading ? (
              <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                {NUM_FORMAT.format(todayDeparturesCount)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Khách đang ở đến hạn trả phòng</p>
          </div>
        </button>

        {/* Card 3: Đang lưu trú */}
        <button
          type="button"
          onClick={() => jumpToSchedule('inHouse')}
          className={`${CARD_CLASS} group flex flex-col justify-between p-5 text-left transition hover:border-[var(--color-border-strong)]`}
        >
          <div className="flex w-full items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-teal-soft)] text-[var(--color-teal)]">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-muted)]">Đang lưu trú</p>
            {liveLoading ? (
              <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                {NUM_FORMAT.format(inHouseBookings.length)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">Đoàn khách hiện có mặt tại cơ sở</p>
          </div>
        </button>

        {/* Card 4: Đơn chờ duyệt đặt cọc */}
        <Link
          to="/manager/bookings?status=PENDING_APPROVAL"
          className={`${CARD_CLASS} group flex flex-col justify-between p-5 transition ${
            pendingApproval.total > 0
              ? 'border-[var(--color-primary-disabled)] bg-[var(--color-primary-soft)]/35 hover:border-[var(--color-primary)]'
              : 'hover:border-[var(--color-border-strong)]'
          }`}
        >
          <div className="flex items-start justify-between">
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                pendingApproval.total > 0
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]'
              }`}
            >
              <BellRing className="h-5 w-5" aria-hidden="true" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-muted)]">Chờ duyệt đặt cọc</p>
            {liveLoading ? (
              <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <p
                className={`mt-1 text-3xl font-extrabold tracking-tight tabular-nums ${
                  pendingApproval.total > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'
                }`}
              >
                {NUM_FORMAT.format(pendingApproval.total)}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {pendingApproval.total > 0 ? 'Cần xác minh chuyển khoản ngay' : 'Chưa có đơn chờ duyệt'}
            </p>
          </div>
        </Link>
      </section>

      {/* ── Row 2: Operational Schedule (7 cols) + Action Queue & Room Health (5 cols) ── */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <OperationalScheduleCard
            activeTab={scheduleTab}
            onTabChange={setScheduleTab}
            arrivals={arrivals}
            departures={departures}
            inHouse={inHouseBookings}
            loading={scheduleTab === 'arrivals' ? scheduleLoading : liveLoading}
            error={scheduleError}
            todayStr={todayStr}
            appliedFilters={scheduleRange}
            homestay={homestay}
            sectionRef={scheduleSectionRef}
            rangeControls={rangeControls}
            scopeLabel={scopeLabel}
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
