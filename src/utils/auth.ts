import type { Role, User } from "../types";
import { loginApi } from "./api";

const AUTH_STORAGE_KEY = "authUser";
const AUTH_TOKEN_KEY = "authToken";

export function getCurrentUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null") as User | null;
  } catch {
    clearCurrentUser();
    return null;
  }
}

export function requireCurrentUser(): User {
  const user = getCurrentUser();
  if (!user) throw new Error("当前未登录");
  return user;
}

export function loginWithMockAccount(username: string, password: string, role: Role) {
  return loginWithBackend(username, password, role);
}

export async function loginWithBackend(username: string, password: string, role: Role) {
  const result = await loginApi(username, password, role);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
  localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  return result;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearCurrentUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
