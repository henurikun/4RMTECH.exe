import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { confirmPasswordReset, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('oobCode') ?? '';
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('If this account exists, a reset link was sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request reset.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await confirmPasswordReset(auth, token, newPassword);
      setInfo('Password reset successful. You can now login.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-6 lg:px-12 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA]">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
        <div className="rounded-3xl bg-[#111318] border border-white/5 p-6 space-y-6">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">Forgot password</h1>
          <form onSubmit={requestReset} className="space-y-3">
            <p className="text-sm text-[#A8ACB8]">Request reset link</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
            />
            <button disabled={busy} className="px-5 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold">
              Send reset link
            </button>
          </form>
          <form onSubmit={submitReset} className="space-y-3">
            <p className="text-sm text-[#A8ACB8]">Reset with code</p>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="oobCode from reset link"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
            />
            <button disabled={busy} className="px-5 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold">
              Reset password
            </button>
          </form>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}
        </div>
      </div>
    </div>
  );
}
