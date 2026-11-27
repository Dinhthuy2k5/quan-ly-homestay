import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Power, PowerOff, X } from 'lucide-react';
import { updateDirectorHomestayApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';
import { getErrorMessage } from '../../../lib/errors';

/**
 * Hộp thoại xác nhận kích hoạt / tạm ngừng hoạt động homestay (API-DIR-HS-02).
 */
export function HomestayStatusModal({ homestay, onClose, onUpdated }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  if (!homestay) return null;

  const willDeactivate = homestay.status === 'ACTIVE';
  const targetStatus = willDeactivate ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const updated = await updateDirectorHomestayApi(homestay.id, { status: targetStatus });
      onUpdated?.(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,60)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-homestay-status-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-2)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                willDeactivate
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {willDeactivate ? (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 id="director-homestay-status-title" className="text-base font-bold text-[var(--color-ink)]">
                {willDeactivate ? 'Tạm ngừng hoạt động cơ sở?' : 'Kích hoạt lại cơ sở?'}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Thay đổi trạng thái vận hành của cơ sở homestay trên toàn hệ thống.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[var(--color-ink)]">{homestay.name}</p>
              <StatusBadge type="homestay" status={homestay.status} />
            </div>
            <p className="text-xs text-[var(--color-body)]">
              {homestay.address}, {homestay.province}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Hotline: <span className="font-semibold text-[var(--color-ink)]">{homestay.hotlinePhone}</span>
            </p>
          </div>

          {willDeactivate ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              Khi chuyển sang trạng thái <strong>Tạm ngừng (INACTIVE)</strong>, cơ sở sẽ tạm ẩn khỏi trang tìm kiếm công khai và không nhận đặt phòng mới. Hệ thống sẽ chặn thao tác nếu cơ sở vẫn còn đơn đặt phòng đang giữ chỗ, chờ duyệt, đã xác nhận hoặc đang lưu trú.
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
              Khi chuyển sang trạng thái <strong>Đang hoạt động (ACTIVE)</strong>, cơ sở sẽ hiển thị trở lại trên hệ thống công khai và các phòng đang mở bán có thể nhận đặt phòng mới.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3.5 text-sm text-[var(--color-danger)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer ${
              willDeactivate
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {willDeactivate ? (
              <PowerOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Power className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {submitting
                ? 'Đang xử lý...'
                : willDeactivate
                  ? 'Xác nhận tạm ngừng'
                  : 'Xác nhận kích hoạt'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomestayStatusModal;
