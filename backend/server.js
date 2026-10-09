import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';
import { createAllowedOrigins } from './config/corsConfig.js';
import { validateProductionEnv } from './config/runtimeConfig.js';
import { JWT_SECRET } from './config/security.js';

import authRoutes from './routes/authRoutes.js';
import labourRoutes from './routes/labourRoutes.js';
import supervisorRoutes from './routes/supervisorRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import problemRoutes from './routes/problemRoutes.js';

import Worker from './models/Worker.js';

validateProductionEnv();

const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = createAllowedOrigins({ isProduction, configuredOrigins });
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};
const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
const frontendIndex = resolve(frontendDist, 'index.html');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: corsOptions
});

app.disable('x-powered-by');
app.set('socketio', io);

app.use(cors(corsOptions));
app.use(express.json({ limit: '32mb' }));

app.use('/api', (req, res, next) => {
  if (isProduction && req.path !== '/health' && Worker.db.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'The database is temporarily unavailable.'
    });
  }
  return next();
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/labour', labourRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/problems', problemRoutes);

app.get('/api/health', (req, res) => {
  const databaseConnected = Worker.db.readyState === 1;
  const status = databaseConnected ? 'online' : 'degraded';
  res.status(isProduction && !databaseConnected ? 503 : 200).json({
    status,
    database: databaseConnected ? 'connected' : 'unavailable',
    service: 'MineGuard AI API'
  });
});

if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    return res.sendFile(frontendIndex);
  });
}

const seedInitialData = async () => {
  try {
    // MongoDB is optional for local/demo mode. Avoid Mongoose's buffer timeout
    // delaying API startup when the database is unavailable.
    if (Worker.db.readyState !== 1) return;
    const count = await Worker.countDocuments();
    if (count === 0) {
      await Worker.create([
        {
          workerId: 'LAB-8842',
          name: 'Ramesh Kumar',
          role: 'labour',
          assignedMineLocation: 'Jharia Coalfields – Pit 4',
          safetyClearance: true,
          qualifications: [
            { title: 'DGMS Safety Permit', regCode: 'DGMS-2024-88', expiryDate: new Date('2026-12-31'), status: 'VALID' }
          ]
        },
        {
          workerId: 'RISHI',
          name: 'Rishi Sharma',
          role: 'supervisor',
          assignedMineLocation: 'Jharia Coalfields',
          safetyClearance: true,
          qualifications: [
            { title: 'Mine Management License Class A', regCode: 'MGR-7741', expiryDate: new Date('2027-08-15'), status: 'VALID' }
          ]
        }
      ]);
      console.log('[MongoDB] Seeded initial worker records.');
    }
  } catch (e) {
    // Fallback
  }
};

io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected.');

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
  });

  socket.on('worker:location', (data) => {
    socket.broadcast.emit('worker:location:update', data);
  });

  socket.on('sos:trigger', (data) => {
    io.to('supervisor_room').to('medical_room').emit('emergency:sos:critical', data);
    io.emit('sos:alert:broadcast', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Client disconnected.');
  });
});

if (isProduction) {
  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token = authToken || (header?.startsWith('Bearer ') ? header.slice(7) : '');

    if (!token) return next(new Error('Authentication required'));

    try {
      socket.data.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch {
      return next(new Error('Invalid authentication token'));
    }
  });
}

let PORT = Number.parseInt(process.env.PORT || '5002', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const startServer = async () => {
  const connection = await connectDB();
  if (isProduction && !connection) {
    throw new Error('MongoDB connection is required in production; check service configuration and database availability.');
  }
  if (!isProduction) await seedInitialData();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (isProduction) {
        console.error('[Express] The configured production port is already in use.');
        process.exit(1);
      }
      console.warn(`[Express] Port ${PORT} busy, attempting fallback port ${PORT + 2}...`);
      PORT += 2;
      server.listen(PORT, '0.0.0.0');
    } else {
      console.error('[Express Error] The server could not bind to its configured port.');
      process.exitCode = 1;
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`MineGuard AI Express & Socket.io Engine Live`);
    console.log(`Listening on port ${PORT}`);
    console.log(`================================================`);
  });
};

startServer().catch((error) => {
  console.error('[Startup] MineGuard AI could not start:', error.message);
  process.exitCode = 1;
});
