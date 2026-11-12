import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  DoorOpen,
  Edit3,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { adjustManagerBookingApi } from '../api';
import { searchAvailableRooms } from '../../homestays/api';
import { formatDate, formatVnd, getNextDate, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';

export default function ManagerAdjustBookingModal({
  booking,
  onClose,
  onSuccess,
}) {
  const isConfirmed = booking.status === 'CONFIRMED';

  // Tính ngày checkIn tối thiểu cho phép theo chính sách
  const [minCheckInStr] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDays = booking.status === 'CONFIRMED' ? 3 : 0;
    today.setDate(today.getDate() + minDays);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [checkInDate, setCheckInDate] = useState(booking.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(booking.checkOutDate || '');
  const [guestCount, setGuestCount] = useState(booking.guestCount || 2);
  const [reason, setReason] = useState('');

  // Danh sách phòng ban đầu trong booking
  const originalRooms = useMemo(() => booking.rooms || [], [booking.rooms]);
  const initialRoomIds = useMemo(() => originalRooms.map((r) => r.roomId), [originalRooms]);

  // Quản lý các phòng được chọn cho đơn điều chỉnh
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set(initialRoomIds));
  const [isChangingRooms, setIsChangingRooms] = useState(false);
  const [availableRooms, setAvailableRooms] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nights = checkInDate && checkOutDate && checkOutDate > checkInDate
    ? nightsBetween(checkInDate, checkOutDate)
    : 0;

  // Tải danh sách phòng trống của cơ sở homestay trong khoảng ngày mới
  const handleLoadAvailableRooms = async () => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setError('Vui lòng chọn ngày nhận phòng và ngày trả phòng hợp lệ trước khi tìm phòng trống.');
      return;
    }
    setError('');
    setLoadingRooms(true);
    try {
      const result = await searchAvailableRooms({
        homestayId: booking.homestayId,
        checkInDate,
        checkOutDate,
        guestCount: 1, // Lấy toàn bộ phòng còn trống
        page: 0,
        size: 50,
      });
      setAvailableRooms(result.items || []);
      setIsChangingRooms(true);
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách phòng còn trống.');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Tra cứu metadata phòng để hiển thị trực quan
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

  // Tính tổng sức chứa tối đa của các phòng đã chọn
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
          setError('Đơn đặt phòng cần giữ ít nhất một phòng.');
          return prev;
        }
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }

    if (checkInDate < minCheckInStr) {
      setError(
        isConfirmed
          ? `Chính sách homestay yêu cầu điều chỉnh trước ngày nhận phòng tối thiểu 3 ngày (từ ${minCheckInStr} trở đi).`
          : 'Ngày nhận phòng không được ở trong quá khứ.'
      );
      return;
    }

    if (selectedRoomIds.size === 0) {
      setError('Đơn đặt phòng phải có ít nhất một phòng.');
      return;
    }

    if (Number(guestCount) > totalCapacity && totalCapacity > 0) {
      setError(`Số khách (${guestCount}) vượt quá tổng sức chứa tối đa của các phòng đã chọn (${totalCapacity} khách).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
      };

      if (reason && reason.trim()) {
        payload.reason = reason.trim();
      }

      // Gửi danh sách phòng nếu có thay đổi hoặc đã mở thay đổi phòng
      const hasRoomsChanged =
        selectedRoomIds.size !== initialRoomIds.length ||
        initialRoomIds.some((id) => !selectedRoomIds.has(id));

      if (hasRoomsChanged || isChangingRooms) {
        payload.roomIds = Array.from(selectedRoomIds);
      }

      const result = await adjustManagerBookingApi(booking.id, payload);
      onSuccess(result);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'ADJUSTMENT_WINDOW_CLOSED') {
        setError('Đơn phòng đã qua thời hạn được phép điều chỉnh theo chính sách (ít nhất 3 ngày trước ngày nhận phòng).');
      } else if (code === 'ROOM_NOT_AVAILABLE') {
        setError('Một hoặc nhiều phòng không còn trống trong khoảng thời gian đã chọn (đã được đặt bởi đơn khác).');
      } else if (code === 'ROOM_LOCKED') {
        setError('Một hoặc nhiều phòng hiện đang bị khóa hoặc bảo trì, không thể tiếp nhận đặt phòng.');
      } else if (code === 'ROOM_CAPACITY_EXCEEDED') {
        setError('Số khách vượt quá tổng sức chứa của các phòng đã chọn.');
      } else if (code === 'BOOKING_STATE_CONFLICT') {
        setError('Trạng thái đơn đặt phòng hiện tại không cho phép điều chỉnh (hoặc đã hết hạn giữ chỗ).');
      } else if (code === 'PRICE_RECALCULATION_REQUIRED') {
        setError('Không thể tính toán lại giá phòng hợp lệ cho các đêm đã chọn.');
      } else if (code === 'HOMESTAY_SCOPE_VIOLATION') {
        setError('Đơn đặt phòng không thuộc cơ sở homestay bạn được phân công quản lý.');
      } else {
        setError(getErrorMessage(err) || 'Không thể điều chỉnh đơn đặt phòng.');
      }
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-adjust-booking-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-2)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="manager-adjust-booking-title" className="text-lg font-bold text-[var(--color-ink)]">
                Điều chỉnh đơn đặt #{booking.code}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                {booking.homestayName || `Homestay #${booking.homestayId}`} • Khách: <strong className="text-[var(--color-ink)]">{booking.contactName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ điều chỉnh"
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form điều chỉnh */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Thông tin chính sách */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-xs sm:text-sm text-[var(--color-ink)] flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-body)] mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {isConfirmed
                  ? 'Quy tắc điều chỉnh đơn đã xác nhận (CONFIRMED):'
                  : 'Quy tắc điều chỉnh đơn chờ duyệt (PENDING_APPROVAL) / chờ cọc (PENDING_DEPOSIT):'}
              </p>
              <p className="text-[var(--color-body)] leading-relaxed text-xs sm:text-sm">
                {isConfirmed
                  ? 'Quản lý có thể thay đổi ngày lưu trú hoặc đổi/thêm/bớt phòng nếu còn ít nhất 3 ngày trước ngày nhận phòng. Tiền cọc khách đã chuyển được GIỮ NGUYÊN; hệ thống tính lại tổng tiền phòng mới, số tiền thừa/thiếu còn lại sẽ được quyết toán toàn bộ lúc khách Check-out.'
                  : 'Quản lý có thể thay đổi ngày, số khách hoặc đổi/thêm/bớt phòng cho khách. Tổng tiền phòng và số tiền cọc cần thu sẽ được tự động tính toán lại theo giá các đêm lưu trú mới.'}
              </p>
            </div>
          </div>

          {/* Ngày nhận và ngày trả phòng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mgr-adj-check-in" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Ngày nhận phòng</span>
              </label>
              <input
                id="mgr-adj-check-in"
                type="date"
                required
                min={minCheckInStr}
                value={checkInDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setCheckInDate(val);
                  if (checkOutDate && val >= checkOutDate) {
                    setCheckOutDate(getNextDate(val));
                  }
                  // Reset danh sách phòng trống cần tìm lại
                  setAvailableRooms(null);
                  setIsChangingRooms(false);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[11px] sm:text-xs text-[var(--color-muted)]">Nhận phòng từ {CHECK_IN_TIME}</span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mgr-adj-check-out" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Ngày trả phòng</span>
              </label>
              <input
                id="mgr-adj-check-out"
                type="date"
                required
                min={checkInDate ? getNextDate(checkInDate) : minCheckInStr}
                value={checkOutDate}
                onChange={(e) => {
                  setCheckOutDate(e.target.value);
                  setAvailableRooms(null);
                  setIsChangingRooms(false);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[11px] sm:text-xs text-[var(--color-muted)]">Trả phòng trước {CHECK_OUT_DEADLINE}</span>
            </div>
          </div>

          {/* Số lượng khách và lý do điều chỉnh */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mgr-adj-guest-count" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                <Users className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Số khách</span>
              </label>
              <input
                id="mgr-adj-guest-count"
                type="number"
                min="1"
                max="50"
                required
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {totalCapacity > 0 && (
                <span className={`text-[11px] sm:text-xs ${Number(guestCount) > totalCapacity ? 'text-rose-600 font-semibold' : 'text-[var(--color-muted)]'}`}>
                  Sức chứa: {totalCapacity} khách
                </span>
              )}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="mgr-adj-reason" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                <FileText className="h-4 w-4 text-[var(--color-muted)]" />
                <span>Lý do điều chỉnh (tùy chọn)</span>
              </label>
              <input
                id="mgr-adj-reason"
                type="text"
                placeholder="VD: Khách yêu cầu đổi ngày, thay đổi số người..."
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[11px] sm:text-xs text-[var(--color-muted)]">Ghi nhận vào nhật ký ghi chú đơn đặt phòng</span>
            </div>
          </div>

          {/* Dải tóm tắt nhanh số đêm và phòng */}
          {nights > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-soft)] p-3.5 text-xs sm:text-sm">
              <span className="text-[var(--color-body)]">
                Lưu trú: <strong className="text-[var(--color-ink)]">{nights} đêm</strong> ({formatDate(checkInDate)} – {formatDate(checkOutDate)})
              </span>
              <span className="text-[var(--color-body)]">
                Số phòng chọn: <strong className="text-[var(--color-primary)]">{selectedRoomIds.size} phòng</strong>
              </span>
            </div>
          )}

          {/* Danh sách phòng đã chọn & Tùy chọn đổi phòng */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                <DoorOpen className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Phòng được chọn ({selectedRoomIds.size} phòng)</span>
              </label>

              {!isChangingRooms && (
                <button
                  type="button"
                  onClick={handleLoadAvailableRooms}
                  disabled={loadingRooms || !checkInDate || !checkOutDate}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.from(selectedRoomIds).map((roomId) => {
                const roomInfo = roomsMap.get(roomId);
                return (
                  <div
                    key={roomId}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-gray-50/70 p-3 text-xs sm:text-sm"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-bold text-[var(--color-ink)] truncate">
                        {roomInfo?.roomName || `Phòng #${roomId}`}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] truncate">
                        {roomInfo?.roomTypeName ? `${roomInfo.roomTypeName} • ` : ''}Tối đa {roomInfo?.maxGuests || 2} khách
                      </p>
                    </div>

                    {isChangingRooms && (
                      <button
                        type="button"
                        onClick={() => toggleRoomSelection(roomId)}
                        disabled={selectedRoomIds.size === 1}
                        title={selectedRoomIds.size === 1 ? 'Đơn phòng phải có ít nhất 1 phòng' : 'Bỏ chọn phòng này'}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Danh sách phòng còn trống để Quản lý thêm/đổi */}
            {isChangingRooms && (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <span className="text-xs sm:text-sm font-bold text-[var(--color-ink)]">
                    Phòng trống trong khoảng ngày đã chọn:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangingRooms(false)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] underline"
                  >
                    Thu gọn
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--color-border)]">
                  {!availableRooms || availableRooms.length === 0 ? (
                    <p className="py-3 text-center text-xs text-[var(--color-muted)] italic">
                      Không còn phòng trống khác trong khoảng ngày này.
                    </p>
                  ) : (
                    availableRooms.map((room) => {
                      const rId = room.roomId ?? room.id;
                      const isSelected = selectedRoomIds.has(rId);
                      return (
                        <div
                          key={rId}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs sm:text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[var(--color-ink)]">
                              {room.roomName || room.name}
                            </p>
                            <p className="text-[11px] sm:text-xs text-[var(--color-muted)]">
                              {room.roomTypeName ? `${room.roomTypeName} • ` : ''}Sức chứa: {room.maxGuests || 2} khách
                              {room.basePrice ? ` • ${formatVnd(room.basePrice)}/đêm` : ''}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleRoomSelection(rId)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Đã chọn</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
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

          {/* Thông báo lỗi */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || selectedRoomIds.size === 0}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang cập nhật điều chỉnh…</span>
                </>
              ) : (
                'Xác nhận điều chỉnh'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
