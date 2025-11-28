// Minimal development log sink. Run: node scripts/loggerServer.js
// Receives POST /log with JSON { tag?: string, level?: string, message?: string, data?: any }

const http = require('http');

const PORT = process.env.LOGGER_PORT ? Number(process.env.LOGGER_PORT) : 4001;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const ts = new Date().toISOString();
        const tag = parsed.tag ? `[${parsed.tag}]` : '';
        const level = (parsed.level || 'info').toUpperCase();
        const msg = parsed.message || '';
        const data = parsed.data !== undefined ? parsed.data : null;
        const line = `${ts} ${level} ${tag} ${msg}`.trim();
        if (level === 'ERROR') {
          console.error(line, data !== null ? data : '');
        } else if (level === 'WARN') {
          console.warn(line, data !== null ? data : '');
        } else {
          console.log(line, data !== null ? data : '');
        }
      } catch (e) {
        console.error('[LOGGER] Failed to parse body', e);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[LOGGER] Listening on http://localhost:${PORT}`);
});


