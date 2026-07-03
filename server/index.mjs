import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { hashPassword, publicUser, signToken, validatePasswordStrength, verifyPassword, verifyToken } from "./auth.mjs";
import { carrierConfig, calculateWarehouseFee, getTrackingUrl, inferCarrier } from "./rules.mjs";
import {
  getRecord,
  getUser,
  listAuditLogs,
  listRecords,
  listUploads,
  saveRecord,
  saveUpload,
  updateUserPassword,
  writeAudit,
} from "./db.mjs";
import { navItems } from "./mockData.mjs";

const PORT = Number(process.env.PORT || 7301);
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("uploads");
const MAX_JSON_BYTES = Number(process.env.MAX_JSON_BYTES || 1024 * 1024 * 5);
const APP_VERSION = process.env.APP_VERSION || "1.2.1";
const AUTH_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX || 8);
const authAttempts = new Map();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cache-control": "no-store",
  });
  res.end(body);
}

function error(res, status, code, message) {
  json(res, status, { error: code, message });
}

async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_JSON_BYTES) return { tooLarge: true };
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function roleMenus(role) {
  return navItems
    .filter((item) => item.roles.includes(role))
    .map((item) => ({ ...item, children: item.children?.filter((child) => child.roles.includes(role)) }))
    .filter((item) => item.path || item.children?.length);
}

function defaultPathForRole(role) {
  if (role === "buyer") return "/purchase/task-hall";
  if (role === "warehouse") return "/warehouse/pending";
  if (role === "customer") return "/customer/tasks";
  return "/dashboard";
}

function filteredList(list, searchParams, fields) {
  const keyword = searchParams.get("q")?.trim().toLowerCase();
  if (!keyword) return list;
  return list.filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(keyword)));
}

function authFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload;
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function rateLimitKey(req, scope, username = "") {
  return `${scope}:${clientIp(req)}:${String(username || "").trim().toLowerCase()}`;
}

function checkAuthRateLimit(req, res, scope, username) {
  const key = rateLimitKey(req, scope, username);
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || now > current.resetAt) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  current.count += 1;
  if (current.count > AUTH_MAX_ATTEMPTS) {
    error(res, 429, "TOO_MANY_REQUESTS", "尝试次数过多，请稍后再试");
    return false;
  }
  return true;
}

function clearAuthRateLimit(req, scope, username) {
  authAttempts.delete(rateLimitKey(req, scope, username));
}

function requireAuth(req, res) {
  const user = authFromRequest(req);
  if (!user) {
    error(res, 401, "UNAUTHORIZED", "请先登录");
    return null;
  }
  return user;
}

function requireRole(user, res, roles) {
  if (!roles.includes(user.role)) {
    error(res, 403, "FORBIDDEN", "当前角色无权执行该操作");
    return false;
  }
  return true;
}

function canReadKind(user, kind, item) {
  if (user.role === "admin") return true;
  if (user.role === "warehouse") return ["package", "packageException", "warehouse", "reconciliation"].includes(kind);
  if (user.role === "buyer") return item.buyer === user.displayName || kind === "task";
  if (user.role === "customer") return item.requester === user.displayName || item.owner === user.displayName;
  return false;
}

function listKindForUser(kind, user, searchParams, fields) {
  return filteredList(listRecords(kind), searchParams, fields).filter((item) => canReadKind(user, kind, item));
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      service: "order-process-backend",
      version: APP_VERSION,
      persistence: "sqlite",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "GET" && url.pathname === "/api/meta") {
    return json(res, 200, {
      service: "球星卡采购接单对账系统 API",
      stage: "persistent-api",
      roles: ["admin", "buyer", "warehouse", "customer"],
      carriers: Object.values(carrierConfig),
    });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    if (!checkAuthRateLimit(req, res, "login", body.username)) return;
    const account = getUser(body.username);
    if (!account || account.role !== body.role || !verifyPassword(body.password, account.passwordHash)) {
      return error(res, 401, "UNAUTHORIZED", "账号、密码或角色不匹配");
    }
    clearAuthRateLimit(req, "login", body.username);
    writeAudit({
      actor: account.username,
      role: account.role,
      action: "auth.login",
      targetKind: "user",
      targetId: account.username,
      before: null,
      after: publicUser(account),
    });
    return json(res, 200, {
      user: publicUser(account),
      token: signToken(account),
      redirectTo: defaultPathForRole(account.role),
      menus: roleMenus(account.role),
    });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    if (!checkAuthRateLimit(req, res, "change-password", body.username)) return;
    const account = getUser(body.username);
    if (!account || account.role !== body.role || !verifyPassword(body.oldPassword, account.passwordHash)) {
      return error(res, 401, "UNAUTHORIZED", "账号、旧密码或角色不匹配");
    }
    const strengthError = validatePasswordStrength(body.newPassword);
    if (strengthError) return error(res, 400, "WEAK_PASSWORD", strengthError);
    if (verifyPassword(body.newPassword, account.passwordHash)) {
      return error(res, 400, "SAME_PASSWORD", "新密码不能和旧密码相同");
    }
    const updated = updateUserPassword(account.username, hashPassword(body.newPassword), account.username);
    clearAuthRateLimit(req, "change-password", body.username);
    return json(res, 200, { user: publicUser(updated), message: "密码已修改，请使用新密码登录" });
  }

  if (req.method === "GET" && url.pathname === "/api/tracking") {
    const trackingNo = url.searchParams.get("trackingNo") || "";
    const carrier = url.searchParams.get("carrier");
    return json(res, 200, {
      trackingNo,
      carrier: carrier || inferCarrier(trackingNo),
      url: getTrackingUrl({ carrier, trackingNo }),
    });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    return json(res, 200, { user, menus: roleMenus(user.role), defaultPath: defaultPathForRole(user.role) });
  }

  if (req.method === "GET" && url.pathname === "/api/navigation") {
    const role = url.searchParams.get("role") || user.role;
    if (role !== user.role && user.role !== "admin") return error(res, 403, "FORBIDDEN", "不能读取其他角色菜单");
    return json(res, 200, { role, menus: roleMenus(role), defaultPath: defaultPathForRole(role) });
  }

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const data = listKindForUser("task", user, url.searchParams, ["id", "productName", "buyer", "requester"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/buyer-fill-records") {
    const data = listKindForUser("buyerFillRecord", user, url.searchParams, ["id", "orderId", "buyer", "productName", "trackingNo"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/packages") {
    const status = url.searchParams.get("status");
    const overdue = url.searchParams.get("overdue");
    let data = listKindForUser("package", user, url.searchParams, ["id", "trackingNo", "buyer", "product", "warehouse"]);
    if (status) data = data.filter((item) => item.status === status);
    if (overdue === "true") data = data.filter((item) => item.overdue);
    return json(res, 200, { data, total: data.length });
  }

  const confirmMatch = url.pathname.match(/^\/api\/packages\/([^/]+)\/confirm-received$/);
  if (req.method === "POST" && confirmMatch) {
    if (!requireRole(user, res, ["admin", "warehouse"])) return;
    const item = getRecord("package", confirmMatch[1]);
    if (!item) return error(res, 404, "NOT_FOUND", "包裹不存在");
    if (item.paymentStatus === "confirmed_received") {
      return json(res, 200, { data: item, message: "包裹已确认收货，无需重复转换成本" });
    }
    item.receivedAt = new Date().toISOString();
    item.status = "已收货";
    item.inboundCost += item.paidPendingConfirmAmount;
    item.paidPendingConfirmAmount = 0;
    item.paymentStatus = "confirmed_received";
    item.overdue = false;
    return json(res, 200, { data: saveRecord("package", item, user, "package.confirmReceived"), message: "已确认收货，待确认金额已转为实际入库成本" });
  }

  if (req.method === "GET" && url.pathname === "/api/packages/exceptions") {
    const status = url.searchParams.get("status");
    const resolution = url.searchParams.get("resolution");
    let data = listKindForUser("packageException", user, url.searchParams, ["id", "trackingNo", "buyer", "product", "reason", "owner"]);
    if (status) data = data.filter((item) => item.status === status);
    if (resolution) data = data.filter((item) => item.resolution === resolution);
    return json(res, 200, { data, total: data.length });
  }

  const resolveExceptionMatch = url.pathname.match(/^\/api\/packages\/exceptions\/([^/]+)\/resolve$/);
  if (req.method === "POST" && resolveExceptionMatch) {
    if (!requireRole(user, res, ["admin", "warehouse"])) return;
    const item = getRecord("packageException", resolveExceptionMatch[1]);
    if (!item) return error(res, 404, "NOT_FOUND", "异常记录不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    if (body.resolution && !["refund", "next_credit"].includes(body.resolution)) return error(res, 400, "BAD_REQUEST", "处理方式无效");
    item.status = "resolved";
    item.resolution = body.resolution || item.resolution;
    item.note = String(body.note || item.note || "").slice(0, 1000);
    return json(res, 200, { data: saveRecord("packageException", item, user, "exception.resolve"), message: "异常处理结果已保存" });
  }

  if (req.method === "GET" && url.pathname === "/api/reconciliation") {
    if (!requireRole(user, res, ["admin", "warehouse"])) return;
    const data = listRecords("reconciliation");
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const data = listKindForUser("product", user, url.searchParams, ["id", "name", "category", "brand", "owner"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/warehouses") {
    const data = listKindForUser("warehouse", user, url.searchParams, ["id", "name", "owner", "contactName", "state"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/warehouse-fees/calculate") {
    const packageCount = Number(url.searchParams.get("packageCount") || 0);
    const photoCount = Number(url.searchParams.get("photoCount") || 0);
    try {
      return json(res, 200, { data: calculateWarehouseFee({ packageCount, photoCount }) });
    } catch (calculationError) {
      return error(res, 400, "BAD_REQUEST", calculationError.message);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/uploads") {
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    if (!body.targetKind || !body.targetId || !body.filename || !body.mimeType || !body.contentBase64) {
      return error(res, 400, "BAD_REQUEST", "缺少上传字段");
    }
    if (!String(body.mimeType).startsWith("image/") && body.mimeType !== "application/pdf") {
      return error(res, 400, "BAD_REQUEST", "仅允许图片或 PDF 凭证");
    }
    const buffer = Buffer.from(String(body.contentBase64), "base64");
    if (!buffer.length || buffer.length > 1024 * 1024 * 4) return error(res, 400, "BAD_REQUEST", "文件大小必须在 1B 到 4MB 之间");
    const id = `UP-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const ext = path.extname(String(body.filename)).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".bin";
    const safePath = path.join(UPLOAD_DIR, `${id}${ext}`);
    fs.writeFileSync(safePath, buffer);
    const upload = saveUpload({
      id,
      owner: user.username,
      targetKind: String(body.targetKind),
      targetId: String(body.targetId),
      filename: String(body.filename).slice(0, 180),
      mimeType: String(body.mimeType),
      path: safePath,
      size: buffer.length,
    });
    writeAudit({ actor: user.username, role: user.role, action: "upload.create", targetKind: upload.targetKind, targetId: upload.targetId, before: null, after: upload });
    return json(res, 201, { data: upload });
  }

  if (req.method === "GET" && url.pathname === "/api/uploads") {
    const targetKind = url.searchParams.get("targetKind");
    const targetId = url.searchParams.get("targetId");
    if (!targetKind || !targetId) return error(res, 400, "BAD_REQUEST", "targetKind/targetId 必填");
    return json(res, 200, { data: listUploads(targetKind, targetId) });
  }

  if (req.method === "GET" && url.pathname === "/api/audit-logs") {
    if (!requireRole(user, res, ["admin"])) return;
    const data = listAuditLogs(url.searchParams.get("limit") || 100);
    return json(res, 200, { data, total: data.length });
  }

  return error(res, 404, "NOT_FOUND", "接口不存在");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((routeError) => {
    console.error(routeError);
    error(res, 500, "INTERNAL_SERVER_ERROR", "服务器内部错误");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`OrderProcess backend listening on http://${HOST}:${PORT}`);
});
