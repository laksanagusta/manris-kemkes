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
import { api, ApiError } from "@/lib/api";

const AUTH_TOKEN_STORAGE_KEY = "manris_token";
const LOGIN_ROUTE = "/login";
const CHANGE_PASSWORD_ROUTE = "/change-password";
const OVERVIEW_ROUTE = "/overview";

export type SessionMode = "setup" | "full";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  organizationId: string | null;
  orgName: string;
  status: string;
  nip: string;
  jabatan: string;
  pangkat: string;
  accessibleOrgIds: string[];
  isGlobal: boolean;
  mustChangePassword: boolean;
}

type RawUser = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  organization_id?: string | null;
  orgName?: string;
  org_name?: string;
  status?: string;
  nip?: string;
  jabatan?: string;
  pangkat?: string;
  accessibleOrgIds?: string[];
  accessible_org_ids?: string[];
  isGlobal?: boolean;
  is_global?: boolean;
  mustChangePassword?: boolean;
  must_change_password?: boolean;
};

function parseUser(raw: unknown): User | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const user = raw as RawUser;

  return {
    id: user.id ?? "",
    name: user.name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    role: user.role ?? "",
    organizationId: user.organizationId ?? user.organization_id ?? null,
    orgName: user.orgName ?? user.org_name ?? "",
    status: user.status ?? "",
    nip: user.nip ?? "",
    jabatan: user.jabatan ?? "",
    pangkat: user.pangkat ?? "",
    accessibleOrgIds: user.accessibleOrgIds ?? user.accessible_org_ids ?? [],
    isGlobal: user.isGlobal ?? user.is_global ?? false,
    mustChangePassword: user.mustChangePassword ?? user.must_change_password ?? false,
  };
}

interface AuthPayload {
  token?: string;
  sessionMode?: string;
  mustChangePassword?: boolean;
  user?: unknown;
}

export interface AuthTransition {
  user: User;
  sessionMode: SessionMode;
  mustChangePassword: boolean;
  redirectTo: string;
}

export interface UpdateProfileInput {
  name: string;
  username: string;
  email: string;
  nip: string;
  jabatan: string;
  pangkat: string;
}

function resolveSessionMode(sessionMode: string | undefined, mustChangePassword: boolean): SessionMode {
  if (sessionMode === "setup" || sessionMode === "full") {
    return sessionMode;
  }

  return mustChangePassword ? "setup" : "full";
}

function getPostAuthRedirectPath(mustChangePassword: boolean) {
  return mustChangePassword ? CHANGE_PASSWORD_ROUTE : OVERVIEW_ROUTE;
}

function normalizeAuthPayload(raw: AuthPayload | User | null | undefined) {
  if (!raw) {
    return {
      user: null,
      mustChangePassword: false,
      sessionMode: null,
      token: null,
    };
  }

  const payload = raw as AuthPayload;
  const parsedUser = parseUser(payload.user ?? raw);
  const mustChangePassword = Boolean(payload.mustChangePassword ?? parsedUser?.mustChangePassword);
  const sessionMode = resolveSessionMode(payload.sessionMode, mustChangePassword);

  return {
    user: parsedUser ? { ...parsedUser, mustChangePassword } : null,
    mustChangePassword,
    sessionMode,
    token: typeof payload.token === "string" ? payload.token : null,
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionMode: SessionMode | null;
  mustChangePassword: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthTransition>;
  completeFirstPasswordChange: (newPassword: string, confirmPassword: string) => Promise<AuthTransition>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthTransition>;
  updateProfile: (input: UpdateProfileInput) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  hasFullSession: boolean;
  requiresPasswordChange: boolean;
  postAuthRedirectPath: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  sessionMode: null,
  mustChangePassword: false,
  loading: true,
  login: async () => {
    throw new Error("Auth context is not available.");
  },
  completeFirstPasswordChange: async () => {
    throw new Error("Auth context is not available.");
  },
  changePassword: async () => {
    throw new Error("Auth context is not available.");
  },
  updateProfile: async () => {
    throw new Error("Auth context is not available.");
  },
  logout: () => {},
  isAuthenticated: false,
  hasFullSession: false,
  requiresPasswordChange: false,
  postAuthRedirectPath: LOGIN_ROUTE,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setSessionMode(null);
    setMustChangePassword(false);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }, []);

  const applyAuthState = useCallback((raw: AuthPayload | User, nextToken?: string | null) => {
    const normalized = normalizeAuthPayload(raw);
    const resolvedToken = nextToken ?? normalized.token;

    if (!normalized.user || !resolvedToken) {
      clearSession();
      throw new ApiError("Respons autentikasi tidak lengkap.", 500);
    }

    setToken(resolvedToken);
    setUser(normalized.user);
    setSessionMode(normalized.sessionMode);
    setMustChangePassword(normalized.mustChangePassword);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, resolvedToken);

    return {
      user: normalized.user,
      sessionMode: normalized.sessionMode,
      mustChangePassword: normalized.mustChangePassword,
      redirectTo: getPostAuthRedirectPath(normalized.mustChangePassword),
    } satisfies AuthTransition;
  }, [clearSession]);

  const applyUserProfile = useCallback((raw: unknown) => {
    const parsed = parseUser(raw);

    if (!parsed) {
      throw new ApiError("Respons profil tidak lengkap.", 500);
    }

    setUser(parsed);
    setMustChangePassword(parsed.mustChangePassword);

    return parsed;
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const savedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const me = await api.get<User>("/auth/me", savedToken);

        if (cancelled) {
          return;
        }

        applyAuthState(me, savedToken);
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [applyAuthState, clearSession]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<AuthPayload>("/auth/login", {
      username,
      password,
    });
    return applyAuthState(res, res.token);
  }, [applyAuthState]);

  const completeFirstPasswordChange = useCallback(async (newPassword: string, confirmPassword: string) => {
    if (!token) {
      throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);
    }

    const res = await api.post<AuthPayload>(
      "/auth/change-password",
      {
        newPassword,
        confirmPassword,
      },
      token,
    );

    return applyAuthState(res, res.token);
  }, [applyAuthState, token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (!token) {
      throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);
    }

    const res = await api.post<AuthPayload>(
      "/auth/change-password",
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
      token,
    );

    return applyAuthState(res, res.token);
  }, [applyAuthState, token]);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    if (!token) {
      throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);
    }

    const res = await api.put<User>("/auth/me", input, token);
    return applyUserProfile(res);
  }, [applyUserProfile, token]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const isAuthenticated = Boolean(token && user);
  const requiresPasswordChange = Boolean(isAuthenticated && mustChangePassword);
  const hasFullSession = Boolean(isAuthenticated && !requiresPasswordChange && sessionMode === "full");
  const postAuthRedirectPath = isAuthenticated
    ? getPostAuthRedirectPath(requiresPasswordChange)
    : LOGIN_ROUTE;

  const value = useMemo(() => ({
    user,
    token,
    sessionMode,
    mustChangePassword,
    loading,
    login,
    completeFirstPasswordChange,
    changePassword,
    updateProfile,
    logout,
    isAuthenticated,
    hasFullSession,
    requiresPasswordChange,
    postAuthRedirectPath,
  }), [
    user,
    token,
    sessionMode,
    mustChangePassword,
    loading,
    login,
    completeFirstPasswordChange,
    changePassword,
    updateProfile,
    logout,
    isAuthenticated,
    hasFullSession,
    requiresPasswordChange,
    postAuthRedirectPath,
  ]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
