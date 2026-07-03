import type { Role, User } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:7301";
const AUTH_STORAGE_KEY = "authUser";
const AUTH_TOKEN_KEY = "authToken";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (options.auth !== false) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    throw new ApiError(response.status, body?.message || "接口请求失败", body?.error);
  }
  return body as T;
}

export type LoginResponse = {
  user: User;
  token: string;
  redirectTo: string;
};

export function loginApi(username: string, password: string, role: Role) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password, role }),
  });
}

export type ListResponse<T> = {
  data: T[];
  total: number;
};
