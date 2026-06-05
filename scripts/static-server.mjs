#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const root = resolve(args[0] || process.env.STATIC_ROOT || 'dist');
const host = args[1] || process.env.STATIC_HOST || '127.0.0.1';
const port = Number(args[2] || process.env.PORT || 3000);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wasm', 'application/wasm'],
]);

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const absolutePath = resolve(join(root, normalizedPath));

  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
    return null;
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isDirectory()) {
    return join(absolutePath, 'index.html');
  }

  if (existsSync(absolutePath)) {
    return absolutePath;
  }

  return join(root, 'index.html');
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
    'Content-Type': contentTypes.get(extname(filePath)) || 'application/octet-stream',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  const scriptPath = fileURLToPath(import.meta.url);
  console.log(`Serving ${root} at http://${host}:${port} with ${scriptPath}`);
});
