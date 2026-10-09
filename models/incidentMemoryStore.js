// Shared fallback incident archive for local/demo mode when MongoDB is offline.
// Records live only for the lifetime of the backend process.
const memoryIncidents = [];

export default memoryIncidents;
