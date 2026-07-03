import crypto from "node:crypto";

const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-change-me-before-production";
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 12);

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(":")[1];
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function validatePasswordStrength(password) {
  const value = String(password || "");
  if (value.length < 10) return "新密码至少需要 10 位";
  if (!/[A-Z]/.test(value)) return "新密码需要包含大写字母";
  if (!/[a-z]/.test(value)) return "新密码需要包含小写字母";
  if (!/\d/.test(value)) return "新密码需要包含数字";
  if (!/[^A-Za-z0-9]/.test(value)) return "新密码需要包含特殊符号";
  if (["123456", "password", "admin"].some((weak) => value.toLowerCase().includes(weak))) return "新密码不能包含常见弱密码片段";
  return "";
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signToken(user) {
  const payload = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}
