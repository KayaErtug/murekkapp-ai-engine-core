// /utils/cleanup.js

import fs from "fs";
import path from "path";

const CLEANUP_DIRS = ["logs", "tmp", "temp", "cache"];
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 saat

export function cleanupOldFiles(baseDir) {
  const now = Date.now();

  for (const dir of CLEANUP_DIRS) {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) continue;

    for (const file of fs.readdirSync(fullPath)) {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }
  }
}
