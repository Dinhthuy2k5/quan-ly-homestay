import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  CreditCard,
  DoorOpen,
  Edit3,
  FileText,
  MapPin,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { cancelCustomerBookingApi, fetchCustomerBookingDetailApi, fetchCustomerBookingServicesApi, fetchCustomerDepositProofApi, registerCustomerBookingServiceApi, submitCustomerDepositApi } from '../api';
import { fetchHomestayServices } from '../../homestays/api';
import CustomerAdjustBookingModal from '../components/CustomerAdjustBookingModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import { validateBankAccountNumber, validateBankAccountHolder, normalizeBankAccountHolder } from '../../../lib/validation';
import OptionalNotePicker from '../../../components/ui/OptionalNotePicker';

function previousDateKey(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CustomerBookingDetailPage() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBankName, setCancelBankName] = useState('');
  const [cancelBankAccountNumber, setCancelBankAccountNumber] = useState('');
  const [cancelBankAccountHolder, setCancelBankAccountHolder] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [referenceCodeInput, setReferenceCodeInput] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofError, setProofError] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccess, setProofSuccess] = useState('');
  const [previewProofPayment, setPreviewProofPayment] = useState(null);
  const [previewProofUrl, setPreviewProofUrl] = useState('');
  const [previewProofError, setPreviewProofError] = useState('');
  const [bookingServices, setBookingServices] = useState([]);
  const [bookingServicesLoading, setBookingServicesLoading] = useState(true);
  const [bookingServicesError, setBookingServicesError] = useState('');
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [serviceCatalogHomestayId, setServiceCatalogHomestayId] = useState(null);
  const [serviceCatalogReload, setServiceCatalogReload] = useState(0);
  const [serviceCatalogLoading, setServiceCatalogLoading] = useState(false);
  const [serviceCatalogError, setServiceCatalogError] = useState('');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  const groupedServiceCatalog = useMemo(() => {
    const groups = new Map();
    for (const item of serviceCatalog) {
      const catName = item.categoryName || 'Dịch vụ khác';
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName).push(item);
    }
    return Array.from(groups.entries()).map(([categoryName, items]) => ({ categoryName, items }));
  }, [serviceCatalog]);
  const [serviceIdInput, setServiceIdInput] = useState('');
  const [serviceRoomIdInput, setServiceRoomIdInput] = useState('');
  const [serviceQuantityInput, setServiceQuantityInput] = useState('1');
  const [serviceDateInput, setServiceDateInput] = useState('');
  const [serviceNoteInput, setServiceNoteInput] = useState('');
  const [serviceSubmitError, setServiceSubmitError] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState('');
  const [expandHouseRules, setExpandHouseRules] = useState(false);

  const [todayTimestamp] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [nowTimestamp] = useState(() => Date.now());

  const proofPreviewUrl = useMemo(() => proofFile && proofFile.type.startsWith('image/')
    ? URL.createObjectURL(proofFile)
    : '', [proofFile]);

  useEffect(() => () => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
  }, [proofPreviewUrl]);

  const canAdjust = useMemo(() => {
    if (!booking) return false;
    if (booking.status === 'PENDING_DEPOSIT') {
      if (!booking.holdExpiresAt) return true;
      return new Date(booking.holdExpiresAt).getTime() > nowTimestamp;
    }
    if (booking.status === 'CONFIRMED') {
      if (!booking.checkInDate) return false;
      const [year, month, day] = booking.checkInDate.split('-').map(Number);
      const checkInTimestamp = new Date(year, month - 1, day).getTime();
      const diffDays = Math.round((checkInTimestamp - todayTimestamp) / (1000 * 60 * 60 * 24));
      return diffDays >= 3;
    }
    return false;
  }, [booking, nowTimestamp, todayTimestamp]);

  const canCancel = ['PENDING_DEPOSIT', 'CONFIRMED'].includes(booking?.status);

  const appliedPolicy = booking?.appliedPolicy || {};
  const depositPercent = appliedPolicy.depositPercent ?? 30;
  const holdHours = appliedPolicy.holdHours ?? 24;
  const finalPaymentTiming = appliedPolicy.finalPaymentTiming || 'Thanh toán nốt khi trả phòng';
  const checkInTime = appliedPolicy.checkInTime || CHECK_IN_TIME;
  const checkOutDeadline = appliedPolicy.checkOutDeadline || CHECK_OUT_DEADLINE;
  const houseRules = appliedPolicy.houseRules || [];
  const refundRules = appliedPolicy.refundRules || [];

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

  useEffect(() => {
    if (!booking?.id) return undefined;
    let active = true;
    setBookingServicesLoading(true);
    setBookingServicesError('');
    fetchCustomerBookingServicesApi(booking.id)
      .then((services) => { if (active) setBookingServices(services); })
      .catch((err) => { if (active) setBookingServicesError(getErrorMessage(err) || 'Không thể tải dịch vụ đã đăng ký.'); })
      .finally(() => { if (active) setBookingServicesLoading(false); });
    return () => { active = false; };
  }, [booking?.id, refreshKey]);

  useEffect(() => {
    if (!serviceModalOpen || !booking?.homestayId || serviceCatalogHomestayId === booking.homestayId) return undefined;
    let active = true;
    setServiceCatalogLoading(true);
    setServiceCatalogError('');
    fetchHomestayServices(booking.homestayId)
      .then((services) => {
        if (active) {
          setServiceCatalog(services);
          setServiceCatalogHomestayId(booking.homestayId);
        }
      })
      .catch((err) => { if (active) setServiceCatalogError(getErrorMessage(err) || 'Không thể tải danh mục dịch vụ.'); })
      .finally(() => { if (active) setServiceCatalogLoading(false); });
    return () => { active = false; };
  }, [serviceModalOpen, booking?.homestayId, serviceCatalogHomestayId, serviceCatalogReload]);

  useEffect(() => {
    if (!serviceIdInput && serviceCatalog.length > 0) setServiceIdInput(String(serviceCatalog[0].id));
  }, [serviceCatalog, serviceIdInput]);

  useEffect(() => {
    if (!serviceRoomIdInput && booking?.rooms?.length > 0) setServiceRoomIdInput(String(booking.rooms[0].roomId));
  }, [booking?.rooms, serviceRoomIdInput]);

  useEffect(() => {
    if (!previewProofPayment?.proofAvailable || !booking?.id) {
      return undefined;
    }

    let active = true;
    let objectUrl = '';

    fetchCustomerDepositProofApi(booking.id, previewProofPayment.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setPreviewProofUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setPreviewProofError('Không thể tải chứng từ. Vui lòng thử lại sau.');
        }
      });

    return () => {
      active = false;
      setPreviewProofUrl('');
      setPreviewProofError('');
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [booking?.id, previewProofPayment?.id, previewProofPayment?.proofAvailable]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const confirmedDepositAmount = (booking?.payments || [])
    .filter((p) => p.paymentType === 'DEPOSIT' && p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleCancelBooking = async (event) => {
    event.preventDefault();
    setCancelSubmitting(true);
    setCancelError('');

    if (confirmedDepositAmount > 0) {
      if (!cancelBankName.trim()) {
        setCancelError('Vui lòng chọn hoặc nhập tên ngân hàng nhận tiền hoàn.');
        setCancelSubmitting(false);
        return;
      }
      const accNumError = validateBankAccountNumber(cancelBankAccountNumber);
      if (accNumError) {
        setCancelError(accNumError);
        setCancelSubmitting(false);
        return;
      }
      const holderError = validateBankAccountHolder(cancelBankAccountHolder);
      if (holderError) {
        setCancelError(holderError);
        setCancelSubmitting(false);
        return;
      }
    }

    try {
      const result = await cancelCustomerBookingApi(booking.id, {
        reason: cancelReason.trim(),
        bankName: cancelBankName.trim(),
        bankAccountNumber: cancelBankAccountNumber.trim(),
        bankAccountHolder: cancelBankAccountHolder.trim().toUpperCase(),
      });
      setCancelResult(result);
      setCancelModalOpen(false);
      setCancelReason('');
      setCancelBankName('');
      setCancelBankAccountNumber('');
      setCancelBankAccountHolder('');
      handleRefresh();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleProofFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProofError('');
    setProofFile(null);
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setProofError('Chỉ nhận tệp JPG, PNG, WEBP hoặc PDF.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError('Tệp chứng từ không được vượt quá 5 MB.');
      event.target.value = '';
      return;
    }
    setProofFile(file);
  };

  const handleSubmitProof = async (event) => {
    event.preventDefault();
    setProofError('');
    const amount = Number(depositAmountInput || booking.depositAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setProofError('Số tiền chuyển phải là số nguyên lớn hơn 0.');
      return;
    }
    if (!proofFile) {
      setProofError('Vui lòng chọn ảnh hoặc PDF chứng từ chuyển khoản.');
      return;
    }
    setProofSubmitting(true);
    try {
      await submitCustomerDepositApi(booking.id, {
        amount,
        referenceCode: referenceCodeInput.trim() || booking.paymentInstruction?.transferContent || booking.code,
        proofFile,
      });
      setProofSuccess('Đã gửi chứng từ. Quản lý sẽ xác minh khoản cọc.');
      handleRefresh();
    } catch (err) {
      setProofError(getErrorMessage(err) || 'Không thể gửi chứng từ. Vui lòng thử lại.');
    } finally {
      setProofSubmitting(false);
    }
  };

  const handleRegisterService = async (event) => {
    event.preventDefault();
    setServiceSubmitError('');
    const quantity = Number(serviceQuantityInput);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setServiceSubmitError('Số lượng phải là số nguyên lớn hơn 0.');
      return;
    }
    setServiceSubmitting(true);
    try {
      const created = await registerCustomerBookingServiceApi(booking.id, Number(serviceRoomIdInput), {
        serviceId: Number(serviceIdInput),
        quantity,
        serviceDate: serviceDateInput || null,
        note: serviceNoteInput.trim() || null,
      });
      setBookingServices((current) => [...current, created]);
      setServiceSuccess(`Đã đăng ký ${created.serviceName} cho ${booking.rooms.find((room) => room.roomId === created.roomId)?.roomName || 'phòng đã chọn'}.`);
      setServiceModalOpen(false);
      setServiceQuantityInput('1');
      setServiceDateInput('');
      setServiceNoteInput('');
    } catch (err) {
      setServiceSubmitError(getErrorMessage(err) || 'Không thể đăng ký dịch vụ. Vui lòng thử lại.');
    } finally {
      setServiceSubmitting(false);
    }
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
      <div className="mx-auto max-w-6xl space-y-6 py-6 animate-pulse">
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
    <div className="mx-auto max-w-6xl space-y-6 py-4 sm:py-6">
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

        <div className="flex flex-wrap items-center gap-2">
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
          {canCancel && (
            <button
              type="button"
              onClick={() => {
                setCancelError('');
                setCancelModalOpen(true);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <Ban className="h-4 w-4" />
              <span>Hủy đặt phòng</span>
            </button>
          )}
        </div>
      </div>

      {cancelResult && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Đơn đặt phòng đã được hủy. {cancelResult.refundAmount > 0
            ? `Số tiền yêu cầu hoàn: ${formatVnd(cancelResult.refundAmount)}. Homestay sẽ xử lý khoản hoàn.`
            : 'Theo chính sách, đơn này không có khoản hoàn tiền.'}
        </div>
      )}

      {proofSuccess && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {proofSuccess}
        </div>
      )}

      {booking.status === 'PENDING_APPROVAL' && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div><strong>Đã nhận chứng từ.</strong> Quản lý đang xác minh khoản cọc.</div>
        </div>
      )}

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
                <p className="text-xs text-[var(--color-muted)]">Từ {checkInTime}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[var(--color-muted)] font-medium">Trả phòng (Check-out)</span>
                <p className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>{formatDate(booking.checkOutDate)}</span>
                </p>
                <p className="text-xs text-[var(--color-muted)]">Trước {checkOutDeadline}</p>
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

          {/* Dịch vụ khách đã đăng ký và đăng ký mới theo booking */}
          <section aria-labelledby="booking-services-title" className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <div>
                <h2 id="booking-services-title" className="flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
                  <Sparkles className="h-5 w-5 text-[var(--color-primary)]" /> Dịch vụ đã đăng ký
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Chỉ dịch vụ được homestay ghi nhận đã sử dụng mới được tính vào quyết toán.</p>
              </div>
              {['PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status) && (
                <button type="button" onClick={() => { setServiceSuccess(''); setServiceSubmitError(''); setServiceModalOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
                  <Plus className="h-4 w-4" /> Thêm dịch vụ
                </button>
              )}
            </div>
            {serviceSuccess && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">{serviceSuccess}</p>}
            {bookingServicesLoading ? (
              <div aria-label="Đang tải dịch vụ" className="mt-4 space-y-3"><div className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" /><div className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" /></div>
            ) : bookingServicesError ? (
              <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                <p>{bookingServicesError}</p>
                <button type="button" onClick={handleRefresh} className="mt-2 font-semibold underline">Tải lại thông tin booking</button>
              </div>
            ) : bookingServices.length === 0 ? (
              <p className="mt-4 rounded-xl bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-body)]">Chưa có dịch vụ nào được đăng ký cho chuyến đi này.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
                {bookingServices.map((service) => {
                  const serviceRoom = booking.rooms?.find((room) => room.roomId === service.roomId);
                  const statusText = service.status === 'USED' ? 'Đã sử dụng' : service.status === 'CANCELLED' ? 'Đã hủy' : 'Đã đăng ký';
                  const statusClass = service.status === 'USED' ? 'bg-emerald-50 text-emerald-800' : service.status === 'CANCELLED' ? 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]' : 'bg-sky-50 text-sky-800';
                  return (
                    <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-ink)]">{service.serviceName}</p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">{serviceRoom?.roomName || `Phòng #${service.roomId}`} · {service.quantity} × {formatVnd(service.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums text-[var(--color-ink)]">{formatVnd(service.totalPrice)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{statusText}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

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

              <form onSubmit={handleSubmitProof} className="space-y-4 border-t border-[var(--color-border)] pt-4">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-ink)]">Gửi chứng từ chuyển khoản</h4>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Quản lý sẽ đối chiếu giao dịch trước khi xác nhận đặt phòng.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-[var(--color-body)]">
                    <span>Số tiền đã chuyển (₫)</span>
                    <input
                      type="number" min="1" step="1" inputMode="numeric"
                      value={depositAmountInput || booking.depositAmount}
                      onChange={(event) => setDepositAmountInput(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-[var(--color-body)]">
                    <span>Nội dung chuyển khoản</span>
                    <input
                      value={referenceCodeInput || instruction.transferContent || booking.code}
                      maxLength={100}
                      onChange={(event) => setReferenceCodeInput(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]"
                      required
                    />
                  </label>
                </div>
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-5 text-center hover:border-[var(--color-primary)]">
                  <Upload className="h-5 w-5 text-[var(--color-muted)]" />
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{proofFile ? proofFile.name : 'Chọn ảnh hoặc PDF chứng từ'}</span>
                  <span className="text-xs text-[var(--color-muted)]">JPG, PNG, WEBP hoặc PDF · tối đa 5 MB</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={handleProofFileChange} />
                </label>
                {proofPreviewUrl && <img src={proofPreviewUrl} alt="Xem trước chứng từ" className="max-h-56 rounded-xl border border-[var(--color-border)] object-contain" />}
                {proofFile?.type === 'application/pdf' && <p className="text-xs text-[var(--color-muted)]">Đã chọn PDF: {proofFile.name}</p>}
                {proofError && <p role="alert" className="text-sm text-rose-700">{proofError}</p>}
                <button type="submit" disabled={proofSubmitting || !proofFile} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" />
                  {proofSubmitting ? 'Đang gửi chứng từ…' : 'Gửi chứng từ'}
                </button>
              </form>
            </div>
          )}

          {/* Lịch sử đặt cọc & thanh toán */}
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-1)] sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-ink)]">
                <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Lịch sử đặt cọc & thanh toán</span>
              </h3>
              {booking.status === 'PENDING_APPROVAL' && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Đang chờ quản lý xác nhận cọc
                </span>
              )}
            </div>

            {booking.payments && booking.payments.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                {booking.payments.map((payment) => {
                  const isDeposit = payment.paymentType === 'DEPOSIT';
                  const isRefund = payment.paymentType === 'REFUND';
                  const title = isDeposit ? 'Tiền đặt cọc' : isRefund ? 'Khoản hoàn tiền' : 'Khoản thanh toán';

                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base text-[var(--color-ink)]">
                            {title}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${payment.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : payment.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-800'
                              }`}
                          >
                            {payment.status === 'CONFIRMED'
                              ? isRefund
                                ? 'Đã hoàn tất'
                                : 'Đã xác nhận'
                              : payment.status === 'REJECTED'
                                ? 'Bị từ chối'
                                : isRefund
                                  ? 'Chờ homestay hoàn tiền'
                                  : 'Đang chờ xác nhận'}
                          </span>
                          <span className="text-xs text-[var(--color-muted)]">
                            · {payment.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                          <span className="text-xs text-[var(--color-muted)]">Số tiền:</span>
                          <span className="font-bold text-base text-[var(--color-ink)]">
                            {formatVnd(payment.amount)}
                          </span>
                        </div>

                        {isRefund && (payment.bankAccountNumber || payment.bankName || payment.bankAccountHolder) && (
                          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-sky-950 space-y-1">
                            <span className="font-semibold block text-sky-900">Tài khoản nhận tiền hoàn:</span>
                            <p className="font-medium">
                              {payment.bankName || 'Ngân hàng'} - <span className="font-mono font-bold text-sky-950">{payment.bankAccountNumber}</span> ({payment.bankAccountHolder})
                            </p>
                          </div>
                        )}

                        {payment.referenceCode && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-[var(--color-muted)]">{isRefund ? 'Mã GD hoàn tiền:' : 'Nội dung CK:'}</span>
                            <span className="break-all font-mono font-semibold text-[var(--color-ink)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                              {payment.referenceCode}
                            </span>
                          </div>
                        )}

                        {payment.rejectionReason && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 space-y-0.5">
                            <p className="font-bold">Lý do từ chối từ homestay:</p>
                            <p>{payment.rejectionReason}</p>
                          </div>
                        )}

                        {payment.note && (
                          <p className="text-xs text-[var(--color-muted)]">
                            Ghi chú: {payment.note}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                          {payment.createdAt && (
                            <span>{isRefund ? 'Yêu cầu lúc:' : 'Gửi lúc:'} {formatDateTime(payment.createdAt)}</span>
                          )}
                          {payment.confirmedAt && (
                            <span>· {isRefund ? 'Đã hoàn lúc:' : 'Xác nhận lúc:'} {formatDateTime(payment.confirmedAt)}</span>
                          )}
                        </div>
                      </div>

                      {payment.proofAvailable && (
                        <div className="shrink-0 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewProofError('');
                              setPreviewProofPayment(payment);
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] shadow-2xs transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Xem chứng từ</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Chưa có khoản đặt cọc hoặc thanh toán nào được ghi nhận.
              </p>
            )}
          </section>

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
                    {finalPaymentTiming}
                  </p>
                </div>
                <span className="text-lg font-bold text-[var(--color-ink)]">
                  {formatVnd(booking.outstandingAmount)}
                </span>
              </div>
            </div>

            {/* Chính sách áp dụng cho đơn đặt phòng */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                  Chính sách áp dụng
                </span>
                <span className="text-[11px] text-[var(--color-muted)]">Đơn #{booking.code}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1. Nhận & trả phòng */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 space-y-1.5">
                  <div className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    <span>Giờ nhận & trả phòng</span>
                  </div>
                  <ul className="text-[var(--color-muted)] space-y-1 pl-5 list-disc">
                    <li>
                      Nhận phòng từ <strong className="text-[var(--color-ink)]">{checkInTime}</strong> ngày {formatDate(booking.checkInDate)}
                    </li>
                    <li>
                      Trả phòng trước <strong className="text-[var(--color-ink)]">{checkOutDeadline}</strong> ngày {formatDate(booking.checkOutDate)}
                    </li>
                  </ul>
                </div>

                {/* 2. Đặt cọc & thanh toán */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 space-y-1.5">
                  <div className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                    <span>Đặt cọc & Thanh toán</span>
                  </div>
                  <ul className="text-[var(--color-muted)] space-y-1 pl-5 list-disc">
                    <li>
                      Tiền đặt cọc: <strong className="text-[var(--color-primary)]">{depositPercent}%</strong> tổng tiền phòng
                    </li>
                    <li>
                      Thời hạn giữ phòng / gửi cọc: trong vòng <strong className="text-[var(--color-ink)]">{holdHours} giờ</strong>
                    </li>
                    <li>
                      Thanh toán còn lại: <strong className="text-[var(--color-ink)]">{finalPaymentTiming}</strong>
                    </li>
                  </ul>
                </div>

                {/* 3. Chính sách hủy & hoàn tiền */}
                {refundRules.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 space-y-1.5">
                    <div className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                      <span>Chính sách hủy & hoàn tiền</span>
                    </div>
                    <ul className="text-[var(--color-muted)] space-y-1 pl-5 list-disc">
                      {refundRules.map((rule, idx) => (
                        <li key={idx}>
                          {rule.description || (
                            rule.daysBeforeCheckIn > 0
                              ? `Hủy trước ≥ ${rule.daysBeforeCheckIn} ngày: hoàn ${rule.refundPercent}% tiền cọc`
                              : `Hủy sát ngày: hoàn ${rule.refundPercent}% tiền cọc`
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Nội quy lưu trú */}
                {houseRules.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 space-y-1.5">
                    <div className="font-semibold text-[var(--color-ink)] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Nội quy lưu trú ({houseRules.length})</span>
                      </span>
                    </div>
                    <ul className="text-[var(--color-muted)] space-y-1 pl-5 list-disc">
                      {(expandHouseRules ? houseRules : houseRules.slice(0, 3)).map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ul>
                    {houseRules.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setExpandHouseRules(!expandHouseRules)}
                        className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        {expandHouseRules ? (
                          <>
                            <ChevronUp className="h-3 w-3" /> Thu gọn
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" /> Xem thêm {houseRules.length - 3} nội quy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
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

      {serviceModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !serviceSubmitting) setServiceModalOpen(false); }}>
          <form onSubmit={handleRegisterService} role="dialog" aria-modal="true" aria-labelledby="register-service-title" className="max-h-[92vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="register-service-title" className="text-lg font-bold text-[var(--color-ink)]">Đăng ký dịch vụ</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Chọn dịch vụ và phòng cần sử dụng. Giá được chốt theo đơn giá hiện tại của homestay.</p>
              </div>
              <button type="button" disabled={serviceSubmitting} onClick={() => setServiceModalOpen(false)} className="rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>

            {serviceCatalogLoading ? (
              <div className="space-y-3" aria-label="Đang tải danh mục dịch vụ"><div className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" /><div className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" /></div>
            ) : serviceCatalogError ? (
              <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                <p>{serviceCatalogError}</p>
                <button type="button" onClick={() => setServiceCatalogReload((current) => current + 1)} className="mt-2 font-semibold underline">Thử tải lại</button>
              </div>
            ) : serviceCatalog.length === 0 ? (
              <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-body)]">Homestay hiện chưa có dịch vụ bổ sung để đăng ký.</div>
            ) : (
              <>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
                  <span>Dịch vụ <span className="text-rose-600">*</span></span>
                  <select required value={serviceIdInput} onChange={(event) => setServiceIdInput(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]">
                    {groupedServiceCatalog.map((group) => (
                      <optgroup key={group.categoryName} label={group.categoryName}>
                        {group.items.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} · {formatVnd(service.unitPrice)} / {service.unit}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
                  <span>Phòng sử dụng dịch vụ <span className="text-rose-600">*</span></span>
                  <select required value={serviceRoomIdInput} onChange={(event) => setServiceRoomIdInput(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]">
                    {booking.rooms?.map((room) => <option key={room.roomId} value={room.roomId}>{room.roomName}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
                    <span>Số lượng <span className="text-rose-600">*</span></span>
                    <input required type="number" min="1" max="2147483647" step="1" value={serviceQuantityInput} onChange={(event) => setServiceQuantityInput(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-ink)]">
                    <span>Ngày sử dụng <span className="font-normal text-[var(--color-muted)]">(tùy chọn)</span></span>
                    <input type="date" min={booking.checkInDate} max={previousDateKey(booking.checkOutDate)} value={serviceDateInput} onChange={(event) => setServiceDateInput(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" />
                  </label>
                </div>
                <OptionalNotePicker label="Ghi chú cho homestay (tùy chọn)" value={serviceNoteInput} onChange={setServiceNoteInput} maxLength={255} placeholder="Nhập yêu cầu riêng cho dịch vụ" options={['Vui lòng liên hệ trước khi phục vụ', 'Tôi sẽ trao đổi thêm với homestay']} />
              </>
            )}

            {serviceSubmitError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{serviceSubmitError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={serviceSubmitting} onClick={() => setServiceModalOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-body)]">Đóng</button>
              <button type="submit" disabled={serviceSubmitting || serviceCatalogLoading || serviceCatalog.length === 0 || Boolean(serviceCatalogError)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
                {serviceSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{serviceSubmitting ? 'Đang đăng ký…' : 'Đăng ký dịch vụ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cancelSubmitting) setCancelModalOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-booking-title"
            onSubmit={handleCancelBooking}
            className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6"
          >
            <div>
              <h2 id="cancel-booking-title" className="text-lg font-bold text-[var(--color-ink)]">Hủy đơn đặt phòng?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Phòng sẽ được mở lại sau khi hủy. Số tiền hoàn (nếu có) được tính theo chính sách áp dụng cho đơn này và sẽ do homestay xử lý.
              </p>
            </div>

            {confirmedDepositAmount > 0 && (
              <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950">
                <div>
                  <p className="font-semibold text-sky-950">
                    Đơn đã cọc {formatVnd(confirmedDepositAmount)}. Vui lòng cung cấp tài khoản nhận tiền hoàn:
                  </p>
                  <p className="text-2xs text-sky-800 mt-0.5">Homestay sẽ đối soát và chuyển khoản hoàn tiền vào tài khoản này.</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-2xs font-semibold text-sky-950 mb-1">
                      Ngân hàng <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      list="customer-cancel-bank-list"
                      required
                      value={cancelBankName}
                      onChange={(e) => setCancelBankName(e.target.value)}
                      placeholder="Chọn hoặc nhập tên ngân hàng"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                    />
                    <datalist id="customer-cancel-bank-list">
                      <option value="Vietcombank" />
                      <option value="Techcombank" />
                      <option value="MB Bank" />
                      <option value="BIDV" />
                      <option value="VietinBank" />
                      <option value="Agribank" />
                      <option value="ACB" />
                      <option value="VPBank" />
                      <option value="TPBank" />
                      <option value="VIB" />
                      <option value="Sacombank" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-sky-950 mb-1">
                      Số tài khoản <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cancelBankAccountNumber}
                      onChange={(e) => setCancelBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={20}
                      placeholder="Nhập số tài khoản ngân hàng (6-20 chữ số)"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-sky-950 mb-1">
                      Tên chủ tài khoản <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cancelBankAccountHolder}
                      onChange={(e) => setCancelBankAccountHolder(normalizeBankAccountHolder(e.target.value))}
                      maxLength={50}
                      placeholder="VD: NGUYEN VAN A"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-semibold uppercase outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            <OptionalNotePicker label="Lý do hủy (không bắt buộc)" value={cancelReason} onChange={setCancelReason} placeholder="Nhập lý do riêng (không bắt buộc)" options={['Thay đổi kế hoạch chuyến đi', 'Không còn nhu cầu lưu trú', 'Lý do cá nhân']} />
            {cancelError && <p role="alert" className="text-sm text-rose-700">{cancelError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelError('');
                }}
                className="min-h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50"
              >
                Giữ đơn đặt phòng
              </button>
              <button
                type="submit"
                disabled={cancelSubmitting || cancelReason.length > 255}
                className="min-h-10 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewProofPayment && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewProofPayment(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-preview-title"
            className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[var(--shadow-2)] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <h2 id="proof-preview-title" className="text-lg font-bold text-[var(--color-ink)]">
                  Chứng từ thanh toán / đặt cọc
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Đơn đặt #{booking.code} · Khoản {previewProofPayment.paymentType === 'DEPOSIT' ? 'cọc' : previewProofPayment.paymentType === 'REFUND' ? 'hoàn' : 'thanh toán'} #{previewProofPayment.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofPayment(null)}
                className="rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 rounded-xl bg-[var(--color-surface-soft)] p-3.5 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-[var(--color-muted)]">Số tiền giao dịch</span>
                <p className="mt-0.5 font-bold text-[var(--color-ink)]">{formatVnd(previewProofPayment.amount)}</p>
              </div>
              <div>
                <span className="text-xs text-[var(--color-muted)]">Nội dung chuyển khoản</span>
                <p className="mt-0.5 break-all font-mono text-xs font-semibold text-[var(--color-ink)]">
                  {previewProofPayment.referenceCode || '—'}
                </p>
              </div>
            </div>

            <div className="min-h-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
              {previewProofUrl ? (
                previewProofPayment.proofMimeType?.startsWith('image/') ? (
                  <img
                    src={previewProofUrl}
                    alt="Chứng từ chuyển khoản"
                    className="mx-auto max-h-[60vh] rounded-lg object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center p-4">
                    <FileText className="h-10 w-10 text-[var(--color-muted)]" />
                    <p className="text-sm font-medium text-[var(--color-ink)]">Tệp chứng từ PDF</p>
                    <a
                      href={previewProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Mở xem chứng từ PDF</span>
                    </a>
                  </div>
                )
              ) : previewProofError ? (
                <div className="py-8 text-center text-sm text-rose-600">
                  {previewProofError}
                </div>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-[var(--color-muted)]">
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                  <span>Đang tải chứng từ…</span>
                </div>
              )}
            </div>

            {previewProofPayment.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <strong className="font-semibold">Lý do từ chối từ homestay:</strong>{' '}
                {previewProofPayment.rejectionReason}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewProofPayment(null)}
                className="min-h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
