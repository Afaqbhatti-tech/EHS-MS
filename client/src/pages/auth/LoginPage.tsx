import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Brain, BarChart3, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel (Dark) ────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F1623] relative overflow-hidden">
        {/* Subtle radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.08),transparent_60%)]" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-12 w-full">
          {/* Logo */}
          <div>
            <h1 className="text-[38px] leading-[46px] font-bold text-white tracking-[-0.03em]">
              EHS<span className="inline-block w-3 h-3 rounded-full bg-primary-500 mx-1.5 mb-1" />OS
            </h1>
            <p className="text-[20px] leading-[28px] text-white/70 mt-2">
              Environmental, Health & Safety
            </p>
            <p className="text-[13px] text-white/40 mt-1">
              FFT / Lucid — KAEC Riyadh Rail Project
            </p>
          </div>

          {/* Feature callouts */}
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

          {/* Bottom */}
          <div className="mt-auto pt-16">
            <p className="text-[11px] text-white/20">
              EHS·OS v2.0 — Confidential. Authorized use only.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Light) ──────────────── */}
      <div className="flex-1 flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-[30px] font-bold text-text-primary tracking-[-0.03em]">
              EHS<span className="inline-block w-2.5 h-2.5 rounded-full bg-primary-500 mx-1 mb-0.5" />OS
            </h1>
            <p className="text-[13px] text-text-tertiary mt-1">KAEC Riyadh Rail Project</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-[var(--radius-xl)] shadow-xl border border-border p-10">
            <h2 className="text-[24px] leading-[32px] font-bold text-text-primary">
              Welcome back
            </h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Sign in to EHS·OS
            </p>

            <div className="border-b border-border mt-6 mb-6" />

            {error && (
              <div className="flex items-start gap-2.5 bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 mb-5 text-[13px]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-[13px] font-medium text-text-secondary">
                  Username or Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                    className="w-full h-[42px] pl-9 pr-3 bg-white border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
                    placeholder="Enter your username or email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-text-secondary">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-[42px] pl-9 pr-10 bg-white border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[42px] bg-primary-600 text-white text-[14px] font-medium rounded-[var(--radius-sm)] shadow-xs hover:bg-primary-700 hover:shadow-sm active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-primary-200 transition-all duration-150 disabled:opacity-45 disabled:cursor-not-allowed mt-2 cursor-pointer"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-[11px] text-text-tertiary text-center mt-6">
              Protected access — authorised personnel only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
