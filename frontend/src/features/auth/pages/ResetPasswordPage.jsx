import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Home, KeyRound } from 'lucide-react';
import { resetPasswordApi } from '../api';
import Button from '../../../components/ui/Button';
import PasswordInput from '../../../components/ui/PasswordInput';
import { getErrorMessage } from '../../../lib/errors';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Mã đặt lại mật khẩu không được để trống.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải chứa ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await resetPasswordApi({
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[440px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-2)] sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Home className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Đặt lại mật khẩu</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Thiết lập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {success ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Đặt lại mật khẩu thành công!</h2>
            <p className="text-sm text-[var(--color-body)]">
              Mật khẩu của bạn đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" size="md" className="w-full">
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reset-token" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
                Mã xác nhận (Token)
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Nhập mã token đặt lại"
                className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="reset-password" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
                Mật khẩu mới
              </label>
              <PasswordInput
                id="reset-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">Tối thiểu 8 ký tự.</p>
            </div>

            <div>
              <label htmlFor="reset-confirm" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
                Xác nhận mật khẩu mới
              </label>
              <PasswordInput
                id="reset-confirm"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
              <KeyRound className="mr-2 h-4 w-4" />
              Đặt lại mật khẩu
            </Button>

            <div className="pt-3 text-center text-sm">
              <Link to="/login" className="font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
