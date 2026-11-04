import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DoorOpen,
  Edit3,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Tag,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { fetchManagerBookingDetailApi } from '../api';
import ManagerAdjustBookingModal from '../components/ManagerAdjustBookingModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

export default function ManagerBookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustSuccessToast, setAdjustSuccessToast] = useState('');

  useEffect(() => {
    let active = true;

    fetchManagerBookingDetailApi(bookingId)
      .then((data) => {
        if (!active) return;
        setBooking(data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        const code = err.response?.data?.error?.code;
        if (code === 'HOMESTAY_SCOPE_VIOLATION') {
          setError('Đơn đặt phòng này không thuộc cơ sở homestay được giao quản lý của bạn.');
        } else if (code === 'BOOKING_NOT_FOUND') {
          setError('Không tìm thấy đơn đặt phòng yêu cầu (hoặc đơn đã bị xóa).');
        } else if (code === 'HOMESTAY_NOT_ASSIGNED') {
          setError('Tài khoản quản lý chưa được phân công cơ sở nào.');
        } else {
          setError(getErrorMessage(err) || 'Không thể tải thông tin chi tiết đơn đặt phòng.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);

  const nights = booking?.checkInDate && booking?.checkOutDate
    ? nightsBetween(booking.checkInDate, booking.checkOutDate)
    : 0;

  let parsedPolicy = null;
  if (booking?.policySnapshot) {
    try {
      parsedPolicy = typeof booking.policySnapshot === 'string'
        ? JSON.parse(booking.policySnapshot)
        : booking.policySnapshot;
    } catch {
      parsedPolicy = null;
    }
  }

  const handleCopy = (text, key) => {
    if (!navigator?.clipboard || !text) return;
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    });
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse pb-12">
        <div className="h-6 w-44 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-44 w-full rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-56 rounded-2xl bg-[var(--color-surface-soft)]" />
            <div className="h-72 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-80 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-600 mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)]">Không thể hiển thị đơn đặt phòng</h2>
        <p className="text-sm sm:text-base text-[var(--color-body)] leading-relaxed">{error || 'Đơn đặt phòng không tồn tại.'}</p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/manager/bookings')}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm sm:text-base font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách đơn</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/manager/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Danh sách đơn đặt phòng</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {(booking.status === 'PENDING_DEPOSIT' || booking.status === 'PENDING_APPROVAL' || booking.status === 'CONFIRMED') && (
            <button
              type="button"
              onClick={() => setIsAdjustOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-disabled)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors shadow-xs"
              title="Điều chỉnh thời gian, số khách hoặc phòng đặt"
            >
              <Edit3 className="h-4 w-4" />
              <span>Điều chỉnh đơn</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="h-4 w-4 text-[var(--color-muted)]" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {adjustSuccessToast && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5 font-medium">
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{adjustSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdjustSuccessToast('')}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Booking Header Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--color-ink)]">
                #{booking.code}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(booking.code, 'code')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border)] px-2.5 py-1 text-sm font-medium text-[var(--color-body)] hover:text-[var(--color-ink)] transition-colors"
                title="Sao chép mã đơn"
              >
                {copiedKey === 'code' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[var(--color-muted)]" />
                    <span>Chép mã</span>
                  </>
                )}
              </button>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${
                  booking.source === 'MANAGER'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>{booking.source === 'MANAGER' ? 'Quản lý đặt hộ' : 'Khách tự đặt trực tuyến'}</span>
              </span>
            </div>

            <p className="text-sm sm:text-base text-[var(--color-muted)]">
              Cơ sở: <strong className="text-[var(--color-ink)] font-semibold">{booking.homestayName || `Homestay #${booking.homestayId}`}</strong> • Khởi tạo lúc: {formatDateTime(booking.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <StatusBadge type="booking" status={booking.status} />
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-1">
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block font-medium">Thời gian lưu trú</span>
            <strong className="text-lg sm:text-xl font-bold text-[var(--color-ink)] block">
              {nights} đêm
            </strong>
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block">
              {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
            </span>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-1">
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block font-medium">Số khách</span>
            <strong className="text-lg sm:text-xl font-bold text-[var(--color-ink)] block">
              {booking.guestCount} khách
            </strong>
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block">
              {booking.rooms?.length || 0} phòng đặt
            </span>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-1">
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block font-medium">Tổng tiền phòng</span>
            <strong className="text-lg sm:text-xl font-bold text-[var(--color-ink)] block">
              {formatVnd(booking.roomTotalPrice)}
            </strong>
            <span className="text-xs sm:text-sm text-[var(--color-primary)] font-semibold block">
              Cọc: {formatVnd(booking.depositAmount)}
            </span>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-1">
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block font-medium">Còn phải thu</span>
            <strong className="text-lg sm:text-xl font-bold text-amber-600 block">
              {formatVnd(booking.outstandingAmount)}
            </strong>
            <span className="text-xs sm:text-sm text-[var(--color-muted)] block">
              Đã thu: {formatVnd(booking.paidAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Customer Info, Rooms & Nightly Breakdown, Notes */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card: Thông tin khách hàng */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <User className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Thông tin khách hàng & Liên hệ</span>
              </h3>

              {booking.customerId ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs sm:text-sm font-semibold text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                  <span>Đã đăng ký tài khoản (#{booking.customerId})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs sm:text-sm font-medium text-gray-600">
                  <span>Khách vãng lai / chưa có tài khoản</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <span className="text-xs sm:text-sm text-[var(--color-muted)] font-medium block">Họ và tên khách liên hệ</span>
                <span className="font-bold text-base sm:text-lg text-[var(--color-ink)] block">{booking.contactName}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm text-[var(--color-muted)] font-medium block">Số điện thoại liên hệ</span>
                <a
                  href={`tel:${booking.contactPhone}`}
                  className="font-mono font-bold text-base sm:text-lg text-[var(--color-primary)] hover:underline inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>{booking.contactPhone}</span>
                </a>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm text-[var(--color-muted)] font-medium block">Email liên hệ</span>
                {booking.contactEmail ? (
                  <a
                    href={`mailto:${booking.contactEmail}`}
                    className="text-sm sm:text-base text-[var(--color-body)] font-medium hover:text-[var(--color-primary)] hover:underline inline-flex items-center gap-2 truncate max-w-full"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                    <span className="truncate">{booking.contactEmail}</span>
                  </a>
                ) : (
                  <span className="text-sm sm:text-base text-[var(--color-muted)] italic">Không cung cấp</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm text-[var(--color-muted)] font-medium block">Người tạo đơn</span>
                <span className="text-sm sm:text-base font-semibold text-[var(--color-body)] block">
                  {booking.createdByName || (booking.source === 'MANAGER' ? 'Quản lý cơ sở' : 'Khách hàng')} (ID: #{booking.createdBy})
                </span>
              </div>
            </div>

            {/* Registered customer account details if available */}
            {booking.customerId && (booking.customerFullName || booking.customerPhone || booking.customerEmail) && (
              <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-[var(--color-body)] space-y-2">
                <span className="font-bold text-sm sm:text-base text-[var(--color-ink)] block">
                  Chi tiết tài khoản hệ thống của khách:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs sm:text-sm">
                  <div>Tên tài khoản: <strong className="text-[var(--color-ink)]">{booking.customerFullName || '—'}</strong></div>
                  <div>SĐT đăng ký: <strong className="font-mono text-[var(--color-ink)]">{booking.customerPhone || '—'}</strong></div>
                  <div>Email đăng ký: <strong className="text-[var(--color-ink)]">{booking.customerEmail || '—'}</strong></div>
                </div>
              </div>
            )}

            {/* Note */}
            {booking.note && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <span className="font-semibold text-sm sm:text-base text-[var(--color-muted)] block mb-1.5">Ghi chú đơn đặt phòng:</span>
                <p className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-sm sm:text-base text-amber-900 leading-relaxed italic">
                  "{booking.note}"
                </p>
              </div>
            )}
          </div>

          {/* Card: Danh sách phòng & Bảng kê chi tiết từng đêm */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Danh sách phòng ({booking.rooms?.length || 0} phòng) & Bảng kê từng đêm</span>
              </h3>
            </div>

            <div className="space-y-4">
              {booking.rooms && booking.rooms.length > 0 ? (
                booking.rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 p-4 sm:p-5 space-y-4"
                  >
                    {/* Room Info Header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3.5">
                        {room.coverImageUrl ? (
                          <img
                            src={fileUrl(room.coverImageUrl)}
                            alt={room.roomName}
                            className="h-14 w-20 sm:h-16 sm:w-24 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-20 sm:h-16 sm:w-24 rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border)] grid place-items-center shrink-0">
                            <DoorOpen className="h-6 w-6 text-[var(--color-muted)]" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-base sm:text-lg text-[var(--color-ink)]">
                            {room.roomName || room.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                            {room.roomTypeName ? `${room.roomTypeName} • ` : ''}Sức chứa tối đa: <span className="font-semibold text-[var(--color-ink)]">{room.maxGuests || 2} khách</span>
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/manager/rooms/${room.roomId}`}
                        className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem phòng →
                      </Link>
                    </div>

                    {/* Nightly price breakdown table */}
                    {room.nights && room.nights.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 border-b border-[var(--color-border)] text-[var(--color-ink)] font-bold text-xs sm:text-sm">
                            <tr>
                              <th className="px-4 py-2.5">Đêm lưu trú</th>
                              <th className="px-4 py-2.5">Quy tắc giá áp dụng</th>
                              <th className="px-4 py-2.5 text-right">Giá đêm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]">
                            {room.nights.map((night, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2.5 font-medium text-sm sm:text-base text-[var(--color-ink)]">
                                  {formatDate(night.stayDate)}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-body)]">
                                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface-soft)] px-2.5 py-1 text-xs sm:text-sm font-mono text-[var(--color-ink)] border border-[var(--color-border)]">
                                    <Tag className="h-3 w-3 text-[var(--color-muted)]" />
                                    <span>{night.appliedRuleName || 'BASE'}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-sm sm:text-base text-[var(--color-ink)] font-mono">
                                  {formatVnd(night.nightlyPrice)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted)] italic p-4 text-center">
                  Không tìm thấy chi tiết phòng cho đơn này.
                </p>
              )}
            </div>
          </div>

          {/* Card: Chính sách áp dụng (Snapshot khi tạo đơn) */}
          {parsedPolicy && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
                <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Chính sách đã áp dụng cho đơn (Snapshot)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl border border-[var(--color-border)] p-3 bg-gray-50/50 space-y-1">
                  <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Tỷ lệ đặt cọc</span>
                  <strong className="text-[var(--color-ink)] text-base sm:text-lg font-bold block">{parsedPolicy.depositPercent ?? 30}%</strong>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-3 bg-gray-50/50 space-y-1">
                  <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Thời gian giữ cọc</span>
                  <strong className="text-[var(--color-ink)] text-base sm:text-lg font-bold block">{parsedPolicy.holdHours ?? 24} giờ</strong>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-3 bg-gray-50/50 space-y-1">
                  <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Số đêm lưu trú</span>
                  <strong className="text-[var(--color-ink)] text-base sm:text-lg font-bold block">{parsedPolicy.minNights ?? 1} – {parsedPolicy.maxNights ?? 30} đêm</strong>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-3 bg-gray-50/50 space-y-1">
                  <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Đặt trước tối đa</span>
                  <strong className="text-[var(--color-ink)] text-base sm:text-lg font-bold block">{parsedPolicy.maxAdvanceDays ?? 90} ngày</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Financial Balance, Deposit Payment Instruction, Audit Trail */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Cân đối tài chính */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
              <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
              <span>Cân đối thanh toán</span>
            </h3>

            <div className="space-y-3.5 text-sm sm:text-base">
              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="font-medium">Tổng tiền phòng:</span>
                <span className="font-bold text-base sm:text-lg text-[var(--color-ink)]">{formatVnd(booking.roomTotalPrice)}</span>
              </div>

              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="font-medium">Tiền cọc yêu cầu:</span>
                <span className="font-bold text-base sm:text-lg text-[var(--color-primary)]">{formatVnd(booking.depositAmount)}</span>
              </div>

              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="font-medium">Đã thanh toán:</span>
                <span className="font-bold text-base sm:text-lg text-emerald-600">{formatVnd(booking.paidAmount)}</span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-center">
                <span className="font-bold text-base sm:text-lg text-[var(--color-ink)]">Còn phải thanh toán:</span>
                <span className="font-extrabold text-lg sm:text-xl text-amber-600">{formatVnd(booking.outstandingAmount)}</span>
              </div>

              {booking.refundAmount != null && booking.refundAmount > 0 && (
                <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-center text-rose-700">
                  <span className="font-bold text-sm sm:text-base">Số tiền hoàn (Hủy đơn):</span>
                  <span className="font-extrabold text-base sm:text-lg">{formatVnd(booking.refundAmount)}</span>
                </div>
              )}
            </div>

            {/* Hold Expiry Alert for PENDING_DEPOSIT */}
            {booking.status === 'PENDING_DEPOSIT' && booking.holdExpiresAt && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-amber-900">
                  <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Hạn thanh toán cọc giữ phòng:</span>
                </div>
                <div className="pl-6 font-extrabold text-base sm:text-lg text-amber-950 font-mono">
                  {formatDateTime(booking.holdExpiresAt)}
                </div>
                <p className="text-xs sm:text-sm text-amber-800 pl-6 leading-relaxed">
                  Đơn sẽ tự động hết hạn nếu khách không thanh toán cọc trước thời điểm này.
                </p>
              </div>
            )}
          </div>

          {/* Card: Hướng dẫn chuyển khoản nộp cọc (Chỉ hiển thị khi PENDING_DEPOSIT) */}
          {booking.paymentInstruction && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-200/80 pb-3.5">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-blue-900">Thông tin chuyển khoản cọc</h3>
              </div>

              <div className="space-y-3 text-sm text-blue-950">
                <div>
                  <span className="text-xs sm:text-sm text-blue-700 font-medium block">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-sm sm:text-base text-blue-950">{booking.paymentInstruction.bankName || 'Ngân hàng Quân Đội (MB Bank)'}</span>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-blue-700 font-medium block">Số tài khoản:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-extrabold text-base sm:text-lg text-blue-900 tracking-wide">
                      {booking.paymentInstruction.bankAccountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.paymentInstruction.bankAccountNumber, 'bankAcc')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors shadow-2xs"
                    >
                      {copiedKey === 'bankAcc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-blue-700 font-medium block">Chủ tài khoản:</span>
                  <span className="font-bold text-sm sm:text-base text-blue-950">{booking.paymentInstruction.bankAccountHolder}</span>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-blue-700 font-medium block">Cú pháp chuyển khoản:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-bold text-sm sm:text-base text-blue-900 bg-white/90 px-2.5 py-1 rounded-md border border-blue-200">
                      {booking.paymentInstruction.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.paymentInstruction.transferContent, 'content')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors shadow-2xs"
                    >
                      {copiedKey === 'content' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card: Lịch sử vận hành & Phê duyệt */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
              <Clock className="h-5 w-5 text-[var(--color-primary)]" />
              <span>Lịch sử vận hành & Phê duyệt</span>
            </h3>

            <div className="space-y-3 text-sm text-[var(--color-body)]">
              <div>
                <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Thời điểm tạo đơn:</span>
                <span className="font-semibold text-sm sm:text-base text-[var(--color-ink)]">{formatDateTime(booking.createdAt)}</span>
              </div>

              <div>
                <span className="text-[var(--color-muted)] block text-xs sm:text-sm font-medium">Cập nhật lần cuối:</span>
                <span className="font-semibold text-sm sm:text-base text-[var(--color-ink)]">{formatDateTime(booking.updatedAt)}</span>
              </div>

              {booking.approvedAt && (
                <div className="border-t border-[var(--color-border)] pt-2.5 text-emerald-800">
                  <span className="block text-xs sm:text-sm text-emerald-700 font-bold flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Duyệt cọc bởi:</span>
                  </span>
                  <span className="font-semibold text-sm sm:text-base text-emerald-950">
                    {booking.approvedByName || `Quản lý #${booking.approvedBy}`} lúc {formatDateTime(booking.approvedAt)}
                  </span>
                </div>
              )}

              {booking.cancelledAt && (
                <div className="border-t border-[var(--color-border)] pt-2.5 text-rose-800">
                  <span className="block text-xs sm:text-sm text-rose-700 font-bold flex items-center gap-1.5 mb-0.5">
                    <XCircle className="h-4 w-4" />
                    <span>Hủy đơn bởi:</span>
                  </span>
                  <span className="font-semibold text-sm sm:text-base text-rose-950">
                    {booking.cancelledByName || `Nhân sự #${booking.cancelledBy}`} lúc {formatDateTime(booking.cancelledAt)}
                  </span>
                  {booking.cancelReason && (
                    <p className="mt-1.5 italic text-xs sm:text-sm text-rose-900 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      Lý do: "{booking.cancelReason}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal điều chỉnh booking */}
      {isAdjustOpen && (
        <ManagerAdjustBookingModal
          booking={booking}
          onClose={() => setIsAdjustOpen(false)}
          onSuccess={(updatedData) => {
            setIsAdjustOpen(false);
            setAdjustSuccessToast(
              `Đã điều chỉnh đơn #${updatedData.code || booking.code} thành công! Tổng tiền phòng mới: ${formatVnd(updatedData.roomTotalPrice)}, tiền cọc: ${formatVnd(updatedData.depositAmount)}.`
            );
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
