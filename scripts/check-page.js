#!/usr/bin/env node
// Serves the repo as Pages would, opens the page in headless Chrome with a
// real token, waits for real Mermaid to draw, taps a node, and saves light
// and dark screenshots. Usage, inputs and outputs are in README.md.

import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'out'));
const { CHROME: chrome, GITHUB_TOKEN: token } = process.env;
if (!token || !chrome) {
  console.error('check-page: set GITHUB_TOKEN and CHROME');
  process.exit(2);
}
await mkdir(out, { recursive: true });

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (request, response) => {
  const path = new URL(String(request.url), 'http://localhost').pathname;
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(undefined)));
const address = /** @type {import('node:net').AddressInfo} */ (server.address());
const pageUrl = `http://127.0.0.1:${address.port}/`;

const profile = join(out, 'profile');
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`], {
  stdio: ['ignore', 'ignore', 'pipe'],
});
const wsUrl = await new Promise((ok, no) => {
  let text = '';
  browser.stderr.on('data', (chunk) => {
    text += chunk;
    const match = text.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) ok(match[1]);
  });
  browser.on('exit', () => no(new Error('Chrome exited before DevTools started')));
});

const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok));
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data));
  pending.get(message.id)?.(message);
  pending.delete(message.id);
});
const send = (/** @type {string} */ method, params = {}, /** @type {string} */ sessionId = '') =>
  new Promise((ok, no) => {
    const id = ++nextId;
    pending.set(id, (/** @type {any} */ m) =>
      m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)
    );
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { flatten: true, targetId });
const page = (/** @type {string} */ method, params = {}) => send(method, params, sessionId);
const evaluate = async (/** @type {string} */ expression) => {
  const reply = await page('Runtime.evaluate', { awaitPromise: true, expression, returnByValue: true });
  return reply.exceptionDetails ? `error: ${reply.exceptionDetails.text}` : reply.result.value;
};
const wait = (/** @type {number} */ ms) => new Promise((ok) => setTimeout(ok, ms));
const until = async (/** @type {string} */ expression, /** @type {number} */ seconds) => {
  for (let i = 0; i < seconds * 2; i++) {
    if (await evaluate(expression)) return true;
    await wait(500);
  }
  return false;
};
const shot = async (/** @type {string} */ name, /** @type {number} */ width, /** @type {string} */ scheme) => {
  await page('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 2, height: 900, mobile: width < 600, width });
  await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
  await wait(1500);
  const { data } = await page('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(out, name), Buffer.from(data, 'base64'));
};

/** @type {Record<string, unknown>} */
const report = {};
try {
  await page('Page.enable');
  await page('Page.navigate', { url: pageUrl });
  report.tokenScreen = await until('!document.getElementById("tokenScreen").hidden', 15);
  await evaluate(`localStorage.setItem('journey.token', ${JSON.stringify(token)})`);
  await page('Page.reload');
  report.graphDrawn = await until('document.querySelector("#diagram svg g.node")', 90);
  report.status = await evaluate('document.getElementById("status").textContent');
  report.graphNote = await evaluate('document.getElementById("graphNote").textContent');
  report.errorCards = await evaluate('document.querySelectorAll("#errors .card").length');
  await evaluate('document.querySelector("#diagram g.node").dispatchEvent(new MouseEvent("click"))');
  report.details = await evaluate('document.getElementById("detailsTitle").textContent');
  report.firstItem = await evaluate('document.querySelector("#detailsList li")?.innerText');
  await evaluate('window.scrollTo(0, 0)');
  await shot('desktop-light.png', 1280, 'light');
  await shot('phone-dark.png', 390, 'dark');
  report.phoneScrolls = await evaluate(
    '(() => { const d = document.getElementById("diagram"); return d.scrollWidth > d.clientWidth && document.documentElement.scrollWidth <= innerWidth; })()'
  );
} finally {
  ws.close();
  browser.kill();
  server.close();
  await rm(profile, { force: true, recursive: true });
}
console.log(JSON.stringify(report, null, 2));
