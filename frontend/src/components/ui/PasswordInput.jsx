import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Component ô nhập mật khẩu với nút bật/tắt xem mật khẩu (Eye / EyeOff).
 * Thiết kế theo Airbnb Design Tokens và chuẩn trợ năng (WCAG).
 */
export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  autoComplete,
  className = '',
  disabled = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] pl-3 pr-11 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none transition-colors disabled:cursor-not-allowed disabled:bg-[var(--color-surface-soft)] ${className || 'h-12'}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] rounded-r-[var(--radius-sm)]"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export default PasswordInput;
