import type { Role, User } from "../types";
import { authUsers, defaultPathForRole } from "./permissions";

const AUTH_STORAGE_KEY = "authUser";

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
  const account = authUsers[username];
  if (!account || account.password !== password || account.role !== role) return null;

  const user: User = {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  return {
    user,
    redirectTo: defaultPathForRole(user.role),
  };
}

export function clearCurrentUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
