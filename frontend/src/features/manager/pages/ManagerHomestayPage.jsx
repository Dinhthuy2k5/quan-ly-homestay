import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, MapPin, Phone, Edit3, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
import { getAssignedHomestayApi, updateAssignedHomestayApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';
import MediaManager from '../components/MediaManager';

export function ManagerHomestayPage() {
  const context = useOutletContext();
  const [homestay, setHomestay] = useState(context?.homestay || null);
  const [loading, setLoading] = useState(!context?.homestay);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    hotlinePhone: '',
    description: '',
  });

  useEffect(() => {
    let active = true;
    getAssignedHomestayApi()
      .then((data) => {
        if (!active) return;
        setHomestay(data);
        setFormData({
          name: data.name || '',
          address: data.address || '',
          hotlinePhone: data.hotlinePhone || '',
          description: data.description || '',
        });
        setErrorMessage('');
      })
      .catch((err) => {
        if (!active) return;
        const code = err.response?.data?.error?.code;
        if (code === 'HOMESTAY_NOT_ASSIGNED') {
          setErrorMessage('Tài khoản quản lý chưa được phân công cơ sở.');
        } else {
          setErrorMessage(err.response?.data?.error?.message || 'Không thể tải thông tin homestay.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStartEdit = () => {
    if (homestay) {
      setFormData({
        name: homestay.name || '',
        address: homestay.address || '',
        hotlinePhone: homestay.hotlinePhone || '',
        description: homestay.description || '',
      });
      setIsEditing(true);
      setSuccessMessage('');
      setErrorMessage('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMessage('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Tên homestay không được để trống.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Địa chỉ homestay không được để trống.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      const updated = await updateAssignedHomestayApi(formData);
      setHomestay(updated);
      setIsEditing(false);
      setSuccessMessage('Cập nhật thông tin cơ sở homestay thành công!');
      if (context?.reloadHomestay) context.reloadHomestay();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!homestay && errorMessage) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-1)]">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">Chưa thể hiển thị cơ sở</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Chi tiết hồ sơ Homestay</h2>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
            >
              <Edit3 className="h-4 w-4" />
              <span>Chỉnh sửa thông tin</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-ink)] mb-1">
                Tên homestay <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={150}
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
                placeholder="Ví dụ: Mai Châu Green Homestay"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-[var(--color-ink)] mb-1">
                  Địa chỉ chi tiết <span className="text-[var(--color-primary)]">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  maxLength={255}
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
                  placeholder="Ví dụ: Bản Lác, Mai Châu, Hòa Bình"
                />
              </div>

              <div>
                <label htmlFor="hotlinePhone" className="block text-sm font-semibold text-[var(--color-ink)] mb-1">
                  Số điện thoại Hotline
                </label>
                <input
                  id="hotlinePhone"
                  name="hotlinePhone"
                  type="tel"
                  maxLength={20}
                  value={formData.hotlinePhone}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
                  placeholder="Ví dụ: 0981234567"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-[var(--color-ink)] mb-1">
                Mô tả giới thiệu cơ sở
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
                placeholder="Giới thiệu về vị trí, không gian, phong cảnh và nét đặc sắc của homestay..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Hủy</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 divide-y divide-[var(--color-border)] text-sm">
            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Tên cơ sở</span>
              <span className="font-semibold text-[var(--color-ink)] sm:col-span-2">{homestay.name}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Tỉnh / Thành phố</span>
              <span className="text-[var(--color-ink)] sm:col-span-2 font-medium">{homestay.province}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Địa chỉ chi tiết</span>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                <span className="text-[var(--color-ink)]">{homestay.address}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Hotline liên hệ</span>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Phone className="h-4 w-4 text-[var(--color-muted)]" />
                <span className="font-medium text-[var(--color-ink)]">
                  {homestay.hotlinePhone || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Trạng thái vận hành</span>
              <div className="sm:col-span-2">
                <StatusBadge type="homestay" status={homestay.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-3">
              <span className="font-medium text-[var(--color-muted)]">Mô tả giới thiệu</span>
              <div className="sm:col-span-2">
                {homestay.description ? (
                  <p className="whitespace-pre-line leading-relaxed text-[var(--color-body)]">
                    {homestay.description}
                  </p>
                ) : (
                  <span className="italic text-[var(--color-muted)]">Chưa có mô tả giới thiệu</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaManager
        ownerType="HOMESTAY"
        ownerId={homestay.id}
        media={homestay.media || []}
        onChange={(media) => setHomestay((current) => ({ ...current, media }))}
      />
    </div>
  );
}

export default ManagerHomestayPage;
