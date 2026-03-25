import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Check, X, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System Admin', ehs_manager: 'EHS Manager',
  safety_officer: 'Safety Officer', site_engineer: 'Site Engineer',
  contractor_hse: 'Contractor HSE', client_consultant: 'Client / Consultant',
  viewer_management: 'Viewer / Management', master: 'Master',
  officer: 'Officer', lead: 'Lead', client: 'Client', office: 'Office',
};

export default function MyProfilePage() {
  const { user, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  // Profile save
  const profileChanged = name !== user?.name || phone !== (user?.phone || '');

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      const res = await api.put<{ user: any }>('/auth/profile', { name: name.trim(), phone: phone.trim() });
      updateUser({
        ...user!,
        name: res.user.name,
        phone: res.user.phone,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  // Password save
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isDifferent = newPassword !== currentPassword || newPassword.length === 0;
  const canSubmitPassword = currentPassword.length > 0 && allRulesPass && passwordsMatch && isDifferent && !passwordLoading;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPassword) return;
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-primary-600 flex items-center justify-center text-lg sm:text-xl font-bold text-white shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-text-primary truncate">{user?.name}</h1>
          <p className="text-[12px] sm:text-[13px] text-text-tertiary truncate">{user?.email}</p>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary-50 text-primary-700 border border-primary-100">
            {ROLE_LABELS[user?.role || ''] || user?.role}
          </span>
        </div>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-[var(--radius-lg)] border border-border shadow-xs">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">Profile Information</h2>
          <p className="text-[12px] text-text-tertiary mt-0.5">Update your personal details</p>
        </div>

        <form onSubmit={handleProfileSave} className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {profileError && (
            <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">
              <X size={14} className="shrink-0 mt-0.5" />
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="flex items-start gap-2 p-3 bg-success-50 border border-success-100 rounded-[var(--radius-md)] text-[13px] text-success-700">
              <Check size={14} className="shrink-0 mt-0.5" />
              Profile updated successfully
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            iconLeft={<User size={14} />}
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            iconLeft={<Mail size={14} />}
            hint="Email cannot be changed. Contact your administrator."
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            iconLeft={<Phone size={14} />}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={profileLoading}
              disabled={!profileChanged || !name.trim()}
              icon={<Save size={14} />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-[var(--radius-lg)] border border-border shadow-xs">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">Change Password</h2>
          <p className="text-[12px] text-text-tertiary mt-0.5">Update your account password</p>
        </div>

        <form onSubmit={handlePasswordChange} className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {passwordError && (
            <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">
              <X size={14} className="shrink-0 mt-0.5" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="flex items-start gap-2 p-3 bg-success-50 border border-success-100 rounded-[var(--radius-md)] text-[13px] text-success-700">
              <Check size={14} className="shrink-0 mt-0.5" />
              Password changed successfully
            </div>
          )}

          <Input
            label="Current Password"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
            iconLeft={<Lock size={14} />}
            iconRight={
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          <div>
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              error={
                newPassword.length > 0 && newPassword === currentPassword
                  ? 'Must be different from current password'
                  : undefined
              }
              iconLeft={<Lock size={14} />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />

            {newPassword.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 text-[11px] transition-colors ${
                        passed ? 'text-success-600' : 'text-text-tertiary'
                      }`}
                    >
                      {passed ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-border-strong" />}
                      {rule.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Input
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? 'Passwords do not match'
                : undefined
            }
            iconLeft={<Lock size={14} />}
            iconRight={
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={passwordLoading}
              disabled={!canSubmitPassword}
              icon={<Lock size={14} />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
