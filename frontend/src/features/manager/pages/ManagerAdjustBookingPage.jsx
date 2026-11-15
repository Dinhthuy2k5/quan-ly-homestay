import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  DoorOpen,
  Edit3,
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { adjustManagerBookingApi, fetchManagerBookingDetailApi } from '../api';
import { searchAvailableRooms } from '../../homestays/api';
import { formatDate, formatVnd, getNextDate, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import OptionalNotePicker from '../../../components/ui/OptionalNotePicker';

export default function ManagerAdjustBookingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext();
  const homestayFromContext = outletContext?.homestay;

  const [booking, setBooking] = useState(() => {
    const stateBooking = location.state?.booking;
    if (stateBooking) {
      return {
        ...stateBooking,
        homestayId: stateBooking.homestayId || homestayFromContext?.id,
        homestayName: stateBooking.homestayName || homestayFromContext?.name,
      };
    }
    return null;
  });
  const [loadingInitial, setLoadingInitial] = useState(!location.state?.booking?.homestayId);
  const [fetchError, setFetchError] = useState('');

  // Luôn tải chi tiết booking đầy đủ để có homestayId, roomTypeName, maxGuests và trạng thái mới nhất
  useEffect(() => {
    let active = true;
    if (!booking?.homestayId || !booking?.rooms?.[0]?.maxGuests) {
      setLoadingInitial(true);
    }
    setFetchError('');
    fetchManagerBookingDetailApi(bookingId)
      .then((data) => {
        if (!active) return;
        setBooking(data);
      })
      .catch((err) => {
        if (!active) return;
        const code = err.response?.data?.error?.code;
        if (code === 'HOMESTAY_SCOPE_VIOLATION') {
          setFetchError('Đơn đặt phòng này không thuộc cơ sở homestay bạn được giao quản lý.');
        } else if (code === 'BOOKING_NOT_FOUND') {
          setFetchError('Không tìm thấy đơn đặt phòng yêu cầu.');
        } else {
          setFetchError(getErrorMessage(err) || 'Không thể tải thông tin đơn đặt phòng.');
        }
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const isConfirmed = booking?.status === 'CONFIRMED';

  // Tính ngày check-in tối thiểu cho phép theo chính sách homestay
  const minCheckInStr = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDays = isConfirmed ? 3 : 0;
    today.setDate(today.getDate() + minDays);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [isConfirmed]);

  // Form states
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [reason, setReason] = useState('');

  // Phòng ban đầu và phòng được chọn
  const originalRooms = useMemo(() => booking?.rooms || [], [booking?.rooms]);
  const initialRoomIds = useMemo(() => originalRooms.map((r) => r.roomId), [originalRooms]);
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());

  // Tra cứu phòng trống mới
  const [availableRooms, setAvailableRooms] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isChangingRooms, setIsChangingRooms] = useState(false);

  // Trạng thái gửi form
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Đồng bộ giá trị mặc định khi có dữ liệu booking
  useEffect(() => {
    if (booking) {
      setCheckInDate(booking.checkInDate || '');
      setCheckOutDate(booking.checkOutDate || '');
      setGuestCount(booking.guestCount || 2);
      setSelectedRoomIds(new Set(booking.rooms?.map((r) => r.roomId) || []));
    }
  }, [booking]);

  const nights = useMemo(() => {
    return checkInDate && checkOutDate && checkOutDate > checkInDate
      ? nightsBetween(checkInDate, checkOutDate)
      : 0;
  }, [checkInDate, checkOutDate]);

  const originalNights = useMemo(() => {
    return booking?.checkInDate && booking?.checkOutDate
      ? nightsBetween(booking.checkInDate, booking.checkOutDate)
      : 0;
  }, [booking?.checkInDate, booking?.checkOutDate]);

  // Tra cứu danh sách phòng trống trong khoảng ngày mới
  const handleLoadAvailableRooms = async () => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setFormError('Vui lòng chọn ngày nhận phòng và ngày trả phòng hợp lệ trước khi tìm phòng trống.');
      return;
    }

    const targetHomestayId = booking?.homestayId || homestayFromContext?.id;
    if (!targetHomestayId) {
      setFormError('Không xác định được cơ sở homestay của đơn đặt phòng.');
      return;
    }

    setFormError('');
    setLoadingRooms(true);
    try {
      const result = await searchAvailableRooms({
        homestayId: targetHomestayId,
        checkInDate,
        checkOutDate,
        guestCount: 1,
        page: 0,
        size: 50,
      });
      setAvailableRooms(result.items || []);
      setIsChangingRooms(true);
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Không thể tải danh sách phòng còn trống.');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Tra cứu thông tin hiển thị phòng
  const roomsMap = useMemo(() => {
    const map = new Map();
    originalRooms.forEach((r) => {
      map.set(r.roomId, {
        roomId: r.roomId,
        roomName: r.roomName || r.name,
        roomTypeName: r.roomTypeName || null,
        maxGuests: r.maxGuests || 2,
        isOriginal: true,
      });
    });
    (availableRooms || []).forEach((ar) => {
      const rId = ar.roomId ?? ar.id;
      if (!map.has(rId)) {
        map.set(rId, {
          roomId: rId,
          roomName: ar.roomName || ar.name,
          roomTypeName: ar.roomTypeName || null,
          maxGuests: ar.maxGuests || 2,
          isOriginal: false,
        });
      }
    });
    return map;
  }, [originalRooms, availableRooms]);

  // Sức chứa tối đa của các phòng đang chọn
  const totalCapacity = useMemo(() => {
    let sum = 0;
    selectedRoomIds.forEach((id) => {
      const r = roomsMap.get(id);
      if (r) sum += r.maxGuests || 2;
    });
    return sum;
  }, [selectedRoomIds, roomsMap]);

  const toggleRoomSelection = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        if (next.size === 1) {
          setFormError('Đơn đặt phòng cần giữ ít nhất một phòng.');
          return prev;
        }
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setFormError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }

    if (checkInDate < minCheckInStr) {
      setFormError(
        isConfirmed
          ? `Chính sách homestay yêu cầu điều chỉnh trước ngày nhận phòng tối thiểu 3 ngày (từ ${minCheckInStr} trở đi).`
          : 'Ngày nhận phòng không được ở trong quá khứ.'
      );
      return;
    }

    if (selectedRoomIds.size === 0) {
      setFormError('Đơn đặt phòng phải có ít nhất một phòng.');
      return;
    }

    if (Number(guestCount) > totalCapacity && totalCapacity > 0) {
      setFormError(`Số khách (${guestCount}) vượt quá tổng sức chứa tối đa của các phòng đã chọn (${totalCapacity} khách).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
      };

      if (reason && reason.trim()) {
        payload.reason = reason.trim();
      }

      const hasRoomsChanged =
        selectedRoomIds.size !== initialRoomIds.length ||
        initialRoomIds.some((id) => !selectedRoomIds.has(id));

      if (hasRoomsChanged || isChangingRooms) {
        payload.roomIds = Array.from(selectedRoomIds);
      }

      const result = await adjustManagerBookingApi(booking.id, payload);

      // Điều hướng về trang chi tiết đơn và hiển thị thông báo thành công
      navigate(`/manager/bookings/${booking.id}`, {
        state: {
          adjustSuccessToast: `Đã điều chỉnh đơn #${result.code || booking.code} thành công! Tổng tiền phòng mới: ${formatVnd(result.roomTotalPrice)}.`,
        },
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'ADJUSTMENT_WINDOW_CLOSED') {
        setFormError('Đơn phòng đã qua thời hạn được phép điều chỉnh theo chính sách (ít nhất 3 ngày trước ngày nhận phòng).');
      } else if (code === 'ROOM_NOT_AVAILABLE') {
        setFormError('Một hoặc nhiều phòng không còn trống trong khoảng thời gian đã chọn (đã được đặt bởi đơn khác).');
      } else if (code === 'ROOM_LOCKED') {
        setFormError('Một hoặc nhiều phòng hiện đang bị khóa hoặc bảo trì, không thể tiếp nhận đặt phòng.');
      } else if (code === 'ROOM_CAPACITY_EXCEEDED') {
        setFormError('Số khách vượt quá tổng sức chứa của các phòng đã chọn.');
      } else if (code === 'BOOKING_STATE_CONFLICT') {
        setFormError('Trạng thái đơn đặt phòng hiện tại không cho phép điều chỉnh (hoặc đã hết hạn giữ chỗ).');
      } else if (code === 'PRICE_RECALCULATION_REQUIRED') {
        setFormError('Không thể tính toán lại giá phòng hợp lệ cho các đêm đã chọn.');
      } else if (code === 'HOMESTAY_SCOPE_VIOLATION') {
        setFormError('Đơn đặt phòng không thuộc cơ sở homestay bạn được phân công quản lý.');
      } else {
        setFormError(getErrorMessage(err) || 'Không thể điều chỉnh đơn đặt phòng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình tải ban đầu
  if (loadingInitial) {
    return (
      <div className="w-full space-y-6 animate-pulse pb-12">
        <div className="h-6 w-44 rounded bg-[var(--color-surface-soft)]" />
        <div className="h-28 w-full rounded-2xl bg-[var(--color-surface-soft)]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-56 rounded-2xl bg-[var(--color-surface-soft)]" />
            <div className="h-72 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-80 rounded-2xl bg-[var(--color-surface-soft)]" />
          </div>
        </div>
      </div>
    );
  }

  // Màn hình lỗi tải booking
  if (fetchError || !booking) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-600 mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)]">Không thể hiển thị đơn đặt phòng</h2>
        <p className="text-sm sm:text-base text-[var(--color-body)] leading-relaxed">{fetchError || 'Đơn đặt phòng không tồn tại.'}</p>
        <div className="pt-2">
          <Link
            to="/manager/bookings"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm sm:text-base font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách đơn</span>
          </Link>
        </div>
      </div>
    );
  }

  // Kiểm tra quyền điều chỉnh
  const isAdjustable =
    booking.source === 'MANAGER' &&
    ['PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status);

  if (!isAdjustable) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700 mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)]">Đơn không thể điều chỉnh</h2>
        <p className="text-sm sm:text-base text-[var(--color-body)] leading-relaxed">
          Chỉ đơn do quản lý đặt hộ ở trạng thái <strong>Chờ cọc</strong>, <strong>Chờ duyệt</strong> hoặc <strong>Đã xác nhận</strong> mới được phép điều chỉnh. Đơn khách tự đặt trực tuyến hoặc đơn đã hủy không áp dụng tính năng này.
        </p>
        <div className="pt-2">
          <Link
            to={`/manager/bookings/${booking.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm sm:text-base font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại chi tiết đơn đặt</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Top Navigation & Title Header ──────────────────────── */}
      <div className="space-y-3">
        <Link
          to={`/manager/bookings/${booking.id}`}
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại chi tiết đơn đặt phòng #{booking.code}</span>
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
              <Edit3 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
                  Điều chỉnh đơn đặt #{booking.code}
                </h1>
                {booking.homestayName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs sm:text-sm font-semibold text-[var(--color-body)] border border-[var(--color-border)]">
                    {booking.homestayName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-semibold text-emerald-800 border border-emerald-200">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Quản lý đặt hộ</span>
                </span>
              </div>
              <p className="text-sm sm:text-base text-[var(--color-muted)] mt-1">
                Khách đại diện: <strong className="text-[var(--color-ink)] font-semibold">{booking.contactName}</strong> ({booking.contactPhone}) • Trạng thái: {booking.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Form Error Banner */}
      {formError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError('')}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Main Form Layout (2 Columns) ───────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Inputs (7 / 12 width) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card Chính sách & Quy tắc điều chỉnh */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)]">
                {isConfirmed ? 'Quy tắc điều chỉnh đơn đã xác nhận (CONFIRMED)' : 'Quy tắc điều chỉnh đơn chờ cọc / chờ duyệt'}
              </h3>
            </div>
            <p className="text-sm sm:text-base text-[var(--color-body)] leading-relaxed">
              {isConfirmed
                ? 'Quản lý có thể thay đổi ngày lưu trú hoặc đổi/thêm/bớt phòng nếu còn ít nhất 3 ngày trước ngày nhận phòng. Tiền cọc khách đã chuyển được GIỮ NGUYÊN; hệ thống tính lại tổng tiền phòng mới, số tiền thừa/thiếu còn lại sẽ được quyết toán toàn bộ lúc khách Check-out.'
                : 'Quản lý có thể thay đổi ngày, số khách hoặc đổi/thêm/bớt phòng cho khách. Tổng tiền phòng và số tiền cọc cần thu sẽ được tự động tính toán lại theo giá các đêm lưu trú mới.'}
            </p>
          </div>

          {/* Card 1: Lịch trình lưu trú & Số lượng khách */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>1. Lịch trình lưu trú & Số khách</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Thiết lập khoảng ngày mới và số lượng khách lưu trú
                </p>
              </div>
              {nights > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs sm:text-sm font-bold text-[var(--color-primary)]">
                  <Clock className="h-4 w-4" />
                  <span>{nights} đêm lưu trú</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ngày nhận phòng */}
              <div>
                <label htmlFor="adj-check-in-date" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Ngày nhận phòng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="adj-check-in-date"
                    type="date"
                    required
                    min={minCheckInStr}
                    disabled={submitting}
                    value={checkInDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCheckInDate(val);
                      if (checkOutDate && val >= checkOutDate) {
                        setCheckOutDate(getNextDate(val));
                      }
                      setAvailableRooms(null);
                      setIsChangingRooms(false);
                    }}
                    className="h-11 sm:h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]"
                  />
                </div>
                <span className="mt-1 block text-xs sm:text-sm text-[var(--color-muted)]">Nhận phòng từ {CHECK_IN_TIME} (Tối thiểu từ {minCheckInStr})</span>
              </div>

              {/* Ngày trả phòng */}
              <div>
                <label htmlFor="adj-check-out-date" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Ngày trả phòng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="adj-check-out-date"
                    type="date"
                    required
                    min={checkInDate ? getNextDate(checkInDate) : minCheckInStr}
                    disabled={submitting}
                    value={checkOutDate}
                    onChange={(e) => {
                      setCheckOutDate(e.target.value);
                      setAvailableRooms(null);
                      setIsChangingRooms(false);
                    }}
                    className="h-11 sm:h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]"
                  />
                </div>
                <span className="mt-1 block text-xs sm:text-sm text-[var(--color-muted)]">Trả phòng trước {CHECK_OUT_DEADLINE}</span>
              </div>
            </div>

            {/* Số khách & Lý do */}
            <div className="space-y-4 pt-1">
              <div>
                <label htmlFor="adj-guest-count" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Số lượng khách <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="adj-guest-count"
                    type="number"
                    min={1}
                    max={50}
                    required
                    disabled={submitting}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-11 sm:h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]"
                  />
                </div>
                {totalCapacity > 0 && (
                  <span className={`mt-1 block text-xs sm:text-sm font-medium ${Number(guestCount) > totalCapacity ? 'text-rose-600 font-bold' : 'text-[var(--color-muted)]'}`}>
                    Tổng sức chứa các phòng đã chọn: {totalCapacity} khách
                  </span>
                )}
              </div>

              <div>
                <OptionalNotePicker
                  label="Lý do điều chỉnh (không bắt buộc)"
                  value={reason}
                  onChange={setReason}
                  maxLength={500}
                  rows={2}
                  placeholder="Nhập lý do điều chỉnh đơn (nếu có)..."
                  options={['Khách yêu cầu đổi ngày', 'Khách yêu cầu đổi phòng', 'Điều chỉnh số lượng khách', 'Cập nhật thông tin đặt phòng']}
                />
                <span className="mt-1 block text-xs sm:text-sm text-[var(--color-muted)]">Lý do điều chỉnh sẽ được lưu vào nhật ký ghi chú của đơn đặt phòng.</span>
              </div>
            </div>
          </div>

          {/* Card 2: Danh sách phòng đặt & Đổi/Thêm phòng */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                  <DoorOpen className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>2. Phòng được chọn ({selectedRoomIds.size} phòng)</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Bấm Đổi / Thêm phòng để tra cứu các phòng trống trong khoảng thời gian mới
                </p>
              </div>

              {!isChangingRooms && (
                <button
                  type="button"
                  onClick={handleLoadAvailableRooms}
                  disabled={loadingRooms || !checkInDate || !checkOutDate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary-disabled)] bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingRooms ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang kiểm tra phòng trống…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Đổi / Thêm phòng khác</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Danh sách các phòng hiện đang chọn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from(selectedRoomIds).map((roomId) => {
                const roomInfo = roomsMap.get(roomId);
                return (
                  <div
                    key={roomId}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-gray-50/70 p-3.5 text-sm sm:text-base"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <p className="font-bold text-sm sm:text-base text-[var(--color-ink)] truncate">
                        {roomInfo?.roomName || `Phòng #${roomId}`}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--color-muted)] truncate">
                        {roomInfo?.roomTypeName ? `${roomInfo.roomTypeName} • ` : ''}Tối đa {roomInfo?.maxGuests || 2} khách
                      </p>
                    </div>

                    {isChangingRooms && (
                      <button
                        type="button"
                        onClick={() => toggleRoomSelection(roomId)}
                        disabled={selectedRoomIds.size === 1}
                        title={selectedRoomIds.size === 1 ? 'Đơn phòng phải có ít nhất 1 phòng' : 'Bỏ chọn phòng này'}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Khung danh sách phòng trống để Quản lý thêm/đổi */}
            {isChangingRooms && (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <span className="text-xs sm:text-sm font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                    <DoorOpen className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>Phòng trống khả dụng từ {formatDate(checkInDate)} đến {formatDate(checkOutDate)}:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangingRooms(false)}
                    className="text-xs sm:text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] underline"
                  >
                    Thu gọn
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--color-border)]">
                  {!availableRooms || availableRooms.length === 0 ? (
                    <p className="py-4 text-center text-xs sm:text-sm text-[var(--color-muted)] italic">
                      Không còn phòng trống khác trong khoảng ngày này.
                    </p>
                  ) : (
                    availableRooms.map((room) => {
                      const rId = room.roomId ?? room.id;
                      const isSelected = selectedRoomIds.has(rId);
                      return (
                        <div
                          key={rId}
                          className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-[var(--color-ink)]">
                              {room.roomName || room.name}
                            </p>
                            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                              {room.roomTypeName ? `${room.roomTypeName} • ` : ''}Sức chứa: {room.maxGuests || 2} khách
                              {room.basePrice ? ` • ${formatVnd(room.basePrice)}/đêm` : ''}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleRoomSelection(rId)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-4 w-4 stroke-[3]" />
                                <span>Đã chọn</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                <span>Thêm phòng</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Summary & Action (5 / 12 width) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-[var(--color-border)] pb-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Tóm tắt thay đổi đơn</span>
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                So sánh thông tin trước và sau khi điều chỉnh
              </p>
            </div>

            {/* Quick Summary Comparison */}
            <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-3 border border-[var(--color-border)] text-sm sm:text-base">
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Lịch trình trước:</span>
                <span className="font-semibold text-[var(--color-muted)] line-through">
                  {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)} ({originalNights} đêm)
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Lịch trình mới:</span>
                <span className="font-bold text-[var(--color-ink)]">
                  {formatDate(checkInDate)} → {formatDate(checkOutDate)} ({nights} đêm)
                </span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-2.5 flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Số khách khai báo:</span>
                <span className="font-bold text-[var(--color-ink)]">{guestCount} người</span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Tổng sức chứa phòng:</span>
                <span className={`font-bold ${guestCount > totalCapacity && totalCapacity > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {totalCapacity} khách ({selectedRoomIds.size} phòng)
                </span>
              </div>
            </div>

            {/* Guest capacity warning */}
            {guestCount > totalCapacity && totalCapacity > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo sức chứa:</strong> Số khách đăng ký ({guestCount}) vượt quá tổng sức chứa tối đa của các phòng đã chọn ({totalCapacity} khách). Vui lòng chọn thêm phòng.
                </div>
              </div>
            )}

            {/* Financial Guidance Note */}
            <div className="rounded-xl bg-blue-50/60 p-3.5 text-xs sm:text-sm text-blue-900 border border-blue-100 flex items-start gap-2.5">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {isConfirmed ? (
                  <>
                    Khoản tiền cọc đã thu <strong>{formatVnd(booking.depositAmount)}</strong> được giữ nguyên. Sau khi điều chỉnh, hệ thống sẽ tính lại tổng tiền phòng và phần chênh lệch sẽ được thu/hoàn lúc khách trả phòng (Check-out).
                  </>
                ) : (
                  <>
                    Hệ thống sẽ tự động tính lại tổng tiền phòng và tiền cọc cần thu theo bảng giá của các đêm lưu trú mới.
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting || selectedRoomIds.size === 0 || (guestCount > totalCapacity && totalCapacity > 0)}
                className="w-full inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm sm:text-base font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span>Đang cập nhật điều chỉnh…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 stroke-[2.5]" />
                    <span>Xác nhận điều chỉnh đơn</span>
                  </>
                )}
              </button>

              <Link
                to={`/manager/bookings/${booking.id}`}
                className="w-full inline-flex h-11 sm:h-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-sm sm:text-base font-semibold text-[var(--color-body)] shadow-xs hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                Hủy bỏ
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
