import React, { useEffect, useId, useState } from 'react';
import { Check, PencilLine } from 'lucide-react';

/** Quick selectable notes for optional, free-form note fields. */
export default function OptionalNotePicker({
  label,
  value = '',
  onChange,
  options,
  placeholder = 'Nhập nội dung riêng (không bắt buộc)',
  maxLength = 255,
  rows = 2,
  className = '',
}) {
  const id = useId();
  const [otherSelected, setOtherSelected] = useState(false);

  useEffect(() => {
    if (options.includes(value)) setOtherSelected(false);
    else if (value) setOtherSelected(true);
  }, [options, value]);

  const selectOther = () => {
    setOtherSelected(true);
    if (options.includes(value)) onChange('');
  };

  return (
    <fieldset className={`space-y-2 ${className}`}>
      <legend className="mb-2 text-sm font-semibold text-[var(--color-ink)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option && !otherSelected;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => { setOtherSelected(false); onChange(option); }}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'}`}
            >
              {selected && <Check aria-hidden="true" className="h-4 w-4" />}
              {option}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={otherSelected}
          onClick={selectOther}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${otherSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]'}`}
        >
          <PencilLine aria-hidden="true" className="h-4 w-4" />Khác, nhập nội dung
        </button>
      </div>
      {otherSelected && (
        <textarea
          id={id}
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          aria-label={`${label} - nội dung riêng`}
          className="w-full resize-y rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm font-normal text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
        />
      )}
    </fieldset>
  );
}
