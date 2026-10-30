import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'report');
const port = Number(process.env.PORT ?? 4312);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const chemin = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const nom = chemin === '/' ? 'index.html' : normalize(chemin).replace(/^[\/]+/, '');
  if (nom.includes('..')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const body = await readFile(join(dir, nom));
    res.writeHead(200, { 'content-type': types[extname(nom)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Introuvable. Lance npm start pour recréer le rapport.');
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
