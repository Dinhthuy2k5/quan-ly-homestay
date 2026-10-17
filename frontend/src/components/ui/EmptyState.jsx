import React from 'react';
import { Home } from 'lucide-react';
import Button from './Button';

export function EmptyState({
  icon: Icon = Home,
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có thông tin nào phù hợp.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface-soft)] flex items-center justify-center text-[var(--color-muted)] mb-4 border border-[var(--color-border)]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
