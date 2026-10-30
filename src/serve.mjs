import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'report');
const port = Number(process.env.PORT ?? 4312);
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const server = createServer(async (req, res) => {
  const name = req.url === '/report.json' ? 'report.json' : 'index.html';
  try {
    const body = await readFile(join(dir, name));
    res.writeHead(200, { 'content-type': types[name.endsWith('json') ? '.json' : '.html'] });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Rapport introuvable. Lance npm run build.');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Le port ${port} est déjà pris. Ferme l'ancien terminal ou lance avec PORT=${port + 1}.`);
    process.exit(1);
  }
  throw e;
});
server.listen(port, '127.0.0.1', () => console.log(`Rapport : http://127.0.0.1:${port}`));
