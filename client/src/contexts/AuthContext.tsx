import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  username: string | null;
  role: string;
  contractor: string | null;
  permissions: Record<string, boolean>;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (flag: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'ehs_token';
const USER_KEY = 'ehs_user';

/** Map API response (camelCase with fullName) to our User interface */
function mapApiUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as string,
    name: (raw.fullName ?? raw.name ?? '') as string,
    email: raw.email as string,
    phone: (raw.phone ?? null) as string | null,
    username: (raw.username ?? null) as string | null,
    role: raw.role as string,
    contractor: (raw.contractor ?? null) as string | null,
    permissions: (raw.permissions ?? {}) as Record<string, boolean>,
    isActive: raw.isActive as boolean,
    lastLoginAt: (raw.lastLoginAt ?? null) as string | null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Validate stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${stored}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setState({
          user: mapApiUser(data.user),
          token: stored,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const mapped = mapApiUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mapped));
    setState({
      user: mapped,
      token: data.token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const updateUser = useCallback((user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState(s => ({ ...s, user }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  const hasRole = useCallback((...roles: string[]) => {
    return !!state.user && roles.includes(state.user.role);
  }, [state.user]);

  const hasPermission = useCallback((flag: string) => {
    if (state.user?.role === 'master') return true;
    return !!state.user?.permissions[flag];
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
