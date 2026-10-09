
const CACHE_NAME = 'mineguard-cache-v1';
const QUEUE_NAME = 'mineguard-sync-queue';

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
});

self.addEventListener('fetch', (event) => {
  // basic fetch listener
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

async function syncReports() {
  console.log('[SW] Syncing offline reports');
}
