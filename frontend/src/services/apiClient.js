import { apiFetch } from './apiUrl.js'
export const submitComplaintApi = async (message) => {
  const token = localStorage.getItem('mineguard_jwt_token') || '';
  const response = await apiFetch('/api/labour/complaint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error('Failed to submit complaint');
  return response.json();
};
