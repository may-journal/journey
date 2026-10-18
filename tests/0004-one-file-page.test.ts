import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { build } from '../src/build.ts';

test('0004.1 the built page holds the core inline and loads no local script', () => {
  const file = build(mkdtempSync(join(tmpdir(), 'journey-')));
  const html = readFileSync(file, 'utf8');
  expect(html).toContain('export function parseDoc(');
  expect(html).not.toContain('/* core */');
  const sources = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  expect(sources).toEqual(['https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js']);
});
