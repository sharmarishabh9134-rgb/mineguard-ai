import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiUrl } from './apiUrl.js'

test('API URL uses relative same-origin paths when no backend URL is configured', () => {
  assert.equal(createApiUrl('/api/labour/concerns', ''), '/api/labour/concerns')
})

test('API URL joins backend origin and API path without duplicating /api', () => {
  assert.equal(
    createApiUrl('/api/labour/concerns', 'https://mineguard-api.example.com/'),
    'https://mineguard-api.example.com/api/labour/concerns'
  )
  assert.equal(
    createApiUrl('/api/labour/concerns', 'https://mineguard-api.example.com/api/'),
    'https://mineguard-api.example.com/api/labour/concerns'
  )
})
