import type { Role, User } from "../types";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:7301").replace(/\/$/, "");
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

export type SessionResponse = {
  user: User;
  defaultPath: string;
};

export function loginApi(username: string, password: string, role: Role) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password, role }),
  });
}

export function changePasswordApi(username: string, role: Role, oldPassword: string, newPassword: string) {
  return apiRequest<{ message: string; user: User }>("/api/auth/change-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, role, oldPassword, newPassword }),
  });
}

export function getSessionApi() {
  return apiRequest<SessionResponse>("/api/auth/me");
}

export function createRecordApi<T>(kind: string, payload: Partial<T>) {
  return apiRequest<{ data: T }>(`/api/records/${kind}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecordApi<T>(kind: string, id: string, payload: Partial<T>) {
  return apiRequest<{ data: T }>(`/api/records/${kind}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRecordApi<T>(kind: string, id: string) {
  return apiRequest<{ data: T }>(`/api/records/${kind}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type UploadRecord = {
  id: string;
  owner: string;
  targetKind: string;
  targetId: string;
  filename: string;
  mimeType: string;
  path: string;
  size: number;
  createdAt?: string;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export async function uploadFileApi(targetKind: string, targetId: string, file: File) {
  const contentBase64 = await fileToBase64(file);
  return apiRequest<{ data: UploadRecord }>("/api/uploads", {
    method: "POST",
    body: JSON.stringify({
      targetKind,
      targetId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64,
    }),
  });
}

export function listUploadsApi(targetKind: string, targetId: string) {
  return apiRequest<{ data: UploadRecord[] }>(`/api/uploads?targetKind=${encodeURIComponent(targetKind)}&targetId=${encodeURIComponent(targetId)}`);
}

export async function fetchUploadBlob(uploadId: string) {
  const headers = new Headers();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/api/uploads/${encodeURIComponent(uploadId)}/file`, { headers });
  if (!response.ok) throw new ApiError(response.status, "照片加载失败");
  return response.blob();
}

export function downloadWarehouseInventoryTemplate() {
  const headers = ["运单号", "快递公司", "商品摘要", "数量", "仓库", "收货人", "实际入库成本", "备注"];
  const rows = [
    ["1Z999AA10123456784", "UPS", "2025/26 Bowman Basketball Hobby Box", "12", "DE Newark Pencader Dr 812 Unit D", "Amy Johnson", "0", "外箱完整"],
    ["794612345678", "FedEx", "2025/26 Topps Chrome Basketball Mega Box", "6", "DE Bear Altair Way 252", "Amy Johnson", "0", ""],
  ];
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `warehouse-inventory-import-template-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadReportCsv(reportType: string) {
  const headers = new Headers();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportType}.csv`, { headers });
  if (!response.ok) throw new ApiError(response.status, "报表导出失败");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `order-process-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type ListResponse<T> = {
  data: T[];
  total: number;
};
