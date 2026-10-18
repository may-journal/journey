// Strips the core's types and puts it inline in page.html, so the built
// index.html is one file that opens straight from disk.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

const MARK = '/* core */';

export function build(outDir: string): string {
  const page = readFileSync(new URL('page.html', import.meta.url), 'utf8');
  const core = stripTypeScriptTypes(readFileSync(new URL('core.ts', import.meta.url), 'utf8'));
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, 'index.html');
  writeFileSync(
    file,
    page.replace(MARK, () => core)
  );
  return file;
}
