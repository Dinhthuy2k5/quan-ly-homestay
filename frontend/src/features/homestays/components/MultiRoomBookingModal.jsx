import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  DoorOpen,
  FileText,
  LoaderCircle,
  Users,
  X,
} from 'lucide-react';
import { createCustomerBooking } from '../api';
import { useAuth } from '../../auth/context/useAuth';
import { formatDate, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';

export default function MultiRoomBookingModal({
  homestay,
  selectedRooms,
  checkInDate,
  checkOutDate,
  initialGuestCount = 2,
  onClose,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const totalCapacity = selectedRooms.reduce((sum, r) => sum + Number(r.maxGuests || 0), 0);
  const totalRoomPrice = selectedRooms.reduce((sum, r) => sum + Number(r.roomTotalPrice || 0), 0);
  const depositAmount = Math.ceil((totalRoomPrice * 30) / 100);
  const nights = nightsBetween(checkInDate, checkOutDate);

  const [guestCount, setGuestCount] = useState(() =>
    Math.min(totalCapacity, Math.max(1, initialGuestCount))
  );
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?redirect=${redirectUrl}`);
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      setError('Chỉ tài khoản khách hàng (Customer) mới có thể đặt phòng trực tuyến.');
      return;
    }

    if (guestCount > totalCapacity) {
      setError(`Số khách (${guestCount}) vượt quá tổng sức chứa của các phòng đã chọn (${totalCapacity} khách).`);
      return;
    }

    setLoading(true);
    try {
      const roomIds = selectedRooms.map((r) => r.roomId ?? r.id);
      const result = await createCustomerBooking({
        homestayId: homestay.id,
        roomIds,
        checkInDate,
        checkOutDate,
        guestCount,
        note,
      });

      // Thành công -> chuyển hướng ngay tới trang chi tiết đơn vừa tạo
      navigate(`/customer/bookings/${result.id}`);
    } catch (err) {
      setError(getErrorMessage(err) || 'Không thể tạo đơn đặt phòng. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-booking-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="multi-booking-title" className="text-lg font-bold text-[var(--color-ink)]">
                Xác nhận đặt {selectedRooms.length} phòng
              </h2>
              <p className="text-xs text-[var(--color-muted)] flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                <span>{homestay.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] hover:bg-gray-200 hover:text-[var(--color-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleBooking} className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-sm">
          {/* Thông tin kỳ nghỉ */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3.5 text-xs">
            <div>
              <span className="font-medium text-[var(--color-muted)]">Nhận phòng</span>
              <p className="font-bold text-sm text-[var(--color-ink)] mt-0.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>{formatDate(checkInDate)}</span>
              </p>
              <span className="text-[11px] text-[var(--color-muted)]">Từ {CHECK_IN_TIME}</span>
            </div>
            <div>
              <span className="font-medium text-[var(--color-muted)]">Trả phòng</span>
              <p className="font-bold text-sm text-[var(--color-ink)] mt-0.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>{formatDate(checkOutDate)}</span>
              </p>
              <span className="text-[11px] text-[var(--color-muted)]">Trước {CHECK_OUT_DEADLINE}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-body)]">
              <span>Thời lượng: <strong>{nights} đêm</strong></span>
              <span>Tổng sức chứa: <strong>{totalCapacity} khách</strong></span>
            </div>
          </div>

          {/* Danh sách phòng đã chọn */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Danh sách phòng được chọn ({selectedRooms.length} phòng):
            </label>
            <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
              {selectedRooms.map((room) => (
                <div key={room.roomId ?? room.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <p className="font-bold text-sm text-[var(--color-ink)]">
                      {room.roomName || room.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Tối đa {room.maxGuests} khách · {room.roomTypeName || 'Phòng nghỉ'}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-[var(--color-ink)]">
                    {formatVnd(room.roomTotalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chọn số lượng khách */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="modal-guests" className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1">
                <Users className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Số lượng khách thực tế</span>
              </label>
              <span className="text-xs text-[var(--color-muted)]">
                Tối đa {totalCapacity} người
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="modal-guests"
                type="number"
                min="1"
                max={totalCapacity}
                required
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-28 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
              />
              <span className="text-xs text-[var(--color-muted)]">
                {guestCount <= totalCapacity ? (
                  <span className="text-emerald-700 font-medium">✓ Đủ sức chứa các phòng</span>
                ) : (
                  <span className="text-rose-600 font-medium">✕ Vượt quá sức chứa tối đa</span>
                )}
              </span>
            </div>
          </div>

          {/* Ghi chú cho homestay */}
          <div className="space-y-1.5">
            <label htmlFor="modal-note" className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1">
              <FileText className="h-4 w-4 text-[var(--color-muted)]" />
              <span>Ghi chú cho homestay (không bắt buộc)</span>
            </label>
            <textarea
              id="modal-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: giờ dự kiến đến, kê thêm nệm hoặc yêu cầu đặc biệt..."
              className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none resize-none"
            />
          </div>

          {/* Tổng tiền và tiền cọc */}
          <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-surface-soft)] p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">Tổng tiền phòng ({selectedRooms.length} phòng, {nights} đêm):</span>
              <span className="text-base font-bold text-[var(--color-ink)]">
                {formatVnd(totalRoomPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-[var(--color-border)]">
              <div>
                <span className="font-semibold text-[var(--color-primary)]">Tiền đặt cọc cần thanh toán (30%):</span>
                <p className="text-[11px] text-[var(--color-muted)]">Chuyển khoản để hoàn tất giữ phòng</p>
              </div>
              <span className="text-base font-bold text-[var(--color-primary)]">
                {formatVnd(depositAmount)}
              </span>
            </div>
          </div>

          {/* Lỗi nếu có */}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
            >
              Hủy
            </button>

            {!isAuthenticated ? (
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <span>Đăng nhập để đặt {selectedRooms.length} phòng</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || guestCount > totalCapacity}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang tạo đơn đặt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Xác nhận đặt {selectedRooms.length} phòng</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
