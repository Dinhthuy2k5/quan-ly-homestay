import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Menu, Search, X } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import { CHECK_IN_TIME, CHECK_OUT_DEADLINE } from '../lib/constants';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const province = searchParams.get('province') || '';
  const keyword = searchParams.get('keyword') || '';
  const showSearch = location.pathname === '/' || location.pathname === '/search' || location.pathname.startsWith('/rooms/');

  const submitSearch = ({ province: nextProvince, keyword: nextKeyword }) => {
    const params = new URLSearchParams();
    if (nextProvince) params.set('province', nextProvince);
    if (nextKeyword) params.set('keyword', nextKeyword);
    const query = params.toString();
    navigate(`/search${query ? `?${query}` : ''}`);
    setSearchOpen(false);
    setMenuOpen(false);
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

          <div className="relative flex shrink-0 items-center gap-2">
            {showSearch && (
              <button type="button" onClick={() => setSearchOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-1)] sm:hidden" aria-label="Bắt đầu tìm homestay">
                <Search aria-hidden="true" className="h-4 w-4" />
                <span>Bắt đầu tìm kiếm</span>
              </button>
            )}
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Mở menu điều hướng" className="flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] p-1.5 pl-3 transition-shadow hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]">
              {menuOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-soft)] text-xs font-semibold text-[var(--color-body)]" aria-hidden="true">HS</span>
            </button>
            {menuOpen && (
              <nav aria-label="Menu chính" className="absolute right-0 top-14 z-[var(--z-dropdown)] w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2 shadow-[var(--shadow-2)]">
                <Link to="/" onClick={() => setMenuOpen(false)} className="block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-medium hover:bg-[var(--color-surface-soft)]">Khám phá homestay</Link>
                <Link to="/search" onClick={() => setMenuOpen(false)} className="block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-medium hover:bg-[var(--color-surface-soft)]">Tìm kiếm</Link>
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
