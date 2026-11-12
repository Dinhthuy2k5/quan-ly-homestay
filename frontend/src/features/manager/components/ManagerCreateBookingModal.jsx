import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  DoorOpen,
  LoaderCircle,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { createManagerBookingApi } from '../api';
import { searchAvailableRooms } from '../../homestays/api';
import { formatDate, formatVnd, getNextDate, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';
import { getErrorMessage } from '../../../lib/errors';
import { EMAIL_REGEX, PHONE_REGEX } from '../../../lib/validation';

export default function ManagerCreateBookingModal({ homestay, onClose, onSuccess }) {
  // Hôm nay định dạng YYYY-MM-DD
  const [todayStr] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [note, setNote] = useState('');

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nights = checkInDate && checkOutDate && checkOutDate > checkInDate
    ? nightsBetween(checkInDate, checkOutDate)
    : 0;

  // Tải danh sách phòng trống của homestay
  const handleSearchRooms = (inDate = checkInDate, outDate = checkOutDate) => {
    if (!homestay?.id || !inDate || !outDate || outDate <= inDate) {
      setAvailableRooms([]);
      return;
    }

    setLoadingRooms(true);
    setError('');
    searchAvailableRooms({
      homestayId: homestay.id,
      checkInDate: inDate,
      checkOutDate: outDate,
      guestCount: 1,
      page: 0,
      size: 50,
    })
      .then((res) => {
        setAvailableRooms(res.items || []);
      })
      .catch((err) => {
        setError(getErrorMessage(err) || 'Không thể tải danh sách phòng trống.');
      })
      .finally(() => {
        setLoadingRooms(false);
      });
  };

  // Map phòng theo roomId
  const roomsMap = useMemo(() => {
    const map = new Map();
    availableRooms.forEach((r) => {
      const rId = r.roomId ?? r.id;
      map.set(rId, {
        roomId: rId,
        roomName: r.roomName || r.name,
        roomTypeName: r.roomTypeName,
        maxGuests: r.maxGuests || 2,
        price: r.roomTotalPrice || 0,
      });
    });
    return map;
  }, [availableRooms]);

  // Danh sách các phòng đã chọn
  const selectedRoomsList = useMemo(() => {
    return Array.from(selectedRoomIds).map((id) =>
      roomsMap.get(id) || { roomId: id, roomName: `Phòng #${id}`, maxGuests: 2, price: 0 }
    );
  }, [selectedRoomIds, roomsMap]);

  // Tổng sức chứa các phòng đã chọn
  const totalCapacity = useMemo(() => {
    return selectedRoomsList.reduce((sum, r) => sum + (r.maxGuests || 0), 0);
  }, [selectedRoomsList]);

  // Tổng tiền phòng dự kiến & cọc 30%
  const totalEstimatedPrice = useMemo(() => {
    return selectedRoomsList.reduce((sum, r) => sum + (r.price || 0), 0);
  }, [selectedRoomsList]);

  const estimatedDeposit = Math.ceil(totalEstimatedPrice * 0.3);

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

  const handleRemoveRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!contactName.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }

    if (!PHONE_REGEX.test(contactPhone.trim())) {
      setError('Số điện thoại không hợp lệ (phải gồm 10 chữ số và bắt đầu bằng số 0, ví dụ: 0901234567).');
      return;
    }

    if (contactEmail.trim() && !EMAIL_REGEX.test(contactEmail.trim())) {
      setError('Email không đúng định dạng (ví dụ: user@example.com).');
      return;
    }

    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      return;
    }

    if (checkInDate < todayStr) {
      setError('Ngày nhận phòng không được ở trong quá khứ.');
      return;
    }

    if (selectedRoomIds.size === 0) {
      setError('Vui lòng chọn ít nhất 1 phòng từ danh sách phòng trống bên dưới.');
      return;
    }

    if (guestCount > totalCapacity) {
      setError(`Số khách dự kiến (${guestCount}) vượt quá tổng sức chứa (${totalCapacity}) của các phòng đã chọn.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createManagerBookingApi({
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        roomIds: Array.from(selectedRoomIds),
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
        note: note.trim() || undefined,
      });

      onSuccess(result);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'ROOM_NOT_AVAILABLE') {
        setError('Một hoặc nhiều phòng đã chọn không còn khả dụng trong khoảng thời gian này.');
      } else if (code === 'ROOM_LOCKED') {
        setError('Một hoặc nhiều phòng hiện đang bị tạm khóa hoặc ngừng khai thác.');
      } else if (code === 'ROOM_CAPACITY_EXCEEDED') {
        setError('Số lượng khách vượt quá tổng sức chứa các phòng đã chọn.');
      } else if (code === 'HOMESTAY_NOT_ASSIGNED') {
        setError('Tài khoản quản lý chưa được phân công cơ sở homestay nào.');
      } else {
        setError(getErrorMessage(err) || 'Không thể tạo đơn đặt phòng.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-booking-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-2)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-booking-title" className="text-lg font-bold text-[var(--color-ink)]">
                Đặt phòng hộ khách (API-MGR-BOOK-02)
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Tạo đơn đặt phòng trực tiếp tại cơ sở: <strong>{homestay?.name || 'Cơ sở được giao'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ đặt phòng"
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section: Thông tin khách hàng */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <User className="h-4 w-4 text-[var(--color-primary)]" />
              <span>Thông tin khách liên hệ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)]">
                  Họ và tên khách <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trần Văn Nam"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)]">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                  <input
                    type="tel"
                    required
                    placeholder="0987654321"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                  />
                </div>
              </label>

              <label className="sm:col-span-2 block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)]">
                  Email khách hàng <span className="text-xs font-normal text-[var(--color-muted)]">(Không bắt buộc)</span>
                </span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                  <input
                    type="email"
                    placeholder="khachhang@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Section: Thời gian lưu trú & số khách */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
              <span>Thời gian lưu trú & Số khách</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)]">
                  Ngày nhận phòng <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={checkInDate}
                  onChange={(e) => {
                    const nextIn = e.target.value;
                    setCheckInDate(nextIn);
                    const minOut = getNextDate(nextIn);
                    if (checkOutDate && checkOutDate < minOut) {
                      setCheckOutDate('');
                      setAvailableRooms([]);
                      setSelectedRoomIds(new Set());
                      setError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                    } else if (checkOutDate && checkOutDate >= minOut) {
                      setError('');
                      handleSearchRooms(nextIn, checkOutDate);
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                />
                <span className="text-[11px] text-[var(--color-muted)]">Từ {CHECK_IN_TIME}</span>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)]">
                  Ngày trả phòng <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  min={checkInDate ? getNextDate(checkInDate) : todayStr}
                  value={checkOutDate}
                  onChange={(e) => {
                    const nextOut = e.target.value;
                    setCheckOutDate(nextOut);
                    if (!nextOut) {
                      setAvailableRooms([]);
                      setSelectedRoomIds(new Set());
                      return;
                    }
                    if (checkInDate && nextOut <= checkInDate) {
                      setError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
                      setAvailableRooms([]);
                      setSelectedRoomIds(new Set());
                      return;
                    }
                    setError('');
                    handleSearchRooms(checkInDate, nextOut);
                  }}
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                />
                <span className="text-[11px] text-[var(--color-muted)]">Trước {CHECK_OUT_DEADLINE}</span>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-body)] flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                  <span>Số lượng khách <span className="text-red-500">*</span></span>
                </span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden"
                />
              </label>
            </div>

            {checkInDate && checkOutDate && checkOutDate <= checkInDate && (
              <p className="text-xs font-semibold text-rose-600">
                Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.
              </p>
            )}

            {nights > 0 && (
              <p className="text-xs font-medium text-[var(--color-primary)]">
                Lưu trú <strong>{nights} đêm</strong> ({formatDate(checkInDate)} – {formatDate(checkOutDate)})
              </p>
            )}
          </div>

          {/* Section: Chọn phòng */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                <DoorOpen className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Chọn phòng ({selectedRoomIds.size} phòng đã chọn)</span>
              </h3>

              <div className="flex items-center gap-2">
                {loadingRooms && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-medium">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang tìm…</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!checkInDate || !checkOutDate || checkOutDate <= checkInDate || loadingRooms}
                  onClick={() => handleSearchRooms(checkInDate, checkOutDate)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50"
                  title="Tìm lại danh sách phòng trống"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tra cứu</span>
                </button>
              </div>
            </div>

            {/* Danh sách phòng đã chọn */}
            {selectedRoomsList.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <div className="text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Phòng được chọn cho đơn:
                </div>
                {selectedRoomsList.map((r) => (
                  <div
                    key={r.roomId}
                    className="flex items-center justify-between rounded-lg bg-white border border-[var(--color-border)] p-2.5 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-[var(--color-ink)]">{r.roomName}</span>
                      <span className="text-xs text-[var(--color-muted)] ml-2">
                        (Tối đa {r.maxGuests} khách · {formatVnd(r.price)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(r.roomId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 p-1"
                      title="Bỏ chọn phòng này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Bỏ</span>
                    </button>
                  </div>
                ))}

                <div className="pt-2 text-xs text-[var(--color-body)] flex items-center justify-between border-t border-[var(--color-border)]">
                  <span>
                    Tổng sức chứa: <strong>{totalCapacity} khách</strong>
                    {guestCount > totalCapacity && (
                      <span className="text-red-600 font-semibold ml-2">
                        (Thiếu {guestCount - totalCapacity} chỗ so với số khách!)
                      </span>
                    )}
                  </span>
                  <span>
                    Ước tính: <strong className="text-[var(--color-ink)]">{formatVnd(totalEstimatedPrice)}</strong> (Cọc: <strong className="text-[var(--color-primary)]">{formatVnd(estimatedDeposit)}</strong>)
                  </span>
                </div>
              </div>
            )}

            {/* Danh sách phòng trống khả dụng để chọn */}
            <div className="rounded-xl border border-[var(--color-border)] bg-gray-50/50 p-3 space-y-2">
              <div className="text-xs font-semibold text-[var(--color-body)] flex items-center justify-between">
                <span>Danh sách phòng trống tại homestay:</span>
                <span className="text-[11px] font-normal text-[var(--color-muted)]">
                  {availableRooms.length} phòng khả dụng
                </span>
              </div>

              {!checkOutDate ? (
                <p className="text-xs text-[var(--color-muted)] italic p-2 text-center">
                  Vui lòng chọn ngày nhận và trả phòng bên trên để xem các phòng còn trống.
                </p>
              ) : availableRooms.length === 0 && !loadingRooms ? (
                <p className="text-xs text-[var(--color-muted)] p-3 text-center rounded-lg bg-white border border-gray-200">
                  Không còn phòng nào trống trong homestay cho khoảng ngày đã chọn. Vui lòng chọn ngày khác.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {availableRooms.map((r) => {
                    const rId = r.roomId ?? r.id;
                    const isSelected = selectedRoomIds.has(rId);
                    return (
                      <div
                        key={rId}
                        onClick={() => toggleSelectRoom(rId)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm transition-all ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-emerald-50/60 shadow-xs'
                            : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-soft)]'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-[var(--color-ink)]">{r.roomName || r.name}</p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {r.roomTypeName ? `${r.roomTypeName} · ` : ''}Sức chứa: {r.maxGuests} khách · Giá: {formatVnd(r.roomTotalPrice || r.nightlyPrice)}
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
                              <span>Chọn</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section: Ghi chú */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
            <label htmlFor="booking-note" className="block text-xs font-semibold text-[var(--color-body)]">
              Ghi chú nội bộ / Kênh đặt phòng <span className="text-xs font-normal text-[var(--color-muted)]">(Tùy chọn)</span>
            </label>
            <textarea
              id="booking-note"
              rows={2}
              placeholder="Ví dụ: Khách gọi điện qua hotline lúc 9h; khách sẽ chuyển khoản cọc trong hôm nay..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-hidden resize-none"
            />
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
              disabled={submitting}
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang tạo đơn…</span>
                </>
              ) : (
                'Tạo đơn đặt phòng'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
