import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Building2, BedDouble, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { getAssignedHomestayApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';

export function ManagerLayout() {
  const [homestay, setHomestay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getAssignedHomestayApi()
      .then((data) => {
        if (isMounted) {
          setHomestay(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const code = err.response?.data?.error?.code;
          if (code === 'HOMESTAY_NOT_ASSIGNED') {
            setError('Tài khoản quản lý của bạn chưa được Giám đốc phân công cơ sở homestay nào.');
          } else {
            setError(err.response?.data?.error?.message || 'Không thể tải thông tin homestay.');
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navItemClass = ({ isActive }) =>
    `inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-[var(--radius-sm)] transition-colors ${
      isActive
        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm'
        : 'text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]'
    }`;

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-[var(--shadow-1)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <ShieldCheck className="h-4 w-4" />
              <span>Khu vực Quản lý Cơ sở</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {loading ? 'Đang tải thông tin cơ sở...' : homestay?.name || 'Quản lý Homestay'}
            </h1>
            {homestay && (
              <p className="text-sm text-[var(--color-muted)]">
                {homestay.address}, {homestay.province} • Hotline: <span className="font-medium text-[var(--color-ink)]">{homestay.hotlinePhone || 'Chưa cập nhật'}</span>
              </p>
            )}
          </div>

          {homestay && (
            <div className="flex items-center gap-3">
              <StatusBadge type="homestay" status={homestay.status} />
              <Link
                to={`/homestays/${homestay.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] transition-colors"
              >
                <span>Xem trang công khai</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Chưa có cơ sở phân công</p>
              <p className="mt-0.5 text-amber-800">{error}</p>
              <p className="mt-2 text-xs text-amber-700">
                Vui lòng liên hệ Giám đốc (Director) hoặc Quản trị viên (Admin) để hoàn tất gán cơ sở homestay cho tài khoản của bạn.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        {!error && (
          <nav className="mt-6 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4" aria-label="Menu quản lý">
            <NavLink to="/manager/homestay" end className={navItemClass}>
              <Building2 className="h-4 w-4" />
              <span>Thông tin cơ sở</span>
            </NavLink>
            <NavLink to="/manager/rooms" className={navItemClass}>
              <BedDouble className="h-4 w-4" />
              <span>Quản lý phòng</span>
            </NavLink>
          </nav>
        )}
      </div>

      {/* Main Content Area */}
      <Outlet context={{ homestay, reloadHomestay: () => {
        getAssignedHomestayApi().then(setHomestay).catch(() => {});
      }}} />
    </div>
  );
}

export default ManagerLayout;
