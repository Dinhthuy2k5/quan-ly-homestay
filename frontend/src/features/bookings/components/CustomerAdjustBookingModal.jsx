import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  DoorOpen,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { adjustCustomerBookingApi } from '../api';
import { searchAvailableRooms } from '../../homestays/api';
import { formatDate, formatVnd, getNextDate, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';

export default function CustomerAdjustBookingModal({
  booking,
  onClose,
  onSuccess,
}) {
  const isConfirmed = booking.status === 'CONFIRMED';

  // Tính ngày checkIn tối thiểu cho phép
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

  // Danh sách phòng ban đầu trong booking
  const originalRooms = useMemo(() => booking.rooms || [], [booking.rooms]);
  const initialRoomIds = useMemo(() => originalRooms.map((r) => r.roomId), [originalRooms]);

  // Quản lý các phòng được chọn cho đơn mới
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set(initialRoomIds));
  const [isChangingRooms, setIsChangingRooms] = useState(false);
  const [availableRooms, setAvailableRooms] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nights = checkInDate && checkOutDate && checkOutDate > checkInDate
    ? nightsBetween(checkInDate, checkOutDate)
    : 0;

  // Tải danh sách phòng trống của homestay trong khoảng ngày mới
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
        roomName: r.roomName,
        maxGuests: r.maxGuests || null,
        isOriginal: true,
      });
    });
    (availableRooms || []).forEach((ar) => {
      const rId = ar.roomId ?? ar.id;
      if (!map.has(rId)) {
        map.set(rId, {
          roomId: rId,
          roomName: ar.roomName || ar.name,
          maxGuests: ar.maxGuests || null,
          price: ar.roomTotalPrice || ar.nightlyPrice || null,
          isOriginal: false,
        });
      }
    });
    return map;
  }, [originalRooms, availableRooms]);

  // Danh sách các phòng đang được chọn trong đơn mới
  const selectedRoomsList = useMemo(() => {
    return Array.from(selectedRoomIds).map(
      (id) => roomsMap.get(id) || { roomId: id, roomName: `Phòng #${id}`, isOriginal: false }
    );
  }, [selectedRoomIds, roomsMap]);

  // Các phòng ban đầu bị người dùng bỏ chọn (để hiển thị nút chọn lại nếu muốn)
  const unselectedOriginalRooms = useMemo(() => {
    return originalRooms.filter((r) => !selectedRoomIds.has(r.roomId));
  }, [originalRooms, selectedRoomIds]);

  const handleRemoveRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
    setError('');
  };

  const handleAddRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      next.add(roomId);
      return next;
    });
    setError('');
  };

  const toggleSelectRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
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
          : 'Ngày nhận phòng không được ở quá khứ.'
      );
      return;
    }

    if (selectedRoomIds.size === 0) {
      setError('Đơn đặt phòng phải có ít nhất một phòng. Vui lòng chọn phòng từ danh sách bên dưới.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
      };

      // Gửi danh sách phòng mới nếu người dùng thay đổi phòng hoặc mở đổi phòng
      const hasRoomsChanged =
        selectedRoomIds.size !== initialRoomIds.length ||
        initialRoomIds.some((id) => !selectedRoomIds.has(id));

      if (hasRoomsChanged || isChangingRooms) {
        payload.roomIds = Array.from(selectedRoomIds);
      }

      const result = await adjustCustomerBookingApi(booking.id, payload);
      onSuccess(result);
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể điều chỉnh đơn đặt phòng.');
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-booking-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="adjust-booking-title" className="text-lg font-bold text-[var(--color-ink)]">
                Điều chỉnh đơn đặt #{booking.code}
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                {booking.homestayName || `Homestay #${booking.homestayId}`}
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
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                {isConfirmed
                  ? 'Chính sách điều chỉnh đơn đã xác nhận (CONFIRMED):'
                  : 'Điều chỉnh đơn đang chờ đặt cọc (PENDING DEPOSIT):'}
              </p>
              <p className="text-blue-800 leading-relaxed">
                {isConfirmed
                  ? 'Bạn có thể thay đổi ngày hoặc đổi/bỏ/thêm phòng nếu còn ít nhất 3 ngày trước ngày nhận phòng. Các khoản tiền bạn đã thanh toán được giữ nguyên và trừ vào tổng tiền mới khi đối soát.'
                  : 'Bạn có thể thay đổi ngày, số khách hoặc đổi/bỏ/thêm phòng. Tổng tiền phòng và khoản cọc cần thanh toán sẽ được tự động tính lại theo phòng và thời gian mới.'}
              </p>
            </div>
          </div>

          {/* Chọn ngày nhận & trả phòng */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--color-body)] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                <span>Ngày nhận phòng mới</span>
              </span>
              <input
                type="date"
                required
                min={minCheckInStr}
                value={checkInDate}
                onChange={(e) => {
                  const nextIn = e.target.value;
                  setCheckInDate(nextIn);
                  const minOut = getNextDate(nextIn);
                  if (checkOutDate && checkOutDate < minOut) {
                    setCheckOutDate('');
                    setError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                  } else {
                    setError('');
                  }
                }}
                className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
              />
              <span className="text-[11px] text-[var(--color-muted)]">Từ {CHECK_IN_TIME}</span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--color-body)] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                <span>Ngày trả phòng mới</span>
              </span>
              <input
                type="date"
                required
                min={checkInDate ? getNextDate(checkInDate) : minCheckInStr}
                value={checkOutDate}
                onChange={(e) => {
                  const nextOut = e.target.value;
                  setCheckOutDate(nextOut);
                  if (checkInDate && nextOut <= checkInDate) {
                    setError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                  } else {
                    setError('');
                  }
                }}
                className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
              />
              <span className="text-[11px] text-[var(--color-muted)]">Trước {CHECK_OUT_DEADLINE}</span>
            </label>
          </div>

          {nights > 0 && (
            <p className="text-xs font-medium text-[var(--color-primary)]">
              Thời gian lưu trú dự kiến: <strong>{nights} đêm</strong> ({formatDate(checkInDate)} – {formatDate(checkOutDate)})
            </p>
          )}

          {/* Số lượng khách */}
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--color-body)] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              <span>Số khách dự kiến</span>
            </span>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={guestCount}
              onChange={(e) => {
                setGuestCount(Math.max(1, Number(e.target.value)));
                setError('');
              }}
              className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
            />
          </label>

          {/* Quản lý danh sách phòng */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-body)] flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                <span>Phòng được chọn ({selectedRoomIds.size} phòng)</span>
              </span>

              {!isChangingRooms ? (
                <button
                  type="button"
                  onClick={handleLoadAvailableRooms}
                  disabled={loadingRooms}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  {loadingRooms ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang kiểm tra phòng trống…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Đổi / thêm phòng khác</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadAvailableRooms}
                  disabled={loadingRooms}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  {loadingRooms ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Cập nhật phòng trống</span>
                </button>
              )}
            </div>

            {/* Khối các phòng ĐANG ĐƯỢC CHỌN cho đơn */}
            <div className="space-y-2">
              {selectedRoomsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-center text-xs text-amber-900">
                  Chưa có phòng nào được chọn. Vui lòng bấm &quot;Đổi / thêm phòng khác&quot; bên trên để chọn phòng.
                </div>
              ) : (
                selectedRoomsList.map((r) => {
                  const isOriginal = initialRoomIds.includes(r.roomId);
                  return (
                    <div
                      key={r.roomId}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DoorOpen className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-[var(--color-ink)]">{r.roomName}</span>
                          {r.maxGuests && (
                            <span className="ml-2 text-xs text-[var(--color-muted)]">
                              (Tối đa {r.maxGuests} khách)
                            </span>
                          )}
                          {isOriginal ? (
                            <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Phòng hiện tại
                            </span>
                          ) : (
                            <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Phòng mới thêm
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(r.roomId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors shrink-0 ml-2"
                        title="Bỏ phòng này khỏi đơn"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Bỏ chọn</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Khối chọn phòng thay thế hoặc thêm mới khi mở chế độ đổi phòng */}
            {isChangingRooms && (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-gray-50/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] pb-1.5 border-b border-[var(--color-border)]">
                  <span>Chọn phòng thay thế hoặc thêm vào đơn:</span>
                  <button
                    type="button"
                    onClick={() => setIsChangingRooms(false)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] font-normal flex items-center gap-0.5"
                  >
                    <span>Thu gọn</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {/* Nếu người dùng đã bỏ chọn phòng ban đầu, cho phép chọn lại */}
                  {unselectedOriginalRooms.map((r) => (
                    <div
                      key={r.roomId}
                      onClick={() => handleAddRoom(r.roomId)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-2.5 text-sm hover:border-[var(--color-primary)] transition-all"
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-ink)]">{r.roomName}</p>
                        <p className="text-xs text-blue-700">Phòng ban đầu trong đơn (đang bỏ chọn)</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Chọn lại</span>
                      </button>
                    </div>
                  ))}

                  {/* Danh sách phòng trống từ homestay */}
                  {availableRooms && availableRooms.length === 0 && unselectedOriginalRooms.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted)] p-3 text-center rounded-xl bg-white border border-gray-200">
                      Không tìm thấy phòng trống nào khác trong homestay cho khoảng ngày đã chọn.
                    </p>
                  ) : (
                    (availableRooms || [])
                      .filter((ar) => !initialRoomIds.includes(ar.roomId ?? ar.id))
                      .map((r) => {
                        const rId = r.roomId ?? r.id;
                        const isSelected = selectedRoomIds.has(rId);
                        return (
                          <div
                            key={rId}
                            onClick={() => toggleSelectRoom(rId)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-sm transition-all ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-emerald-50/50 shadow-xs'
                                : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-soft)]'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-[var(--color-ink)]">{r.roomName || r.name}</p>
                              <p className="text-xs text-[var(--color-muted)]">
                                Sức chứa: {r.maxGuests} khách · {formatVnd(r.roomTotalPrice || r.nightlyPrice)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-[var(--color-primary)] text-white'
                                  : 'border border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'
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
                                  <span>Chọn phòng</span>
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
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"
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
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || selectedRoomIds.size === 0}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý điều chỉnh…</span>
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
