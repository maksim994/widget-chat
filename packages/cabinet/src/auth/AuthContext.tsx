import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  getToken,
  setToken,
  type AuthResponse,
  type AuthUser,
} from "../lib/api";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    companyName: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<AuthUser>("/api/auth/me", { skipAuthRedirect: true });
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!user) return;
    const tick = () =>
      api("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [user]);

  const applyAuth = useCallback(
    (res: AuthResponse, options?: { afterRegister?: boolean }) => {
      setToken(res.token);
      setUser(res.user);
      const path =
        options?.afterRegister && res.user.role === "ADMIN" ? "/operators?welcome=1" : "/";
      navigate(path, { replace: true });
    },
    [navigate]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
      });
      applyAuth(res);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (data: {
      companyName: string;
      name: string;
      email: string;
      password: string;
    }) => {
      const res = await api<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        skipAuthRedirect: true,
      });
      applyAuth(res, { afterRegister: true });
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
