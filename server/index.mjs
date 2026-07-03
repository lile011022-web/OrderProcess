import http from "node:http";
import { URL } from "node:url";
import {
  authUsers,
  fillRecords,
  navItems,
  packageExceptions,
  packages,
  productProfiles,
  reconciliationRecords,
  tasks,
  warehouseAddresses,
} from "./mockData.mjs";
import { calculateWarehouseFee, carrierConfig, getTrackingUrl, inferCarrier } from "./rules.mjs";

const PORT = Number(process.env.PORT || 7301);
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

function publicUser(account) {
  if (!account) return null;
  const { password: _password, ...user } = account;
  return user;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: "NOT_FOUND", message: "接口不存在" });
}

function badRequest(res, message) {
  json(res, 400, { error: "BAD_REQUEST", message });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
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
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(role)),
    }))
    .filter((item) => item.path || item.children?.length);
}

function filteredList(list, searchParams, fields) {
  const keyword = searchParams.get("q")?.trim().toLowerCase();
  if (!keyword) return list;
  return list.filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(keyword)));
}

function defaultPathForRole(role) {
  if (role === "buyer") return "/purchase/task-hall";
  if (role === "warehouse") return "/warehouse/pending";
  if (role === "customer") return "/customer/tasks";
  return "/dashboard";
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, {
      ok: true,
      service: "order-process-backend",
      version: "1.1.0",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/meta") {
    json(res, 200, {
      service: "球星卡采购接单对账系统 API",
      stage: "mock-api",
      roles: ["admin", "buyer", "warehouse", "customer"],
      carriers: Object.values(carrierConfig),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    if (!body) return badRequest(res, "请求体必须是 JSON");
    const account = authUsers[body.username];
    if (!account || account.password !== body.password || account.role !== body.role) {
      json(res, 401, { error: "UNAUTHORIZED", message: "账号、密码或角色不匹配" });
      return;
    }
    json(res, 200, { user: publicUser(account), redirectTo: defaultPathForRole(account.role), menus: roleMenus(account.role) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/navigation") {
    const role = url.searchParams.get("role");
    if (!role || !["admin", "buyer", "warehouse", "customer"].includes(role)) return badRequest(res, "role 参数无效");
    json(res, 200, { role, menus: roleMenus(role), defaultPath: defaultPathForRole(role) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const role = url.searchParams.get("role");
    const owner = url.searchParams.get("owner");
    let data = filteredList(tasks, url.searchParams, ["id", "productName", "buyer", "requester"]);
    if (role === "customer" && owner) data = data.filter((task) => task.requester === owner);
    json(res, 200, { data, total: data.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/buyer-fill-records") {
    const buyer = url.searchParams.get("buyer");
    let data = filteredList(fillRecords, url.searchParams, ["id", "orderId", "buyer", "productName", "trackingNo"]);
    if (buyer) data = data.filter((record) => record.buyer === buyer);
    json(res, 200, { data, total: data.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/packages") {
    const status = url.searchParams.get("status");
    const overdue = url.searchParams.get("overdue");
    let data = filteredList(packages, url.searchParams, ["id", "trackingNo", "buyer", "product", "warehouse"]);
    if (status) data = data.filter((item) => item.status === status);
    if (overdue === "true") data = data.filter((item) => item.overdue);
    json(res, 200, { data, total: data.length });
    return;
  }

  const confirmMatch = url.pathname.match(/^\/api\/packages\/([^/]+)\/confirm-received$/);
  if (req.method === "POST" && confirmMatch) {
    const item = packages.find((pkg) => pkg.id === confirmMatch[1]);
    if (!item) return notFound(res);
    item.receivedAt = new Date().toISOString();
    item.status = "已收货";
    item.inboundCost += item.paidPendingConfirmAmount;
    item.paidPendingConfirmAmount = 0;
    item.paymentStatus = "confirmed_received";
    item.overdue = false;
    json(res, 200, { data: item, message: "已确认收货，待确认金额已转为实际入库成本" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/packages/exceptions") {
    const status = url.searchParams.get("status");
    const resolution = url.searchParams.get("resolution");
    let data = filteredList(packageExceptions, url.searchParams, ["id", "trackingNo", "buyer", "product", "reason", "owner"]);
    if (status) data = data.filter((item) => item.status === status);
    if (resolution) data = data.filter((item) => item.resolution === resolution);
    json(res, 200, { data, total: data.length });
    return;
  }

  const resolveExceptionMatch = url.pathname.match(/^\/api\/packages\/exceptions\/([^/]+)\/resolve$/);
  if (req.method === "POST" && resolveExceptionMatch) {
    const item = packageExceptions.find((exception) => exception.id === resolveExceptionMatch[1]);
    if (!item) return notFound(res);
    const body = await readJson(req);
    if (!body) return badRequest(res, "请求体必须是 JSON");
    item.status = "resolved";
    item.resolution = body.resolution === "refund" ? "refund" : item.resolution;
    item.note = body.note || item.note;
    json(res, 200, { data: item, message: "异常处理结果已保存" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/reconciliation") {
    json(res, 200, { data: reconciliationRecords, total: reconciliationRecords.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const owner = url.searchParams.get("owner");
    let data = filteredList(productProfiles, url.searchParams, ["id", "name", "category", "brand", "owner"]);
    if (owner) data = data.filter((item) => item.owner === owner);
    json(res, 200, { data, total: data.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/warehouses") {
    const owner = url.searchParams.get("owner");
    let data = filteredList(warehouseAddresses, url.searchParams, ["id", "name", "owner", "contactName", "state"]);
    if (owner) data = data.filter((item) => item.owner === owner);
    json(res, 200, { data, total: data.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/warehouse-fees/calculate") {
    const packageCount = Number(url.searchParams.get("packageCount") || 0);
    const photoCount = Number(url.searchParams.get("photoCount") || 0);
    if (!Number.isFinite(packageCount) || !Number.isFinite(photoCount)) return badRequest(res, "packageCount/photoCount 必须是数字");
    json(res, 200, { data: calculateWarehouseFee({ packageCount, photoCount }) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tracking") {
    const trackingNo = url.searchParams.get("trackingNo") || "";
    const carrier = url.searchParams.get("carrier");
    json(res, 200, {
      trackingNo,
      carrier: carrier || inferCarrier(trackingNo),
      url: getTrackingUrl({ carrier, trackingNo }),
    });
    return;
  }

  notFound(res);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    json(res, 500, { error: "INTERNAL_SERVER_ERROR", message: "服务器内部错误" });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`OrderProcess backend listening on http://${HOST}:${PORT}`);
});
