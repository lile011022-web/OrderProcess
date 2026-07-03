import fs from "node:fs";
import path from "node:path";
import { clearBusinessData, listAllUploads } from "./db.mjs";

const shouldClearUploads = process.env.CLEAR_UPLOAD_FILES !== "false";
const clearAudit = process.env.CLEAR_AUDIT === "true";

const uploadRows = shouldClearUploads ? listUploadsForCleanup() : [];
const result = clearBusinessData({ clearAudit });
let deletedFiles = 0;

for (const upload of uploadRows) {
  try {
    if (upload.path && fs.existsSync(upload.path)) {
      fs.rmSync(upload.path, { force: true });
      deletedFiles += 1;
    }
  } catch (error) {
    console.warn(`Failed to delete upload file: ${upload.path}`, error.message);
  }
}

console.log(JSON.stringify({ ok: true, ...result, deletedFiles, clearAudit }, null, 2));

function listUploadsForCleanup() {
  const uploads = listAllUploads();
  const uploadDir = process.env.UPLOAD_DIR || path.resolve("uploads");
  if (fs.existsSync(uploadDir)) {
    for (const filename of fs.readdirSync(uploadDir)) {
      uploads.push({ path: path.join(uploadDir, filename) });
    }
  }
  return uploads;
}
