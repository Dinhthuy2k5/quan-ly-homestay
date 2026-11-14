import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, CalendarDays, CheckCircle2, LoaderCircle, Users } from 'lucide-react';
import { createCustomerBooking, fetchHomestayDetail, searchAvailableRooms } from '../api';
import BookingServiceSelector from '../components/BookingServiceSelector';
import { useAuth } from '../../auth/context/useAuth';
import OptionalNotePicker from '../../../components/ui/OptionalNotePicker';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import { formatDate, formatVnd, nightsBetween } from '../../../lib/format';

export default function MultiRoomBookingPage() {
  const { homestayId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const checkInDate = searchParams.get('checkIn') || '';
  const checkOutDate = searchParams.get('checkOut') || '';
  const initialGuestCount = Math.max(1, Number(searchParams.get('guests') || 2));
  const requestedRoomIds = useMemo(() => (searchParams.get('rooms') || '').split(',').filter(Boolean), [searchParams]);

  const [homestay, setHomestay] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [guestCount, setGuestCount] = useState(initialGuestCount);
  const [note, setNote] = useState('');
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || requestedRoomIds.length === 0) {
      setLoadError('Thiếu ngày lưu trú hoặc danh sách phòng. Hãy chọn phòng lại từ trang homestay.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all([
      fetchHomestayDetail(homestayId),
      searchAvailableRooms({ homestayId, checkInDate, checkOutDate, guestCount: 1, page: 0, size: 100 }),
    ])
      .then(([detail, availability]) => {
        if (!active) return;
        setHomestay(detail);
        setRooms((availability.items || []).filter((room) => requestedRoomIds.includes(String(room.roomId ?? room.id))));
        setLoadError('');
      })
      .catch((error) => { if (active) setLoadError(getErrorMessage(error) || 'Không tải được thông tin đặt phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [homestayId, checkInDate, checkOutDate, requestedRoomIds]);

  const totalCapacity = rooms.reduce((sum, room) => sum + Number(room.maxGuests || 0), 0);
  const totalRoomPrice = rooms.reduce((sum, room) => sum + Number(room.roomTotalPrice || 0), 0);
  const depositAmount = Math.ceil((totalRoomPrice * 30) / 100);
  const nights = checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : 0;
  const roomIds = rooms.map((room) => Number(room.roomId ?? room.id));
  const backParams = new URLSearchParams({ checkIn: checkInDate, checkOut: checkOutDate, guests: String(guestCount), rooms: requestedRoomIds.join(',') });

  const handleBooking = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (user?.role !== 'CUSTOMER') {
      setSubmitError('Chỉ tài khoản khách hàng mới có thể đặt phòng trực tuyến.');
      return;
    }
    if (rooms.length !== requestedRoomIds.length) {
      setSubmitError('Một hoặc nhiều phòng đã chọn không còn trống trong khoảng ngày này. Vui lòng quay lại chọn phòng.');
      return;
    }
    if (guestCount > totalCapacity) {
      setSubmitError(`Số khách vượt quá sức chứa ${totalCapacity} người của các phòng đã chọn.`);
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createCustomerBooking({ homestayId, roomIds, checkInDate, checkOutDate, guestCount, note, services });
      navigate(`/customer/bookings/${booking.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error) || 'Không thể tạo đơn đặt phòng. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  if (loading) return <div role="status" className="mx-auto max-w-5xl py-20 text-center text-[var(--color-muted)]"><LoaderCircle className="mx-auto h-7 w-7 animate-spin" /><p className="mt-3">Đang tải thông tin đặt phòng…</p></div>;
  if (loadError) return <div className="mx-auto max-w-3xl py-8"><ErrorBanner message={loadError} /><Link to={`/homestays/${homestayId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] hover:underline"><ArrowLeft className="h-4 w-4" />Quay lại homestay để chọn phòng</Link></div>;
  if (rooms.length === 0 || !homestay) return <div className="mx-auto max-w-3xl py-8"><EmptyState title="Phòng đã chọn không còn trống" description="Tình trạng phòng có thể đã thay đổi. Hãy quay lại homestay để kiểm tra và chọn phòng khác." /><Link to={`/homestays/${homestayId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] hover:underline"><ArrowLeft className="h-4 w-4" />Quay lại chọn phòng</Link></div>;

  return (
    <article className="mx-auto max-w-6xl space-y-7 pb-10">
      <Link to={`/homestays/${homestayId}?${backParams.toString()}#rooms-title`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-body)] hover:text-[var(--color-ink)]"><ArrowLeft className="h-4 w-4" />Quay lại chọn phòng</Link>
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]"><Building2 className="h-4 w-4" />{homestay.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">Hoàn tất đặt {rooms.length} phòng</h1>
        <p className="text-sm text-[var(--color-body)]">Xem lại lịch lưu trú, khách và dịch vụ trước khi gửi yêu cầu.</p>
      </header>

      <form onSubmit={handleBooking} className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.8fr)] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Thông tin lưu trú</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"><p className="text-xs font-medium text-[var(--color-muted)]">Nhận phòng</p><p className="mt-1 flex items-center gap-2 font-semibold text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" />{formatDate(checkInDate)}</p><p className="mt-1 text-xs text-[var(--color-muted)]">Từ {CHECK_IN_TIME}</p></div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"><p className="text-xs font-medium text-[var(--color-muted)]">Trả phòng</p><p className="mt-1 flex items-center gap-2 font-semibold text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" />{formatDate(checkOutDate)}</p><p className="mt-1 text-xs text-[var(--color-muted)]">Đến hết {CHECK_OUT_DEADLINE}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4">
              <span className="text-sm text-[var(--color-body)]">{nights} đêm · {rooms.length} phòng · Sức chứa tối đa {totalCapacity} khách</span>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]"><Users className="h-4 w-4 text-[var(--color-muted)]" /><span>Số khách</span><input aria-label="Số lượng khách" type="number" min="1" max={totalCapacity} required value={guestCount} onChange={(event) => setGuestCount(Math.max(1, Number(event.target.value) || 1))} className="w-20 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 focus:border-[var(--color-ink)] focus:outline-none" /></label>
            </div>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Phòng đã chọn</h2>
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {rooms.map((room) => <li key={room.roomId ?? room.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold text-[var(--color-ink)]">{room.roomName || room.name}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{room.roomTypeName || 'Phòng nghỉ'} · Tối đa {room.maxGuests} khách</p></div><p className="shrink-0 text-right text-sm font-semibold text-[var(--color-ink)]">{formatVnd(room.roomTotalPrice)}<span className="block text-xs font-normal text-[var(--color-muted)]">/{nights} đêm</span></p></li>)}
            </ul>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-7">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-ink)]">Dịch vụ tùy chọn</h2>
            <BookingServiceSelector homestayId={homestay.id} rooms={rooms.map((room) => ({ id: room.roomId ?? room.id, name: room.roomName || room.name }))} checkInDate={checkInDate} checkOutDate={checkOutDate} value={services} onChange={setServices} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Ghi chú cho homestay</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Không bắt buộc</p>
            <div className="mt-4"><OptionalNotePicker label="" value={note} onChange={setNote} maxLength={500} placeholder="Nhập ghi chú cho homestay" options={['Tôi dự kiến đến muộn', 'Đoàn có trẻ nhỏ', 'Vui lòng liên hệ để xác nhận giờ đến']} /></div>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Tóm tắt giá</h2>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--color-body)]"><span>Tiền phòng · {rooms.length} phòng · {nights} đêm</span><strong className="text-[var(--color-ink)]">{formatVnd(totalRoomPrice)}</strong></div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">Dịch vụ chỉ được tính phí khi homestay xác nhận đã sử dụng.</p>
            <div className="mt-4 border-t border-[var(--color-border)] pt-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[var(--color-ink)]">Tiền đặt cọc (30%)</span><strong className="text-lg text-[var(--color-ink)]">{formatVnd(depositAmount)}</strong></div><p className="mt-1 text-xs text-[var(--color-muted)]">Chuyển khoản sau khi gửi yêu cầu đặt phòng.</p></div>
            {submitError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</div>}
            <button type="submit" disabled={submitting || guestCount > totalCapacity} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-55">{submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" />Đang gửi yêu cầu…</> : <><CheckCircle2 className="h-4 w-4" />{isAuthenticated ? `Đặt ${rooms.length} phòng` : 'Đăng nhập để đặt phòng'}</>}</button>
          </section>
        </aside>
      </form>
    </article>
  );
}
