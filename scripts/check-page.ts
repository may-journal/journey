#!/usr/bin/env node
// Builds the page, opens it in headless Chrome with a real token, waits for the graph
// and dates, taps a node, and saves screenshots. Usage is in README.md.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from '../src/build.ts';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] || join(root, 'out'));
const token = process.env.GITHUB_TOKEN;
const chrome = process.env.CHROME;
if (!token || !chrome) {
  console.error('check-page: set GITHUB_TOKEN and CHROME');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

// The built page is one self-contained file, so it opens straight from disk.
const pageUrl = pathToFileURL(build(join(out, 'site'))).href;

const profile = join(out, 'profile');
rmSync(profile, { recursive: true, force: true });
const browser = spawn(
  chrome,
  ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  {
    stdio: ['ignore', 'ignore', 'pipe'],
  }
);
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
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((ok, no) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
const evaluate = async (expression) => {
  const reply = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (reply.exceptionDetails)
    return `error: ${reply.exceptionDetails.exception?.description || reply.exceptionDetails.text}`;
  return reply.result.value;
};
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const until = async (expression, seconds) => {
  for (let i = 0; i < seconds * 2; i++) {
    if (await evaluate(expression)) return true;
    await wait(500);
  }
  return false;
};
const shot = async (name, width, height, scheme) => {
  await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 600 });
  await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
  await wait(1500);
  const { data } = await page('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, name), Buffer.from(data, 'base64'));
};

const report = {};
try {
  await page('Page.enable');
  await page('Page.navigate', { url: pageUrl });
  report.pageLoaded = await until('document.getElementById("token-screen")', 15);
  report.tokenScreen = await evaluate('!document.getElementById("token-screen").hidden');
  await evaluate(`localStorage.setItem('journey.token', ${JSON.stringify(token)})`);
  await page('Page.reload');
  report.graphDrawn = await until('document.querySelector("#diagram svg g.node")', 90);
  report.status = await evaluate('document.getElementById("status").textContent');
  report.graphNote = await evaluate('document.getElementById("graph-note").textContent');
  report.svgNodes = await evaluate('document.querySelectorAll("#diagram g.node").length');
  report.errorCards = await evaluate('document.querySelectorAll("#errors .card").length');
  await evaluate('document.querySelector("#diagram g.node").dispatchEvent(new MouseEvent("click", { bubbles: true }))');
  report.details = await evaluate('document.getElementById("details-title").textContent');
  report.datesDone = await until(
    '/^Dates (loaded|stopped)/.test(document.getElementById("dates-status").textContent)',
    240
  );
  report.dates = await evaluate('document.getElementById("dates-status").textContent');
  await evaluate(
    'document.getElementById("sort").value = "modified"; document.getElementById("sort").dispatchEvent(new Event("change"))'
  );
  report.firstItem = await evaluate('document.querySelector("#details-list li")?.innerText');
  await evaluate(
    'document.getElementById("recent").value = "14"; document.getElementById("recent").dispatchEvent(new Event("change"))'
  );
  const DOTTED = `[...document.querySelectorAll("#diagram g.node")].filter((n) => n.textContent.includes("•")).length`;
  await until(DOTTED, 20);
  report.recentNodes = await evaluate(DOTTED);
  await evaluate('window.scrollTo(0, 0)');
  await shot('desktop-light.png', 1280, 900, 'light');
  await shot('phone-dark.png', 390, 844, 'dark');
  report.phoneScrolls = await evaluate(
    '(() => { const d = document.getElementById("diagram"); return d.scrollWidth > d.clientWidth && document.documentElement.scrollWidth <= innerWidth; })()'
  );
  await evaluate("localStorage.removeItem('journey.token')");
} finally {
  ws.close();
  browser.kill();
  rmSync(profile, { recursive: true, force: true });
}
console.log(JSON.stringify(report, null, 2));
