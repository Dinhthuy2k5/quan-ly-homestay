import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function ErrorBanner({
  message = 'Không thể tải dữ liệu từ máy chủ.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] border border-[var(--color-danger)] p-6 text-center max-w-xl mx-auto my-8 ${className}`}
    >
      <div className="flex items-center justify-center gap-2 text-[var(--color-danger)] font-semibold text-base mb-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>Đã có lỗi xảy ra</span>
      </div>
      <p className="text-sm text-[var(--color-body)] mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </Button>
      )}
    </div>
  );
}

export default ErrorBanner;
