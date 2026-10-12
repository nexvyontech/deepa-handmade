"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isStaffRole } from "@deepa/shared";
import * as authApi from "@/lib/api/auth";
import {
  clearTokens,
  hasTokens,
  notifyUnauthorized,
  setUnauthorizedHandler,
  writeTokenPair,
} from "@/lib/api/tokens";
import type { PublicUser } from "@/lib/types/api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  /** True once the initial session check has finished. */
  sessionReady: boolean;
  login: (mobile: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!hasTokens()) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      try {
        const me = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        // apiRequest clears tokens when refresh fails; treat as anonymous
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setStatus("anonymous");
        }
      }
    };

    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("anonymous");
    });

    void hydrate();
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (mobile: string, password: string) => {
    const response = await authApi.login({ mobile, password });
    writeTokenPair({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    setStatus("authenticated");
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // backend is authoritative for token expiry; we always clear locally
    }
    notifyUnauthorized();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isStaff = user ? isStaffRole(user.role) : false;
    return {
      user,
      status,
      sessionReady: status !== "loading",
      login,
      logout,
      hasPermission: (permission: string) => user?.permissions.includes(permission) ?? false,
      isStaff,
    };
  }, [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}