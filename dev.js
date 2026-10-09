import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const vite = fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url));
// Keep the API on a stable development port so Vite's /api proxy always reaches
// the API process started below, even when another app is already on port 5000.
const apiPort = process.env.API_PORT || '5002';
const children = [
  spawn(process.execPath, ['server.js'], { cwd: root, stdio: 'inherit', env: { ...process.env, PORT: apiPort } }),
  spawn(process.execPath, [vite, '--host', '127.0.0.1'], { cwd: root, stdio: 'inherit', env: process.env }),
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

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
