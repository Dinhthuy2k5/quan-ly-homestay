import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Home, LogIn, LogOut, Menu, Search, User as UserIcon, X } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../lib/constants';
import { useAuth } from '../features/auth/context/useAuth';

const ROLE_BADGES = {
  CUSTOMER: { label: 'Khách hàng', className: 'bg-white text-[var(--color-body)] border-[var(--color-border)]' },
  MANAGER: { label: 'Quản lý cơ sở', className: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary-disabled)]' },
  DIRECTOR: { label: 'Giám đốc', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ADMIN: { label: 'Quản trị viên', className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

function SearchOverlay({ initialProvince, initialKeyword, onSearch, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-black/40 p-4 sm:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="mobile-search-title" className="mx-auto mt-2 max-w-lg rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-2)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="mobile-search-title" className="text-lg font-semibold text-[var(--color-ink)]">Tìm homestay</h2>
          <button type="button" onClick={onClose} aria-label="Đóng tìm kiếm" className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <SearchBar idPrefix="mobile-search" key={`${initialProvince}:${initialKeyword}`} initialProvince={initialProvince} initialKeyword={initialKeyword} onSearch={onSearch} />
        <p className="mt-4 text-sm text-[var(--color-muted)]">Tìm theo tỉnh/thành phố hoặc tên homestay.</p>
      </section>
    </div>
  );
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const province = searchParams.get('province') || '';
  const keyword = searchParams.get('keyword') || '';
  const showSearch = location.pathname === '/' || location.pathname === '/search' || location.pathname.startsWith('/rooms/');

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const submitSearch = ({ province: nextProvince, keyword: nextKeyword }) => {
    const params = new URLSearchParams();
    if (nextProvince) params.set('province', nextProvince);
    if (nextKeyword) params.set('keyword', nextKeyword);
    const query = params.toString();
    navigate(`/search${query ? `?${query}` : ''}`);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'HS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-border)] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
          <Link to="/" aria-label="Homestay — Trang chủ" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] sm:text-xl">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Home aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Homestay</span>
          </Link>

          {showSearch && (
            <div className="hidden min-w-0 flex-1 justify-center px-6 sm:flex">
              <SearchBar idPrefix="desktop-search" key={`${province}:${keyword}`} initialProvince={province} initialKeyword={keyword} onSearch={submitSearch} className="max-w-[680px]" />
            </div>
          )}

          <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
            {showSearch && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-1)] sm:hidden"
                aria-label="Bắt đầu tìm homestay"
              >
                <Search aria-hidden="true" className="h-4 w-4" />
                <span>Bắt đầu tìm kiếm</span>
              </button>
            )}

            {/* Khung hiển thị tài khoản cá nhân */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-label="Mở menu tài khoản cá nhân"
                className="flex h-11 sm:h-12 items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-white py-1.5 pl-3 pr-2.5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                <Menu aria-hidden="true" className="h-4 w-4 text-[var(--color-body)]" />

                {/* Avatar nổi bật với màu thương hiệu primary */}
                <span
                  className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-[var(--color-primary)] text-xs sm:text-sm font-bold text-white shadow-xs"
                  aria-hidden="true"
                >
                  {getInitials(user?.fullName)}
                </span>

                {/* Thông tin tên và vai trò rõ nét */}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="max-w-[130px] md:max-w-[160px] truncate text-xs sm:text-sm font-bold text-[var(--color-ink)] leading-tight">
                    {user?.fullName || 'Tài khoản'}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)] font-medium leading-tight">
                    {ROLE_BADGES[user?.role]?.label || 'Đã đăng nhập'}
                  </span>
                </div>

                <ChevronDown
                  className={`hidden sm:block h-4 w-4 text-[var(--color-muted)] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-label="Mở menu đăng nhập"
                className="flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[var(--shadow-1)] transition-all hover:border-[var(--color-border-strong)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                <Menu aria-hidden="true" className="h-4 w-4 text-[var(--color-body)]" />
                <div className="flex items-center gap-1.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-muted)]" aria-hidden="true">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline text-xs font-semibold text-[var(--color-ink)]">Đăng nhập</span>
                </div>
              </button>
            )}

            {menuOpen && (
              <nav
                aria-label="Menu chính"
                className="absolute right-0 top-14 sm:top-15 z-[var(--z-dropdown)] w-72 sm:w-80 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-2.5 shadow-[var(--shadow-2)]"
              >
                {isAuthenticated ? (
                  <>
                    {/* Thẻ thông tin tài khoản cá nhân lớn và đồng bộ tông màu thiết kế */}
                    <div className="mb-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3.5 shadow-xs">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white shadow-sm">
                          {getInitials(user?.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[var(--color-ink)]">
                            {user?.fullName || 'Người dùng'}
                          </p>
                          <p className="truncate text-xs text-[var(--color-muted)]">{user?.email}</p>
                          <span
                            className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                              ROLE_BADGES[user?.role]?.className || 'bg-white text-[var(--color-body)] border-[var(--color-border)]'
                            }`}
                          >
                            {ROLE_BADGES[user?.role]?.label || 'Khách hàng'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-soft)] transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-[var(--color-primary)]" />
                      <span className="font-semibold text-[var(--color-ink)]">Tài khoản cá nhân</span>
                    </Link>

                    {user?.role === 'MANAGER' && (
                      <Link
                        to="/manager"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] transition-colors"
                      >
                        Khu vực Quản lý homestay
                      </Link>
                    )}
                    {user?.role === 'DIRECTOR' && (
                      <Link
                        to="/director"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Khu vực Giám đốc
                      </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin/users"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        Quản trị hệ thống
                      </Link>
                    )}

                    <div className="my-1.5 border-t border-[var(--color-border)]" />

                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-soft)] text-gray-700"
                    >
                      Khám phá homestay
                    </Link>
                    <Link
                      to="/search"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-soft)] text-gray-700"
                    >
                      Tìm kiếm
                    </Link>

                    <div className="my-1.5 border-t border-[var(--color-border)]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Khung tài khoản khi chưa đăng nhập */}
                    <div className="mb-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 text-center">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">Tài khoản</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">Đăng nhập để đặt phòng và lưu homestay yêu thích</p>
                      <div className="mt-3 flex gap-2">
                        <Link
                          to="/login"
                          onClick={() => setMenuOpen(false)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] py-2 text-center text-xs font-semibold text-white shadow-xs hover:opacity-95"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Đăng nhập</span>
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setMenuOpen(false)}
                          className="flex-1 rounded-lg border border-[var(--color-border)] bg-white py-2 text-center text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
                        >
                          Đăng ký
                        </Link>
                      </div>
                    </div>

                    <div className="my-1 border-t border-[var(--color-border)]" />

                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-soft)] text-gray-700"
                    >
                      Khám phá homestay
                    </Link>
                    <Link
                      to="/search"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-soft)] text-gray-700"
                    >
                      Tìm kiếm
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface-soft)]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <h2 className="font-semibold text-[var(--color-ink)]">Khám phá</h2>
            <Link to="/search" className="mt-3 inline-block text-[var(--color-body)] hover:underline">Tìm homestay</Link>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-ink)]">Hỗ trợ đặt phòng</h2>
            <p className="mt-3 leading-relaxed text-[var(--color-body)]">Liên hệ trực tiếp homestay qua số hotline trên trang thông tin cơ sở.</p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-ink)]">Thời gian lưu trú</h2>
            <p className="mt-3 text-[var(--color-body)]">Nhận phòng từ {CHECK_IN_TIME}</p>
            <p className="mt-1 text-[var(--color-body)]">Trả phòng đến hết {CHECK_OUT_DEADLINE}</p>
          </div>
          <p className="border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-muted)] sm:col-span-3">© 2026 Hệ thống quản lý vận hành homestay</p>
        </div>
      </footer>

      {searchOpen && showSearch && <SearchOverlay initialProvince={province} initialKeyword={keyword} onSearch={submitSearch} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

export default PublicLayout;
