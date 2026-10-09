import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import labourRoutes from './routes/labourRoutes.js';
import supervisorRoutes from './routes/supervisorRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import problemRoutes from './routes/problemRoutes.js';

import Worker from './models/Worker.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('socketio', io);

app.use(cors());
app.use(express.json({ limit: '32mb' }));

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/labour', labourRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/problems', problemRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'MineGuard AI Strict Role Governance Engine' });
});

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
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`[Socket.io] Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('worker:location', (data) => {
    socket.broadcast.emit('worker:location:update', data);
  });

  socket.on('sos:trigger', (data) => {
    io.to('supervisor_room').to('medical_room').emit('emergency:sos:critical', data);
    io.emit('sos:alert:broadcast', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

let PORT = parseInt(process.env.PORT || '5002', 10);

const startServer = async () => {
  await connectDB();
  await seedInitialData();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Express] Port ${PORT} busy, attempting fallback port ${PORT + 2}...`);
      PORT += 2;
      server.listen(PORT);
    } else {
      console.error('[Express Error]', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`MineGuard AI Express & Socket.io Engine Live`);
    console.log(`Port: http://localhost:${PORT}`);
    console.log(`================================================`);
  });
};

startServer();
