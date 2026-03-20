#!/usr/bin/env node
/**
 * Download avatar.glb to public/avatars/ for fast local loading.
 * Run: pnpm download-avatar
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const URL =
  "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/brunette.glb";
const OUT_DIR = path.join(__dirname, "..", "public", "avatars");
const OUT_FILE = path.join(OUT_DIR, "avatar.glb");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(OUT_FILE);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    });
    req.on("error", reject);
  });
}

console.log("Downloading avatar from GitHub...");
download(URL)
  .then(() => {
    console.log("✅ Avatar saved to public/avatars/avatar.glb");
  })
  .catch((err) => {
    console.error("❌ Download failed:", err.message);
    process.exit(1);
  });
