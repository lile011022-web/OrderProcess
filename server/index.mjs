import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { hashPassword, publicUser, signToken, validatePasswordStrength, verifyPassword, verifyToken } from "./auth.mjs";
import { carrierConfig, calculateWarehouseFee, getTrackingUrl, inferCarrier } from "./rules.mjs";
import {
  deleteRecord,
  getRecord,
  getUpload,
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
const APP_VERSION = process.env.APP_VERSION || "1.3.5";
const AUTH_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX || 8);
const authAttempts = new Map();
const RECORD_KINDS = new Set(["task", "buyerFillRecord", "package", "packageException", "product", "warehouse", "reconciliation"]);
const KIND_PREFIX = {
  task: "PT",
  buyerFillRecord: "BF",
  package: "PKG",
  packageException: "EXP",
  product: "SKU",
  warehouse: "WH",
  reconciliation: "REC",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

function text(res, status, content, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(content),
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
  });
  res.end(content);
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
  let data = list;
  if (keyword) data = data.filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(keyword)));
  for (const key of ["owner", "buyer", "status", "auditStatus", "payStatus", "resolution", "overdue"]) {
    const value = searchParams.get(key);
    if (!value) continue;
    data = data.filter((item) => item[key] === undefined || String(item[key]) === value);
  }
  return data;
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
  if (kind === "product") return item.status === "启用" || item.owner === user.displayName;
  if (kind === "warehouse") return item.status === "启用" || item.owner === user.displayName;
  if (kind === "package" && user.role === "customer") return item.owner === user.displayName;
  if (user.role === "warehouse") return ["package", "packageException", "warehouse", "reconciliation"].includes(kind);
  if (user.role === "buyer") return item.buyer === user.displayName || kind === "task";
  if (user.role === "customer") return item.requester === user.displayName || item.owner === user.displayName;
  return false;
}

function canWriteKind(user, kind, item = {}) {
  if (user.role === "admin") return true;
  if (user.role === "warehouse") return ["package", "packageException", "warehouse"].includes(kind);
  if (user.role === "buyer") return kind === "buyerFillRecord" || (kind === "task" && item.buyer === user.displayName);
  if (user.role === "customer") return ["task", "product", "warehouse"].includes(kind) && (!item.owner || item.owner === user.displayName || !item.requester || item.requester === user.displayName);
  return false;
}

function listKindForUser(kind, user, searchParams, fields) {
  return filteredList(listRecords(kind), searchParams, fields).filter((item) => canReadKind(user, kind, item));
}

function makeId(kind) {
  const prefix = KIND_PREFIX[kind] || "REC";
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `${prefix}-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 500);
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function cleanImage(value, fallback = "") {
  const image = String(value ?? fallback).trim();
  if (!image) return "";
  if (!image.startsWith("data:image/") && !image.startsWith("http://") && !image.startsWith("https://")) return "";
  return image.slice(0, 1024 * 1024 * 4);
}

function warehouseContactName(warehouseName) {
  const name = cleanText(warehouseName);
  if (!name) return "";
  return listRecords("warehouse").find((warehouse) => warehouse.name === name)?.contactName || "";
}

function normalizeRecord(kind, body, user, existing = null) {
  const now = new Date().toISOString();
  if (kind === "task") {
    const quantity = Math.max(1, cleanNumber(body.quantity, existing?.quantity || 1));
    const accepted = Math.min(quantity, cleanNumber(body.accepted, existing?.accepted || 0));
    const purchased = Math.min(quantity, cleanNumber(body.purchased, existing?.purchased || 0));
    const deadline = body.deadline || existing?.deadline || now;
    return {
      ...existing,
      id: existing?.id || body.id || makeId("task"),
      productId: cleanText(body.productId, existing?.productId || ""),
      requester: existing?.requester || cleanText(body.requester, user.displayName),
      source: existing?.source || (user.role === "customer" ? "客户发布" : "管理员发布"),
      productName: cleanText(body.productName, existing?.productName || "未命名采购任务"),
      image: cleanImage(body.image, existing?.image || "https://images.unsplash.com/photo-1607242792481-37f27e1d74e1?auto=format&fit=crop&w=420&q=80"),
      spec: cleanText(body.spec, existing?.spec || ""),
      targetPrice: cleanNumber(body.targetPrice, existing?.targetPrice || 0),
      quantity,
      accepted,
      purchased,
      arrived: Math.min(quantity, cleanNumber(body.arrived, existing?.arrived || 0)),
      deadline,
      status: cleanText(body.status, existing?.status || "已发布"),
      customerPayStatus: cleanText(body.customerPayStatus, existing?.customerPayStatus || "待结款"),
      customerPaidAmount: cleanNumber(body.customerPaidAmount, existing?.customerPaidAmount || 0),
      customerPaidAt: body.customerPaidAt || existing?.customerPaidAt || "",
      overdue: Boolean(body.overdue ?? existing?.overdue ?? (new Date(deadline).getTime() < Date.now())),
      buyer: cleanText(body.buyer, existing?.buyer || "未分配"),
      requirement: cleanText(body.requirement, existing?.requirement || ""),
      warehouse: cleanText(body.warehouse, existing?.warehouse || ""),
      recipient: cleanText(body.recipient, existing?.recipient || ""),
    };
  }
  if (kind === "buyerFillRecord") {
    const quantity = Math.max(1, cleanNumber(body.quantity, existing?.quantity || 1));
    const unitPrice = cleanNumber(body.unitPrice, existing?.unitPrice || 0);
    const settlement = cleanNumber(body.settlement, existing?.settlement || quantity * unitPrice);
    const warehouse = cleanText(body.warehouse, existing?.warehouse || "");
    return {
      ...existing,
      id: existing?.id || body.id || makeId("buyerFillRecord"),
      orderId: cleanText(body.orderId, existing?.orderId || `ORD-${Date.now().toString().slice(-6)}`),
      buyer: cleanText(body.buyer, existing?.buyer || user.displayName),
      productName: cleanText(body.productName, existing?.productName || "未命名商品"),
      quantity,
      unitPrice,
      tax: cleanNumber(body.tax, existing?.tax || 0),
      domesticShipping: cleanNumber(body.domesticShipping, existing?.domesticShipping || 0),
      serviceFee: cleanNumber(body.serviceFee, existing?.serviceFee || 0),
      settlement,
      overPrice: Boolean(body.overPrice ?? existing?.overPrice ?? false),
      trackingNo: cleanText(body.trackingNo, existing?.trackingNo || ""),
      platform: cleanText(body.platform, existing?.platform || "whatnot"),
      platformOrderNo: cleanText(body.platformOrderNo, existing?.platformOrderNo || ""),
      note: cleanText(body.note, existing?.note || ""),
      recipient: cleanText(body.recipient, existing?.recipient || warehouseContactName(warehouse)),
      warehouse,
      warehouseEta: body.warehouseEta || existing?.warehouseEta || "",
      auditStatus: cleanText(body.auditStatus, existing?.auditStatus || "待审核"),
      payStatus: cleanText(body.payStatus, existing?.payStatus || "待付款"),
    };
  }
  if (kind === "package") {
    const carrier = body.carrier || inferCarrier(body.trackingNo || existing?.trackingNo || "") || "UPS";
    return {
      ...existing,
      id: existing?.id || body.id || makeId("package"),
      carrier,
      trackingNo: cleanText(body.trackingNo, existing?.trackingNo || ""),
      owner: cleanText(body.owner, existing?.owner || ""),
      importBatchNo: cleanText(body.importBatchNo, existing?.importBatchNo || ""),
      buyer: cleanText(body.buyer, existing?.buyer || user.displayName),
      product: cleanText(body.product, existing?.product || body.productName || ""),
      expectedAt: body.expectedAt || existing?.expectedAt || now,
      receivedAt: body.receivedAt ?? existing?.receivedAt,
      status: cleanText(body.status, existing?.status || "在途"),
      warehouse: cleanText(body.warehouse, existing?.warehouse || ""),
      recipient: cleanText(body.recipient, existing?.recipient || ""),
      productQty: Math.max(1, cleanNumber(body.productQty, existing?.productQty || body.quantity || 1)),
      linkedPurchases: Math.max(1, cleanNumber(body.linkedPurchases, existing?.linkedPurchases || 1)),
      paidAmount: cleanNumber(body.paidAmount, existing?.paidAmount || 0),
      paidPendingConfirmAmount: cleanNumber(body.paidPendingConfirmAmount, existing?.paidPendingConfirmAmount || 0),
      inboundCost: cleanNumber(body.inboundCost, existing?.inboundCost || 0),
      exceptionAmount: cleanNumber(body.exceptionAmount, existing?.exceptionAmount || 0),
      photoCount: cleanNumber(body.photoCount, existing?.photoCount || 0),
      note: cleanText(body.note, existing?.note || ""),
      paymentStatus: body.paymentStatus || existing?.paymentStatus || "unpaid",
      overdue: Boolean(body.overdue ?? existing?.overdue ?? false),
    };
  }
  if (kind === "packageException") {
    return {
      ...existing,
      id: existing?.id || body.id || makeId("packageException"),
      packageId: cleanText(body.packageId, existing?.packageId || ""),
      trackingNo: cleanText(body.trackingNo, existing?.trackingNo || ""),
      carrier: body.carrier || existing?.carrier || inferCarrier(body.trackingNo || "") || "UPS",
      buyer: cleanText(body.buyer, existing?.buyer || ""),
      product: cleanText(body.product, existing?.product || ""),
      reason: cleanText(body.reason, existing?.reason || "待补充异常原因"),
      owner: cleanText(body.owner, existing?.owner || user.displayName),
      amount: cleanNumber(body.amount, existing?.amount || 0),
      resolution: body.resolution || existing?.resolution || "next_credit",
      status: body.status || existing?.status || "pending",
      evidence: cleanText(body.evidence, existing?.evidence || ""),
      note: cleanText(body.note, existing?.note || ""),
      createdAt: existing?.createdAt || now,
    };
  }
  if (kind === "product") {
    return {
      ...existing,
      id: existing?.id || body.id || makeId("product"),
      name: cleanText(body.name, existing?.name || "未命名商品"),
      image: cleanImage(body.image, existing?.image || ""),
      sourceUrl: cleanImage(body.sourceUrl, existing?.sourceUrl || ""),
      category: cleanText(body.category, existing?.category || ""),
      brand: cleanText(body.brand, existing?.brand || ""),
      spec: cleanText(body.spec, existing?.spec || ""),
      owner: existing?.owner || cleanText(body.owner, user.role === "customer" ? user.displayName : "管理员"),
      referencePrice: cleanNumber(body.referencePrice, existing?.referencePrice || 0),
      status: body.status || existing?.status || (user.role === "customer" ? "待审核" : "启用"),
      updatedAt: now.slice(0, 10),
    };
  }
  if (kind === "warehouse") {
    return {
      ...existing,
      id: existing?.id || body.id || makeId("warehouse"),
      name: cleanText(body.name, existing?.name || "未命名仓库"),
      owner: existing?.owner || cleanText(body.owner, user.role === "customer" ? user.displayName : "管理员"),
      contactName: cleanText(body.contactName, existing?.contactName || ""),
      phone: cleanText(body.phone, existing?.phone || ""),
      addressLine1: cleanText(body.addressLine1, existing?.addressLine1 || ""),
      addressLine2: cleanText(body.addressLine2, existing?.addressLine2 || ""),
      city: cleanText(body.city, existing?.city || ""),
      state: cleanText(body.state, existing?.state || ""),
      zipCode: cleanText(body.zipCode, existing?.zipCode || ""),
      country: "US",
      status: body.status || existing?.status || (user.role === "customer" ? "待审核" : "启用"),
    };
  }
  if (kind === "reconciliation") {
    return {
      ...existing,
      id: existing?.id || body.id || makeId("reconciliation"),
      period: cleanText(body.period, existing?.period || now.slice(0, 7)),
      paidPendingConfirmAmount: cleanNumber(body.paidPendingConfirmAmount, existing?.paidPendingConfirmAmount || 0),
      inboundCost: cleanNumber(body.inboundCost, existing?.inboundCost || 0),
      exceptionAmount: cleanNumber(body.exceptionAmount, existing?.exceptionAmount || 0),
      status: body.status || existing?.status || "待确认",
    };
  }
  return { ...existing, ...body, id: existing?.id || body.id || makeId(kind) };
}

function csvEscape(value) {
  const textValue = String(value ?? "");
  return /[",\n]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
}

function makeCsv(rows) {
  if (!rows.length) return "id\n";
  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return [keys.join(","), ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(","))].join("\n");
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

  const recordCreateMatch = url.pathname.match(/^\/api\/records\/([^/]+)$/);
  if (req.method === "POST" && recordCreateMatch) {
    const kind = recordCreateMatch[1];
    if (!RECORD_KINDS.has(kind)) return error(res, 404, "NOT_FOUND", "业务记录类型不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const item = normalizeRecord(kind, body, user);
    if (!canWriteKind(user, kind, item)) return error(res, 403, "FORBIDDEN", "当前角色无权新增该记录");
    return json(res, 201, { data: saveRecord(kind, item, user, `${kind}.create`) });
  }

  const recordUpdateMatch = url.pathname.match(/^\/api\/records\/([^/]+)\/([^/]+)$/);
  if (req.method === "PATCH" && recordUpdateMatch) {
    const [, kind, id] = recordUpdateMatch;
    if (!RECORD_KINDS.has(kind)) return error(res, 404, "NOT_FOUND", "业务记录类型不存在");
    const existing = getRecord(kind, id);
    if (!existing) return error(res, 404, "NOT_FOUND", "业务记录不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const item = normalizeRecord(kind, { ...existing, ...body, id }, user, existing);
    if (!canWriteKind(user, kind, item)) return error(res, 403, "FORBIDDEN", "当前角色无权修改该记录");
    return json(res, 200, { data: saveRecord(kind, item, user, `${kind}.update`) });
  }

  if (req.method === "DELETE" && recordUpdateMatch) {
    const [, kind, id] = recordUpdateMatch;
    if (!RECORD_KINDS.has(kind)) return error(res, 404, "NOT_FOUND", "业务记录类型不存在");
    const existing = getRecord(kind, id);
    if (!existing) return error(res, 404, "NOT_FOUND", "业务记录不存在");
    if (!canWriteKind(user, kind, existing)) return error(res, 403, "FORBIDDEN", "当前角色无权删除该记录");
    return json(res, 200, { data: deleteRecord(kind, id, user, `${kind}.delete`) });
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/reports/") && url.pathname.endsWith(".csv")) {
    const type = url.pathname.replace("/api/reports/", "").replace(".csv", "");
    const kindByReport = {
      purchase: "task",
      buyer: "buyerFillRecord",
      "product-cost": "package",
      exceptions: "packageException",
      "warehouse-fees": "package",
      "final-cost": "reconciliation",
      monthly: "reconciliation",
    };
    const kind = kindByReport[type] || "reconciliation";
    const rows = listKindForUser(kind, user, url.searchParams, ["id", "productName", "product", "buyer", "owner", "period"]);
    return text(res, 200, makeCsv(rows), "text/csv; charset=utf-8");
  }

  if (req.method === "POST" && url.pathname === "/api/tasks") {
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const item = normalizeRecord("task", body, user);
    if (!canWriteKind(user, "task", item)) return error(res, 403, "FORBIDDEN", "当前角色无权发布采购任务");
    return json(res, 201, { data: saveRecord("task", item, user, "task.publish"), message: "采购任务已发布" });
  }

  const acceptTaskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/accept$/);
  if (req.method === "POST" && acceptTaskMatch) {
    if (!requireRole(user, res, ["admin", "buyer"])) return;
    const item = getRecord("task", acceptTaskMatch[1]);
    if (!item) return error(res, 404, "NOT_FOUND", "采购任务不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const qty = Math.max(1, Math.min(cleanNumber(body.quantity, 1), Math.max(0, item.quantity - item.accepted)));
    if (qty <= 0) return error(res, 400, "BAD_REQUEST", "该任务已无剩余可接数量");
    const updated = { ...item, accepted: item.accepted + qty, buyer: user.displayName, status: item.accepted + qty >= item.quantity ? "已接满" : "接单中" };
    const order = normalizeRecord("buyerFillRecord", {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      buyer: user.displayName,
      productName: item.productName,
      quantity: qty,
      unitPrice: cleanNumber(body.unitPrice, item.targetPrice),
      settlement: qty * cleanNumber(body.unitPrice, item.targetPrice),
      trackingNo: "",
      recipient: item.recipient,
      warehouse: item.warehouse,
      auditStatus: "待回填",
      payStatus: "待付款",
    }, user);
    saveRecord("task", updated, user, "task.accept");
    saveRecord("buyerFillRecord", order, user, "order.createFromTask");
    return json(res, 200, { data: updated, order, message: "接单成功，已生成接单记录" });
  }

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const data = listKindForUser("task", user, url.searchParams, ["id", "productName", "buyer", "requester"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "GET" && url.pathname === "/api/buyer-fill-records") {
    const data = listKindForUser("buyerFillRecord", user, url.searchParams, ["id", "orderId", "buyer", "productName", "trackingNo"]);
    return json(res, 200, { data, total: data.length });
  }

  if (req.method === "POST" && url.pathname === "/api/buyer-fill-records") {
    if (!requireRole(user, res, ["admin", "buyer"])) return;
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const record = normalizeRecord("buyerFillRecord", { ...body, buyer: user.role === "buyer" ? user.displayName : body.buyer }, user);
    let saved = saveRecord("buyerFillRecord", record, user, "buyerFillRecord.submit");
    const packageInputs = Array.isArray(body.packages) && body.packages.length
      ? body.packages
      : record.trackingNo
        ? [{ trackingNo: record.trackingNo, quantity: record.quantity, warehouse: record.warehouse, recipient: record.recipient, warehouseEta: record.warehouseEta }]
        : [];
    const packageItems = [];
    for (const packageInput of packageInputs) {
      const trackingNo = cleanText(packageInput.trackingNo, "");
      if (!trackingNo) continue;
      const packageItem = normalizeRecord("package", {
        trackingNo,
        carrier: inferCarrier(trackingNo) || undefined,
        buyer: record.buyer,
        product: `${record.productName} x ${Math.max(1, cleanNumber(packageInput.quantity, record.quantity))}`,
        expectedAt: packageInput.warehouseEta || record.warehouseEta || new Date().toISOString(),
        warehouse: packageInput.warehouse || record.warehouse,
        recipient: packageInput.recipient || record.recipient,
        productQty: packageInput.quantity || record.quantity,
        linkedPurchases: String(record.platformOrderNo || "").split(/[\s,，、\n]+/).filter(Boolean).length || 1,
        paidAmount: 0,
        paidPendingConfirmAmount: 0,
        inboundCost: 0,
        paymentStatus: "unpaid",
      }, user);
      packageItems.push(saveRecord("package", packageItem, user, "package.createFromBuyerFill"));
    }
    if (packageItems.length) {
      saved = saveRecord("buyerFillRecord", { ...saved, packageId: packageItems[0].id, packageIds: packageItems.map((item) => item.id) }, user, "buyerFillRecord.linkPackage");
    }
    return json(res, 201, { data: saved, packages: packageItems, package: packageItems[0] || null, message: packageItems.length > 1 ? `采购回填已提交，已生成 ${packageItems.length} 个待处理包裹` : "采购回填已提交，已生成待处理包裹" });
  }

  const reviewFillMatch = url.pathname.match(/^\/api\/buyer-fill-records\/([^/]+)\/review$/);
  if (req.method === "POST" && reviewFillMatch) {
    if (!requireRole(user, res, ["admin"])) return;
    const record = getRecord("buyerFillRecord", reviewFillMatch[1]);
    if (!record) return error(res, 404, "NOT_FOUND", "回填记录不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    record.auditStatus = body.approved === false ? "已驳回" : "已审核";
    record.reviewNote = cleanText(body.note, "");
    return json(res, 200, { data: saveRecord("buyerFillRecord", record, user, "buyerFillRecord.review"), message: record.auditStatus });
  }

  const paymentFillMatch = url.pathname.match(/^\/api\/buyer-fill-records\/([^/]+)\/payment$/);
  if (req.method === "POST" && paymentFillMatch) {
    if (!requireRole(user, res, ["admin"])) return;
    const record = getRecord("buyerFillRecord", paymentFillMatch[1]);
    if (!record) return error(res, 404, "NOT_FOUND", "回填记录不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const payQty = Math.max(1, Math.min(cleanNumber(body.payQty, record.quantity), record.quantity));
    const amount = cleanNumber(body.amount, Math.round(record.settlement * (payQty / record.quantity)));
    record.auditStatus = "已审核";
    record.payStatus = "已付待确认";
    record.paidQty = payQty;
    record.paidAmount = amount;
    record.paymentMethod = cleanText(body.paymentMethod, "");
    record.paymentAccount = cleanText(body.paymentAccount, "");
    record.paymentAt = body.paymentAt || new Date().toISOString();
    const saved = saveRecord("buyerFillRecord", record, user, "buyerFillRecord.payment");
    const packageRows = listRecords("package");
    const matchedPackages = packageRows.filter((item) =>
      item.trackingNo === record.trackingNo
      && item.buyer === record.buyer
      && (!record.productName || String(item.product || "").includes(record.productName))
    );
    const packageItem = (record.packageId && getRecord("package", record.packageId)) || matchedPackages.at(-1) || packageRows.find((item) => item.trackingNo === record.trackingNo);
    let savedPackage = null;
    if (packageItem) {
      packageItem.paidAmount = amount;
      packageItem.paidPendingConfirmAmount = amount;
      packageItem.paymentStatus = "paid_pending_confirm";
      savedPackage = saveRecord("package", packageItem, user, "package.paymentPendingConfirm");
    }
    return json(res, 200, { data: saved, package: savedPackage, message: "付款已记录，金额进入已付待确认" });
  }

  if (req.method === "GET" && url.pathname === "/api/packages") {
    const status = url.searchParams.get("status");
    const overdue = url.searchParams.get("overdue");
    let data = listKindForUser("package", user, url.searchParams, ["id", "trackingNo", "buyer", "product", "warehouse", "owner", "importBatchNo"]);
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

  const etaMatch = url.pathname.match(/^\/api\/packages\/([^/]+)\/eta$/);
  if (req.method === "POST" && etaMatch) {
    if (!requireRole(user, res, ["admin", "warehouse"])) return;
    const item = getRecord("package", etaMatch[1]);
    if (!item) return error(res, 404, "NOT_FOUND", "包裹不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    item.expectedAt = body.expectedAt || item.expectedAt;
    item.etaNote = cleanText(body.note, item.etaNote || "");
    item.overdue = item.status !== "已收货" && new Date(item.expectedAt).getTime() < Date.now();
    if (item.overdue && item.status === "在途") item.status = "预计到达超时";
    return json(res, 200, { data: saveRecord("package", item, user, "package.updateEta"), message: "预计到达时间已保存" });
  }

  const markExceptionMatch = url.pathname.match(/^\/api\/packages\/([^/]+)\/mark-exception$/);
  if (req.method === "POST" && markExceptionMatch) {
    if (!requireRole(user, res, ["admin", "warehouse"])) return;
    const item = getRecord("package", markExceptionMatch[1]);
    if (!item) return error(res, 404, "NOT_FOUND", "包裹不存在");
    const body = await readJson(req);
    if (!body || body.tooLarge) return error(res, body?.tooLarge ? 413 : 400, body?.tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "请求体必须是合法 JSON");
    const exception = normalizeRecord("packageException", {
      packageId: item.id,
      trackingNo: item.trackingNo,
      carrier: item.carrier,
      buyer: item.buyer,
      product: item.product,
      reason: body.reason || "仓库登记未收到或包裹异常",
      owner: body.owner || item.buyer,
      amount: body.amount || item.paidPendingConfirmAmount || item.exceptionAmount || 0,
      resolution: body.resolution || "next_credit",
      status: "processing",
      evidence: body.evidence || "",
      note: body.note || "",
    }, user);
    item.status = "物流异常";
    item.overdue = true;
    item.exceptionAmount = cleanNumber(exception.amount, item.exceptionAmount || 0);
    saveRecord("package", item, user, "package.markException");
    saveRecord("packageException", exception, user, "exception.createFromPackage");
    return json(res, 201, { data: item, exception, message: "已登记异常包裹" });
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
    const saved = saveRecord("packageException", item, user, "exception.resolve");
    const packageItem = item.packageId ? getRecord("package", item.packageId) : null;
    if (packageItem) {
      packageItem.exceptionAmount = item.amount;
      packageItem.status = "物流异常";
      saveRecord("package", packageItem, user, "package.exceptionResolved");
    }
    return json(res, 200, { data: saved, message: "异常处理结果已保存" });
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

  const uploadFileMatch = url.pathname.match(/^\/api\/uploads\/([^/]+)\/file$/);
  if (req.method === "GET" && uploadFileMatch) {
    const upload = getUpload(uploadFileMatch[1]);
    if (!upload) return error(res, 404, "NOT_FOUND", "上传文件不存在");
    if (upload.targetKind === "package") {
      const packageItem = getRecord("package", upload.targetId);
      if (!packageItem || !canReadKind(user, "package", packageItem)) return error(res, 403, "FORBIDDEN", "无权查看该包裹照片");
    } else if (user.role !== "admin" && upload.owner !== user.username) {
      return error(res, 403, "FORBIDDEN", "无权查看该上传文件");
    }
    if (!fs.existsSync(upload.path)) return error(res, 404, "NOT_FOUND", "上传文件已丢失");
    const buffer = fs.readFileSync(upload.path);
    res.writeHead(200, {
      "content-type": upload.mimeType,
      "content-length": buffer.length,
      "access-control-allow-origin": CORS_ORIGIN,
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    });
    res.end(buffer);
    return;
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
