import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Check, X, AlertCircle, Lock, Brain, BarChart3, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'One number', test: pw => /\d/.test(pw) },
  { label: 'One special character', test: pw => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
];

export default function SetupPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const token = params.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userName, setUserName] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError('No setup token provided');
      return;
    }

    fetch(`${API_BASE}/auth/verify-setup-token/${token}`, {
        headers: { 'ngrok-skip-browser-warning': '1' },
      })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTokenValid(true);
          setUserName(data.name || '');
        } else {
          setTokenError(data.reason || 'Invalid token');
        }
      })
      .catch(() => setTokenError('Failed to verify token'))
      .finally(() => setVerifying(false));
  }, [token]);

  const strength = PASSWORD_RULES.filter(r => r.test(password)).length;
  const segments = 4;
  const filledSegments = Math.round((strength / PASSWORD_RULES.length) * segments);
  const segmentColor = (i: number) => {
    if (i >= filledSegments) return 'bg-border';
    if (filledSegments <= 1) return 'bg-danger-500';
    if (filledSegments <= 2) return 'bg-warning-500';
    if (filledSegments <= 3) return 'bg-warning-500';
    return 'bg-success-500';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (strength < PASSWORD_RULES.length) {
      setError('Password does not meet all requirements');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ token, password, password_confirmation: confirm }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to set password');
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F1623] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-12 w-full">
          <div>
            <h1 className="text-[38px] leading-[46px] font-bold text-white tracking-[-0.03em]">
              EHS<span className="inline-block w-3 h-3 rounded-full bg-primary-500 mx-1.5 mb-1" />OS
            </h1>
            <p className="text-[20px] leading-[28px] text-white/70 mt-2">Environmental, Health & Safety</p>
            <p className="text-[13px] text-white/40 mt-1">FFT / Lucid — KAEC Riyadh Rail Project</p>
          </div>
          <div className="mt-16 space-y-5">
            {[
              { icon: Brain, text: 'AI-powered risk assessments' },
              { icon: BarChart3, text: 'Real-time compliance dashboard' },
              { icon: Shield, text: 'Complete EHS operational control' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon size={16} className="text-primary-400 shrink-0" />
                <span className="text-[13px] text-white/60">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-16">
            <p className="text-[11px] text-white/20">EHS·OS v2.0 — Confidential. Authorized use only.</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel ──────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-[30px] font-bold text-text-primary tracking-[-0.03em]">
              EHS<span className="inline-block w-2.5 h-2.5 rounded-full bg-primary-500 mx-1 mb-0.5" />OS
            </h1>
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] shadow-xl border border-border p-10">
            {verifying ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-2 border-border border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[13px] text-text-secondary">Verifying your setup link...</p>
              </div>
            ) : !tokenValid ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={24} className="text-danger-500" />
                </div>
                <h2 className="text-[20px] font-semibold text-text-primary mb-2">Link Invalid</h2>
                <p className="text-[13px] text-text-secondary mb-4">{tokenError}</p>
                <a href="/login" className="text-[13px] text-primary-600 hover:underline font-medium">Go to Login</a>
              </div>
            ) : success ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-success-600" />
                </div>
                <h2 className="text-[20px] font-semibold text-text-primary mb-2">Password Set!</h2>
                <p className="text-[13px] text-text-secondary">Redirecting to login...</p>
              </div>
            ) : (
              <>
                <h2 className="text-[24px] leading-[32px] font-bold text-text-primary">Set your password</h2>
                <p className="text-[13px] text-text-secondary mt-1">
                  Welcome{userName ? `, ${userName}` : ''}! Create a secure password.
                </p>

                <div className="border-b border-border mt-6 mb-6" />

                {error && (
                  <div className="flex items-start gap-2.5 bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 mb-5 text-[13px]">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-text-secondary">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full h-[42px] pl-9 pr-10 bg-white border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Strength meter */}
                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex gap-1.5">
                          {Array.from({ length: segments }).map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${segmentColor(i)}`} />
                          ))}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          {PASSWORD_RULES.map(rule => (
                            <div key={rule.label} className="flex items-center gap-2 text-[11px]">
                              {rule.test(password) ? (
                                <Check size={12} className="text-success-600 shrink-0" />
                              ) : (
                                <X size={12} className="text-text-disabled shrink-0" />
                              )}
                              <span className={rule.test(password) ? 'text-success-700' : 'text-text-tertiary'}>
                                {rule.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-text-secondary">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                        className="w-full h-[42px] pl-9 pr-3 bg-white border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
                        placeholder="Confirm your password"
                      />
                    </div>
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-[11px] text-danger-600">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || strength < PASSWORD_RULES.length || password !== confirm}
                    className="w-full h-[42px] bg-primary-600 text-white text-[14px] font-medium rounded-[var(--radius-sm)] shadow-xs hover:bg-primary-700 hover:shadow-sm active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-primary-200 transition-all duration-150 disabled:opacity-45 disabled:cursor-not-allowed mt-1 cursor-pointer"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Setting password...
                      </span>
                    ) : (
                      'Set Password'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
