// Preserve the historical root command while keeping the server implementation
// inside backend/. The process working directory still controls dotenv and data
// file resolution, matching the behavior of the original root entry point.
import './backend/server.js';
