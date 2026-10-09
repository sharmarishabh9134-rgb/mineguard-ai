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
    lat: { type: Number },
    lng: { type: Number }
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
  incidentType: { type: String, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 4000 },
  rootCause: { type: String, trim: true, maxlength: 2000 },
  correctiveAction: { type: String, trim: true, maxlength: 3000 },
  resolutionNotes: { type: String, trim: true, maxlength: 3000 },
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);

export default Incident;
