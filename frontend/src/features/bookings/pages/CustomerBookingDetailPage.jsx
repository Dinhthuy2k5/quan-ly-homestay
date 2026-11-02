import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  CreditCard,
  DoorOpen,
  Edit3,
  FileText,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { fetchCustomerBookingDetailApi } from '../api';
import CustomerAdjustBookingModal from '../components/CustomerAdjustBookingModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';

export default function CustomerBookingDetailPage() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  const [todayTimestamp] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [nowTimestamp] = useState(() => Date.now());

  const canAdjust = useMemo(() => {
    if (!booking) return false;
    if (booking.status === 'PENDING_DEPOSIT') {
      if (!booking.holdExpiresAt) return true;
      return new Date(booking.holdExpiresAt).getTime() > nowTimestamp;
    }
    if (booking.status === 'CONFIRMED') {
      if (!booking.checkInDate) return false;
      const [year, month, day] = booking.checkInDate.split('-').map(Number);
      const checkInTime = new Date(year, month - 1, day).getTime();
      const diffDays = Math.round((checkInTime - todayTimestamp) / (1000 * 60 * 60 * 24));
      return diffDays >= 3;
    }
    return false;
  }, [booking, nowTimestamp, todayTimestamp]);

  useEffect(() => {
    let active = true;

    fetchCustomerBookingDetailApi(bookingId)
      .then((data) => {
        if (!active) return;
        setBooking(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err) || 'Không thể tải thông tin chi tiết đơn đặt phòng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? '' : curr));
    }, 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-6 animate-pulse">
        <div className="h-4 w-48 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-10 w-80 rounded-xl bg-[var(--color-surface-soft)]" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-[var(--color-surface-soft)]" />
            <div className="h-64 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
          <div className="h-80 rounded-2xl bg-[var(--color-surface-soft)]" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-ink)]">
          {error || 'Không tìm thấy đơn đặt phòng'}
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Đơn đặt phòng không tồn tại hoặc bạn không có quyền truy cập thông tin này.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/customer/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Danh sách chuyến đi</span>
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Thử lại</span>
          </button>
        </div>
      </div>
    );
  }

  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const isPendingDeposit = booking.status === 'PENDING_DEPOSIT';
  const instruction = booking.paymentInstruction;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4 sm:py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="hover:text-[var(--color-ink)] transition-colors">
          Khám phá
        </Link>
        <span aria-hidden="true">›</span>
        <Link to="/customer/bookings" className="hover:text-[var(--color-ink)] transition-colors">
          Chuyến đi của tôi
        </Link>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-[var(--color-ink)]">#{booking.code}</span>
      </nav>

      {/* Header chi tiết đơn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Đơn đặt #{booking.code}
            </h1>
            <StatusBadge type="booking" status={booking.status} />
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Thời điểm khởi tạo đơn: {formatDateTime(booking.createdAt)}
          </p>
        </div>

        {canAdjust && (
          <button
            type="button"
            onClick={() => {
              setAdjustSuccessMsg('');
              setAdjustModalOpen(true);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-ink)] shadow-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
          >
            <Edit3 className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Điều chỉnh đặt phòng</span>
          </button>
        )}
      </div>

      {/* Thông báo điều chỉnh thành công */}
      {adjustSuccessMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="font-medium">{adjustSuccessMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setAdjustSuccessMsg('')}
            className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-950 transition-colors"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cảnh báo giữ phòng khi chờ đặt cọc */}
      {isPendingDeposit && booking.holdExpiresAt && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-900 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
          <div className="flex-1 text-sm">
            <h3 className="font-bold text-amber-950">Thời hạn giữ chỗ phòng</h3>
            <p className="mt-1">
              Phòng đang được tạm giữ cho bạn đến{' '}
              <strong className="font-bold underline decoration-amber-400">
                {formatDateTime(booking.holdExpiresAt)}
              </strong>
              . Quý khách vui lòng chuyển khoản đặt cọc{' '}
              <strong>{formatVnd(booking.depositAmount)}</strong> trước thời hạn trên để hoàn tất việc giữ chỗ.
            </p>
          </div>
        </div>
      )}

      {/* Grid nội dung chính và sidebar tóm tắt */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Cột trái: Chi tiết chính */}
        <div className="space-y-6">
          {/* Card cơ sở homestay */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-[var(--shadow-1)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Cơ sở Homestay
              </span>
              {booking.homestayId && (
                <Link
                  to={`/homestays/${booking.homestayId}`}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <span>Xem trang homestay</span>
                  <Compass className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              <Link
                to={`/homestays/${booking.homestayId}`}
                className="text-lg font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2"
              >
                <Building className="h-5 w-5 text-[var(--color-primary)]" />
                <span>{booking.homestayName || `Homestay #${booking.homestayId}`}</span>
              </Link>

              {booking.homestayAddress && (
                <p className="flex items-start gap-1.5 text-sm text-[var(--color-body)]">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--color-muted)] mt-0.5" />
                  <span>{booking.homestayAddress}</span>
                </p>
              )}
            </div>

            {/* Thông tin thời gian nhận/trả phòng */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-[var(--color-surface-soft)] p-4 border border-[var(--color-border)]">
              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Nhận phòng (Check-in)</span>
                <p className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>{formatDate(booking.checkInDate)}</span>
                </p>
                <p className="text-xs text-[var(--color-muted)]">Từ {CHECK_IN_TIME}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Trả phòng (Check-out)</span>
                <p className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>{formatDate(booking.checkOutDate)}</span>
                </p>
                <p className="text-xs text-[var(--color-muted)]">Trước {CHECK_OUT_DEADLINE}</p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs text-[var(--color-body)]">
                <span>
                  Thời lượng:{' '}
                  <strong className="font-semibold text-[var(--color-ink)]">{nights} đêm</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                  <span>
                    Số khách đăng ký:{' '}
                    <strong className="font-semibold text-[var(--color-ink)]">
                      {booking.guestCount} người
                    </strong>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Card danh sách phòng & bảng giá từng đêm */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-[var(--shadow-1)] space-y-5">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h2 className="text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Phòng đã đặt & Chi tiết giá theo từng đêm</span>
              </h2>
            </div>

            <div className="space-y-5">
              {booking.rooms?.map((room) => {
                const roomTotal = room.nights?.reduce((sum, n) => sum + (n.nightlyPrice || 0), 0) || 0;
                return (
                  <div
                    key={room.roomId}
                    className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    {/* Header phòng */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                          {room.coverImageUrl ? (
                            <img
                              src={fileUrl(room.coverImageUrl)}
                              alt={room.roomName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">
                              <DoorOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/rooms/${room.roomId}`}
                            className="text-base font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {room.roomName}
                          </Link>
                          <p className="text-xs text-[var(--color-muted)]">Mã phòng: #{room.roomId}</p>
                        </div>
                      </div>

                      <div className="text-right self-end sm:self-auto">
                        <span className="text-xs text-[var(--color-muted)]">Tổng tiền phòng này:</span>
                        <p className="text-sm font-bold text-[var(--color-ink)]">
                          {formatVnd(roomTotal)}
                        </p>
                      </div>
                    </div>

                    {/* Danh sách đêm nghỉ */}
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                        Bảng giá theo từng ngày lưu trú:
                      </p>
                      <div className="divide-y divide-[var(--color-border)]/50 rounded-lg border border-[var(--color-border)] bg-white">
                        {room.nights?.map((night) => (
                          <div
                            key={night.stayDate}
                            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                              <span className="font-medium text-[var(--color-ink)]">
                                Đêm {formatDate(night.stayDate)}
                              </span>
                              {night.appliedRuleName && (
                                <span className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted)] border border-[var(--color-border)]">
                                  <Tag className="h-3 w-3" />
                                  <span>{night.appliedRuleName}</span>
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[var(--color-ink)] font-mono">
                              {formatVnd(night.nightlyPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hướng dẫn chuyển khoản ngân hàng nếu PENDING_DEPOSIT */}
          {isPendingDeposit && instruction && (
            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-white p-5 sm:p-6 shadow-[var(--shadow-1)] space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-ink)]">
                    Thông tin thanh toán chuyển khoản cọc
                  </h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Chuyển khoản chính xác số tiền và nội dung để hệ thống đối soát nhanh chóng
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-muted)]">Ngân hàng</span>
                  <span className="font-bold text-[var(--color-ink)]">{instruction.bankName}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs text-[var(--color-muted)]">Số tài khoản</span>
                    <p className="text-base font-mono font-bold tracking-wider text-[var(--color-ink)]">
                      {instruction.bankAccountNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(instruction.bankAccountNumber, 'bank-acc')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] shadow-xs transition-colors"
                  >
                    {copiedKey === 'bank-acc' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-[var(--color-border)] pt-2.5">
                  <span className="text-xs text-[var(--color-muted)]">Chủ tài khoản</span>
                  <span className="font-semibold uppercase text-[var(--color-ink)]">
                    {instruction.bankAccountHolder}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-[var(--color-border)] pt-2.5">
                  <div>
                    <span className="text-xs text-[var(--color-muted)]">Số tiền cọc cần chuyển</span>
                    <p className="text-base font-bold text-[var(--color-primary)]">
                      {formatVnd(booking.depositAmount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(booking.depositAmount, 'deposit-amount')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] shadow-xs transition-colors"
                  >
                    {copiedKey === 'deposit-amount' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-900">
                        Nội dung chuyển khoản (bắt buộc):
                      </p>
                      <p className="font-mono font-bold text-emerald-950 text-sm mt-0.5 truncate">
                        {instruction.transferContent}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(instruction.transferContent, 'transfer-content')}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      {copiedKey === 'transfer-content' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Sau khi bạn chuyển khoản, ban quản lý cơ sở sẽ kiểm tra và xác nhận đơn đặt phòng.
                </span>
              </div>
            </div>
          )}

          {/* Ghi chú của khách nếu có */}
          {booking.note && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-[var(--shadow-1)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Ghi chú của bạn cho Homestay</span>
              </h3>
              <p className="text-sm text-[var(--color-body)] rounded-xl bg-[var(--color-surface-soft)] p-3 border border-[var(--color-border)] whitespace-pre-wrap">
                {booking.note}
              </p>
            </div>
          )}
        </div>

        {/* Cột phải: Tổng kết thanh toán & Hỗ trợ */}
        <div className="space-y-6">
          {/* Card bảng kê thanh toán */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-[var(--shadow-1)] space-y-4 lg:sticky lg:top-24">
            <h3 className="text-base font-bold text-[var(--color-ink)] border-b border-[var(--color-border)] pb-3">
              Chi tiết tài chính
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span>Tổng tiền phòng:</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {formatVnd(booking.roomTotalPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span>Tiền cọc quy định:</span>
                <span className="font-semibold text-[var(--color-primary)]">
                  {formatVnd(booking.depositAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span>Đã thanh toán:</span>
                <span className="font-semibold text-emerald-700">
                  {formatVnd(booking.paidAmount)}
                </span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-[var(--color-ink)]">
                    Còn lại cần thanh toán:
                  </span>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Thanh toán nốt khi nhận phòng
                  </p>
                </div>
                <span className="text-lg font-bold text-[var(--color-ink)]">
                  {formatVnd(booking.outstandingAmount)}
                </span>
              </div>
            </div>

            {/* Thông tin hỗ trợ */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Quy định lưu trú
              </span>
              <ul className="space-y-1.5 text-xs text-[var(--color-muted)] list-disc pl-4">
                <li>Nhận phòng từ {CHECK_IN_TIME} ngày {formatDate(booking.checkInDate)}</li>
                <li>Trả phòng trước {CHECK_OUT_DEADLINE} ngày {formatDate(booking.checkOutDate)}</li>
                <li>Vui lòng mang theo CMND/CCCD khi làm thủ tục nhận phòng.</li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                to="/customer/bookings"
                className="flex w-full min-h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-xs"
              >
                ← Quay lại danh sách chuyến đi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {adjustModalOpen && (
        <CustomerAdjustBookingModal
          booking={booking}
          onClose={() => setAdjustModalOpen(false)}
          onSuccess={(updated) => {
            setAdjustModalOpen(false);
            setAdjustSuccessMsg(
              `Đã cập nhật đơn đặt #${updated.bookingCode || booking.code} thành công!`
            );
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
