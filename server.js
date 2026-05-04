const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID || "11ObpaDhZ9j1UKpzMyP-mag2RCx-qeJVQ0K-KZD7RMrQ";
const PUBLIC_DIR = path.join(__dirname, "public");
const CACHE_MS = 5 * 60 * 1000;

const cache = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

async function fetchSheet(sheetName) {
  const cached = cache.get(sheetName);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.csv;

  const url = new URL(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetName);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets respondio ${response.status} para ${sheetName}`);
  }

  const csv = await response.text();
  cache.set(sheetName, { time: Date.now(), csv });
  return csv;
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
    return;
  }

  if (url.pathname.startsWith("/api/sheet/")) {
    const sheetName = decodeURIComponent(url.pathname.replace("/api/sheet/", ""));
    if (!["COMANDA", "DETALLE COMANDA", "COMANDA DE CAMBIOS", "DETALLE DE CAMBIOS"].includes(sheetName)) {
      send(res, 400, JSON.stringify({ error: "Hoja no permitida" }), "application/json; charset=utf-8");
      return;
    }

    try {
      const csv = await fetchSheet(sheetName);
      send(res, 200, csv, "text/csv; charset=utf-8");
    } catch (error) {
      send(res, 502, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Informe Chazarreta listo en http://127.0.0.1:${PORT}`);
});
