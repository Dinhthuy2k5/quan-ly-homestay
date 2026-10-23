import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Home, Mail } from 'lucide-react';
import { forgotPasswordApi } from '../api';
import Button from '../../../components/ui/Button';
import { getErrorMessage } from '../../../lib/errors';
import { validateEmail } from '../../../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await forgotPasswordApi(email.trim());
      setSubmitted(true);
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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Quên mật khẩu</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Nhập email để nhận đường dẫn đặt lại mật khẩu
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-body)]">
              Nếu tài khoản tồn tại trong hệ thống, chúng tôi đã tạo hướng dẫn đặt lại mật khẩu cho địa chỉ{' '}
              <strong className="text-[var(--color-ink)]">{email}</strong>.
            </p>

            <p className="text-xs text-[var(--color-muted)]">
              Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn. Vui lòng kiểm tra cả thư mục spam.
            </p>

            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="md" className="w-full">
                  Quay lại đăng nhập
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
              <label htmlFor="forgot-email" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
                Email tài khoản
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ví dụ: khach@example.com"
                className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
              <Mail className="mr-2 h-4 w-4" />
              Gửi yêu cầu đặt lại mật khẩu
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

export default ForgotPasswordPage;
