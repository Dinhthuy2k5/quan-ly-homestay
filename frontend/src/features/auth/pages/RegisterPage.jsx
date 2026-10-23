import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, UserPlus } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import Button from '../../../components/ui/Button';
import PasswordInput from '../../../components/ui/PasswordInput';
import { getErrorMessage } from '../../../lib/errors';
import { validateEmail, validatePhone } from '../../../lib/validation';

export function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải chứa ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      // Tự động đăng nhập sau khi đăng ký thành công
      await login({ email: email.trim(), password });
      navigate('/', { replace: true });
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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Đăng ký để đặt phòng và theo dõi chuyến đi</p>
        </div>

        {error && (
          <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-fullname" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Họ và tên
            </label>
            <input
              id="reg-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ví dụ: Nguyễn Văn A"
              className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Email
            </label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-phone" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Số điện thoại
            </label>
            <input
              id="reg-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ví dụ: 0901234567"
              className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Mật khẩu
            </label>
            <PasswordInput
              id="reg-password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">Tối thiểu 8 ký tự.</p>
          </div>

          <div>
            <label htmlFor="reg-confirm" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
              Xác nhận mật khẩu
            </label>
            <PasswordInput
              id="reg-confirm"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
            <UserPlus className="mr-2 h-4 w-4" />
            Đăng ký tài khoản
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-sm text-[var(--color-body)]">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
