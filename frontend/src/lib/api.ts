const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.detail || body.error || "Request failed", res.status);
  }

  if (res.status === 204) return {} as T;

  const json = await res.json();

  // Auto-unwrap { data: ... } envelope from standardized API responses
  if (json && typeof json === "object" && "data" in json && Object.keys(json).length === 1) {
    return json.data as T;
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),

  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), token }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),
};
