import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Phone,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import { formatDate, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';

export const CARD_CLASS =
  'rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)]';

const NUM_FORMAT = new Intl.NumberFormat('vi-VN');
const DEC_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

// ─── Delta Badge (So sánh kỳ trước) ───────────────────────────────────────────

export function DeltaBadge({
  current,
  previous,
  mode = 'percent',
  invertTone = false,
  label = 'so với kỳ trước',
}) {
  if (previous === null || previous === undefined || current === null || current === undefined) {
    return null;
  }

  let diffText = '';
  let direction = 'flat'; // 'up' | 'down' | 'flat'
  let tooltip = '';

  if (mode === 'points') {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) {
      direction = 'flat';
      diffText = '0 đ%';
    } else {
      direction = diff > 0 ? 'up' : 'down';
      diffText = `${diff > 0 ? '+' : ''}${DEC_FORMAT.format(diff)} đ%`;
    }
    tooltip = `${diffText} ${label}`;
  } else if (mode === 'currency') {
    const diff = current - previous;
    if (diff === 0) {
      direction = 'flat';
      diffText = '0%';
      tooltip = `Không đổi ${label}`;
    } else if (previous <= 0) {
      // Khi kỳ trước âm (lỗ) hoặc bằng 0, tính % theo mẫu số âm sẽ bị đảo dấu/sai lệch.
      // Hiển thị trực tiếp mức chênh lệch VND thực tế để dễ hiểu và chính xác kế toán.
      direction = diff > 0 ? 'up' : 'down';
      diffText = `${diff > 0 ? '+' : '-'}${formatVnd(Math.abs(diff))}`;
      tooltip = `Kỳ trước: ${previous < 0 ? '-' : ''}${formatVnd(Math.abs(previous))} · Chênh lệch: ${diffText}`;
    } else {
      const pct = (diff / previous) * 100;
      direction = diff > 0 ? 'up' : 'down';
      diffText = `${pct > 0 ? '+' : ''}${DEC_FORMAT.format(pct)}%`;
      tooltip = `${diffText} ${label} (kỳ trước: ${formatVnd(previous)})`;
    }
  } else {
    const diff = current - previous;
    if (diff === 0) {
      direction = 'flat';
      diffText = '0%';
    } else if (previous === 0) {
      direction = diff > 0 ? 'up' : 'down';
      diffText = `${diff > 0 ? '+' : ''}${NUM_FORMAT.format(diff)}`;
    } else {
      // Dùng Math.abs(previous) làm mẫu số để không bao giờ bị đảo dấu khi kỳ trước < 0
      const pct = (diff / Math.abs(previous)) * 100;
      direction = diff > 0 ? 'up' : 'down';
      diffText = `${pct > 0 ? '+' : ''}${DEC_FORMAT.format(pct)}%`;
    }
    tooltip = `${diffText} ${label}`;
  }

  const isPositiveTone = invertTone ? direction === 'down' : direction === 'up';
  const isNegativeTone = invertTone ? direction === 'up' : direction === 'down';

  const toneClass = isPositiveTone
    ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
    : isNegativeTone
      ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
      : 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]';

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${toneClass}`}
      title={tooltip}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{diffText}</span>
    </span>
  );
}

// ─── Hero Card: Tỷ lệ khai thác + Chỉ số phái sinh ────────────────────────────

export function OccupancyHeroCard({
  report,
  prevReport,
  days,
  prevDays,
  loading,
  periodLabel,
}) {
  const activeRooms = report?.activeRooms ?? 0;
  const occupied = report?.occupiedRoomNights ?? 0;
  const bookingCount = report?.bookingCount ?? 0;
  const capacity = activeRooms * days;
  const occupancyRate = report && capacity > 0 ? (occupied / capacity) * 100 : 0;

  const prevCapacity = (prevReport?.activeRooms ?? 0) * (prevDays || 0);
  const prevRate =
    prevReport && prevCapacity > 0
      ? (prevReport.occupiedRoomNights / prevCapacity) * 100
      : prevReport
        ? 0
        : null;

  const vacantRoomNights = Math.max(0, capacity - occupied);
  const avgNightsPerBooking = bookingCount > 0 ? occupied / bookingCount : null;
  const avgRoomsPerDay = days > 0 ? occupied / days : 0;
  const noActiveRooms = Boolean(report && activeRooms === 0);

  // Health classification
  let health = {
    label: 'Ổn định',
    badgeClass: 'bg-[var(--color-teal-soft)] text-[var(--color-teal)]',
    strokeColor: 'var(--color-teal)',
    hint: 'Mức khai thác cân bằng trong kỳ.',
  };
  if (noActiveRooms) {
    health = {
      label: 'Chưa mở bán',
      badgeClass: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
      strokeColor: 'var(--color-border-strong)',
      hint: 'Chưa có phòng ở trạng thái ACTIVE.',
    };
  } else if (occupancyRate >= 70) {
    health = {
      label: 'Khai thác tốt',
      badgeClass: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
      strokeColor: 'var(--color-success)',
      hint: 'Công suất cao — cân nhắc tối ưu giá cuối tuần.',
    };
  } else if (occupancyRate < 30) {
    health = {
      label: 'Công suất thấp',
      badgeClass: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
      strokeColor: 'var(--color-primary)',
      hint: 'Còn nhiều đêm-phòng trống — nên đẩy khuyến mãi.',
    };
  }

  // Donut SVG geometry
  const size = 144;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(occupancyRate, 0), 100);
  const dashOffset = circumference - (clampedPct / 100) * circumference;

  return (
    <section
      aria-labelledby="hero-occupancy-heading"
      className={`${CARD_CLASS} flex flex-col justify-between p-5 sm:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Hiệu suất khai thác
          </span>
          <h2 id="hero-occupancy-heading" className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
            Tỷ lệ lấp đầy phòng
          </h2>
        </div>
        {!loading && report && (
          <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${health.badgeClass}`}>
            {health.label}
          </span>
        )}
      </div>

      {/* Main Donut + Summary */}
      <div className="my-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            role="img"
            aria-label={`Tỷ lệ lấp đầy ${DEC_FORMAT.format(occupancyRate)}%`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-surface-soft)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={loading ? 'var(--color-border)' : health.strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={loading ? circumference * 0.7 : dashOffset}
              style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.2, 0, 0, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {loading ? (
              <div className="h-7 w-16 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            ) : (
              <>
                <span className="text-2xl font-extrabold tracking-tight tabular-nums text-[var(--color-ink)]">
                  {noActiveRooms ? '—' : `${DEC_FORMAT.format(occupancyRate)}%`}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-[var(--color-muted)]">
                  {days} ngày
                </span>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="text-xs font-medium text-[var(--color-muted)]">Đêm-phòng bán được</span>
            {!loading && !noActiveRooms && prevRate !== null && (
              <DeltaBadge current={occupancyRate} previous={prevRate} mode="points" />
            )}
          </div>
          {loading ? (
            <div className="mx-auto h-7 w-32 animate-pulse rounded-lg bg-[var(--color-surface-soft)] sm:mx-0" />
          ) : (
            <p className="text-2xl font-bold tracking-tight tabular-nums text-[var(--color-ink)]">
              {NUM_FORMAT.format(occupied)}
              <span className="text-sm font-medium text-[var(--color-muted)]">
                {' '}/ {NUM_FORMAT.format(capacity)} đêm-phòng
              </span>
            </p>
          )}
          <p className="text-xs leading-relaxed text-[var(--color-muted)]">
            {loading ? 'Đang tính toán công suất phòng...' : health.hint}
          </p>
        </div>
      </div>

      {noActiveRooms ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
          Chưa có phòng nào ở trạng thái ACTIVE. Hãy mở bán phòng để bắt đầu tính tỷ lệ khai thác.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 border-t border-[var(--color-border)] pt-4">
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-3 py-2.5">
            <p className="text-[11px] font-medium text-[var(--color-muted)]">Còn trống</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-[var(--color-ink)]">
              {loading ? '—' : NUM_FORMAT.format(vacantRoomNights)}
            </p>
            <p className="text-[10px] text-[var(--color-muted)]">đêm-phòng</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-3 py-2.5">
            <p className="text-[11px] font-medium text-[var(--color-muted)]">TB lưu trú</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-[var(--color-ink)]">
              {loading ? '—' : avgNightsPerBooking !== null ? DEC_FORMAT.format(avgNightsPerBooking) : '—'}
            </p>
            <p className="text-[10px] text-[var(--color-muted)]">đêm / đơn</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-soft)] px-3 py-2.5">
            <p className="text-[11px] font-medium text-[var(--color-muted)]">TB mỗi đêm</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-[var(--color-ink)]">
              {loading ? '—' : DEC_FORMAT.format(avgRoomsPerDay)}
            </p>
            <p className="text-[10px] text-[var(--color-muted)]">phòng / đêm</p>
          </div>
        </div>
      )}

      {periodLabel && (
        <p className="mt-3 text-[11px] text-[var(--color-muted)]">
          Công suất tính theo {NUM_FORMAT.format(activeRooms)} phòng ACTIVE hiện tại · {periodLabel}
        </p>
      )}
    </section>
  );
}

// ─── Schedule Card: Lịch nhận / trả phòng & Đang lưu trú ──────────────────────

function canCheckInNow(booking, todayStr) {
  if (booking.status !== 'CONFIRMED' || !booking.checkInDate || !booking.checkOutDate) return false;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDateTime = `${todayStr}T${currentTime}`;
  return currentDateTime >= `${booking.checkInDate}T${CHECK_IN_TIME}` && todayStr < booking.checkOutDate;
}

function canCheckOutNow(booking, todayStr) {
  if (booking.status !== 'CHECKED_IN' || !booking.checkOutDate) return false;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDateTime = `${todayStr}T${currentTime}`;
  return currentDateTime <= `${booking.checkOutDate}T${CHECK_OUT_DEADLINE}`;
}

export function OperationalScheduleCard({
  activeTab,
  onTabChange,
  arrivals,
  departures,
  inHouse,
  loading,
  error,
  todayStr,
  appliedFilters,
  homestay,
  sectionRef,
  rangeControls = null,
  scopeLabel = 'trong kỳ đã chọn',
}) {
  const tabs = [
    { key: 'arrivals', label: 'Chờ nhận phòng', count: arrivals.length, icon: LogIn },
    { key: 'departures', label: 'Chờ trả phòng', count: departures.length, icon: LogOut },
    { key: 'inHouse', label: 'Đang lưu trú', count: inHouse.length, icon: Moon },
  ];

  const activeList =
    activeTab === 'arrivals' ? arrivals : activeTab === 'departures' ? departures : inHouse;
  const visibleItems = activeList.slice(0, 6);

  const viewAllHref =
    activeTab === 'arrivals'
      ? `/manager/bookings?status=CONFIRMED&fromDate=${appliedFilters.fromDate}&toDate=${appliedFilters.toDate}`
      : '/manager/bookings?status=CHECKED_IN';

  const emptyMessage =
    activeTab === 'arrivals'
      ? `Không có đơn chờ nhận phòng ${scopeLabel}.`
      : activeTab === 'departures'
        ? `Không có đơn chờ trả phòng ${scopeLabel}.`
        : 'Hiện chưa có đoàn khách nào đang lưu trú tại cơ sở.';

  return (
    <section
      ref={sectionRef}
      aria-labelledby="schedule-section-heading"
      className={`${CARD_CLASS} flex flex-col p-5 sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Điều phối đón & tiễn khách
          </span>
          <h2 id="schedule-section-heading" className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
            Lịch vận hành phòng
          </h2>
        </div>

        {rangeControls}
      </div>

      {/* Segmented tabs */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex flex-wrap rounded-xl bg-[var(--color-surface-soft)] p-1"
          role="tablist"
          aria-label="Danh sách lịch vận hành"
        >
          {tabs.map(({ key, label, count, icon: Icon }) => {
            const isSelected = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onTabChange(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isSelected
                  ? 'bg-white text-[var(--color-ink)] shadow-xs'
                  : 'text-[var(--color-body)] hover:text-[var(--color-ink)]'
                  }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${isSelected
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'bg-white/70 text-[var(--color-muted)]'
                    }`}
                >
                  {loading ? '·' : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-18 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]"
              />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 px-4 py-10 text-center">
            <CalendarClock className="h-8 w-8 text-[var(--color-muted)] opacity-60" aria-hidden="true" />
            <p className="mt-2.5 text-sm font-medium text-[var(--color-body)]">{emptyMessage}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Thử đổi kỳ báo cáo phía trên hoặc tạo đơn đặt phòng hộ khách mới.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
            {visibleItems.map((booking) => {
              const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
              const isTodayCheckIn = booking.checkInDate === todayStr;
              const isTodayCheckOut = booking.checkOutDate === todayStr;
              const showCheckInCta = canCheckInNow(booking, todayStr);
              const showCheckOutCta = canCheckOutNow(booking, todayStr);
              const rooms = booking.rooms || [];

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-[var(--color-surface-soft)]/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/manager/bookings/${booking.id}`}
                        className="font-mono text-xs font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
                      >
                        #{booking.code}
                      </Link>
                      <StatusBadge type="booking" status={booking.status} />
                      {activeTab === 'arrivals' && isTodayCheckIn && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Nhận hôm nay
                        </span>
                      )}
                      {activeTab === 'inHouse' && isTodayCheckIn && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Mới nhận hôm nay
                        </span>
                      )}
                      {(activeTab === 'departures' || activeTab === 'inHouse') && isTodayCheckOut && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Trả hôm nay
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-body)]">
                      <span className="font-semibold text-[var(--color-ink)]">{booking.contactName}</span>
                      {booking.contactPhone && (
                        <a
                          href={`tel:${booking.contactPhone}`}
                          className="inline-flex items-center gap-1 font-mono text-[var(--color-muted)] hover:text-[var(--color-primary)]"
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          <span>{booking.contactPhone}</span>
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        <span>{booking.guestCount} khách</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
                      <span className="font-medium text-[var(--color-body)]">
                        {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                      </span>
                      <span>({nights} đêm)</span>
                      {rooms.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          {rooms.slice(0, 2).map((room) => (
                            <span
                              key={room.roomId}
                              className="rounded-md border border-[var(--color-border)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink)]"
                            >
                              {room.roomName}
                            </span>
                          ))}
                          {rooms.length > 2 && (
                            <span className="text-[11px] font-semibold text-[var(--color-muted)]">
                              +{rooms.length - 2} phòng
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: Price + Contextual 1-click CTA */}
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                    <span className="text-xs font-bold tabular-nums text-[var(--color-ink)]">
                      {formatVnd(booking.roomTotalPrice)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {showCheckInCta && (
                        <Link
                          to={`/manager/bookings/${booking.id}`}
                          state={{ openCheckIn: true }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Nhận phòng</span>
                        </Link>
                      )}
                      {showCheckOutCta && (
                        <Link
                          to={`/manager/bookings/${booking.id}/check-out`}
                          state={{
                            booking: {
                              ...booking,
                              homestayId: booking.homestayId || homestay?.id,
                              homestayName: booking.homestayName || homestay?.name,
                            },
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-ink)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Trả phòng</span>
                        </Link>
                      )}
                      <Link
                        to={`/manager/bookings/${booking.id}`}
                        className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-body)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer link */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
        <span className="text-[var(--color-muted)]">
          {!loading && activeList.length > visibleItems.length
            ? `Hiển thị ${visibleItems.length}/${activeList.length} đơn gần nhất`
            : activeTab === 'arrivals'
              ? 'Đơn đã check-in sẽ tự động chuyển sang tab Đang lưu trú'
              : activeTab === 'departures'
                ? 'Chỉ hiển thị khách đang lưu trú có hạn trả phòng trong phạm vi chọn'
                : 'Dữ liệu khách đang có mặt tại thời điểm hiện tại'}
        </span>
        <Link
          to={viewAllHref}
          className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
        >
          <span>Xem tất cả đơn</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

// ─── Right Column: Cần xử lý ngay + Phân bổ quỹ phòng ─────────────────────────

export function ActionQueueAndRoomsPanel({
  pendingApproval,
  pendingDepositCount,
  todayArrivalsCount,
  todayDeparturesCount,
  roomStats,
  todayStr,
  loading,
}) {
  const approvalCount = pendingApproval.total;
  const totalUrgent =
    approvalCount + pendingDepositCount + todayArrivalsCount + todayDeparturesCount;

  const totalRooms = roomStats.active + roomStats.locked + roomStats.inactive;
  const activePct = totalRooms > 0 ? (roomStats.active / totalRooms) * 100 : 0;
  const lockedPct = totalRooms > 0 ? (roomStats.locked / totalRooms) * 100 : 0;
  const inactivePct = totalRooms > 0 ? (roomStats.inactive / totalRooms) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Action Queue */}
      <section aria-labelledby="action-queue-heading" className={`${CARD_CLASS} p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Ưu tiên hôm nay
            </span>
            <h2 id="action-queue-heading" className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
              Cần xử lý ngay
            </h2>
          </div>
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${approvalCount > 0
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]'
              }`}
          >
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
            ))}
          </div>
        ) : totalUrgent === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Không có đầu việc tồn đọng</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                Chưa có đơn chờ duyệt cọc hay lượt đón/tiễn gấp trong hôm nay.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {/* Urgent: Pending Approval */}
            <Link
              to="/manager/bookings?status=PENDING_APPROVAL"
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition ${approvalCount > 0
                ? 'border-[var(--color-primary-disabled)] bg-[var(--color-primary-soft)]/70 hover:bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-soft)]'
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 ${approvalCount > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                    }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--color-ink)]">Đơn chờ duyệt đặt cọc</p>
                  <p className="text-[11px] text-[var(--color-muted)]">Cần đối chiếu chuyển khoản</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${approvalCount > 0
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]'
                    }`}
                >
                  {approvalCount}
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Quick direct links to the latest pending approvals */}
            {pendingApproval.items.length > 0 && (
              <div className="space-y-1.5 pl-2">
                {pendingApproval.items.slice(0, 2).map((b) => (
                  <Link
                    key={b.id}
                    to={`/manager/bookings/${b.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs transition hover:border-[var(--color-primary)]"
                  >
                    <span className="truncate font-medium text-[var(--color-ink)]">
                      <span className="font-mono font-bold">#{b.code}</span> · {b.contactName}
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--color-primary)]">Duyệt →</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Pending deposit */}
            <Link
              to="/manager/bookings?status=PENDING_DEPOSIT"
              className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 transition hover:bg-[var(--color-surface-soft)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Clock className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--color-ink)]">Đơn chờ khách nộp cọc</p>
                  <p className="text-[11px] text-[var(--color-muted)]">Đang giữ phòng tạm thời</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded-full bg-[var(--color-warning-soft)] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[var(--color-warning)]">
                  {pendingDepositCount}
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Today's pending check-ins & check-outs */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <Link
                to={`/manager/bookings?status=CONFIRMED&fromDate=${todayStr}&toDate=${todayStr}`}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <div className="flex items-center justify-between">
                  <LogIn className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span className="text-lg font-extrabold tabular-nums text-[var(--color-ink)]">
                    {todayArrivalsCount}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-body)]">
                  Chờ nhận phòng hôm nay
                </p>
              </Link>

              <Link
                to="/manager/bookings?status=CHECKED_IN"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 p-3 transition hover:border-amber-300 hover:bg-amber-50/50"
              >
                <div className="flex items-center justify-between">
                  <LogOut className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span className="text-lg font-extrabold tabular-nums text-[var(--color-ink)]">
                    {todayDeparturesCount}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-body)]">
                  Trả phòng hôm nay
                </p>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 2. Room Status Distribution */}
      <section aria-labelledby="room-status-heading" className={`${CARD_CLASS} p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Quỹ phòng hiện tại
            </span>
            <h2 id="room-status-heading" className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
              Phân bổ trạng thái phòng
            </h2>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <BedDouble className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
              ))}
            </div>
          </div>
        ) : totalRooms === 0 ? (
          <p className="mt-4 rounded-xl bg-[var(--color-surface-soft)] p-4 text-center text-xs text-[var(--color-muted)]">
            Cơ sở chưa có phòng nào được tạo.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Stacked Bar */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-[var(--color-body)]">
                  {NUM_FORMAT.format(roomStats.active)}/{NUM_FORMAT.format(totalRooms)} phòng sẵn sàng nhận đặt
                </span>
                <span className="font-bold tabular-nums text-[var(--color-ink)]">
                  {DEC_FORMAT.format(activePct)}%
                </span>
              </div>
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]"
                role="img"
                aria-label={`Phân bổ phòng: ${roomStats.active} đang nhận đặt, ${roomStats.locked} tạm khóa, ${roomStats.inactive} ngừng khai thác`}
              >
                {activePct > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${activePct}%` }}
                  />
                )}
                {lockedPct > 0 && (
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${lockedPct}%` }}
                  />
                )}
                {inactivePct > 0 && (
                  <div
                    className="h-full bg-gray-300 transition-all"
                    style={{ width: `${inactivePct}%` }}
                  />
                )}
              </div>
            </div>

            {/* Legend tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span>Mở bán</span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(roomStats.active)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted)]">
                  <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                  <span>Tạm khóa</span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(roomStats.locked)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted)]">
                  <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
                  <span>Ngừng bán</span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
                  {NUM_FORMAT.format(roomStats.inactive)}
                </p>
              </div>
            </div>

            {/* Locked rooms callout */}
            {roomStats.lockedRooms.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>Phòng đang tạm khóa ({roomStats.locked})</span>
                </p>
                <ul className="space-y-1">
                  {roomStats.lockedRooms.slice(0, 3).map((room) => (
                    <li key={room.id}>
                      <Link
                        to={`/manager/rooms/${room.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs transition hover:bg-white"
                      >
                        <span className="truncate font-semibold text-[var(--color-ink)]">{room.name}</span>
                        <span className="truncate text-[11px] text-[var(--color-muted)]">
                          {room.statusReason || 'Chưa ghi lý do'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-3 text-xs">
          <Link
            to="/manager/rooms"
            className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
          >
            <span>Quản lý quỹ phòng</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
