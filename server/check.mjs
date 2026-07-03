const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:7301";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const health = await request("/health");
const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "123456", role: "admin" }),
});
const authHeaders = { authorization: `Bearer ${login.token}` };
const packages = await request("/api/packages?overdue=true", { headers: authHeaders });
const fee = await request("/api/warehouse-fees/calculate?packageCount=2&photoCount=3", { headers: authHeaders });
const tracking = await request("/api/tracking?trackingNo=1Z999AA10123456784");
const audit = await request("/api/audit-logs?limit=5", { headers: authHeaders });

console.log(JSON.stringify({
  health: health.ok,
  loginUser: login.user.username,
  overduePackages: packages.total,
  fee: fee.data,
  tracking,
  auditRows: audit.total,
}, null, 2));
