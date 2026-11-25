import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Filter,
  Moon,
  PieChart,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getManagerReportOccupancyApi, getManagerRoomTypesApi } from '../api';
import { CARD_CLASS, DeltaBadge } from './OperationsWidgets';
import StatusBadge from '../../../components/ui/StatusBadge';
import {
  displayPeriod,
  getPresetRange,
  getPreviousPeriod,
  inclusiveDays,
} from '../utils/dateRange';
import { formatDate, formatVnd } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const DEC_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Rút gọn ngày YYYY-MM-DD thành dd/MM để gắn nhãn trục X trên biểu đồ cột. */
function shortDayMonth(isoDate) {
  if (!isoDate || isoDate.length < 10) return '';
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
}

/** Kiểm tra ngày YYYY-MM-DD có rơi vào cuối tuần (Thứ 7 / Chủ nhật) hay không. */
function isWeekend(isoDate) {
  if (!isoDate) return false;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * Giao diện tab "Công suất phòng" (API-REPORT-MGR-03).
 * Gồm: 4 thẻ tổng hợp công suất, biểu đồ xu hướng theo ngày và bảng công suất từng phòng.
 */
export default function OccupancyReportView({ reloadKey = 0, onLoadingChange }) {
  const initialRange = useMemo(() => getPresetRange('month'), []);

  // --- NHÓM STATE BỘ LỌC ---
  const [filters, setFilters] = useState({ ...initialRange, roomTypeId: '' });
  const [appliedFilters, setAppliedFilters] = useState({ ...initialRange, roomTypeId: '' });
  const [preset, setPreset] = useState('month');

  // --- NHÓM STATE DỮ LIỆU API ---
  const [roomTypes, setRoomTypes] = useState([]);   // Danh sách loại phòng cho dropdown lọc
  const [report, setReport] = useState(null);       // Dữ liệu công suất kỳ đang xem
  const [prevReport, setPrevReport] = useState(null); // Dữ liệu kỳ liền trước để so sánh tăng/giảm
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localReload, setLocalReload] = useState(0);

  // Kỳ liền trước cùng số ngày
  const prevRange = useMemo(
    () => getPreviousPeriod(appliedFilters.fromDate, appliedFilters.toDate),
    [appliedFilters.fromDate, appliedFilters.toDate]
  );

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // 1. Tải danh sách loại phòng của homestay (chạy 1 lần khi mở tab)
  useEffect(() => {
    let active = true;
    getManagerRoomTypesApi()
      .then((list) => {
        if (active) setRoomTypes(Array.isArray(list) ? list : []);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);

  // 2. Gọi API-REPORT-MGR-03 song song cho kỳ hiện tại và kỳ liền trước
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchOccupancy() {
      setLoading(true);
      setError('');

      try {
        const currentPromise = getManagerReportOccupancyApi({
          fromDate: appliedFilters.fromDate,
          toDate: appliedFilters.toDate,
          roomTypeId: appliedFilters.roomTypeId || undefined,
          signal,
        });

        const prevPromise = prevRange
          ? getManagerReportOccupancyApi({
            fromDate: prevRange.fromDate,
            toDate: prevRange.toDate,
            roomTypeId: appliedFilters.roomTypeId || undefined,
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
          setError(getErrorMessage(requestError) || 'Không thể tải báo cáo công suất phòng.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    fetchOccupancy();
    return () => controller.abort();
  }, [appliedFilters, prevRange, reloadKey, localReload]);

  // --- XỬ LÝ BỘ LỌC ---
  const choosePreset = (nextPreset) => {
    const nextRange = getPresetRange(nextPreset);
    setFilters((prev) => ({ ...prev, ...nextRange }));
    setAppliedFilters((prev) => ({ ...prev, ...nextRange }));
    setPreset(nextPreset);
    setError('');
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name === 'fromDate' || name === 'toDate') {
      setPreset('custom');
    } else {
      setAppliedFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

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

  const clearRoomTypeFilter = () => {
    setFilters((prev) => ({ ...prev, roomTypeId: '' }));
    setAppliedFilters((prev) => ({ ...prev, roomTypeId: '' }));
  };

  // --- BIẾN DẪN XUẤT HIỂN THỊ ---
  const effectiveFrom = report?.fromDate || appliedFilters.fromDate;
  const effectiveTo = report?.toDate || appliedFilters.toDate;
  const periodLabel = displayPeriod(effectiveFrom, effectiveTo);
  const prevPeriodLabel = prevRange ? displayPeriod(prevRange.fromDate, prevRange.toDate) : '';
  const days = report?.periodDays ?? inclusiveDays(effectiveFrom, effectiveTo);

  const activeRooms = report?.activeRooms ?? 0;
  const capacityRoomNights = report?.capacityRoomNights ?? 0;
  const occupiedRoomNights = report?.occupiedRoomNights ?? 0;
  const vacantRoomNights = report?.vacantRoomNights ?? 0;
  const occupancyRate = report?.occupancyRate ?? 0;

  const byRoom = report?.byRoom || [];
  const byDate = report?.byDate || [];
  const totalBookedRoomValue = useMemo(
    () => byRoom.reduce((sum, item) => sum + Number(item.bookedRoomValue || 0), 0),
    [byRoom]
  );

  // Tìm ngày có công suất cao nhất trong kỳ để hiển thị tóm tắt nhanh
  const peakDay = useMemo(() => {
    if (byDate.length === 0) return null;
    return byDate.reduce(
      (best, cur) => (cur.occupiedRooms > (best?.occupiedRooms ?? -1) ? cur : best),
      null
    );
  }, [byDate]);

  const selectedRoomTypeName = roomTypes.find(
    (rt) => String(rt.id) === String(appliedFilters.roomTypeId)
  )?.name;

  return (
    <div className="space-y-5">
      {/* ── Thanh bộ lọc kỳ & loại phòng ── */}
      <section className={`${CARD_CLASS} px-4 py-3.5 sm:px-5`} aria-label="Bộ lọc báo cáo công suất phòng">
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

        {/* Lọc loại phòng & thông tin kỳ đối chiếu */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Loại phòng:</span>
            </span>

            <label className="inline-flex items-center">
              <span className="sr-only">Chọn loại phòng</span>
              <select
                name="roomTypeId"
                value={filters.roomTypeId}
                onChange={updateField}
                disabled={loading}
                className="min-h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
              >
                <option value="">Tất cả loại phòng</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </label>

            {appliedFilters.roomTypeId && (
              <button
                type="button"
                onClick={clearRoomTypeFilter}
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

      {/* ── Banner lỗi ── */}
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

      {/* ── Hàng 1: 4 thẻ chỉ số công suất chính ── */}
      <section aria-labelledby="occupancy-kpi-heading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="occupancy-kpi-heading" className="sr-only">
          Chỉ số công suất phòng theo kỳ
        </h2>

        {/* Thẻ 1: Tỷ lệ lấp đầy */}
        <article className={`${CARD_CLASS} flex flex-col justify-between border-[var(--color-border-strong)] p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">
                Tỷ lệ lấp đầy{selectedRoomTypeName ? ` · ${selectedRoomTypeName}` : ''}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 text-2xl xl:text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {activeRooms > 0 ? `${DEC_FORMAT.format(occupancyRate)}%` : '—'}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-ink)] text-white">
              <PieChart className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)]">So với kỳ trước</span>
            {!loading && activeRooms > 0 && prevReport && (
              <DeltaBadge current={occupancyRate} previous={prevReport.occupancyRate} mode="points" />
            )}
          </div>
        </article>

        {/* Thẻ 2: Đêm-phòng đã khai thác */}
        <article className={`${CARD_CLASS} flex flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Đêm-phòng khai thác</p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 text-2xl xl:text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(occupiedRoomNights)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
            <span className="text-[var(--color-muted)] tabular-nums">
              Trên {NUM_FORMAT.format(capacityRoomNights)} đêm khả dụng
            </span>
            {!loading && (
              <DeltaBadge current={occupiedRoomNights} previous={prevReport?.occupiedRoomNights} />
            )}
          </div>
        </article>

        {/* Thẻ 3: Đêm-phòng còn trống */}
        <article className={`${CARD_CLASS} flex flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Đêm-phòng còn trống</p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 text-2xl xl:text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(vacantRoomNights)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-body)]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)] tabular-nums">
            <span>
              Tỷ lệ trống: {capacityRoomNights > 0 ? `${DEC_FORMAT.format((vacantRoomNights / capacityRoomNights) * 100)}%` : '—'}
            </span>
          </div>
        </article>

        {/* Thẻ 4: Quỹ phòng mở bán */}
        <article className={`${CARD_CLASS} flex flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-muted)]">Phòng tính công suất</p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
              ) : (
                <p className="mt-1.5 text-2xl xl:text-3xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(activeRooms)}
                </p>
              )}
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <BedDouble className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)]">
            <span>Phòng ACTIVE × {days} ngày</span>
          </div>
        </article>
      </section>

      {/* ── Hàng 2: Biểu đồ xu hướng công suất theo từng ngày ── */}
      <section aria-labelledby="occupancy-daily-heading" className={`${CARD_CLASS} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 id="occupancy-daily-heading" className="text-base font-bold text-[var(--color-ink)]">
              Biến động công suất theo từng ngày
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Rê chuột vào từng cột để xem số phòng có khách và tỷ lệ lấp đầy của đêm tương ứng. Cột viền đậm là cuối tuần (T7/CN).
            </p>
          </div>
          {!loading && peakDay && peakDay.occupiedRooms > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <span>
                Cao điểm: {formatDate(peakDay.stayDate)} ({peakDay.occupiedRooms}/{peakDay.activeRooms} phòng · {DEC_FORMAT.format(peakDay.occupancyRate)}%)
              </span>
            </span>
          )}
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
          ) : activeRooms === 0 ? (
            <p className="rounded-xl bg-[var(--color-warning-soft)] px-4 py-6 text-center text-xs font-medium text-[var(--color-warning)]">
              Chưa có phòng nào ở trạng thái ACTIVE thuộc bộ lọc hiện tại để tính công suất theo ngày.
            </p>
          ) : byDate.length === 0 ? (
            <p className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-8 text-center text-xs text-[var(--color-muted)]">
              Không có dữ liệu ngày lưu trú trong kỳ này.
            </p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div
                className="flex h-48 items-end gap-1.5 pt-6"
                style={{ minWidth: byDate.length > 24 ? `${byDate.length * 26}px` : '100%' }}
                role="img"
                aria-label={`Biểu đồ công suất theo ngày từ ${periodLabel}`}
              >
                {byDate.map((item) => {
                  const pct = Math.min(Math.max(item.occupancyRate || 0, 0), 100);
                  const weekend = isWeekend(item.stayDate);
                  // Đảm bảo cột có giá trị > 0 luôn có chiều cao tối thiểu dễ nhìn
                  const heightStyle = item.occupiedRooms > 0 ? `${Math.max(pct, 6)}%` : '2px';

                  return (
                    <div
                      key={item.stayDate}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                      title={`${formatDate(item.stayDate)}: ${item.occupiedRooms}/${item.activeRooms} phòng (${DEC_FORMAT.format(item.occupancyRate)}%)`}
                    >
                      {/* Nhãn phần trăm gọn khi di chuột vào cột */}
                      <span className="pointer-events-none mb-1 text-[10px] font-bold tabular-nums text-[var(--color-ink)] opacity-0 transition-opacity group-hover:opacity-100">
                        {DEC_FORMAT.format(item.occupancyRate)}%
                      </span>

                      <div className="flex h-36 w-full max-w-8 items-end justify-center rounded-t-md bg-[var(--color-surface-soft)]/70">
                        <div
                          className={`w-full rounded-t-md transition-all ${item.occupiedRooms === 0
                              ? 'bg-[var(--color-border)]'
                              : weekend
                                ? 'bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)]'
                                : 'bg-[var(--color-ink)] group-hover:bg-black'
                            }`}
                          style={{ height: heightStyle }}
                        />
                      </div>

                      <span
                        className={`mt-1.5 text-[10px] tabular-nums ${weekend
                            ? 'font-bold text-[var(--color-primary)]'
                            : 'text-[var(--color-muted)]'
                          }`}
                      >
                        {shortDayMonth(item.stayDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Hàng 3: Bảng công suất chi tiết từng phòng ── */}
      <section aria-labelledby="occupancy-room-heading" className={`${CARD_CLASS} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 id="occupancy-room-heading" className="text-base font-bold text-[var(--color-ink)]">
              Công suất chi tiết theo từng phòng
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Sắp xếp theo số đêm khai thác giảm dần — giúp nhận diện phòng đắt khách và phòng còn trống nhiều.
            </p>
          </div>
          <Link
            to="/manager/rooms"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <span>Quản lý phòng</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
              ))}
            </div>
          ) : byRoom.length === 0 ? (
            <p className="rounded-xl bg-[var(--color-surface-soft)] px-4 py-8 text-center text-xs text-[var(--color-muted)]">
              Không có phòng nào thuộc bộ lọc hiện tại.
            </p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="py-2.5 pr-3">Phòng</th>
                  <th className="py-2.5 px-2">Loại phòng</th>
                  <th className="py-2.5 px-2 text-right">Đã khai thác</th>
                  <th className="py-2.5 px-2 text-right">Còn trống</th>
                  <th className="py-2.5 px-3 w-44">Tỷ lệ lấp đầy</th>
                  <th className="py-2.5 pl-2 text-right">Giá trị phòng theo đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {byRoom.map((room) => {
                  const pct = Math.min(Math.max(room.occupancyRate || 0, 0), 100);
                  const isNonActive = room.roomStatus !== 'ACTIVE';

                  return (
                    <tr key={room.roomId} className="transition-colors hover:bg-[var(--color-surface-soft)]/70">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/manager/rooms/${room.roomId}`}
                            className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
                          >
                            {room.roomName}
                          </Link>
                          {isNonActive && <StatusBadge type="room" status={room.roomStatus} />}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[var(--color-body)]">{room.roomTypeName}</td>
                      <td className="py-3 px-2 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                        {NUM_FORMAT.format(room.occupiedNights)}
                        {room.capacityNights > 0 && (
                          <span className="font-normal text-[var(--color-muted)]">
                            /{NUM_FORMAT.format(room.capacityNights)} đêm
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-[var(--color-muted)]">
                        {room.capacityNights > 0 ? `${NUM_FORMAT.format(room.vacantNights)} đêm` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-ink)] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-11 text-right font-bold tabular-nums text-[var(--color-ink)]">
                            {room.capacityNights > 0 ? `${DEC_FORMAT.format(room.occupancyRate)}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-2 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                        {formatVnd(room.bookedRoomValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] font-bold text-[var(--color-ink)]">
                  <td className="pt-3 pr-3" colSpan={2}>
                    Tổng cộng ({byRoom.length} phòng)
                  </td>
                  <td className="pt-3 px-2 text-right tabular-nums">
                    {NUM_FORMAT.format(occupiedRoomNights)}/{NUM_FORMAT.format(capacityRoomNights)} đêm
                  </td>
                  <td className="pt-3 px-2 text-right tabular-nums">
                    {NUM_FORMAT.format(vacantRoomNights)} đêm
                  </td>
                  <td className="pt-3 px-3 text-right tabular-nums">
                    {activeRooms > 0 ? `${DEC_FORMAT.format(occupancyRate)}%` : '—'}
                  </td>
                  <td className="pt-3 pl-2 text-right tabular-nums">
                    {formatVnd(totalBookedRoomValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <p className="mt-3 text-[11px] text-[var(--color-muted)]">
          Lưu ý: &ldquo;Giá trị phòng theo đơn&rdquo; là tổng tiền phòng ghi nhận theo từng đêm lưu trú trong kỳ (chưa trừ hủy/hoàn), tách biệt với &ldquo;Tiền thực thu ròng&rdquo; ở tab Tài chính cơ sở.
        </p>
      </section>
    </div>
  );
}
