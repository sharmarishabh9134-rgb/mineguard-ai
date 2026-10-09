export const submitComplaintApi = async (message) => {
  const token = localStorage.getItem('mineguard_token') || 'dummy-token';
  const response = await fetch('/api/labour/complaint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \Bearer \\
    },
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error('Failed to submit complaint');
  return response.json();
};
