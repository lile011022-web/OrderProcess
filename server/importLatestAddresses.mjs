import { latestWarehouseAddresses } from "./latestAddresses.mjs";
import { saveRecord } from "./db.mjs";

for (const address of latestWarehouseAddresses) {
  saveRecord("warehouse", address, { username: "system", role: "system" }, "warehouse.importLatestAddress");
}

console.log(JSON.stringify({ ok: true, imported: latestWarehouseAddresses.length }, null, 2));
