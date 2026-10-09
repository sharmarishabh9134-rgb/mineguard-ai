import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  mineLocation: {
    type: String,
    required: true,
    default: 'Jharia Coalfields – Pit 4'
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DISPATCHED', 'RESOLVED'],
    default: 'ACTIVE',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);

export default Incident;
