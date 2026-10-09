const configuredApiUrl = import.meta.env?.VITE_API_URL?.trim() || ''

export function createApiUrl(path, baseUrl = configuredApiUrl) {
  const normalizedPath = path.startsWith('/api/')
    ? path
    : `/api/${path.replace(/^\/+/, '')}`

  if (!baseUrl) return normalizedPath

  // Accept either a backend origin or an origin already ending in /api.
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '').replace(/\/api$/i, '')
  return `${normalizedBase}${normalizedPath}`
}

export const apiUrl = path => createApiUrl(path)
export const apiFetch = (input, init) => fetch(
  typeof input === 'string' ? apiUrl(input) : input,
  init
)
