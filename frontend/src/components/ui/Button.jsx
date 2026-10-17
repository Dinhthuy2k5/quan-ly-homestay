import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Nút bấm chuẩn theo Airbnb design system (mục 6.1).
 * Variants: primary, secondary, ghost, danger, icon.
 * Sizes: md (48px), sm (36px).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none select-none cursor-pointer';

  const sizeStyles = {
    md: 'h-12 px-6 text-base rounded-[var(--radius-sm)]',
    sm: 'h-9 px-4 text-sm rounded-[var(--radius-sm)]',
    icon: 'w-10 h-10 p-0 rounded-full',
  }[variant === 'icon' ? 'icon' : size] || 'h-12 px-6 text-base rounded-[var(--radius-sm)]';

  const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:bg-[var(--color-primary-disabled)] disabled:cursor-not-allowed disabled:active:scale-100',
    secondary: 'bg-white border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    icon: 'bg-white border border-[var(--color-border)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:border-[var(--color-border-strong)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-1)]',
  }[variant] || '';

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang xử lý...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
