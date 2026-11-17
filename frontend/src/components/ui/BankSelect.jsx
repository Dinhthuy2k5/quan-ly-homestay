import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { fetchSupportedBanks } from '../../lib/banks';

/**
 * Normalizes string for searching (removes diacritics, lowercase).
 */
function normalizeSearchText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * BankSelect - Combobox chọn hoặc tìm kiếm ngân hàng Việt Nam.
 * Hỗ trợ tự động tải từ VietQR/NAPAS và có danh sách fallback dự phòng.
 *
 * Props:
 * - value: string (tên hoặc tên viết tắt của ngân hàng)
 * - onChange: (bankName: string) => void
 * - placeholder?: string
 * - required?: boolean
 * - disabled?: boolean
 * - className?: string
 * - id?: string
 */
export default function BankSelect({
  value = '',
  onChange,
  placeholder = 'Chọn hoặc nhập tên ngân hàng',
  required = false,
  disabled = false,
  className = '',
  id,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchSupportedBanks().then((list) => {
      if (active) {
        setBanks(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredBanks = useMemo(() => {
    if (!searchQuery.trim()) return banks;
    const query = normalizeSearchText(searchQuery);
    return banks.filter((b) => {
      const shortNorm = normalizeSearchText(b.shortName);
      const codeNorm = normalizeSearchText(b.code);
      const nameNorm = normalizeSearchText(b.name);
      return shortNorm.includes(query) || codeNorm.includes(query) || nameNorm.includes(query);
    });
  }, [banks, searchQuery]);

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    onChange(nextVal);
    setSearchQuery(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectBank = (bank) => {
    const bankDisplayName = bank.shortName || bank.name;
    onChange(bankDisplayName);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          required={required}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setSearchQuery(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 pr-8 text-xs text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:bg-gray-100 ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setSearchQuery(value);
              setIsOpen((prev) => !prev);
            }
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg text-xs">
          {loading ? (
            <div className="p-3 text-center text-xs text-[var(--color-muted)]">Đang tải danh sách ngân hàng…</div>
          ) : filteredBanks.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--color-muted)]">
              Không tìm thấy ngân hàng khớp. Bạn vẫn có thể giữ nguyên tên đã nhập.
            </div>
          ) : (
            filteredBanks.map((bank) => {
              const displayName = bank.shortName || bank.name;
              const isSelected = value.trim().toLowerCase() === displayName.toLowerCase();
              return (
                <button
                  key={bank.code || bank.shortName}
                  type="button"
                  onClick={() => handleSelectBank(bank)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-50 font-semibold text-[var(--color-primary)]' : 'text-[var(--color-ink)]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs">{displayName}</span>
                      {bank.code && bank.code !== displayName && (
                        <span className="text-[10px] text-[var(--color-muted)] font-mono">({bank.code})</span>
                      )}
                    </div>
                    {bank.name && bank.name !== displayName && (
                      <p className="text-[10px] text-[var(--color-muted)] truncate">{bank.name}</p>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
