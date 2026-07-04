import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  authUsers,
  fillRecords,
  packageExceptions,
  packages,
  productProfiles,
  reconciliationRecords,
  tasks,
  warehouseAddresses,
} from "./mockData.mjs";
import { hashPassword, publicUser } from "./auth.mjs";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "order-process.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','buyer','warehouse','customer')),
  password_hash TEXT NOT NULL,
  password_changed_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (kind, id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_payload TEXT,
  after_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
if (!userColumns.includes("password_changed_at")) {
  db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT");
}

function insertUser(account) {
  db.prepare(`
    INSERT OR IGNORE INTO users (username, display_name, role, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(account.username, account.displayName, account.role, hashPassword(account.password));
}

function insertRecord(kind, item) {
  db.prepare(`
    INSERT OR IGNORE INTO records (kind, id, payload)
    VALUES (?, ?, ?)
  `).run(kind, item.id, JSON.stringify(item));
}

export function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount === 0) Object.values(authUsers).forEach(insertUser);

  if (process.env.SEED_DEMO_DATA !== "true") return;

  const recordCount = db.prepare("SELECT COUNT(*) AS count FROM records").get().count;
  if (recordCount > 0) return;
  tasks.forEach((item) => insertRecord("task", item));
  fillRecords.forEach((item) => insertRecord("buyerFillRecord", item));
  packages.forEach((item) => insertRecord("package", item));
  packageExceptions.forEach((item) => insertRecord("packageException", item));
  productProfiles.forEach((item) => insertRecord("product", item));
  warehouseAddresses.forEach((item) => insertRecord("warehouse", item));
  reconciliationRecords.forEach((item) => insertRecord("reconciliation", item));
}

export function getUser(username) {
  const row = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username);
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    passwordHash: row.password_hash,
    passwordChangedAt: row.password_changed_at,
  };
}

export function updateUserPassword(username, passwordHash, actor = "self") {
  const before = getUser(username);
  db.prepare("UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE username = ?").run(passwordHash, username);
  const after = getUser(username);
  writeAudit({
    actor,
    role: after?.role || "unknown",
    action: "auth.changePassword",
    targetKind: "user",
    targetId: username,
    before: before ? publicUser(before) : null,
    after: after ? publicUser(after) : null,
  });
  return after;
}

export function clearBusinessData({ clearAudit = false } = {}) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const records = db.prepare("DELETE FROM records").run();
    const uploads = db.prepare("DELETE FROM uploads").run();
    const audit = clearAudit ? db.prepare("DELETE FROM audit_logs").run() : { changes: 0 };
    writeAudit({
      actor: "system",
      role: "system",
      action: "system.clearBusinessData",
      targetKind: "database",
      targetId: "records",
      before: null,
      after: { records: records.changes, uploads: uploads.changes, audit: audit.changes },
    });
    db.exec("COMMIT");
    return { records: records.changes, uploads: uploads.changes, audit: audit.changes };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listRecords(kind) {
  return db.prepare("SELECT payload FROM records WHERE kind = ? ORDER BY created_at ASC").all(kind).map((row) => JSON.parse(row.payload));
}

export function getRecord(kind, id) {
  const row = db.prepare("SELECT payload FROM records WHERE kind = ? AND id = ?").get(kind, id);
  return row ? JSON.parse(row.payload) : null;
}

export function saveRecord(kind, item, actor, action) {
  const before = getRecord(kind, item.id);
  db.prepare(`
    INSERT INTO records (kind, id, payload, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(kind, id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
  `).run(kind, item.id, JSON.stringify(item));

  writeAudit({
    actor: actor ? publicUser(actor).username : "system",
    role: actor?.role || "system",
    action,
    targetKind: kind,
    targetId: item.id,
    before,
    after: item,
  });
  return item;
}

export function deleteRecord(kind, id, actor, action) {
  const before = getRecord(kind, id);
  if (!before) return null;
  db.prepare("DELETE FROM records WHERE kind = ? AND id = ?").run(kind, id);
  writeAudit({
    actor: actor ? publicUser(actor).username : "system",
    role: actor?.role || "system",
    action,
    targetKind: kind,
    targetId: id,
    before,
    after: null,
  });
  return before;
}

export function writeAudit({ actor, role, action, targetKind, targetId, before, after }) {
  db.prepare(`
    INSERT INTO audit_logs (actor, role, action, target_kind, target_id, before_payload, after_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(actor, role, action, targetKind, targetId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null);
}

export function listAuditLogs(limit = 100) {
  return db.prepare(`
    SELECT id, actor, role, action, target_kind AS targetKind, target_id AS targetId, created_at AS createdAt
    FROM audit_logs
    ORDER BY id DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(Number(limit) || 100, 500)));
}

export function saveUpload(upload) {
  db.prepare(`
    INSERT INTO uploads (id, owner, target_kind, target_id, filename, mime_type, path, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(upload.id, upload.owner, upload.targetKind, upload.targetId, upload.filename, upload.mimeType, upload.path, upload.size);
  return upload;
}

export function listUploads(targetKind, targetId) {
  return db.prepare(`
    SELECT id, owner, target_kind AS targetKind, target_id AS targetId, filename, mime_type AS mimeType, path, size, created_at AS createdAt
    FROM uploads
    WHERE target_kind = ? AND target_id = ?
    ORDER BY created_at DESC
  `).all(targetKind, targetId);
}

export function listAllUploads() {
  return db.prepare(`
    SELECT id, owner, target_kind AS targetKind, target_id AS targetId, filename, mime_type AS mimeType, path, size, created_at AS createdAt
    FROM uploads
    ORDER BY created_at DESC
  `).all();
}

seedIfEmpty();
