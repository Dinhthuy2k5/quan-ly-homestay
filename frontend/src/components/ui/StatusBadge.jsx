import React from 'react';
import { getStatusInfo } from '../../lib/status';

/**
 * Badge trạng thái chuẩn (mục 6.5).
 * @param {{ type: 'room'|'homestay'|'booking'|'payment'|'night', status: string, className?: string }} props
 */
export function StatusBadge({ type = 'room', status, className = '' }) {
  const { label, color } = getStatusInfo(type, status);

  const colorStyles = {
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
    danger:  'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
    info:    'bg-[var(--color-info-soft)] text-[var(--color-info)]',
    teal:    'bg-[var(--color-teal-soft)] text-[var(--color-teal)]',
    neutral: 'bg-[var(--color-surface-soft)] text-[var(--color-muted)] border border-[var(--color-border)]',
  }[color] || 'bg-[var(--color-surface-soft)] text-[var(--color-muted)]';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[var(--radius-pill)] leading-none select-none ${colorStyles} ${className}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
