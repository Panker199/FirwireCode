const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "../app/renderer");
const PORT = 3000;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

// Kill anything on port
try {
  const out = execSync('netstat -ano | findstr :3000 | findstr LISTENING', { windowsHide: true }).toString();
  const lines = out.trim().split("\n");
  for (const line of lines) {
    const pid = line.trim().split(/\s+/).pop();
    if (pid && pid !== "0") {
      try { execSync("taskkill /F /PID " + pid, { windowsHide: true }); } catch {}
    }
  }
} catch {}

const server = http.createServer((req, res) => {
  let url = req.url.split("?")[0];
  if (url === "/") url = "/browser.html";
  const filePath = path.join(ROOT, url);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Firewire Dev Server\n\n  ${url}\n`);
  try { execSync(`start ${url}`, { windowsHide: true }); } catch {}
});
