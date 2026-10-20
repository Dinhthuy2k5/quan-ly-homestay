import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">403 — Không có quyền truy cập</h1>
      <p className="mt-2 max-w-md text-base text-[var(--color-muted)]">
        Tài khoản của bạn không có quyền thực hiện thao tác hoặc truy cập vào khu vực quản trị này.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button variant="primary" size="md">
            Về trang chủ
          </Button>
        </Link>
        <Link to="/account">
          <Button variant="secondary" size="md">
            Xem tài khoản của tôi
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default ForbiddenPage;
