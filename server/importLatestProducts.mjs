import { ensureLatestProducts } from "./db.mjs";
import { latestProducts } from "./latestProducts.mjs";

const imported = ensureLatestProducts();

console.log(JSON.stringify({ ok: true, imported, products: latestProducts.map((product) => product.name) }, null, 2));
