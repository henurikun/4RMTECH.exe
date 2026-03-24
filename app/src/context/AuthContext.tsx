import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { api, setToken } from '../lib/api';

type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthed: boolean;
  /** Re-fetch session from API (e.g. after client-side navigation). */
  refreshUser: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    const fb = auth.currentUser;
    if (!fb) {
      setToken(null);
      setUser(null);
      return;
    }
    try {
      const idToken = await fb.getIdToken();
      setToken(idToken);
      const me = await api.auth.me();
      setUser({ id: me.id, email: me.email, name: me.name, role: me.role as UserRole });
    } catch {
      setToken(null);
      setUser(null);
      signOut(auth).catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    const unsub = onIdTokenChanged(auth, () => {
      void refreshUser();
    });
    return () => unsub();
  }, [refreshUser]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    await signInWithEmailAndPassword(auth, email, password);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await refreshUser();
    },
    [refreshUser]
  );

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    signOut(auth).catch(() => {});
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthed: Boolean(user),
      refreshUser,
      login,
      loginWithGoogle,
      register,
      logout,
    }),
    [user, refreshUser, login, loginWithGoogle, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

