/* 本地開發伺服器：提供靜態檔案並掛載 api/analyze.js。
   用法：SME_MOCK=1 node scripts/dev-server.mjs   （不呼叫 Claude，用模擬資料）
         ANTHROPIC_API_KEY=... node scripts/dev-server.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/analyze.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8765);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/analyze") { try { await handler(req, res); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, code: "server", message: String(e.message) })); } return; }
  let file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end("not found"); return; }
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log("http://127.0.0.1:" + port));
