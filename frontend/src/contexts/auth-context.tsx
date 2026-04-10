"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  organizationId: string | null;
  orgName: string;
  status: string;
  accessibleOrgIds: string[];
  isGlobal: boolean;
}

function parseUser(raw: any): User {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name,
    username: raw.username,
    email: raw.email,
    role: raw.role,
    organizationId: raw.organizationId || raw.organization_id || null,
    orgName: raw.orgName || raw.org_name || "",
    status: raw.status,
    accessibleOrgIds: raw.accessibleOrgIds || raw.accessible_org_ids || [],
    isGlobal: raw.isGlobal ?? raw.is_global ?? false,
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("manris_token");
    if (savedToken) {
      setToken(savedToken);
      // Verify token & load user
      api.get<any>("/auth/me", savedToken)
        .then((u) => setUser(parseUser(u.user || u)))
        .catch(() => {
          localStorage.removeItem("manris_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: any }>("/auth/login", {
      username,
      password,
    });
    setToken(res.token);
    setUser(parseUser(res.user));
    localStorage.setItem("manris_token", res.token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("manris_token");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
