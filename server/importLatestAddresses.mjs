import { latestWarehouseAddresses } from "./latestAddresses.mjs";
import { ensureLatestWarehouseAddresses } from "./db.mjs";

const imported = ensureLatestWarehouseAddresses();

console.log(JSON.stringify({ ok: true, imported, addresses: latestWarehouseAddresses.map((address) => address.name) }, null, 2));
