import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/mineguard_db';
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Listen to connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('[db] operation failed.');
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Warning] Connection lost. Attempting reconnect...');
    });

    // Graceful Shutdown Handlers
    const gracefulExit = async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed through app termination.');
      process.exit(0);
    };

    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);

    return conn;
  } catch (error) {
    // Do not echo connection error messages: drivers may include configured
    // connection details in their diagnostics.
    console.warn('[MongoDB Warning] Initial connection failed.');
  }
};

export default connectDB;
