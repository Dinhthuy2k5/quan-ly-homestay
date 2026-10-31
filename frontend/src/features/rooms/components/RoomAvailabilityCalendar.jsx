import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, Search, Users } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchRoomAvailability } from '../api';
import { createCustomerBooking, searchAvailableRooms } from '../../homestays/api';
import { formatVnd, nightsBetween } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { useAuth } from '../../auth/context/useAuth';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const today = new Date();
today.setHours(0, 0, 0, 0);
const TODAY_KEY = toDateKey(today);
const RANGE_END = addDays(today, 366);

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function MonthCalendar({ month, checkIn, checkOut, unavailable, onSelect }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const title = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(month);

  return (
    <section aria-label={title} className="min-w-0 flex-1">
      <h3 className="mb-3 text-center font-semibold capitalize text-[var(--color-ink)]">{title}</h3>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-[var(--color-muted)]">
        {WEEKDAYS.map((day) => <span key={day} className="py-2">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} aria-hidden="true" className="h-10" />;
          const date = new Date(year, monthIndex, day);
          const key = toDateKey(date);
          const isUnavailable = unavailable.has(key);
          const isPast = key < TODAY_KEY;
          const isAfterRange = key >= toDateKey(RANGE_END);
          const isCheckout = Boolean(checkIn && !checkOut && key > checkIn);
          const conflictsInStay = isCheckout && [...unavailable].some((blockedDate) => blockedDate >= checkIn && blockedDate < key);
          const choosingCheckIn = !checkIn || Boolean(checkOut) || key <= checkIn;
          const disabled = isPast || isAfterRange || (choosingCheckIn && isUnavailable) || (checkIn && key > checkIn && conflictsInStay);
          const selected = key === checkIn || key === checkOut;
          const inRange = checkIn && checkOut && key > checkIn && key < checkOut;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              aria-label={`${day} ${title}${isUnavailable ? ', đã có khách lưu trú qua đêm' : ''}${key === checkIn ? ', ngày nhận phòng' : ''}${key === checkOut ? ', ngày trả phòng' : ''}`}
              aria-pressed={selected}
              title={isUnavailable ? 'Đã có khách lưu trú qua đêm; có thể chọn ngày này làm ngày trả phòng' : undefined}
              className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ink)] ${selected ? 'z-10 bg-[var(--color-ink)] font-semibold text-white' : inRange ? 'rounded-none bg-[var(--color-surface-soft)] text-[var(--color-ink)]' : 'text-[var(--color-ink)] hover:border hover:border-[var(--color-ink)]'} ${disabled ? 'cursor-not-allowed text-[var(--color-muted)] opacity-50' : ''} ${isUnavailable ? 'line-through decoration-1' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RoomAvailabilityCalendar({ room }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [guestCount, setGuestCount] = useState(Math.max(1, Number(searchParams.get('guests') || 1)));
  const [firstMonth, setFirstMonth] = useState(() => {
    const initialDate = fromDateKey(searchParams.get('checkIn'));
    return initialDate ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [unavailable, setUnavailable] = useState(new Set());
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingNote, setBookingNote] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    let active = true;
    fetchRoomAvailability(room.id, { fromDate: TODAY_KEY, toDate: toDateKey(RANGE_END) })
      .then((result) => { if (active) setUnavailable(new Set(result.unavailableDates)); })
      .catch((error) => { if (active) setCalendarError(getErrorMessage(error)); })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [room.id]);

  const lastNavigableMonth = useMemo(() => new Date(RANGE_END.getFullYear(), RANGE_END.getMonth() - 1, 1), []);
  const canGoBack = firstMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward = firstMonth < lastNavigableMonth;
  const nights = nightsBetween(checkIn, checkOut);

  const onSelectDate = (selectedDate) => {
    setDateError(''); setQuote(null); setQuoteError(''); setBookingResult(null); setBookingError('');
    if (!checkIn || checkOut || selectedDate <= checkIn) {
      setCheckIn(selectedDate); setCheckOut('');
      return;
    }
    const conflict = [...unavailable].some((bookedDate) => bookedDate >= checkIn && bookedDate < selectedDate);
    if (conflict) {
      setDateError('Khoảng lưu trú đi qua ngày đã có khách. Hãy chọn ngày nhận hoặc trả phòng khác.');
      setCheckIn(selectedDate); setCheckOut('');
      return;
    }
    setCheckOut(selectedDate);
  };

  const checkRoom = async () => {
    setDateError(''); setQuoteError(''); setQuote(null); setBookingResult(null); setBookingError('');
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setDateError('Chọn ngày nhận phòng và ngày trả phòng để kiểm tra.');
      return;
    }
    if (guestCount > Number(room.maxGuests || 0)) {
      setDateError(`Phòng này tối đa ${room.maxGuests} khách.`);
      return;
    }
    setQuoteLoading(true);
    try {
      let page = 0;
      let totalPages = 1;
      let found = null;
      while (!found && page < totalPages) {
        const result = await searchAvailableRooms({
          homestayId: room.homestay?.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount,
          page,
          size: 100,
        });
        found = result.items.find((item) => Number(item.roomId) === Number(room.id)) ?? null;
        totalPages = result.totalPages ?? totalPages;
        page += 1;
      }
      if (found) setQuote(found); else setQuoteError('Phòng không còn trống trong khoảng ngày đã chọn. Hãy thử ngày khác.');
    } catch (error) { setQuoteError(getErrorMessage(error)); }
    finally { setQuoteLoading(false); }
  };

  const createBooking = async () => {
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    if (user?.role !== 'CUSTOMER') return;
    setBookingLoading(true);
    setBookingError('');
    try {
      const result = await createCustomerBooking({
        homestayId: room.homestay?.id,
        roomIds: [room.id],
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestCount,
        note: bookingNote,
      });
      setBookingResult(result);
      setQuote(null);
    } catch (error) {
      setBookingError(getErrorMessage(error));
    } finally {
      setBookingLoading(false);
    }
  };

  const clearDates = () => { setCheckIn(''); setCheckOut(''); setQuote(null); setQuoteError(''); setDateError(''); setBookingResult(null); setBookingError(''); };
  const months = [firstMonth, addMonths(firstMonth, 1)];

  return (
    <section id="availability" className="scroll-mt-28 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)] sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Chọn ngày lưu trú</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Ngày gạch ngang đã có khách lưu trú qua đêm.</p>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={!canGoBack} onClick={() => setFirstMonth((month) => addMonths(month, -1))} aria-label="Hai tháng trước" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-surface-soft)] disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" disabled={!canGoForward} onClick={() => setFirstMonth((month) => addMonths(month, 1))} aria-label="Hai tháng tiếp theo" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-surface-soft)] disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
          {calendarLoading ? <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-[var(--color-muted)]"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải lịch phòng…</div> : calendarError ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{calendarError}</p> : <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">{months.map((month) => <MonthCalendar key={`${month.getFullYear()}-${month.getMonth()}`} month={month} checkIn={checkIn} checkOut={checkOut} unavailable={unavailable} onSelect={onSelectDate} />)}</div>}
          <div className="mt-4 flex min-h-7 items-center justify-between gap-3 text-sm">
            <p className={dateError ? 'text-rose-700' : 'text-[var(--color-muted)]'} role={dateError ? 'alert' : undefined}>{dateError || (checkIn && checkOut ? `${nights} đêm · ${checkIn} – ${checkOut}` : 'Chọn ngày nhận phòng, sau đó chọn ngày trả phòng.')}</p>
            {(checkIn || checkOut) && <button type="button" onClick={clearDates} className="shrink-0 font-semibold underline underline-offset-4">Xóa ngày</button>}
          </div>
        </div>

        <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 sm:p-5">
          <p className="flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums text-[var(--color-ink)]">{quote ? formatVnd(quote.roomTotalPrice) : room.nightlyPrice == null ? 'Chưa thiết lập giá' : formatVnd(room.nightlyPrice)}</span><span className="text-sm text-[var(--color-muted)]">{quote ? `cho ${nights} đêm` : '/ đêm'}</span></p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{quote ? 'Giá đã tính theo từng đêm và quy tắc giá đang áp dụng.' : 'Giá cuối cùng có thể thay đổi theo ngày lưu trú.'}</p>
          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-t-lg border border-[var(--color-border)]">
            <div className="p-3"><p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Nhận phòng</p><p className="mt-1 text-sm">{checkIn || 'Thêm ngày'}</p></div>
            <div className="border-l border-[var(--color-border)] p-3"><p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Trả phòng</p><p className="mt-1 text-sm">{checkOut || 'Thêm ngày'}</p></div>
          </div>
          <label className="block rounded-b-lg border border-t-0 border-[var(--color-border)] p-3">
            <span className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Khách</span>
            <span className="mt-1 flex items-center gap-2"><Users aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" /><input type="number" min="1" max={room.maxGuests || 255} value={guestCount} onChange={(event) => { setGuestCount(Math.max(1, Number(event.target.value) || 1)); setQuote(null); setBookingResult(null); setBookingError(''); }} aria-label="Số khách" className="w-full bg-transparent text-sm focus-visible:outline-none" /><span className="shrink-0 text-xs text-[var(--color-muted)]">tối đa {room.maxGuests}</span></span>
          </label>
          <button type="button" disabled={quoteLoading || calendarLoading} onClick={checkRoom} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-55">{quoteLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Đang kiểm tra…</> : <><Search className="h-4 w-4" />Kiểm tra phòng và giá</>}</button>
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">Nhận phòng từ {CHECK_IN_TIME} · Trả phòng đến hết {CHECK_OUT_DEADLINE}</p>
          {quoteError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{quoteError}</p>}
          {quote && <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4"><p className="font-semibold text-emerald-700">Phòng còn trống</p>{quote.quotedNights.map((night) => <div key={night.stayDate} className="flex justify-between gap-4 text-sm text-[var(--color-body)]"><span>{night.stayDate}</span><span className="font-medium tabular-nums">{formatVnd(night.nightlyPrice)}</span></div>)}<p className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-semibold"><span>Tổng cộng</span><span>{formatVnd(quote.roomTotalPrice)}</span></p></div>}
          {quote && user?.role === 'CUSTOMER' && <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <label htmlFor="booking-note" className="mb-1 block text-xs font-semibold text-[var(--color-body)]">Ghi chú cho homestay (không bắt buộc)</label>
            <textarea id="booking-note" maxLength={500} value={bookingNote} onChange={(event) => setBookingNote(event.target.value)} rows={2} className="w-full resize-y rounded-lg border border-[var(--color-border)] p-2 text-sm" placeholder="Ví dụ: dự kiến nhận phòng sau 11:00" />
            <button type="button" onClick={createBooking} disabled={bookingLoading} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-55">{bookingLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Đang tạo booking…</> : 'Đặt phòng'}</button>
          </div>}
          {quote && !isAuthenticated && <button type="button" onClick={createBooking} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 font-semibold text-white hover:bg-[var(--color-primary-hover)]">Đăng nhập để đặt phòng</button>}
          {quote && isAuthenticated && user?.role !== 'CUSTOMER' && <p className="mt-4 rounded-lg bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-muted)]">Chỉ tài khoản khách hàng mới có thể đặt phòng trực tuyến.</p>}
          {bookingError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{bookingError}</p>}
          {bookingResult && <div role="status" className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">Đã tạo yêu cầu đặt phòng</p>
            <p>Mã booking: <strong>{bookingResult.code}</strong></p>
            <p>Tiền phòng: <strong>{formatVnd(bookingResult.roomTotalPrice)}</strong></p>
            <p>Tiền cọc cần thanh toán: <strong>{formatVnd(bookingResult.depositAmount)}</strong></p>
            <p>Giữ phòng đến: <strong>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(bookingResult.holdExpiresAt))}</strong></p>
            {bookingResult.paymentInstruction?.bankAccountNumber ? <div className="border-t border-emerald-200 pt-2"><p>{bookingResult.paymentInstruction.bankName}</p><p>Số tài khoản: <strong>{bookingResult.paymentInstruction.bankAccountNumber}</strong></p><p>Chủ tài khoản: {bookingResult.paymentInstruction.bankAccountHolder}</p><p>Nội dung: <strong>{bookingResult.paymentInstruction.transferContent}</strong></p></div> : <p className="border-t border-emerald-200 pt-2">Thông tin tài khoản nhận cọc chưa được cấu hình. Vui lòng liên hệ homestay.</p>}
            <Link
              to="/customer/bookings"
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <span>Xem danh sách chuyến đi của bạn</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>}
        </aside>
      </div>
    </section>
  );
}

export default RoomAvailabilityCalendar;
