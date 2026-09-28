#!/usr/bin/env node
// 本地预览 dist/：node bin/serve.mjs [--dir dist] [--port 4173]
// 只给本地看效果用，线上是 GitHub Pages。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'dist' },
    port: { type: 'string', default: process.env.PORT ?? '4173' },
  },
});

const root = resolve(values.dir);
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css' };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) return send(res, 403, 'forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    send(res, 404, 'not found');
  }
}).listen(Number(values.port), () => {
  console.log(`预览：http://localhost:${values.port}/`);
});

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}
