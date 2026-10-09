import mongoose from 'mongoose';

const workerLocationSchema = new mongoose.Schema({
  workerId: { type: String, required: true, index: true },
  mineId: { type: String, required: true },
  zoneId: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number },
  gpsStatus: { type: String, default: 'SATELLITE_GPS' },
  networkStatus: { type: String, default: 'ONLINE' },
  clientTimestamp: { type: Date, required: true }
}, {
  timestamps: true
});

const WorkerLocation = mongoose.models.WorkerLocation || mongoose.model('WorkerLocation', workerLocationSchema);

export default WorkerLocation;
