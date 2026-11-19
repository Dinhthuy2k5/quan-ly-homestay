import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  DoorOpen,
  Info,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { checkOutManagerBookingApi, fetchManagerBookingDetailApi, getManagerBookingBalanceApi } from '../api';
import { formatDate, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import StatusBadge from '../../../components/ui/StatusBadge';

export default function ManagerCheckOutBookingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext();
  const homestayFromContext = outletContext?.homestay;

  const [booking, setBooking] = useState(() => location.state?.booking || null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Form states
  const [serviceDecisions, setServiceDecisions] = useState({});
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('CASH');
  const [checkoutPaymentRef, setCheckoutPaymentRef] = useState('');
  const [checkoutPaymentNote, setCheckoutPaymentNote] = useState('Thu phần còn lại khi trả phòng');
  const [checkOutNote, setCheckOutNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tải chi tiết booking và cân đối tài chính
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      fetchManagerBookingDetailApi(bookingId),
      getManagerBookingBalanceApi(bookingId).catch(() => null),
    ])
      .then(([bookingData, balanceData]) => {
        if (!active) return;
        setBooking(bookingData);
        if (balanceData) setBalance(balanceData);
      })
      .catch((err) => {
        if (!active) return;
        const code = err.response?.data?.error?.code;
        if (code === 'HOMESTAY_SCOPE_VIOLATION') {
          setError('Đơn đặt phòng này không thuộc cơ sở homestay được giao quản lý của bạn.');
        } else if (code === 'BOOKING_NOT_FOUND') {
          setError('Không tìm thấy đơn đặt phòng yêu cầu (hoặc đơn đã bị xóa).');
        } else {
          setError(getErrorMessage(err) || 'Không thể tải thông tin đơn đặt phòng.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);

  // Kiểm tra thời gian lưu trú và điều kiện check-out
  const now = new Date();
  const currentDateTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const checkInStartStr = booking?.checkInDate ? `${booking.checkInDate}T${CHECK_IN_TIME}` : null;
  const stayEndStr = booking?.checkOutDate ? `${booking.checkOutDate}T${CHECK_OUT_DEADLINE}` : null;

  const isCheckOutExpired = Boolean(stayEndStr && currentDateTimeStr > stayEndStr);
  const isCheckOutTooEarly = Boolean(checkInStartStr && currentDateTimeStr < checkInStartStr);
  const isCheckedIn = booking?.status === 'CHECKED_IN';
  const canCheckOut = Boolean(isCheckedIn && !isCheckOutExpired && !isCheckOutTooEarly);

  const nights = booking?.checkInDate && booking?.checkOutDate
    ? nightsBetween(booking.checkInDate, booking.checkOutDate)
    : 0;

  // Dịch vụ
  const registeredServices = useMemo(
    () => (booking?.services || []).filter((s) => s.status === 'REGISTERED'),
    [booking?.services]
  );
  const existingUsedServices = useMemo(
    () => (booking?.services || []).filter((s) => s.status === 'USED'),
    [booking?.services]
  );

  // Tính toán tài chính
  const checkoutRoomTotalPrice = Number(booking?.roomTotalPrice || 0);
  const checkoutExistingUsedPrice = existingUsedServices.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  const checkoutNewlyUsedPrice = registeredServices
    .filter((s) => serviceDecisions[s.id] === 'USED')
    .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  const checkoutServiceTotalPrice = checkoutExistingUsedPrice + checkoutNewlyUsedPrice;
  const checkoutGrandTotalPrice = checkoutRoomTotalPrice + checkoutServiceTotalPrice;

  // Tiền đã thanh toán trước (DEPOSIT và PAYMENT đã CONFIRMED)
  const checkoutPaidBefore = balance?.paidAmount != null
    ? Number(balance.paidAmount)
    : (booking?.payments || []).reduce((sum, p) =>
      p.status === 'CONFIRMED' && (p.paymentType === 'DEPOSIT' || p.paymentType === 'PAYMENT')
        ? sum + Number(p.amount || 0)
        : sum, 0);

  const checkoutOutstandingAmount = Math.max(0, checkoutGrandTotalPrice - checkoutPaidBefore);

  // Thao tác phân loại dịch vụ hàng loạt
  const handleSelectAllUsed = () => {
    const next = {};
    registeredServices.forEach((s) => { next[s.id] = 'USED'; });
    setServiceDecisions(next);
  };

  const handleSelectAllCancelled = () => {
    const next = {};
    registeredServices.forEach((s) => { next[s.id] = 'CANCELLED'; });
    setServiceDecisions(next);
  };

  // Submit quyết toán trả phòng
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isCheckedIn) {
      setFormError('Đơn đặt phòng phải ở trạng thái Đang lưu trú (CHECKED_IN) để thực hiện trả phòng.');
      return;
    }
    if (isCheckOutExpired) {
      setFormError(`Đã quá hạn trả phòng (hạn trả phòng: ${CHECK_OUT_DEADLINE} ngày ${formatDate(booking.checkOutDate)}). Vui lòng đối soát lại.`);
      return;
    }
    if (isCheckOutTooEarly) {
      setFormError(`Chưa đến giờ nhận phòng (từ ${CHECK_IN_TIME} ngày ${formatDate(booking.checkInDate)}).`);
      return;
    }

    // Kiểm tra đã phân loại đủ mọi dịch vụ REGISTERED
    const unselected = registeredServices.filter((s) => !serviceDecisions[s.id]);
    if (unselected.length > 0) {
      setFormError(
        `Vui lòng chọn trạng thái (Đã sử dụng hoặc Hủy) cho tất cả ${unselected.length} dịch vụ chưa xác nhận: ${unselected.map((s) => s.serviceName || s.name).join(', ')}`
      );
      return;
    }

    const usedBookingServiceIds = [];
    const unusedBookingServiceIds = [];
    for (const s of registeredServices) {
      const decision = serviceDecisions[s.id];
      if (decision === 'USED') {
        usedBookingServiceIds.push(s.id);
      } else if (decision === 'CANCELLED') {
        unusedBookingServiceIds.push(s.id);
      }
    }

    let paymentPayload = null;
    if (checkoutOutstandingAmount > 0) {
      paymentPayload = {
        amount: checkoutOutstandingAmount,
        method: checkoutPaymentMethod,
        referenceCode: checkoutPaymentMethod === 'BANK_TRANSFER' ? (checkoutPaymentRef?.trim() || null) : null,
        note: checkoutPaymentNote?.trim() || null,
      };
    }

    setSubmitting(true);
    try {
      const res = await checkOutManagerBookingApi(booking.id, {
        usedBookingServiceIds,
        unusedBookingServiceIds,
        payment: paymentPayload,
        note: checkOutNote?.trim() || null,
      });

      const collected = res?.collectedAtCheckout || 0;
      const successMsg = collected > 0
        ? `Đã hoàn tất trả phòng (Check-out) và thu ${formatVnd(collected)} tại quầy thành công! Tổng đã thu: ${formatVnd(res?.totalCollected || 0)}.`
        : 'Đã hoàn tất trả phòng (Check-out) và quyết toán thành công!';

      navigate(`/manager/bookings/${booking.id}`, {
        state: { adjustSuccessToast: successMsg },
        replace: true,
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'CHECKOUT_NOT_ALLOWED') {
        setFormError('Không thể trả phòng: Đơn đặt phòng phải ở trạng thái Đang lưu trú (CHECKED_IN).');
      } else if (code === 'SERVICE_USAGE_SELECTION_INCOMPLETE') {
        setFormError('Mọi dịch vụ đã đăng ký phải được phân loại đầy đủ (Đã dùng hoặc Hủy).');
      } else if (code === 'OUTSTANDING_BALANCE' || code === 'PAYMENT_AMOUNT_MISMATCH') {
        setFormError(`Số tiền thanh toán phải khớp chính xác với số dư còn thiếu (${formatVnd(checkoutOutstandingAmount)}).`);
      } else {
        setFormError(getErrorMessage(err) || 'Không thể thực hiện trả phòng. Vui lòng kiểm tra lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse pb-16">
        <div className="h-6 w-52 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-32 w-full rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 rounded-2xl bg-[var(--color-surface-soft)]" />
          <div className="lg:col-span-5 h-96 rounded-2xl bg-[var(--color-surface-soft)]" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <h2 className="text-base font-bold">Không thể mở trang trả phòng</h2>
          </div>
          <p className="text-sm text-rose-800">{error || 'Không tìm thấy dữ liệu đơn đặt phòng.'}</p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tải lại dữ liệu</span>
            </button>
            <Link
              to="/manager/bookings"
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách đơn</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unclassifiedCount = registeredServices.filter((s) => !serviceDecisions[s.id]).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to={`/manager/bookings/${booking.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại chi tiết đơn đặt phòng</span>
        </Link>
        <span className="text-xs text-[var(--color-muted)]">
          Cơ sở: <strong>{booking.homestayName || homestayFromContext?.name || 'Mai Châu Valley'}</strong>
        </span>
      </div>

      {/* Page Header Banner */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
            <LogOut className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">
                Trả phòng & Quyết toán (Check-out)
              </h1>
              <span className="font-mono text-base font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-0.5">
                #{booking.code}
              </span>
              <StatusBadge type="booking" status={booking.status} />
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
              Đối soát dịch vụ đã sử dụng, thu công nợ còn lại tại quầy và ghi nhận hoàn tất kỳ lưu trú của khách hàng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-2xs"
            title="Làm mới thông tin"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Cảnh báo trạng thái không hợp lệ nếu có */}
      {!isCheckedIn ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Không thể thực hiện trả phòng</h3>
            <p className="text-xs sm:text-sm text-amber-800">
              Đơn đặt phòng đang ở trạng thái <strong>{booking.status}</strong>. Chỉ những đơn đang ở trạng thái <strong>Đang lưu trú (CHECKED_IN)</strong> mới có thể tiến hành thủ tục trả phòng và quyết toán tài chính.
            </p>
            <div className="pt-2">
              <Link
                to={`/manager/bookings/${booking.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:no-underline"
              >
                Quay lại trang chi tiết đơn
              </Link>
            </div>
          </div>
        </div>
      ) : isCheckOutExpired ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Đã quá thời hạn trả phòng tiêu chuẩn</h3>
            <p className="text-xs sm:text-sm text-rose-800">
              Theo quy định, hạn trả phòng không được muộn hơn <strong>{CHECK_OUT_DEADLINE}</strong> ngày kết thúc lưu trú ({formatDate(booking.checkOutDate)}). Vui lòng liên hệ ban quản trị để được hỗ trợ đối soát bổ sung.
            </p>
          </div>
        </div>
      ) : null}

      {/* Form Check-out: Bố cục 2 cột cân đối */}
      <form onSubmit={handleCheckOutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7 cột): Thông tin khách, phòng, phân loại dịch vụ & ghi chú */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Thẻ thông tin khách và lưu trú */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[var(--color-ink)]">Thông tin lưu trú & Khách hàng</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {nights} đêm lưu trú
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Khách hàng liên hệ:</span>
                <p className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[var(--color-muted)]" />
                  <span>{booking.contactName}</span>
                </p>
                <p className="text-xs text-[var(--color-muted)] pl-5">{booking.contactPhone} • {booking.contactEmail}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Số lượng khách:</span>
                <p className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[var(--color-muted)]" />
                  <span>{booking.actualGuestCount || booking.guestCount || 1} khách thực tế</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Thời gian lưu trú:</span>
                <p className="font-semibold text-[var(--color-ink)]">
                  {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                </p>
                <p className="text-2xs text-[var(--color-muted)] flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Check-in: {CHECK_IN_TIME} • Check-out trước: {CHECK_OUT_DEADLINE}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Phòng đã nhận:</span>
                <div className="space-y-1">
                  {booking.rooms?.map((r) => (
                    <div key={r.roomId || r.id} className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <DoorOpen className="h-4 w-4 text-[var(--color-muted)]" />
                      <span>{r.roomName || `Phòng #${r.roomId}`}</span>
                      {r.roomTypeName && (
                        <span className="text-xs font-normal text-[var(--color-muted)]">({r.roomTypeName})</span>
                      )}
                    </div>
                  )) || <p className="text-[var(--color-muted)]">—</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Thẻ phân loại dịch vụ phát sinh */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--color-border)] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-bold text-[var(--color-ink)]">
                    Xác nhận dịch vụ phát sinh ({registeredServices.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Phân loại từng dịch vụ: <strong>Đã dùng</strong> (tính tiền vào hóa đơn) hoặc <strong>Hủy</strong> (không tính tiền).
                </p>
              </div>

              {registeredServices.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllUsed}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    ✓ Chọn tất cả đã dùng
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllCancelled}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-semibold hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    ✕ Chọn tất cả hủy
                  </button>
                </div>
              )}
            </div>

            {/* Trạng thái đếm phân loại */}
            {registeredServices.length > 0 && (
              <div className="flex items-center justify-between text-xs rounded-xl bg-[var(--color-surface-soft)] p-3 border border-[var(--color-border)] flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span>
                    Đã dùng:{' '}
                    <strong className="text-emerald-700">
                      {registeredServices.filter((s) => serviceDecisions[s.id] === 'USED').length}
                    </strong>
                  </span>
                  <span>
                    Hủy:{' '}
                    <strong className="text-rose-700">
                      {registeredServices.filter((s) => serviceDecisions[s.id] === 'CANCELLED').length}
                    </strong>
                  </span>
                </div>
                {unclassifiedCount > 0 ? (
                  <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Còn {unclassifiedCount} dịch vụ chưa chọn
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Tất cả dịch vụ đã được phân loại
                  </span>
                )}
              </div>
            )}

            {/* Danh sách các dịch vụ REGISTERED */}
            {registeredServices.length > 0 ? (
              <div className="space-y-3">
                {registeredServices.map((svc) => {
                  const decision = serviceDecisions[svc.id];
                  const isUnset = !decision;
                  const isUsed = decision === 'USED';
                  const isCancelled = decision === 'CANCELLED';

                  return (
                    <div
                      key={svc.id}
                      className={`rounded-xl border p-4 transition-all ${isUnset
                        ? 'border-amber-300 bg-amber-50/40 shadow-2xs ring-1 ring-amber-300/60'
                        : isUsed
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-rose-200 bg-rose-50/30'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-[var(--color-ink)]">
                              {svc.serviceName || svc.name}
                            </h4>
                            {isUnset && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                                Chưa chọn (Bắt buộc)
                              </span>
                            )}
                            {isUsed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Đã sử dụng (+{formatVnd(svc.totalPrice)})
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                ✕ Không dùng / Hủy (0 ₫)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--color-muted)] flex flex-wrap gap-x-3 gap-y-1">
                            <span>Phòng: <strong>{svc.roomName || `#${svc.roomId}`}</strong></span>
                            {svc.serviceDate && <span>Ngày: <strong>{formatDate(svc.serviceDate)}</strong></span>}
                            <span>Đơn giá: {formatVnd(svc.unitPrice)} / {svc.unit || 'lần'}</span>
                            <span>Số lượng: <strong>{svc.quantity}</strong></span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right font-extrabold text-base text-[var(--color-ink)]">
                          {formatVnd(svc.totalPrice)}
                        </div>
                      </div>

                      {/* Nút phân loại */}
                      <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-[var(--color-border)] text-xs flex-wrap">
                        <span className="text-[var(--color-muted)] text-2xs font-bold uppercase">
                          {isUnset ? 'Yêu cầu lựa chọn:' : 'Trạng thái ghi nhận:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setServiceDecisions((prev) => ({ ...prev, [svc.id]: 'USED' }))}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${isUsed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-[var(--color-border)] text-[var(--color-body)] hover:bg-emerald-50 hover:text-emerald-800'
                              }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã sử dụng (Tính tiền)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceDecisions((prev) => ({ ...prev, [svc.id]: 'CANCELLED' }))}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${isCancelled
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white border border-[var(--color-border)] text-[var(--color-body)] hover:bg-rose-50 hover:text-rose-800'
                              }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Không sử dụng (Hủy)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs sm:text-sm text-[var(--color-muted)] bg-[var(--color-surface-soft)]">
                Không có dịch vụ phát sinh nào đang chờ xác nhận sử dụng.
              </div>
            )}

            {/* Dịch vụ đã dùng trước đó nếu có */}
            {existingUsedServices.length > 0 && (
              <div className="text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Đã ghi nhận <strong>{existingUsedServices.length}</strong> dịch vụ hoàn tất trước đó với tổng tiền{' '}
                  <strong>{formatVnd(checkoutExistingUsedPrice)}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* 3. Ghi chú bàn giao trả phòng */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <label htmlFor="checkOutNoteInput" className="block text-sm font-bold text-[var(--color-ink)]">
              Ghi chú trả phòng (Tùy chọn)
            </label>
            <textarea
              id="checkOutNoteInput"
              rows={3}
              maxLength={500}
              value={checkOutNote}
              onChange={(e) => setCheckOutNote(e.target.value)}
              placeholder="VD: Khách đã bàn giao phòng và chìa khóa đầy đủ, thiết bị phòng nguyên vẹn, hài lòng về chuyến đi..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <p className="text-2xs text-[var(--color-muted)] text-right">{checkOutNote.length} / 500 ký tự</p>
          </div>
        </div>

        {/* CỘT PHẢI (5 cột): Bảng quyết toán tài chính & Xử lý thu tiền */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* Card Quyết toán tài chính */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3.5">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-[var(--color-ink)]">Bảng quyết toán tài chính</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="text-[var(--color-muted)]">Tiền phòng ({nights} đêm):</span>
                <span className="font-semibold text-[var(--color-ink)]">{formatVnd(checkoutRoomTotalPrice)}</span>
              </div>

              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="text-[var(--color-muted)]">Tiền dịch vụ (đã sử dụng):</span>
                <span className="font-semibold text-[var(--color-ink)]">+{formatVnd(checkoutServiceTotalPrice)}</span>
              </div>

              <div className="flex justify-between items-center text-[var(--color-ink)] font-bold border-t border-[var(--color-border)] pt-3 text-sm sm:text-base">
                <span>Tổng giá trị đơn:</span>
                <span>{formatVnd(checkoutGrandTotalPrice)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700">
                <span className="text-xs sm:text-sm font-medium">Đã thanh toán (Cọc ):</span>
                <span className="font-bold">-{formatVnd(checkoutPaidBefore)}</span>
              </div>

              <div className="flex justify-between items-center border-t-2 border-[var(--color-border)] pt-3.5 bg-indigo-50/50 rounded-xl p-3.5">
                <div>
                  <span className="block font-bold text-sm text-[var(--color-ink)]">
                    Còn phải thanh toán:
                  </span>
                  <span className="text-2xs text-[var(--color-muted)]">Thu tại quầy khi trả phòng</span>
                </div>
                <span
                  className={`text-lg sm:text-xl font-black ${checkoutOutstandingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                >
                  {checkoutOutstandingAmount > 0 ? formatVnd(checkoutOutstandingAmount) : '0 ₫ (Đã thanh toán đủ)'}
                </span>
              </div>
            </div>

            {/* Mục thu tiền nếu outstandingAmount > 0 */}
            {checkoutOutstandingAmount > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-950">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <span>Thu tiền quyết toán: {formatVnd(checkoutOutstandingAmount)}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1.5">
                    Phương thức thanh toán <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('CASH')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${checkoutPaymentMethod === 'CASH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-gray-700 border-[var(--color-border)] hover:bg-gray-50'
                        }`}
                    >
                      💵 Tiền mặt (CASH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('BANK_TRANSFER')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${checkoutPaymentMethod === 'BANK_TRANSFER'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-gray-700 border-[var(--color-border)] hover:bg-gray-50'
                        }`}
                    >
                      🏦 Chuyển khoản (BANK)
                    </button>
                  </div>
                </div>

                {checkoutPaymentMethod === 'BANK_TRANSFER' && (
                  <div>
                    <label htmlFor="refCodeInput" className="block text-xs font-semibold text-amber-950 mb-1">
                      Mã tham chiếu / Mã giao dịch ngân hàng
                    </label>
                    <input
                      id="refCodeInput"
                      type="text"
                      maxLength={100}
                      value={checkoutPaymentRef}
                      onChange={(e) => setCheckoutPaymentRef(e.target.value)}
                      placeholder="VD: FT261118123456"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-mono text-[var(--color-ink)] focus:border-amber-600 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="paymentNoteInput" className="block text-xs font-semibold text-amber-950 mb-1">
                    Ghi chú thu tiền
                  </label>
                  <input
                    id="paymentNoteInput"
                    type="text"
                    maxLength={255}
                    value={checkoutPaymentNote}
                    onChange={(e) => setCheckoutPaymentNote(e.target.value)}
                    placeholder="VD: Thu tiền mặt phần còn lại khi trả phòng"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:border-amber-600 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Đơn đặt phòng đã được thanh toán đầy đủ, không phát sinh khoản thu thêm tại quầy.</span>
              </div>
            )}

            {/* Lỗi submit nếu có */}
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 flex items-start gap-2 shadow-2xs">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {/* Các nút hành động */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !canCheckOut || unclassifiedCount > 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang hoàn tất quyết toán…</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Xác nhận Trả phòng & Quyết toán</span>
                  </>
                )}
              </button>

              <Link
                to={`/manager/bookings/${booking.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors text-center"
              >
                Hủy bỏ & Quay lại chi tiết đơn
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
