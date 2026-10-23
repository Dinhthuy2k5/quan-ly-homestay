import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, LogIn } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import Button from '../../../components/ui/Button';
import PasswordInput from '../../../components/ui/PasswordInput';
import { getErrorMessage } from '../../../lib/errors';
import { validateEmail } from '../../../lib/validation';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectUrl = searchParams.get('redirect') || location.state?.from || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login({ email: email.trim(), password });
      const role = res.user?.role;

      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
      } else if (role === 'MANAGER') {
        navigate('/manager', { replace: true });
      } else if (role === 'DIRECTOR') {
        navigate('/director', { replace: true });
      } else if (role === 'ADMIN') {
        navigate('/admin/users', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Đăng nhập</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Chào mừng bạn quay lại hệ thống Homestay</p>
        </div>

        {error && (
          <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ví dụ: khach@example.com"
              className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-semibold text-[var(--color-ink)]">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
            />
          </div>

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
            <LogIn className="mr-2 h-4 w-4" />
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-sm text-[var(--color-body)]">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
