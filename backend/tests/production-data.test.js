import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import test from 'node:test';

test('production auth controller never reads or writes the local JSON fallback', async () => {
  const previousCwd = process.cwd();
  const previousNodeEnv = process.env.NODE_ENV;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mineguard-prod-data-'));
  const localDataPath = path.join(tempDir, 'database.json');
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  let accesses = 0;

  try {
    process.chdir(tempDir);
    process.env.NODE_ENV = 'production';

    fs.existsSync = function (filePath, ...args) {
      if (path.resolve(filePath) === localDataPath) {
        accesses += 1;
        return true;
      }
      return originalExistsSync.call(this, filePath, ...args);
    };
    fs.readFileSync = function (filePath, ...args) {
      if (path.resolve(filePath) === localDataPath) {
        accesses += 1;
        return Buffer.from('{}');
      }
      return originalReadFileSync.call(this, filePath, ...args);
    };
    fs.writeFileSync = function (filePath, ...args) {
      if (path.resolve(filePath) === localDataPath) {
        accesses += 1;
        return;
      }
      return originalWriteFileSync.call(this, filePath, ...args);
    };

    const moduleUrl = new URL('../controllers/authController.js', import.meta.url);
    moduleUrl.searchParams.set('production-data-test', String(Date.now()));
    const authController = await import(moduleUrl.href);
    authController.saveDB();
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal(accesses, 0);
    assert.deepEqual(Object.keys(authController.MEMORY_WORKERS), []);
  } finally {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    process.chdir(previousCwd);
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    await rm(tempDir, { recursive: true, force: true });
  }
});
