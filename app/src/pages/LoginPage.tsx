import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const continueWithGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <Link
            to={from}
            className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
            {mode === 'login' ? 'Login' : 'Create account'}
          </h1>
          <span />
        </div>
      </header>

      <main className="px-6 lg:px-12 py-10">
        <div className="max-w-md mx-auto rounded-3xl bg-[#111318] border border-white/5 p-6">
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={busy}
            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 text-[#F4F6FA] text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-[#FFD700] text-[#070A15]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-[#FFD700] text-[#070A15]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700]"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                type="email"
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700]"
                placeholder="you@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700]"
                placeholder="••••••••"
              />
              {mode === 'register' && (
                <p className="text-[11px] text-[#6B7280]">Min 6 characters.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              disabled={busy}
              type="submit"
              className="w-full px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors disabled:opacity-70"
            >
              {mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

