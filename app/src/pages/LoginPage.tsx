import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

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

