import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#A8ACB8] mb-4">Please login to edit settings.</p>
          <Link to="/login" className="px-6 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('You need to log in again.');
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <Link to="/" className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">Account Settings</h1>
          <span />
        </div>
      </header>
      <main className="px-6 lg:px-12 py-10">
        <form onSubmit={submit} className="max-w-md mx-auto rounded-3xl bg-[#111318] border border-white/5 p-6 space-y-4">
          <p className="text-sm text-[#A8ACB8]">Change your account password.</p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </main>
    </div>
  );
}
