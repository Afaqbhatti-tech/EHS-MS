import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Lock, Check, X as XIcon } from 'lucide-react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { api } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

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

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timer on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isDifferent = newPassword !== currentPassword || newPassword.length === 0;
  const canSubmit = currentPassword.length > 0 && allRulesPass && passwordsMatch && isDifferent && !loading;

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setSuccess(false);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setSuccess(true);
      timerRef.current = setTimeout(() => handleClose(), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change Password"
      subtitle="Update your account password. You'll stay logged in on this device."
      size="sm"
      footer={
        success ? null : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              icon={<Lock size={14} />}
            >
              Update Password
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center">
            <Check size={24} className="text-success-600" />
          </div>
          <p className="text-[15px] font-semibold text-text-primary">Password Updated</p>
          <p className="text-[13px] text-text-secondary">Your password has been changed successfully.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">
              <XIcon size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Current Password */}
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
                onClick={() => setShowCurrent((v) => !v)}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {/* New Password */}
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
                  onClick={() => setShowNew((v) => !v)}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />

            {/* Password strength rules */}
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

          {/* Confirm Password */}
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
                onClick={() => setShowConfirm((v) => !v)}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </form>
      )}
    </Modal>
  );
}
