/**
 * Root dev launcher — starts backend API and frontend Vite dev server concurrently.
 *
 * Usage (from repo root):
 *   node dev.js
 *
 * Environment:
 *   API_PORT  — backend port (default 5002). Vite proxies /api to this port.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root       = fileURLToPath(new URL('.', import.meta.url));
const backendDir = join(root, 'backend');
const frontendDir = join(root, 'frontend');
const vite       = join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

const apiPort = process.env.API_PORT || '5002';

const children = [
  spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: apiPort }
  }),
  spawn(process.execPath, [vite, '--host', '127.0.0.1'], {
    cwd: frontendDir,
    stdio: 'inherit',
    env: { ...process.env, API_PORT: apiPort }
  }),
];

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = code;
};

for (const child of children) {
  child.on('error', (error) => {
    console.error('[dev] Failed to start a development service:', error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) stop(code ?? 1);
  });
}

process.on('SIGINT',  () => stop(0));
process.on('SIGTERM', () => stop(0));
