import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then((me) => setUser({ id: me.id, email: me.email, name: me.name, role: me.role as UserRole }))
      .catch(() => {
        // no session / token
        setUser(null);
      });
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await api.auth.login({ email, password });
    setToken(res.token);
    setUser({ id: res.user.id, email: res.user.email, name: res.user.name, role: res.user.role as UserRole });
  }, []);

  const register = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await api.auth.register({ name, email, password });
      setToken(res.token);
      setUser({ id: res.user.id, email: res.user.email, name: res.user.name, role: res.user.role as UserRole });
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthed: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

