import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Info,
  LoaderCircle,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { createManagerBookingApi, getAssignedHomestayApi } from '../api';
import { searchAvailableRooms } from '../../homestays/api';
import { formatDate, formatVnd, getNextDate, nightsBetween } from '../../../lib/format';
import { EMAIL_REGEX, PHONE_REGEX } from '../../../lib/validation';
import { getErrorMessage } from '../../../lib/errors';

export default function ManagerCreateBookingPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const [homestay, setHomestay] = useState(outletContext?.homestay || null);

  // Mốc ngày hôm nay dạng YYYY-MM-DD
  const [todayStr] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Form states
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [note, setNote] = useState('');

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(() => getNextDate(todayStr, 1));
  const [guestCount, setGuestCount] = useState(2);

  // Room search & selection
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());
  const [roomSearchError, setRoomSearchError] = useState('');

  // Submission & Validation states
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Đảm bảo homestay đã tải
  useEffect(() => {
    if (!homestay) {
      getAssignedHomestayApi()
        .then((data) => setHomestay(data))
        .catch((err) => console.warn('Không thể tải thông tin homestay:', err));
    }
  }, [homestay]);

  const nights = useMemo(() => {
    return checkInDate && checkOutDate && checkOutDate > checkInDate
      ? nightsBetween(checkInDate, checkOutDate)
      : 0;
  }, [checkInDate, checkOutDate]);

  // Tra cứu danh sách phòng trống mỗi khi khoảng ngày hoặc homestay thay đổi
  useEffect(() => {
    if (!homestay?.id || !checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setAvailableRooms([]);
      return;
    }

    let active = true;
    setLoadingRooms(true);
    setRoomSearchError('');

    searchAvailableRooms({
      homestayId: homestay.id,
      checkInDate,
      checkOutDate,
      guestCount: 1,
      page: 0,
      size: 50,
    })
      .then((res) => {
        if (!active) return;
        const list = res.items || [];
        setAvailableRooms(list);
        // Lọc bỏ những phòng đã chọn mà không còn khả dụng trong khoảng ngày mới
        setSelectedRoomIds((prev) => {
          const validIds = new Set(list.map((r) => r.roomId ?? r.id));
          const next = new Set();
          prev.forEach((id) => {
            if (validIds.has(id)) next.add(id);
          });
          return next;
        });
      })
      .catch((err) => {
        if (!active) return;
        setRoomSearchError(getErrorMessage(err) || 'Không thể tải danh sách phòng trống.');
        setAvailableRooms([]);
      })
      .finally(() => {
        if (active) setLoadingRooms(false);
      });

    return () => {
      active = false;
    };
  }, [homestay?.id, checkInDate, checkOutDate]);

  // Bản đồ phòng khả dụng
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
        amenities: r.amenities || [],
        coverImageUrl: r.coverImageUrl,
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
  const remainingAtCheckIn = Math.max(0, totalEstimatedPrice - estimatedDeposit);

  // Toggle chọn phòng
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
    if (fieldErrors.rooms) {
      setFieldErrors((prev) => ({ ...prev, rooms: null }));
    }
  };

  const handleRemoveRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
  };

  // Dùng Regex chặn ký tự phi số tại ô Số điện thoại
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 11) {
      setContactPhone(val);
      if (fieldErrors.contactPhone) {
        setFieldErrors((prev) => ({ ...prev, contactPhone: null }));
      }
    }
  };

  // Validation
  const validate = () => {
    const errors = {};

    if (!contactName.trim()) {
      errors.contactName = 'Vui lòng nhập họ và tên khách hàng.';
    } else if (contactName.trim().length > 150) {
      errors.contactName = 'Tên khách hàng không được vượt quá 150 ký tự.';
    }

    if (!contactPhone.trim()) {
      errors.contactPhone = 'Vui lòng nhập số điện thoại liên hệ.';
    } else if (!PHONE_REGEX.test(contactPhone.trim())) {
      errors.contactPhone = 'Số điện thoại không hợp lệ (gồm 10 chữ số và bắt đầu bằng số 0, VD: 0901234567).';
    }

    if (contactEmail.trim() && !EMAIL_REGEX.test(contactEmail.trim())) {
      errors.contactEmail = 'Email không đúng định dạng (VD: khachhang@gmail.com).';
    }

    if (!checkInDate) {
      errors.checkInDate = 'Vui lòng chọn ngày nhận phòng.';
    } else if (checkInDate < todayStr) {
      errors.checkInDate = 'Ngày nhận phòng không thể ở trong quá khứ.';
    }

    if (!checkOutDate) {
      errors.checkOutDate = 'Vui lòng chọn ngày trả phòng.';
    } else if (checkOutDate <= checkInDate) {
      errors.checkOutDate = 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.';
    }

    if (selectedRoomIds.size === 0) {
      errors.rooms = 'Vui lòng chọn ít nhất 1 phòng từ danh sách phòng trống khả dụng.';
    }

    if (guestCount < 1) {
      errors.guestCount = 'Số lượng khách tối thiểu là 1 người.';
    } else if (selectedRoomIds.size > 0 && guestCount > totalCapacity) {
      errors.guestCount = `Số khách (${guestCount}) vượt quá tổng sức chứa (${totalCapacity}) của các phòng đã chọn.`;
    }

    if (note && note.length > 255) {
      errors.note = 'Ghi chú tối đa 255 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

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

      // Điều hướng về danh sách đơn đặt phòng kèm thông báo flash toast
      navigate('/manager/bookings', {
        state: {
          createdBooking: result,
        },
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'ROOM_NOT_AVAILABLE') {
        setFormError('Một hoặc nhiều phòng đã chọn không còn khả dụng trong khoảng thời gian này.');
      } else if (code === 'ROOM_LOCKED') {
        setFormError('Một hoặc nhiều phòng hiện đang bị tạm khóa hoặc ngừng khai thác.');
      } else if (code === 'ROOM_CAPACITY_EXCEEDED') {
        setFormError('Số lượng khách vượt quá tổng sức chứa các phòng đã chọn.');
      } else if (code === 'HOMESTAY_NOT_ASSIGNED') {
        setFormError('Tài khoản quản lý chưa được phân công cơ sở homestay nào.');
      } else {
        setFormError(getErrorMessage(err) || 'Không thể tạo đơn đặt phòng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Top Navigation & Title Header ──────────────────────── */}
      <div className="space-y-3">
        <Link
          to="/manager/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách đơn đặt phòng</span>
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
                  Đặt phòng hộ khách
                </h1>
                {homestay?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs sm:text-sm font-semibold text-[var(--color-body)] border border-[var(--color-border)]">
                    {homestay.name}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-[var(--color-muted)] mt-1">
                Tạo đơn đặt phòng trực tiếp cho khách qua điện thoại, mạng xã hội hoặc khách vãng lai (walk-in).
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
          {/* Card 1: Thông tin khách hàng */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                  <User className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>1. Thông tin khách lưu trú</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Thông tin đại diện liên hệ và nhận phòng của khách
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs sm:text-sm font-semibold text-amber-800">
                Bắt buộc
              </span>
            </div>

            <div className="space-y-4">
              {/* Họ tên khách */}
              <div>
                <label htmlFor="guest-name" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Họ và tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="guest-name"
                    type="text"
                    autoFocus
                    maxLength={150}
                    disabled={submitting}
                    value={contactName}
                    placeholder="VD: Nguyễn Văn An"
                    onChange={(e) => {
                      setContactName(e.target.value);
                      if (fieldErrors.contactName) {
                        setFieldErrors((prev) => ({ ...prev, contactName: null }));
                      }
                    }}
                    className={`h-11 sm:h-12 w-full rounded-xl border bg-[var(--color-surface)] pl-10 pr-3.5 text-sm sm:text-base text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                      fieldErrors.contactName
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                    }`}
                  />
                </div>
                {fieldErrors.contactName && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.contactName}</p>
                )}
              </div>

              {/* Số điện thoại & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Số điện thoại */}
                <div>
                  <label htmlFor="guest-phone" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                    <input
                      id="guest-phone"
                      type="text"
                      inputMode="numeric"
                      disabled={submitting}
                      value={contactPhone}
                      placeholder="0912345678"
                      onChange={handlePhoneChange}
                      className={`h-11 sm:h-12 w-full rounded-xl border bg-[var(--color-surface)] pl-10 pr-3.5 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.contactPhone
                          ? 'border-red-400 focus:ring-red-100'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.contactPhone && (
                    <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.contactPhone}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="guest-email" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                    Email liên hệ <span className="text-xs font-normal text-[var(--color-muted)]">(Không bắt buộc)</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                    <input
                      id="guest-email"
                      type="email"
                      disabled={submitting}
                      value={contactEmail}
                      placeholder="khach@example.com"
                      onChange={(e) => {
                        setContactEmail(e.target.value);
                        if (fieldErrors.contactEmail) {
                          setFieldErrors((prev) => ({ ...prev, contactEmail: null }));
                        }
                      }}
                      className={`h-11 sm:h-12 w-full rounded-xl border bg-[var(--color-surface)] pl-10 pr-3.5 text-sm sm:text-base text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.contactEmail
                          ? 'border-red-400 focus:ring-red-100'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.contactEmail && (
                    <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.contactEmail}</p>
                  )}
                </div>
              </div>

              {/* Ghi chú từ khách */}
              <div>
                <div className="flex items-center justify-between text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  <label htmlFor="guest-note">Ghi chú hoặc yêu cầu đặc biệt</label>
                  <span className="text-xs font-normal text-[var(--color-muted)]">
                    {note.length}/255
                  </span>
                </div>
                <textarea
                  id="guest-note"
                  rows={2}
                  maxLength={255}
                  disabled={submitting}
                  value={note}
                  placeholder="VD: Khách đến lúc 18h, yêu cầu hỗ trợ bếp nướng BBQ, thêm giường phụ..."
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (fieldErrors.note) {
                      setFieldErrors((prev) => ({ ...prev, note: null }));
                    }
                  }}
                  className={`w-full rounded-xl border bg-[var(--color-surface)] p-3 text-sm sm:text-base text-[var(--color-ink)] transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.note
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                  }`}
                />
                {fieldErrors.note && <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.note}</p>}
              </div>
            </div>
          </div>

          {/* Card 2: Lịch lưu trú & Số lượng khách */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>2. Lịch trình lưu trú & Số khách</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Hệ thống sẽ tự động tra cứu danh sách phòng trống tương ứng
                </p>
              </div>
              {nights > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs sm:text-sm font-bold text-[var(--color-primary)]">
                  <Clock className="h-4 w-4" />
                  <span>{nights} đêm lưu trú</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ngày nhận phòng */}
              <div>
                <label htmlFor="check-in-date" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Ngày nhận phòng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="check-in-date"
                    type="date"
                    min={todayStr}
                    disabled={submitting}
                    value={checkInDate}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      setCheckInDate(newIn);
                      if (checkOutDate && checkOutDate <= newIn) {
                        setCheckOutDate(getNextDate(newIn, 1));
                      }
                      if (fieldErrors.checkInDate) {
                        setFieldErrors((prev) => ({ ...prev, checkInDate: null }));
                      }
                    }}
                    className={`h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.checkInDate
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                    }`}
                  />
                </div>
                {fieldErrors.checkInDate && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.checkInDate}</p>
                )}
              </div>

              {/* Ngày trả phòng */}
              <div>
                <label htmlFor="check-out-date" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Ngày trả phòng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="check-out-date"
                    type="date"
                    min={checkInDate ? getNextDate(checkInDate, 1) : todayStr}
                    disabled={submitting}
                    value={checkOutDate}
                    onChange={(e) => {
                      setCheckOutDate(e.target.value);
                      if (fieldErrors.checkOutDate) {
                        setFieldErrors((prev) => ({ ...prev, checkOutDate: null }));
                      }
                    }}
                    className={`h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.checkOutDate
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                    }`}
                  />
                </div>
                {fieldErrors.checkOutDate && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.checkOutDate}</p>
                )}
              </div>

              {/* Số lượng khách */}
              <div>
                <label htmlFor="guest-count" className="block text-sm font-semibold text-[var(--color-ink)] mb-1.5">
                  Số lượng khách <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-muted)]" />
                  <input
                    id="guest-count"
                    type="number"
                    min={1}
                    max={50}
                    disabled={submitting}
                    value={guestCount}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value) || 1);
                      setGuestCount(count);
                      if (fieldErrors.guestCount) {
                        setFieldErrors((prev) => ({ ...prev, guestCount: null }));
                      }
                    }}
                    className={`h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm sm:text-base font-semibold text-[var(--color-ink)] transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.guestCount
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-soft)]'
                    }`}
                  />
                </div>
                {fieldErrors.guestCount && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600">{fieldErrors.guestCount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Chọn phòng trống */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                  <DoorOpen className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>3. Chọn phòng trống khả dụng</span>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Bấm chọn một hoặc nhiều phòng cần đặt cho khách
                </p>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[var(--color-muted)]">
                Đã chọn: <strong className="text-[var(--color-primary)] text-sm sm:text-base font-bold">{selectedRoomIds.size}</strong> phòng
              </span>
            </div>

            {fieldErrors.rooms && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 flex items-center gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                <span>{fieldErrors.rooms}</span>
              </div>
            )}

            {roomSearchError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs sm:text-sm text-amber-800 flex items-center gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                <span>{roomSearchError}</span>
              </div>
            )}

            {/* List / Grid of Rooms */}
            {loadingRooms ? (
              <div className="py-12 text-center space-y-3">
                <LoaderCircle className="h-8 w-8 animate-spin mx-auto text-[var(--color-primary)]" />
                <p className="text-sm text-[var(--color-muted)]">
                  Đang kiểm tra tình trạng phòng trống từ {formatDate(checkInDate)} đến {formatDate(checkOutDate)}...
                </p>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center space-y-2">
                <DoorOpen className="h-10 w-10 mx-auto text-gray-300" />
                <p className="text-base font-bold text-[var(--color-ink)]">
                  Không tìm thấy phòng trống
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-md mx-auto">
                  Tất cả các phòng tại cơ sở đã kín trong khoảng thời gian này hoặc cơ sở chưa kích hoạt phòng nào. Vui lòng chọn khoảng ngày khác.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableRooms.map((room) => {
                  const rId = room.roomId ?? room.id;
                  const isSelected = selectedRoomIds.has(rId);
                  const roomPrice = room.roomTotalPrice || 0;
                  const pricePerNight = nights > 0 ? Math.round(roomPrice / nights) : roomPrice;

                  return (
                    <div
                      key={rId}
                      onClick={() => toggleSelectRoom(rId)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 sm:p-5 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30 ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary-light)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-base sm:text-lg text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                              {room.roomName || room.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                              {room.roomTypeName || 'Tiêu chuẩn'}
                            </p>
                          </div>

                          {/* Checkbox badge */}
                          <div
                            className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                : 'border-gray-300 bg-white group-hover:border-gray-400'
                            }`}
                          >
                            {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Room Amenities or Capacity */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-soft)] px-2.5 py-1 text-xs sm:text-sm font-medium text-[var(--color-muted)] border border-[var(--color-border)]">
                            <Users className="h-3.5 w-3.5 text-gray-500" />
                            <span>Tối đa {room.maxGuests || 2} khách</span>
                          </span>
                          {room.amenities && room.amenities.slice(0, 2).map((a, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-white px-2 py-0.5 text-xs text-gray-500 border border-gray-100"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pricing Footer */}
                      <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex items-baseline justify-between">
                        <span className="text-xs sm:text-sm text-[var(--color-muted)]">
                          {nights > 0 ? `${nights} đêm:` : 'Giá phòng:'}
                        </span>
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
                            {formatVnd(roomPrice)}
                          </span>
                          {nights > 1 && (
                            <span className="block text-xs text-[var(--color-muted)]">
                              ~{formatVnd(pricePerNight)}/đêm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Summary & Financial Breakdown (5 / 12 width) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-[var(--color-border)] pb-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Tóm tắt đặt phòng</span>
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                Xem lại lịch trình và các khoản tiền cần thanh toán
              </p>
            </div>

            {/* Quick Stay Details */}
            <div className="rounded-xl bg-[var(--color-surface-soft)] p-4 space-y-2.5 border border-[var(--color-border)] text-sm sm:text-base">
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Lịch trình:</span>
                <span className="font-bold text-[var(--color-ink)]">{formatDate(checkInDate)} → {formatDate(checkOutDate)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Thời gian:</span>
                <span className="font-bold text-[var(--color-ink)]">{nights} đêm lưu trú</span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Số khách khai báo:</span>
                <span className="font-bold text-[var(--color-ink)]">{guestCount} người</span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-body)]">
                <span className="font-medium">Tổng sức chứa các phòng:</span>
                <span className={`font-bold ${guestCount > totalCapacity && totalCapacity > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {totalCapacity} khách ({selectedRoomsList.length} phòng)
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

            {/* Selected Rooms List */}
            <div>
              <div className="text-sm font-bold text-[var(--color-ink)] mb-2 flex items-center justify-between">
                <span>Phòng đã chọn ({selectedRoomsList.length}):</span>
              </div>

              {selectedRoomsList.length === 0 ? (
                <p className="text-xs sm:text-sm italic text-[var(--color-muted)] py-3 text-center border border-dashed border-[var(--color-border)] rounded-xl">
                  Chưa chọn phòng nào
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedRoomsList.map((room) => (
                    <div
                      key={room.roomId}
                      className="flex items-center justify-between gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm sm:text-base border border-gray-200"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-[var(--color-ink)] block truncate">
                          {room.roomName}
                        </span>
                        <span className="text-xs sm:text-sm text-[var(--color-muted)]">
                          Tối đa {room.maxGuests} khách • {formatVnd(room.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRoom(room.roomId);
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white transition-colors"
                        title="Bỏ chọn phòng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Breakdown (matching ManagerBookingDetailPage Financial Balance) */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-3.5 text-sm sm:text-base">
              <div className="flex justify-between items-center text-[var(--color-body)]">
                <span className="font-medium">Tổng tiền phòng:</span>
                <span className="font-bold text-base sm:text-lg text-[var(--color-ink)]">
                  {formatVnd(totalEstimatedPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between text-amber-900 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 font-medium">
                <div>
                  <span className="font-bold block text-sm sm:text-base">Tiền cọc giữ phòng (30%):</span>
                  <span className="text-xs sm:text-sm text-amber-700">Khách cần thanh toán trong 24h</span>
                </div>
                <span className="text-lg sm:text-xl font-extrabold text-amber-900">
                  {formatVnd(estimatedDeposit)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 text-[var(--color-body)]">
                <span className="font-bold text-base sm:text-lg text-[var(--color-ink)]">Còn phải thanh toán (70%):</span>
                <span className="font-extrabold text-lg sm:text-xl text-amber-600">
                  {formatVnd(remainingAtCheckIn)}
                </span>
              </div>
            </div>

            {/* Business Policy Note */}
            <div className="rounded-xl bg-blue-50/60 p-3.5 text-xs sm:text-sm text-blue-900 border border-blue-100 flex items-start gap-2.5">
              <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Đơn tạo hộ sẽ có trạng thái <strong>Chờ cọc (PENDING_DEPOSIT)</strong>. Khách hàng sẽ có 24 giờ để chuyển khoản đặt cọc trước khi phòng bị giải phóng.
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
                    <span>Đang tạo đơn đặt phòng...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-5 w-5" />
                    <span>Xác nhận tạo đơn đặt phòng</span>
                  </>
                )}
              </button>

              <Link
                to="/manager/bookings"
                className="w-full inline-flex h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-body)] shadow-xs hover:bg-[var(--color-surface-soft)] transition-colors"
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
