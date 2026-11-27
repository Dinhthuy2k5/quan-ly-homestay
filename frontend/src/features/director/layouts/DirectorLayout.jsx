import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, ChevronRight, CircleDollarSign, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/context/useAuth';

const DIRECTOR_NAV_ITEMS = [
  {
    to: '/director/homestays',
    label: 'Quản lý cơ sở',
    icon: Building2,
    end: false,
  },
  {
    to: '/director/price-requests',
    label: 'Phê duyệt giá',
    icon: CircleDollarSign,
    end: false,
  },
];

export function DirectorLayout() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Thanh điều hướng cho màn hình nhỏ (< lg) */}
      <div className="lg:hidden space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <span>Giám đốc công ty</span>
            </div>
            <h1 className="truncate text-lg font-bold text-[var(--color-ink)]">
              {user?.fullName || 'Khu vực Giám đốc'}
            </h1>
          </div>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none" aria-label="Menu giám đốc di động">
          {DIRECTOR_NAV_ITEMS.map((item) => (
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
              <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bố cục 2 cột chuẩn đồng bộ với ManagerLayout */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
        <aside className="hidden lg:flex lg:w-68 xl:w-72 shrink-0 flex-col gap-4 lg:sticky lg:top-24">
          {/* Thẻ thông tin vai trò Giám đốc */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-1)] space-y-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Điều hành toàn công ty
                </span>
                <h2 className="truncate text-base font-bold text-[var(--color-ink)]" title={user?.fullName}>
                  {user?.fullName || 'Giám đốc'}
                </h2>
              </div>
            </div>

            {user?.email && (
              <div className="border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-muted)] truncate">
                {user.email}
              </div>
            )}
          </div>

          {/* Menu điều hướng dọc */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-1)] space-y-1.5">
            <div className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Danh mục quản trị
            </div>
            <nav className="flex flex-col space-y-1" aria-label="Menu giám đốc">
              {DIRECTOR_NAV_ITEMS.map((item) => (
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
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isActive
                            ? 'text-[var(--color-primary)] opacity-100 translate-x-0.5'
                            : 'text-[var(--color-muted)] opacity-0 group-hover:opacity-60'
                        }`}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Ghi chú phạm vi vai trò */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3.5 text-xs text-[var(--color-muted)] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
              <span>Khu vực Giám đốc</span>
            </div>
            <p className="leading-relaxed">
              Quản lý toàn bộ cơ sở homestay, phân công Quản lý và theo dõi, phê duyệt các đề xuất quy tắc giá phòng.
            </p>
          </div>
        </aside>

        {/* Nội dung chính */}
        <main className="flex-1 min-w-0 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DirectorLayout;
