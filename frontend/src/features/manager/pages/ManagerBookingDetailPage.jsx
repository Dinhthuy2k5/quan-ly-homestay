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
import { cancelManagerBookingApi, fetchManagerBookingDetailApi, fetchManagerDepositProofApi, recordManagerDirectDepositApi, reviewManagerDepositApi } from '../api';
import ManagerAdjustBookingModal from '../components/ManagerAdjustBookingModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';

const CUSTOMER_CANCELLATION_REASONS = [
  'Khách thay đổi kế hoạch chuyến đi',
  'Khách không còn nhu cầu lưu trú',
  'Khách đề nghị đổi lịch nhưng không thể sắp xếp',
];
const HOMESTAY_CANCELLATION_REASONS = [
  'Phòng gặp sự cố, không bảo đảm điều kiện lưu trú',
  'Homestay không thể phục vụ trong thời gian đã đặt',
  'Sự cố bất khả kháng tại khu vực lưu trú',
];

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
  const [reviewingDeposit, setReviewingDeposit] = useState(null);
  const [depositProofUrl, setDepositProofUrl] = useState('');
  const [depositReviewReason, setDepositReviewReason] = useState('');
  const [depositReviewError, setDepositReviewError] = useState('');
  const [depositReviewSubmitting, setDepositReviewSubmitting] = useState(false);
  const [isDirectDepositOpen, setIsDirectDepositOpen] = useState(false);
  const [directDepositAmount, setDirectDepositAmount] = useState('');
  const [directDepositNote, setDirectDepositNote] = useState('');
  const [directDepositError, setDirectDepositError] = useState('');
  const [directDepositSubmitting, setDirectDepositSubmitting] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [otherCancelReason, setOtherCancelReason] = useState('');
  const [cancelRequestedByCustomer, setCancelRequestedByCustomer] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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

  useEffect(() => {
    if (!reviewingDeposit?.proofAvailable) {
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    fetchManagerDepositProofApi(bookingId, reviewingDeposit.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setDepositProofUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setDepositReviewError('Không tải được chứng từ. Hãy thử tải lại chi tiết booking.');
      });

    return () => {
      active = false;
      setDepositProofUrl('');
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookingId, reviewingDeposit?.id, reviewingDeposit?.proofAvailable]);

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

  const handleDepositReview = async (decision) => {
    if (!reviewingDeposit) return;
    if (decision === 'REJECT' && !depositReviewReason.trim()) {
      setDepositReviewError('Nhập lý do từ chối chứng từ.');
      return;
    }
    setDepositReviewSubmitting(true);
    setDepositReviewError('');
    try {
      const result = await reviewManagerDepositApi(bookingId, {
        paymentId: reviewingDeposit.id,
        decision,
        reason: decision === 'REJECT' ? depositReviewReason : null,
      });
      setReviewingDeposit(null);
      setDepositReviewReason('');
      setAdjustSuccessToast(decision === 'APPROVE'
        ? result.bookingStatus === 'CONFIRMED'
          ? 'Đã xác nhận khoản cọc và booking.'
          : 'Đã xác nhận khoản cọc. Booking cần khách nộp thêm phần cọc còn thiếu.'
        : result.bookingStatus === 'EXPIRED'
          ? 'Đã từ chối chứng từ; thời hạn giữ chỗ đã hết và booking được giải phóng.'
          : 'Đã từ chối chứng từ. Booking đã được chuyển về chờ khách gửi lại.');
      setReloadKey((key) => key + 1);
    } catch (err) {
      setDepositReviewError(getErrorMessage(err) || 'Không thể xử lý khoản đặt cọc.');
    } finally {
      setDepositReviewSubmitting(false);
    }
  };

  const confirmedDepositAmount = (booking?.payments || []).reduce((sum, payment) =>
    payment.paymentType === 'DEPOSIT' && payment.status === 'CONFIRMED' ? sum + Number(payment.amount || 0) : sum, 0);
  const remainingDepositAmount = Math.max(0, Number(booking?.depositAmount || 0) - confirmedDepositAmount);

  const handleRecordDirectDeposit = async (event) => {
    event.preventDefault();
    const amount = Number(directDepositAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setDirectDepositError('Nhập số tiền nguyên dương bằng VND.');
      return;
    }
    if (amount > remainingDepositAmount) {
      setDirectDepositError(`Số tiền không được vượt quá phần cọc còn thiếu (${formatVnd(remainingDepositAmount)}).`);
      return;
    }
    setDirectDepositSubmitting(true);
    setDirectDepositError('');
    try {
      const result = await recordManagerDirectDepositApi(bookingId, { amount, note: directDepositNote });
      setIsDirectDepositOpen(false);
      setDirectDepositNote('');
      setDirectDepositAmount('');
      setAdjustSuccessToast(result.bookingStatus === 'CONFIRMED'
        ? 'Đã ghi nhận tiền mặt và xác nhận booking.'
        : 'Đã ghi nhận khoản cọc tiền mặt. Booking còn thiếu tiền đặt cọc.');
      setReloadKey((key) => key + 1);
    } catch (err) {
      setDirectDepositError(getErrorMessage(err) || 'Không thể ghi nhận khoản đặt cọc.');
    } finally {
      setDirectDepositSubmitting(false);
    }
  };

  const handleCancelBooking = async (event) => {
    event.preventDefault();
    const reason = selectedCancelReason === 'OTHER' ? otherCancelReason.trim() : selectedCancelReason;
    if (!reason) {
      setCancelError(selectedCancelReason === 'OTHER'
        ? 'Vui lòng nhập lý do hủy booking.'
        : 'Vui lòng chọn một lý do hủy booking.');
      return;
    }
    setCancelSubmitting(true);
    setCancelError('');
    try {
      const result = await cancelManagerBookingApi(bookingId, {
        reason,
        requestedByCustomer: cancelRequestedByCustomer,
      });
      setIsCancelOpen(false);
      setSelectedCancelReason('');
      setOtherCancelReason('');
      setAdjustSuccessToast(result.refundRequired
        ? `Booking đã hủy. Khoản hoàn ${formatVnd(result.refundAmount)} đang chờ xử lý.`
        : 'Booking đã hủy. Theo chính sách, không phát sinh khoản hoàn tiền.');
      setReloadKey((key) => key + 1);
    } catch (err) {
      setCancelError(getErrorMessage(err) || 'Không thể hủy booking. Hãy làm mới và thử lại.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse pb-12">
        <div className="h-6 w-44 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-44 w-full rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
          <div className="2xl:col-span-8 space-y-6">
            <div className="h-56 rounded-2xl bg-[var(--color-surface-soft)]" />
            <div className="h-72 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
          <div className="2xl:col-span-4 space-y-6">
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
          {(booking.status === 'PENDING_DEPOSIT' || booking.status === 'CONFIRMED') && (
            <button
              type="button"
              onClick={() => { setCancelError(''); setSelectedCancelReason(''); setOtherCancelReason(''); setIsCancelOpen(true); }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors shadow-xs"
            >
              <XCircle className="h-4 w-4" />
              <span>Hủy booking</span>
            </button>
          )}
          {booking.source === 'MANAGER' && (booking.status === 'PENDING_DEPOSIT' || booking.status === 'PENDING_APPROVAL' || booking.status === 'CONFIRMED') && (
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
                    ? 'bg-[var(--color-surface-soft)] text-[var(--color-body)] border border-[var(--color-border)]'
                    : 'bg-[var(--color-surface-soft)] text-[var(--color-body)] border border-[var(--color-border)]'
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
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Customer Info, Rooms & Nightly Breakdown, Notes */}
        <div className="2xl:col-span-8 space-y-6">
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
        <div className="2xl:col-span-4 space-y-6">
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
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3.5">
                <FileText className="h-5 w-5 text-[var(--color-muted)]" />
                <h3 className="text-base font-bold text-[var(--color-ink)]">Thông tin chuyển khoản cọc</h3>
              </div>

              <div className="space-y-3 text-sm text-[var(--color-ink)]">
                <div>
                  <span className="text-xs sm:text-sm text-[var(--color-body)] font-medium block">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-sm sm:text-base text-[var(--color-ink)]">{booking.paymentInstruction.bankName || 'Ngân hàng Quân Đội (MB Bank)'}</span>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-[var(--color-body)] font-medium block">Số tài khoản:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-extrabold text-base sm:text-lg text-[var(--color-ink)] tracking-wide">
                      {booking.paymentInstruction.bankAccountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.paymentInstruction.bankAccountNumber, 'bankAcc')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-[var(--color-body)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-2xs"
                    >
                      {copiedKey === 'bankAcc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-[var(--color-body)] font-medium block">Chủ tài khoản:</span>
                  <span className="font-bold text-sm sm:text-base text-[var(--color-ink)]">{booking.paymentInstruction.bankAccountHolder}</span>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-[var(--color-body)] font-medium block">Cú pháp chuyển khoản:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-bold text-sm sm:text-base text-[var(--color-ink)] bg-white/90 px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                      {booking.paymentInstruction.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.paymentInstruction.transferContent, 'content')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-[var(--color-body)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-2xs"
                    >
                      {copiedKey === 'content' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
                <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
                Các khoản cọc và hoàn tiền
              </h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {booking.status === 'PENDING_APPROVAL' && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Chờ xác nhận cọc</span>
                )}
                {booking.status === 'PENDING_DEPOSIT' && remainingDepositAmount > 0 && (
                  <button type="button" onClick={() => { setDirectDepositAmount(String(remainingDepositAmount)); setDirectDepositError(''); setIsDirectDepositOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]">
                    <CreditCard className="h-4 w-4" /> Ghi nhận tiền mặt
                  </button>
                )}
              </div>
            </div>
            {booking.payments?.length ? (
              <div className="divide-y divide-[var(--color-border)]">
                {booking.payments.map((payment) => {
                  const isDeposit = payment.paymentType === 'DEPOSIT';
                  const canReview = isDeposit && payment.status === 'PENDING' && booking.status === 'PENDING_APPROVAL';
                  return (
                    <div key={payment.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--color-ink)]">{isDeposit ? 'Tiền đặt cọc' : 'Khoản hoàn tiền'}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${payment.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                            {payment.status === 'CONFIRMED' ? 'Đã xác nhận' : payment.status === 'REJECTED' ? 'Bị từ chối' : 'Chờ xác nhận'}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-body)]">{formatVnd(payment.amount)} · {payment.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</p>
                        {payment.referenceCode && <p className="break-all text-xs text-[var(--color-muted)]">Nội dung chuyển khoản: {payment.referenceCode}</p>}
                        {payment.note && <p className="text-xs text-[var(--color-muted)]">Ghi chú: {payment.note}</p>}
                        {payment.rejectionReason && <p className="text-xs text-rose-700">Lý do từ chối: {payment.rejectionReason}</p>}
                        {payment.createdAt && <p className="text-xs text-[var(--color-muted)]">Gửi lúc {formatDateTime(payment.createdAt)}</p>}
                      </div>
                      {canReview && (
                        <button
                          type="button"
                          onClick={() => {
                            setDepositReviewError('');
                            setDepositReviewReason('');
                            setReviewingDeposit(payment);
                          }}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                        >
                          <UserCheck className="h-4 w-4" /> Đối chiếu chứng từ
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">Chưa có khoản đặt cọc hoặc hoàn tiền nào được ghi nhận.</p>
            )}
          </section>

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

      {reviewingDeposit && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !depositReviewSubmitting) setReviewingDeposit(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="deposit-review-title" className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="deposit-review-title" className="text-lg font-bold text-[var(--color-ink)]">Đối chiếu khoản đặt cọc</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Booking #{booking.code} · khoản cọc #{reviewingDeposit.id}</p>
              </div>
              <button type="button" disabled={depositReviewSubmitting} onClick={() => setReviewingDeposit(null)} className="rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 rounded-xl bg-[var(--color-surface-soft)] p-4 sm:grid-cols-2">
              <div><p className="text-xs text-[var(--color-muted)]">Số tiền khách báo đã chuyển</p><p className="mt-1 font-bold text-[var(--color-ink)]">{formatVnd(reviewingDeposit.amount)}</p></div>
              <div><p className="text-xs text-[var(--color-muted)]">Nội dung chuyển khoản</p><p className="mt-1 break-all font-mono text-sm font-semibold text-[var(--color-ink)]">{reviewingDeposit.referenceCode || '—'}</p></div>
            </div>

            <div className="min-h-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
              {reviewingDeposit.proofAvailable && depositProofUrl ? (
                reviewingDeposit.proofMimeType?.startsWith('image/') ? (
                  <img src={depositProofUrl} alt="Chứng từ đặt cọc" className="mx-auto max-h-80 rounded-lg object-contain" />
                ) : (
                  <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center">
                    <FileText className="h-8 w-8 text-[var(--color-muted)]" />
                    <a href={depositProofUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--color-primary)] underline">Mở chứng từ PDF</a>
                  </div>
                )
              ) : reviewingDeposit.proofAvailable ? (
                <p className="py-8 text-center text-sm text-[var(--color-muted)]">Đang tải chứng từ…</p>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--color-muted)]">Khoản này không có tệp chứng từ.</p>
              )}
            </div>

            <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
              <span>Lý do từ chối <span className="font-normal text-[var(--color-muted)]">(bắt buộc nếu từ chối)</span></span>
              <textarea value={depositReviewReason} onChange={(event) => setDepositReviewReason(event.target.value)} maxLength={255} rows={2} placeholder="Ví dụ: số tiền hoặc nội dung giao dịch không khớp" className="w-full resize-y rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
            </label>
            {depositReviewError && <p role="alert" className="text-sm text-rose-700">{depositReviewError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={depositReviewSubmitting} onClick={() => handleDepositReview('REJECT')} className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                {depositReviewSubmitting ? 'Đang xử lý…' : 'Từ chối chứng từ'}
              </button>
              <button type="button" disabled={depositReviewSubmitting} onClick={() => handleDepositReview('APPROVE')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                <Check className="h-4 w-4" /> {depositReviewSubmitting ? 'Đang xử lý…' : 'Xác nhận đã nhận tiền'}
              </button>
            </div>
          </section>
        </div>
      )}

      {isDirectDepositOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !directDepositSubmitting) setIsDirectDepositOpen(false); }}>
          <form onSubmit={handleRecordDirectDeposit} role="dialog" aria-modal="true" aria-labelledby="direct-deposit-title" className="w-full max-w-lg space-y-5 rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="direct-deposit-title" className="text-lg font-bold text-[var(--color-ink)]">Ghi nhận tiền đặt cọc</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Chỉ dùng khi quản lý đã trực tiếp nhận tiền mặt từ khách.</p>
              </div>
              <button type="button" disabled={directDepositSubmitting} onClick={() => setIsDirectDepositOpen(false)} className="rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 rounded-xl bg-[var(--color-surface-soft)] p-4 sm:grid-cols-2">
              <div><p className="text-xs text-[var(--color-muted)]">Tiền cọc cần có</p><p className="mt-1 font-bold text-[var(--color-ink)]">{formatVnd(booking.depositAmount)}</p></div>
              <div><p className="text-xs text-[var(--color-muted)]">Đã xác nhận · Còn thiếu</p><p className="mt-1 font-bold text-[var(--color-ink)]">{formatVnd(confirmedDepositAmount)} · {formatVnd(remainingDepositAmount)}</p></div>
            </div>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
              <span>Số tiền nhận (VND) <span className="text-rose-600">*</span></span>
              <input type="number" min="1" max={remainingDepositAmount} step="1" required value={directDepositAmount} onChange={(event) => setDirectDepositAmount(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
              <span className="block text-xs font-normal text-[var(--color-muted)]">Không vượt quá số tiền cọc còn thiếu.</span>
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
              <span>Ghi chú <span className="font-normal text-[var(--color-muted)]">(không bắt buộc)</span></span>
              <textarea maxLength={255} rows={2} value={directDepositNote} onChange={(event) => setDirectDepositNote(event.target.value)} placeholder="Ví dụ: Khách nộp tiền mặt tại quầy" className="w-full resize-y rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
            </label>
            {directDepositError && <p role="alert" className="text-sm text-rose-700">{directDepositError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={directDepositSubmitting} onClick={() => setIsDirectDepositOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)]">Quay lại</button>
              <button type="submit" disabled={directDepositSubmitting || remainingDepositAmount <= 0} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{directDepositSubmitting ? 'Đang ghi nhận…' : 'Xác nhận đã nhận tiền'}</button>
            </div>
          </form>
        </div>
      )}

      {isCancelOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <form onSubmit={handleCancelBooking} role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="w-full max-w-lg space-y-5 rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cancel-booking-title" className="text-lg font-bold text-[var(--color-ink)]">Hủy booking #{booking.code}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Khoản hoàn (nếu có) được tính theo chính sách hủy đã áp dụng cho booking.</p>
              </div>
              <button type="button" disabled={cancelSubmitting} onClick={() => setIsCancelOpen(false)} className="rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[var(--color-ink)]">Nguồn yêu cầu hủy</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-medium ${cancelRequestedByCustomer ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-body)]'}`}>
                  <input type="radio" name="cancel-source" checked={cancelRequestedByCustomer} onChange={() => { setCancelRequestedByCustomer(true); setSelectedCancelReason(''); setOtherCancelReason(''); setCancelError(''); }} className="accent-[var(--color-primary)]" />
                  Khách yêu cầu
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-medium ${!cancelRequestedByCustomer ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-body)]'}`}>
                  <input type="radio" name="cancel-source" checked={!cancelRequestedByCustomer} onChange={() => { setCancelRequestedByCustomer(false); setSelectedCancelReason(''); setOtherCancelReason(''); setCancelError(''); }} className="accent-[var(--color-primary)]" />
                  Sự cố homestay
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[var(--color-ink)]">Lý do hủy <span className="text-rose-600">*</span></legend>
              {(cancelRequestedByCustomer ? CUSTOMER_CANCELLATION_REASONS : HOMESTAY_CANCELLATION_REASONS).map((reason) => (
                <label key={reason} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${selectedCancelReason === reason ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]' : 'border-[var(--color-border)] text-[var(--color-body)]'}`}>
                  <input type="radio" name="cancel-reason" checked={selectedCancelReason === reason} onChange={() => { setSelectedCancelReason(reason); setOtherCancelReason(''); setCancelError(''); }} className="mt-0.5 accent-[var(--color-primary)]" />
                  {reason}
                </label>
              ))}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${selectedCancelReason === 'OTHER' ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]' : 'border-[var(--color-border)] text-[var(--color-body)]'}`}>
                <input type="radio" name="cancel-reason" checked={selectedCancelReason === 'OTHER'} onChange={() => { setSelectedCancelReason('OTHER'); setCancelError(''); }} className="mt-0.5 accent-[var(--color-primary)]" />
                Lý do khác
              </label>
            </fieldset>
            {selectedCancelReason === 'OTHER' && (
              <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
                <span>Nhập lý do cụ thể</span>
                <textarea required value={otherCancelReason} onChange={(event) => setOtherCancelReason(event.target.value)} maxLength={239} rows={3} placeholder="Mô tả ngắn gọn lý do hủy" className="w-full resize-y rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
              </label>
            )}
            {cancelError && <p role="alert" className="text-sm text-rose-700">{cancelError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={cancelSubmitting} onClick={() => setIsCancelOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]">Quay lại</button>
              <button type="submit" disabled={cancelSubmitting || !selectedCancelReason || (selectedCancelReason === 'OTHER' && !otherCancelReason.trim())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> {cancelSubmitting ? 'Đang hủy…' : 'Xác nhận hủy booking'}
              </button>
            </div>
          </form>
        </div>
      )}

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
