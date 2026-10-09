import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)) {
        files.push(...await listJavaScriptFiles(entryPath));
      }
    } else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

test('all backend relative imports resolve to existing files', async () => {
  const files = await listJavaScriptFiles(backendRoot);
  const unresolved = [];
  const importPattern = /\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const [, specifier] of source.matchAll(importPattern)) {
      const target = path.resolve(path.dirname(file), specifier);
      try {
        if (!(await stat(target)).isFile()) unresolved.push(`${path.relative(backendRoot, file)} -> ${specifier}`);
      } catch {
        unresolved.push(`${path.relative(backendRoot, file)} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(unresolved, [], `Unresolved backend imports:\n${unresolved.join('\n')}`);
});
