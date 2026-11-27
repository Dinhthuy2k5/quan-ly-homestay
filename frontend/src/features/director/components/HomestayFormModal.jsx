import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, Save, X } from 'lucide-react';
import { createDirectorHomestayApi, updateDirectorHomestayApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';
import { getErrorMessage } from '../../../lib/errors';
import { validateHotlinePhone } from '../../../lib/validation';

const INITIAL_FORM = {
  name: '',
  province: '',
  address: '',
  hotlinePhone: '',
  description: '',
};

/**
 * Modal dùng chung cho tạo mới cơ sở homestay (API-DIR-HS-01)
 * và chỉnh sửa thông tin cơ sở (API-DIR-HS-02).
 */
export function HomestayFormModal({ mode = 'create', homestay = null, onClose, onSaved }) {
  const isEdit = mode === 'edit' && Boolean(homestay);

  const [form, setForm] = useState(() =>
    isEdit && homestay
      ? {
          name: homestay.name || '',
          province: homestay.province || '',
          address: homestay.address || '',
          hotlinePhone: homestay.hotlinePhone || '',
          description: homestay.description || '',
        }
      : INITIAL_FORM
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const trimmedValues = {
    name: form.name.trim(),
    province: form.province.trim(),
    address: form.address.trim(),
    hotlinePhone: form.hotlinePhone.trim(),
    description: form.description.trim(),
  };

  const hasChanges = !isEdit || (
    trimmedValues.name !== (homestay?.name || '') ||
    trimmedValues.province !== (homestay?.province || '') ||
    trimmedValues.address !== (homestay?.address || '') ||
    trimmedValues.hotlinePhone !== (homestay?.hotlinePhone || '') ||
    trimmedValues.description !== (homestay?.description || '')
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const validate = () => {
    const errors = {};
    if (!trimmedValues.name) {
      errors.name = 'Tên homestay không được để trống.';
    } else if (trimmedValues.name.length > 150) {
      errors.name = 'Tên homestay không được vượt quá 150 ký tự.';
    }

    if (!trimmedValues.province) {
      errors.province = 'Tỉnh/thành phố không được để trống.';
    } else if (trimmedValues.province.length > 100) {
      errors.province = 'Tỉnh/thành phố không được vượt quá 100 ký tự.';
    }

    if (!trimmedValues.address) {
      errors.address = 'Địa chỉ chi tiết không được để trống.';
    } else if (trimmedValues.address.length > 255) {
      errors.address = 'Địa chỉ không được vượt quá 255 ký tự.';
    }

    const hotlineError = validateHotlinePhone(trimmedValues.hotlinePhone);
    if (hotlineError) {
      errors.hotlinePhone = hotlineError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    if (isEdit && !hasChanges) {
      setSubmitError('Bạn chưa thay đổi thông tin nào.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      let saved;
      if (isEdit) {
        const patch = {};
        if (trimmedValues.name !== (homestay.name || '')) patch.name = trimmedValues.name;
        if (trimmedValues.province !== (homestay.province || '')) patch.province = trimmedValues.province;
        if (trimmedValues.address !== (homestay.address || '')) patch.address = trimmedValues.address;
        if (trimmedValues.hotlinePhone !== (homestay.hotlinePhone || '')) {
          patch.hotlinePhone = trimmedValues.hotlinePhone;
        }
        if (trimmedValues.description !== (homestay.description || '')) {
          patch.description = trimmedValues.description;
        }
        saved = await updateDirectorHomestayApi(homestay.id, patch);
      } else {
        saved = await createDirectorHomestayApi(trimmedValues);
      }

      onSaved?.(saved, isEdit ? 'edit' : 'create');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,60)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-homestay-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-2)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="director-homestay-modal-title" className="truncate text-lg font-bold text-[var(--color-ink)]">
                  {isEdit ? 'Chỉnh sửa thông tin cơ sở' : 'Thêm cơ sở homestay mới'}
                </h2>
                {isEdit && homestay?.status && <StatusBadge type="homestay" status={homestay.status} />}
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                {isEdit
                  ? `Cập nhật hồ sơ và hotline công khai cho cơ sở #${homestay.id}.`
                  : 'Cơ sở mới được tạo sẽ mặc định ở trạng thái Đang hoạt động (ACTIVE).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-4">
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3.5 text-sm text-[var(--color-danger)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dir-hs-name" className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Tên cơ sở homestay <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                id="dir-hs-name"
                name="name"
                type="text"
                maxLength={150}
                value={form.name}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Ví dụ: Mộc Châu Pine Homestay"
                className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[var(--color-ink)] outline-none transition ${
                  fieldErrors.name
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="dir-hs-province" className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Tỉnh / Thành phố <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                id="dir-hs-province"
                name="province"
                type="text"
                maxLength={100}
                value={form.province}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Ví dụ: Sơn La"
                className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[var(--color-ink)] outline-none transition ${
                  fieldErrors.province
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                }`}
              />
              {fieldErrors.province && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.province}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dir-hs-address" className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Địa chỉ chi tiết <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                id="dir-hs-address"
                name="address"
                type="text"
                maxLength={255}
                value={form.address}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Ví dụ: Bản Áng, Đông Sang, Mộc Châu"
                className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[var(--color-ink)] outline-none transition ${
                  fieldErrors.address
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                }`}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.address}</p>
              )}
            </div>

            <div>
              <label htmlFor="dir-hs-hotline" className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Số điện thoại Hotline <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                id="dir-hs-hotline"
                name="hotlinePhone"
                type="tel"
                maxLength={20}
                value={form.hotlinePhone}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Ví dụ: 02123881234 hoặc 0912345678"
                className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[var(--color-ink)] outline-none transition ${
                  fieldErrors.hotlinePhone
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                }`}
              />
              {fieldErrors.hotlinePhone ? (
                <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.hotlinePhone}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  Số liên hệ công khai của cơ sở (hỗ trợ số bàn 11 số, di động 10 số hoặc +84).
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="dir-hs-description" className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
              Mô tả giới thiệu cơ sở
            </label>
            <textarea
              id="dir-hs-description"
              name="description"
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
              placeholder="Giới thiệu ngắn về không gian, vị trí và điểm nổi bật của homestay..."
              className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
            />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">Tối đa 2.000 ký tự.</p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-body)] transition hover:bg-[var(--color-surface-soft)] disabled:opacity-50 cursor-pointer"
            >
              <span>Hủy</span>
            </button>
            <button
              type="submit"
              disabled={submitting || (isEdit && !hasChanges)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Đang lưu...'
                  : isEdit
                    ? 'Lưu thay đổi'
                    : 'Tạo cơ sở homestay'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HomestayFormModal;
