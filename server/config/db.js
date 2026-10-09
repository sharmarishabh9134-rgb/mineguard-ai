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

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Error] Runtime error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Warning] Connection lost.');
    });

    const gracefulExit = async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed.');
      process.exit(0);
    };

    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);

    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Connection failed (${error.message}).`);
  }
};

export default connectDB;
