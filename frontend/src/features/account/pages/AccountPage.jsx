import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../auth/context/useAuth';
import { changePasswordApi, updateProfileApi } from '../../auth/api';
import Button from '../../../components/ui/Button';
import PasswordInput from '../../../components/ui/PasswordInput';
import StatusBadge from '../../../components/ui/StatusBadge';
import { getErrorMessage } from '../../../lib/errors';

function ProfileForm({ user, refreshProfile }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim() || !phone.trim()) {
      setProfileError('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }

    setProfileLoading(true);

    try {
      await updateProfileApi({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      setProfileSuccess('Cập nhật thông tin cá nhân thành công.');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <section aria-labelledby="profile-title" className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-1)] sm:p-7">
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 id="profile-title" className="text-lg font-semibold text-[var(--color-ink)]">Thông tin cá nhân</h2>
          <p className="text-xs text-[var(--color-muted)]">Họ tên và số điện thoại liên hệ</p>
        </div>
      </div>

      {profileSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-success-soft)] p-3 text-sm font-medium text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
          {profileError}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div>
          <label htmlFor="acc-email" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Email tài khoản
          </label>
          <input
            id="acc-email"
            type="email"
            readOnly
            disabled
            value={user?.email || ''}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 text-sm text-[var(--color-muted)] cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">Email không thể thay đổi sau khi đăng ký.</p>
        </div>

        <div>
          <label htmlFor="acc-role" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Vai trò hệ thống
          </label>
          <div className="pt-0.5">
            <StatusBadge type="homestay" status={user?.role === 'CUSTOMER' ? 'Khách hàng' : user?.role || 'CUSTOMER'} />
          </div>
        </div>

        <div>
          <label htmlFor="acc-fullname" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Họ và tên
          </label>
          <input
            id="acc-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="acc-phone" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Số điện thoại
          </label>
          <input
            id="acc-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          />
        </div>

        <Button type="submit" variant="primary" size="md" loading={profileLoading} className="w-full mt-2">
          Lưu thay đổi
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword) {
      setPwdError('Vui lòng nhập mật khẩu cũ (mật khẩu hiện tại).');
      return;
    }

    if (!newPassword) {
      setPwdError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('Mật khẩu mới phải chứa ít nhất 8 ký tự.');
      return;
    }

    if (currentPassword === newPassword) {
      setPwdError('Mật khẩu mới không được trùng với mật khẩu cũ.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setPwdLoading(true);

    try {
      await changePasswordApi({
        currentPassword,
        newPassword,
      });
      setPwdSuccess('Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi an toàn.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(getErrorMessage(err));
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <section aria-labelledby="password-title" className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-1)] sm:p-7">
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 id="password-title" className="text-lg font-semibold text-[var(--color-ink)]">Đổi mật khẩu</h2>
          <p className="text-xs text-[var(--color-muted)]">Cập nhật mật khẩu định kỳ để bảo vệ tài khoản</p>
        </div>
      </div>

      {pwdSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-success-soft)] p-3 text-sm font-medium text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{pwdSuccess}</span>
        </div>
      )}

      {pwdError && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
          {pwdError}
        </div>
      )}

      <form onSubmit={handleChangePassword} autoComplete="off" className="space-y-4">
        <div>
          <label htmlFor="acc-current-pwd" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Mật khẩu cũ (mật khẩu hiện tại)
          </label>
          <PasswordInput
            id="acc-current-pwd"
            name="currentPasswordInput"
            required
            className="h-11"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu cũ của bạn"
            autoComplete="one-time-code"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">Vui lòng nhập mật khẩu cũ đang sử dụng để xác thực.</p>
        </div>

        <div>
          <label htmlFor="acc-new-pwd" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Mật khẩu mới
          </label>
          <PasswordInput
            id="acc-new-pwd"
            required
            className="h-11"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">Tối thiểu 8 ký tự.</p>
        </div>

        <div>
          <label htmlFor="acc-confirm-pwd" className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">
            Xác nhận mật khẩu mới
          </label>
          <PasswordInput
            id="acc-confirm-pwd"
            required
            className="h-11"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" variant="secondary" size="md" loading={pwdLoading} className="w-full mt-2">
          <KeyRound className="mr-2 h-4 w-4" />
          Đổi mật khẩu
        </Button>
      </form>
    </section>
  );
}

export function AccountPage() {
  const { user, refreshProfile } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4 sm:py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Link to="/" className="hover:text-[var(--color-ink)]">
          Khám phá
        </Link>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-[var(--color-ink)]">Tài khoản</span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">Cài đặt tài khoản</h1>
        <p className="text-sm text-[var(--color-muted)]">Quản lý thông tin hồ sơ và bảo mật tài khoản của bạn</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <ProfileForm key={user?.id || 'profile'} user={user} refreshProfile={refreshProfile} />
        <PasswordForm />
      </div>
    </div>
  );
}

export default AccountPage;
