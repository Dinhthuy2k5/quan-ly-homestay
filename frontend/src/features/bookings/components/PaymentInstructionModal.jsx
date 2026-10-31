import React, { useState } from 'react';
import { AlertCircle, Check, Copy, CreditCard, ShieldCheck, X } from 'lucide-react';
import { formatDateTime, formatVnd } from '../../../lib/format';

export default function PaymentInstructionModal({ booking, onClose }) {
  const [copiedKey, setCopiedKey] = useState('');

  if (!booking) return null;

  const { paymentInstruction, depositAmount, holdExpiresAt, code } = booking;
  const transferContent = paymentInstruction?.transferContent || `${code} DAT COC`;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((current) => (current === key ? '' : current));
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-instruction-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4.5 bg-[var(--color-surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 id="payment-instruction-title" className="text-lg font-bold text-[var(--color-ink)]">
                Thông tin thanh toán cọc
              </h2>
              <p className="text-xs text-[var(--color-muted)]">Mã đặt phòng: #{code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] hover:bg-gray-200 hover:text-[var(--color-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung thanh toán */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-sm">
          {/* Thông báo thời hạn giữ phòng */}
          {holdExpiresAt && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
              <div>
                <p className="font-semibold text-xs tracking-wide uppercase text-amber-800">
                  Thời hạn hoàn tất đặt cọc
                </p>
                <p className="mt-0.5 text-sm">
                  Phòng được tạm giữ đến{' '}
                  <strong className="font-bold underline decoration-amber-400">
                    {formatDateTime(holdExpiresAt)}
                  </strong>
                  . Vui lòng chuyển khoản trước mốc này để giữ phòng.
                </p>
              </div>
            </div>
          )}

          {/* Chi tiết tài khoản ngân hàng */}
          {paymentInstruction?.bankAccountNumber ? (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-muted)]">Ngân hàng thụ hưởng</span>
                <span className="font-bold text-[var(--color-ink)] text-right">
                  {paymentInstruction.bankName || 'Ngân hàng nhận cọc'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Số tài khoản</p>
                  <p className="text-lg font-mono font-bold tracking-wider text-[var(--color-ink)]">
                    {paymentInstruction.bankAccountNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(paymentInstruction.bankAccountNumber, 'account')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-xs"
                >
                  {copiedKey === 'account' ? (
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
                <span className="font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                  {paymentInstruction.bankAccountHolder || 'HOMESTAY'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--color-border)] pt-2.5">
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Số tiền cần chuyển (tiền cọc)</p>
                  <p className="text-base font-bold text-[var(--color-primary)]">
                    {formatVnd(depositAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(depositAmount), 'amount')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-xs"
                >
                  {copiedKey === 'amount' ? (
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
                    <p className="text-xs font-semibold text-emerald-900">Nội dung chuyển khoản (bắt buộc):</p>
                    <p className="font-mono font-bold text-emerald-950 text-sm mt-0.5 truncate">
                      {transferContent}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(transferContent, 'content')}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    {copiedKey === 'content' ? (
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
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-[var(--color-muted)]">
              Thông tin tài khoản ngân hàng chưa được cập nhật trong hệ thống. Vui lòng liên hệ trực tiếp homestay để nhận hướng dẫn thanh toán.
            </div>
          )}

          {/* Lưu ý kiểm duyệt thủ công */}
          <div className="flex items-center gap-2.5 text-xs text-[var(--color-muted)] pt-1">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Sau khi bạn chuyển khoản, quản lý cơ sở sẽ đối soát và xác nhận đơn đặt phòng của bạn.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-soft)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
