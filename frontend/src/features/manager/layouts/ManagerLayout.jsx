import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Tags,
  CircleDollarSign,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import { getAssignedHomestayApi } from '../api';
import StatusBadge from '../../../components/ui/StatusBadge';

const NAV_ITEMS = [
  {
    to: '/manager/homestay',
    label: 'Thông tin cơ sở',
    icon: Building2,
    end: true,
  },
  {
    to: '/manager/bookings',
    label: 'Đơn đặt phòng',
    icon: CalendarCheck,
    end: false,
  },
  {
    to: '/manager/rooms',
    label: 'Quản lý phòng',
    icon: BedDouble,
    end: false,
  },
  {
    to: '/manager/room-types',
    label: 'Loại phòng',
    icon: Tags,
    end: true,
  },
  {
    to: '/manager/price-rules',
    label: 'Quy tắc giá',
    icon: CircleDollarSign,
    end: true,
  },
];

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

  return (
    <div className="space-y-6">
      {/* Top Mobile Bar (hiển thị trên màn hình nhỏ < lg) */}
      <div className="lg:hidden space-y-3.5 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span>Quản lý cơ sở</span>
            </div>
            <h1 className="truncate text-lg font-bold text-[var(--color-ink)]">
              {loading ? 'Đang tải...' : homestay?.name || 'Quản lý Homestay'}
            </h1>
          </div>
          {homestay && <StatusBadge type="homestay" status={homestay.status} />}
        </div>

        {homestay && (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-muted)]">
            <span className="truncate">{homestay.address}, {homestay.province}</span>
            <Link
              to={`/homestays/${homestay.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[var(--color-primary)] font-semibold hover:underline"
            >
              <span>Xem trang</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Mobile Horizontal Tabs */}
        {!error && (
          <nav className="flex gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none" aria-label="Menu quản lý di động">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-surface-soft)] text-[var(--color-body)] hover:text-[var(--color-ink)]'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm shadow-xs">
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

      {/* Bố cục 2 cột tiêu chuẩn: Cột dọc điều hành bên trái, Nội dung bên phải */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
        {/* Cột dọc bên trái (Desktop Sidebar) */}
        {!error && (
          <aside className="hidden lg:flex lg:w-68 xl:w-72 shrink-0 flex-col gap-4 lg:sticky lg:top-24">
            {/* Thẻ thông tin tóm tắt Homestay */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)] space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold shadow-xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Cơ sở quản lý
                    </span>
                    <h2 className="truncate text-base font-bold text-[var(--color-ink)]" title={homestay?.name}>
                      {loading ? 'Đang tải…' : homestay?.name || 'Quản lý Homestay'}
                    </h2>
                  </div>
                </div>
              </div>

              {homestay && (
                <>
                  <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-body)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-muted)] font-medium">Trạng thái:</span>
                      <StatusBadge type="homestay" status={homestay.status} />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[var(--color-muted)] font-medium shrink-0">Khu vực:</span>
                      <span className="font-semibold text-right text-[var(--color-ink)] truncate">{homestay.province}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--color-muted)] font-medium shrink-0">Hotline:</span>
                      <span className="font-semibold text-[var(--color-ink)]">{homestay.hotlinePhone || 'Chưa có'}</span>
                    </div>
                  </div>

                  <Link
                    to={`/homestays/${homestay.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] py-2 text-xs font-semibold text-[var(--color-body)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    <span>Xem trang công khai</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                  </Link>
                </>
              )}
            </div>

            {/* Cột dọc Danh mục điều hành (Vertical Navigation) */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-1)] space-y-1.5">
              <div className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Danh mục điều hành
              </div>
              <nav className="flex flex-col space-y-1" aria-label="Menu quản lý">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold border border-[var(--color-primary-disabled)] shadow-xs'
                          : 'text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)] border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-[var(--color-primary)]'
                                : 'text-[var(--color-muted)] group-hover:text-[var(--color-ink)]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            isActive
                              ? 'text-[var(--color-primary)] opacity-100 translate-x-0.5'
                              : 'text-[var(--color-muted)] opacity-0 group-hover:opacity-60'
                          }`}
                        />
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Thẻ vai trò và hướng dẫn */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3.5 text-xs text-[var(--color-muted)] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Khu vực Quản lý</span>
              </div>
              <p className="leading-relaxed">
                Hệ thống điều hành cơ sở: cập nhật hồ sơ, quản lý phòng & giá, duyệt cọc và hủy đơn đặt phòng.
              </p>
            </div>
          </aside>
        )}

        {/* Khu vực nội dung chính bên phải */}
        <main className="flex-1 min-w-0 w-full">
          <Outlet
            context={{
              homestay,
              reloadHomestay: () => {
                getAssignedHomestayApi().then(setHomestay).catch(() => {});
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default ManagerLayout;
