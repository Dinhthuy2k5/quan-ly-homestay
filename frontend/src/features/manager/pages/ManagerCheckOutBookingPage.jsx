import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Landmark,
  LoaderCircle,
  LogOut,
  RefreshCw,
  X,
} from 'lucide-react';
import { checkOutManagerBookingApi, fetchManagerBookingDetailApi, getManagerBookingBalanceApi } from '../api';
import { formatDate, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import StatusBadge from '../../../components/ui/StatusBadge';

const CARD_CLASS = 'rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)]';

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

  const nights =
    booking?.checkInDate && booking?.checkOutDate
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
  const checkoutPaidBefore =
    balance?.paidAmount != null
      ? Number(balance.paidAmount)
      : (booking?.payments || []).reduce(
          (sum, p) =>
            p.status === 'CONFIRMED' && (p.paymentType === 'DEPOSIT' || p.paymentType === 'PAYMENT')
              ? sum + Number(p.amount || 0)
              : sum,
          0
        );

  const checkoutOutstandingAmount = Math.max(0, checkoutGrandTotalPrice - checkoutPaidBefore);

  // Thao tác phân loại dịch vụ hàng loạt
  const handleSelectAllUsed = () => {
    const next = {};
    registeredServices.forEach((s) => {
      next[s.id] = 'USED';
    });
    setServiceDecisions(next);
  };

  const handleSelectAllCancelled = () => {
    const next = {};
    registeredServices.forEach((s) => {
      next[s.id] = 'CANCELLED';
    });
    setServiceDecisions(next);
  };

  // Submit quyết toán trả phòng
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isCheckedIn) {
      setFormError('Đơn đặt phòng phải ở trạng thái Đang lưu trú để thực hiện trả phòng.');
      return;
    }
    if (isCheckOutExpired) {
      setFormError(
        `Đã quá hạn trả phòng (hạn trả phòng: ${CHECK_OUT_DEADLINE} ngày ${formatDate(booking.checkOutDate)}). Vui lòng đối soát lại.`
      );
      return;
    }
    if (isCheckOutTooEarly) {
      setFormError(`Chưa đến giờ nhận phòng (từ ${CHECK_IN_TIME} ngày ${formatDate(booking.checkInDate)}).`);
      return;
    }

    const unselected = registeredServices.filter((s) => !serviceDecisions[s.id]);
    if (unselected.length > 0) {
      setFormError(
        `Vui lòng chọn trạng thái cho ${unselected.length} dịch vụ: ${unselected.map((s) => s.serviceName || s.name).join(', ')}`
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
        referenceCode: checkoutPaymentMethod === 'BANK_TRANSFER' ? checkoutPaymentRef?.trim() || null : null,
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
      const successMsg =
        collected > 0
          ? `Đã hoàn tất trả phòng và thu ${formatVnd(collected)} tại quầy. Tổng đã thu: ${formatVnd(res?.totalCollected || 0)}.`
          : 'Đã hoàn tất trả phòng và quyết toán thành công.';

      navigate(`/manager/bookings/${booking.id}`, {
        state: { adjustSuccessToast: successMsg },
        replace: true,
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'CHECKOUT_NOT_ALLOWED') {
        setFormError('Không thể trả phòng: Đơn đặt phòng phải ở trạng thái Đang lưu trú.');
      } else if (code === 'SERVICE_USAGE_SELECTION_INCOMPLETE') {
        setFormError('Mọi dịch vụ đã đăng ký phải được chọn trạng thái Đã dùng hoặc Không dùng.');
      } else if (code === 'OUTSTANDING_BALANCE' || code === 'PAYMENT_AMOUNT_MISMATCH') {
        setFormError(
          `Số tiền thanh toán phải khớp chính xác với số dư còn thiếu (${formatVnd(checkoutOutstandingAmount)}).`
        );
      } else {
        setFormError(getErrorMessage(err) || 'Không thể thực hiện trả phòng. Vui lòng kiểm tra lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-16 animate-pulse">
        <div className="h-5 w-44 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-12 w-72 rounded-xl bg-[var(--color-surface-soft)]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-80 rounded-2xl bg-[var(--color-surface-soft)] lg:col-span-7" />
          <div className="h-96 rounded-2xl bg-[var(--color-surface-soft)] lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <div className="space-y-4 rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-6 text-[var(--color-danger)]">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-bold text-[var(--color-ink)]">Không thể mở trang trả phòng</h2>
          </div>
          <p className="text-sm text-[var(--color-body)]">{error || 'Không tìm thấy dữ liệu đơn đặt phòng.'}</p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-ink)] px-4 py-2 text-xs font-semibold text-white hover:bg-black"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tải lại</span>
            </button>
            <Link
              to="/manager/bookings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Danh sách đơn</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const classifiedCount = registeredServices.filter((s) => Boolean(serviceDecisions[s.id])).length;
  const unclassifiedCount = registeredServices.length - classifiedCount;
  const homestayName = booking.homestayName || homestayFromContext?.name || '';
  const contactDetails = [booking.contactPhone, booking.contactEmail].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/manager/bookings/${booking.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Chi tiết đơn #{booking.code}</span>
        </Link>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Page Title */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            Trả phòng & Quyết toán
          </h1>
          <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2.5 py-0.5 font-mono text-sm font-bold text-[var(--color-ink)]">
            #{booking.code}
          </span>
          <StatusBadge type="booking" status={booking.status} />
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          {homestayName ? `${homestayName} · ` : ''}
          Xác nhận dịch vụ đã sử dụng và thu phần công nợ còn lại khi khách trả phòng.
        </p>
      </header>

      {/* Cảnh báo điều kiện check-out (nếu có) */}
      {!isCheckedIn ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
          <div className="space-y-1">
            <p className="font-bold text-[var(--color-ink)]">Chưa thể thực hiện trả phòng</p>
            <p className="text-[var(--color-body)]">
              Chỉ các đơn đang ở trạng thái <strong>Đang lưu trú</strong> mới có thể làm thủ tục trả phòng và quyết toán.
            </p>
            <Link
              to={`/manager/bookings/${booking.id}`}
              className="inline-block pt-1 text-xs font-semibold text-[var(--color-ink)] underline"
            >
              Quay lại chi tiết đơn
            </Link>
          </div>
        </div>
      ) : isCheckOutExpired ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
          <div className="space-y-1">
            <p className="font-bold text-[var(--color-ink)]">Đã quá thời hạn trả phòng</p>
            <p className="text-[var(--color-body)]">
              Hạn trả phòng tiêu chuẩn là <strong>{CHECK_OUT_DEADLINE}</strong> ngày{' '}
              <strong>{formatDate(booking.checkOutDate)}</strong>. Vui lòng kiểm tra lại với quản trị viên.
            </p>
          </div>
        </div>
      ) : null}

      {/* Form 2 cột: Trái (Thông tin + Dịch vụ + Ghi chú) | Phải (Quyết toán) */}
      <form onSubmit={handleCheckOutSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (7 cột) */}
        <div className="space-y-5 lg:col-span-7">
          {/* 1. Thông tin lưu trú */}
          <section className={`${CARD_CLASS} p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-bold text-[var(--color-ink)]">Thông tin lưu trú</h2>
              <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-body)]">
                {nights} đêm
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-[var(--color-muted)]">Khách hàng</dt>
                <dd className="mt-1 font-semibold text-[var(--color-ink)]">{booking.contactName}</dd>
                {contactDetails && (
                  <dd className="mt-0.5 text-xs text-[var(--color-muted)]">{contactDetails}</dd>
                )}
              </div>

              <div>
                <dt className="text-xs font-medium text-[var(--color-muted)]">Số khách</dt>
                <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                  {booking.actualGuestCount || booking.guestCount || 1} khách
                  {booking.actualGuestCount ? (
                    <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">(thực tế)</span>
                  ) : null}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-[var(--color-muted)]">Thời gian lưu trú</dt>
                <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                  {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                </dd>
                <dd className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Nhận từ {CHECK_IN_TIME} · Trả trước {CHECK_OUT_DEADLINE}</span>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-[var(--color-muted)]">Phòng đã nhận</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {booking.rooms?.length > 0 ? (
                    booking.rooms.map((r) => (
                      <span
                        key={r.roomId || r.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]"
                      >
                        <span>{r.roomName || `Phòng #${r.roomId}`}</span>
                        {r.roomTypeName && (
                          <span className="font-normal text-[var(--color-muted)]">· {r.roomTypeName}</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* 2. Dịch vụ phát sinh */}
          <section className={`${CARD_CLASS} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--color-ink)]">Dịch vụ phát sinh</h2>
                  {registeredServices.length > 0 && (
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        unclassifiedCount === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'
                      }`}
                    >
                      ({classifiedCount}/{registeredServices.length})
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Chọn <strong>Đã dùng</strong> để tính vào hóa đơn hoặc <strong>Không dùng</strong> để bỏ qua.
                </p>
              </div>

              {registeredServices.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllUsed}
                    className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 font-semibold text-[var(--color-body)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] cursor-pointer"
                  >
                    Dùng tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllCancelled}
                    className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] cursor-pointer"
                  >
                    Hủy tất cả
                  </button>
                </div>
              )}
            </div>

            {registeredServices.length > 0 ? (
              <ul className="divide-y divide-[var(--color-border)]">
                {registeredServices.map((svc) => {
                  const decision = serviceDecisions[svc.id];
                  const isUsed = decision === 'USED';
                  const isCancelled = decision === 'CANCELLED';

                  return (
                    <li
                      key={svc.id}
                      className="flex flex-col gap-3 py-4 first:pt-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-sm font-bold text-[var(--color-ink)]">
                            {svc.serviceName || svc.name}
                          </h3>
                          <span className="text-xs text-[var(--color-muted)]">
                            {svc.roomName || `Phòng #${svc.roomId}`}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-muted)]">
                          {formatVnd(svc.unitPrice)} / {svc.unit || 'lần'} × {svc.quantity}
                          {svc.serviceDate ? ` · ${formatDate(svc.serviceDate)}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isCancelled
                              ? 'text-[var(--color-muted)] line-through'
                              : 'text-[var(--color-ink)]'
                          }`}
                        >
                          {formatVnd(svc.totalPrice)}
                        </span>

                        <div
                          className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-0.5"
                          role="group"
                          aria-label={`Trạng thái dịch vụ ${svc.serviceName || svc.name}`}
                        >
                          <button
                            type="button"
                            onClick={() => setServiceDecisions((prev) => ({ ...prev, [svc.id]: 'USED' }))}
                            aria-pressed={isUsed}
                            className={`inline-flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              isUsed
                                ? 'bg-[var(--color-ink)] text-white shadow-2xs'
                                : 'text-[var(--color-body)] hover:text-[var(--color-ink)]'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã dùng</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceDecisions((prev) => ({ ...prev, [svc.id]: 'CANCELLED' }))}
                            aria-pressed={isCancelled}
                            className={`inline-flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              isCancelled
                                ? 'bg-white text-[var(--color-danger)] shadow-2xs ring-1 ring-[var(--color-danger)]/25'
                                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Không dùng</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-[var(--color-surface-soft)] px-4 py-5 text-center text-xs text-[var(--color-muted)]">
                Không có dịch vụ phát sinh cần xác nhận.
              </p>
            )}

            {existingUsedServices.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-soft)] px-3.5 py-2.5 text-xs text-[var(--color-body)]">
                <span>
                  Dịch vụ đã xác nhận trước đó ({existingUsedServices.length})
                </span>
                <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                  {formatVnd(checkoutExistingUsedPrice)}
                </span>
              </div>
            )}
          </section>

          {/* 3. Ghi chú trả phòng */}
          <section className={`${CARD_CLASS} p-5 sm:p-6`}>
            <div className="flex items-center justify-between">
              <label htmlFor="checkOutNoteInput" className="text-sm font-bold text-[var(--color-ink)]">
                Ghi chú bàn giao
              </label>
              <span className="text-xs text-[var(--color-muted)]">Tùy chọn</span>
            </div>
            <textarea
              id="checkOutNoteInput"
              rows={3}
              maxLength={500}
              value={checkOutNote}
              onChange={(e) => setCheckOutNote(e.target.value)}
              placeholder="Ghi nhận tình trạng phòng, chìa khóa hoặc lưu ý sau lưu trú..."
              className="mt-2.5 w-full rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none transition focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--color-muted)]">
              {checkOutNote.length}/500
            </p>
          </section>
        </div>

        {/* CỘT PHẢI (5 cột): Bảng quyết toán */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className={`${CARD_CLASS} p-5 sm:p-6 space-y-5`}>
            <h2 className="border-b border-[var(--color-border)] pb-4 text-base font-bold text-[var(--color-ink)]">
              Quyết toán hóa đơn
            </h2>

            {/* Chi tiết các khoản */}
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-muted)]">Tiền phòng ({nights} đêm)</dt>
                <dd className="font-semibold tabular-nums text-[var(--color-ink)]">
                  {formatVnd(checkoutRoomTotalPrice)}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-muted)]">Dịch vụ đã dùng</dt>
                <dd className="font-semibold tabular-nums text-[var(--color-ink)]">
                  {checkoutServiceTotalPrice > 0 ? `+${formatVnd(checkoutServiceTotalPrice)}` : '0 ₫'}
                </dd>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <dt className="font-semibold text-[var(--color-ink)]">Tổng giá trị đơn</dt>
                <dd className="font-bold tabular-nums text-[var(--color-ink)]">
                  {formatVnd(checkoutGrandTotalPrice)}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-muted)]">Đã thanh toán trước</dt>
                <dd className="font-semibold tabular-nums text-[var(--color-success)]">
                  -{formatVnd(checkoutPaidBefore)}
                </dd>
              </div>
            </dl>

            {/* Điểm nhấn: Số tiền cần thu */}
            <div className="flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3.5">
              <div>
                <p className="text-xs font-semibold text-[var(--color-body)]">Còn phải thu</p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {checkoutOutstandingAmount > 0 ? 'Thanh toán tại quầy' : 'Đã hoàn tất thanh toán'}
                </p>
              </div>
              <p
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  checkoutOutstandingAmount > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-success)]'
                }`}
              >
                {formatVnd(checkoutOutstandingAmount)}
              </p>
            </div>

            {/* Phương thức thu tiền (chỉ hiện khi còn công nợ) */}
            {checkoutOutstandingAmount > 0 ? (
              <div className="space-y-3.5 border-t border-[var(--color-border)] pt-4">
                <div>
                  <span className="block text-xs font-semibold text-[var(--color-body)] mb-2">
                    Phương thức thu tiền
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('CASH')}
                      aria-pressed={checkoutPaymentMethod === 'CASH'}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        checkoutPaymentMethod === 'CASH'
                          ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                          : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      <Banknote className="h-4 w-4 shrink-0" />
                      <span>Tiền mặt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('BANK_TRANSFER')}
                      aria-pressed={checkoutPaymentMethod === 'BANK_TRANSFER'}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        checkoutPaymentMethod === 'BANK_TRANSFER'
                          ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                          : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      <Landmark className="h-4 w-4 shrink-0" />
                      <span>Chuyển khoản</span>
                    </button>
                  </div>
                </div>

                {checkoutPaymentMethod === 'BANK_TRANSFER' && (
                  <div>
                    <label
                      htmlFor="refCodeInput"
                      className="mb-1 block text-xs font-semibold text-[var(--color-body)]"
                    >
                      Mã giao dịch ngân hàng
                    </label>
                    <input
                      id="refCodeInput"
                      type="text"
                      maxLength={100}
                      value={checkoutPaymentRef}
                      onChange={(e) => setCheckoutPaymentRef(e.target.value)}
                      placeholder="VD: FT261118123456"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 font-mono text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="paymentNoteInput"
                    className="mb-1 block text-xs font-semibold text-[var(--color-body)]"
                  >
                    Ghi chú thu tiền
                  </label>
                  <input
                    id="paymentNoteInput"
                    type="text"
                    maxLength={255}
                    value={checkoutPaymentNote}
                    onChange={(e) => setCheckoutPaymentNote(e.target.value)}
                    placeholder="Thu phần còn lại khi trả phòng"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--color-success-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-success)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Không phát sinh khoản thu thêm tại quầy.</span>
              </div>
            )}

            {/* Lỗi submit */}
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] p-3 text-xs font-medium text-[var(--color-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Nút hành động chính */}
            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting || !canCheckOut || unclassifiedCount > 0}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>
                      {checkoutOutstandingAmount > 0
                        ? 'Xác nhận thu tiền & Trả phòng'
                        : 'Xác nhận trả phòng'}
                    </span>
                  </>
                )}
              </button>

              {canCheckOut && unclassifiedCount > 0 && (
                <p className="text-center text-xs text-[var(--color-muted)]">
                  Chọn trạng thái cho {unclassifiedCount} dịch vụ phát sinh để tiếp tục.
                </p>
              )}

              <Link
                to={`/manager/bookings/${booking.id}`}
                className="block w-full rounded-xl py-2 text-center text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
              >
                Quay lại chi tiết đơn
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
