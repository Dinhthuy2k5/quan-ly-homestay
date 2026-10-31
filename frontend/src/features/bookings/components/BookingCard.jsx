import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  DoorOpen,
  MapPin,
  Users,
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import { fileUrl } from '../../../lib/api/client';
import { formatDate, formatDateTime, formatVnd, nightsBetween } from '../../../lib/format';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../../../lib/constants';

export default function BookingCard({ booking, onOpenPayment }) {
  const [copiedCode, setCopiedCode] = useState(false);

  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const primaryRoom = booking.rooms?.[0];
  const roomNames = booking.rooms?.map((r) => r.roomName).filter(Boolean).join(', ');

  const copyBookingCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(booking.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isPendingDeposit = booking.status === 'PENDING_DEPOSIT';

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)] hover:shadow-md">
      {/* Header đơn đặt phòng */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/homestays/${booking.homestayId}`}
            className="text-base font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5"
          >
            <Building className="h-4 w-4 text-[var(--color-muted)]" />
            <span>{booking.homestayName || `Homestay #${booking.homestayId}`}</span>
          </Link>
          {booking.homestayProvince && (
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-[var(--color-muted)] border border-[var(--color-border)]">
              <MapPin className="h-3 w-3 text-[var(--color-primary)]" />
              <span>{booking.homestayProvince}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mã booking và nút copy */}
          <button
            type="button"
            onClick={copyBookingCode}
            title="Nhấn để sao chép mã đặt phòng"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs font-mono font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <span>#{booking.code}</span>
            {copiedCode ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            )}
          </button>

          {/* Badge trạng thái */}
          <StatusBadge type="booking" status={booking.status} />
        </div>
      </div>

      {/* Thân card */}
      <div className="p-5 sm:p-6 grid gap-6 lg:grid-cols-[1fr_240px]">
        {/* Khối thông tin chi tiết */}
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Thumbnail ảnh phòng */}
          <div className="relative h-32 w-full sm:h-32 sm:w-44 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
            {primaryRoom?.coverImageUrl ? (
              <img
                src={fileUrl(primaryRoom.coverImageUrl)}
                alt={primaryRoom.roomName || 'Phòng nghỉ'}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-[var(--color-muted)]">
                <DoorOpen className="h-8 w-8 stroke-[1.5]" />
                <span className="text-[11px] mt-1">Homestay</span>
              </div>
            )}
          </div>

          {/* Chi tiết phòng & ngày lưu trú */}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <h3 className="text-base font-bold text-[var(--color-ink)] leading-snug">
                {roomNames || 'Phòng nghỉ'}
              </h3>
            </div>

            {/* Ngày nhận / trả */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-body)]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
              </span>
              <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-border)]">
                {nights} đêm
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <Users className="h-3.5 w-3.5" />
                {booking.guestCount} khách
              </span>
            </div>

            {/* Giờ quy định nhận/trả */}
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Nhận phòng từ {CHECK_IN_TIME} · Trả phòng trước {CHECK_OUT_DEADLINE}</span>
            </div>

            <p className="text-[11px] text-[var(--color-muted)]">
              Khởi tạo: {formatDateTime(booking.createdAt)}
            </p>
          </div>
        </div>

        {/* Khối tài chính & Hành động */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/50 p-4 lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pl-6">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between lg:block">
              <span className="text-xs text-[var(--color-muted)]">Tổng tiền phòng:</span>
              <p className="text-lg font-bold text-[var(--color-ink)]">
                {formatVnd(booking.roomTotalPrice)}
              </p>
            </div>
            <div className="flex items-baseline justify-between lg:block">
              <span className="text-xs text-[var(--color-muted)]">Tiền đặt cọc:</span>
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                {formatVnd(booking.depositAmount)}
              </p>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
            {isPendingDeposit && (
              <button
                type="button"
                onClick={() => onOpenPayment?.(booking)}
                className="flex w-full min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Xem chuyển khoản cọc</span>
              </button>
            )}

            {primaryRoom?.roomId && (
              <Link
                to={`/rooms/${primaryRoom.roomId}`}
                className="flex w-full min-h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                Xem lại phòng
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Banner cảnh báo thời hạn cọc cho PENDING_DEPOSIT */}
      {isPendingDeposit && booking.holdExpiresAt && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50/70 px-5 py-2.5 sm:px-6 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              Phòng đang được giữ đến: <strong>{formatDateTime(booking.holdExpiresAt)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenPayment?.(booking)}
            className="font-bold underline text-amber-900 hover:text-amber-950"
          >
            Thanh toán cọc ngay ›
          </button>
        </div>
      )}
    </article>
  );
}
