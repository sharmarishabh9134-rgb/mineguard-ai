import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  workerId: { type: String, required: true },
  workerName: { type: String, trim: true },
  mineId: { type: String, trim: true, index: true },
  zoneId: { type: String, trim: true, index: true },
  type: { type: String, enum: ['COMPLAINT','IDEA','SAFETY_ISSUE','OTHER'], default: 'COMPLAINT', index: true },
  title: { type: String, trim: true, maxlength: 160 },
  message: { type: String, required: true },
  location: {
    latitude: { type: Number, min: -90, max: 90 }, longitude: { type: Number, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 }, source: { type: String, enum: ['gps'] }, capturedAt: Date
  },
  photo: { name: String, mimeType: String, data: String },
  status: { type: String, default: 'OPEN', enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'] },
  supervisorResponse: { type: String, maxlength: 2000 }, respondedBy: String, respondedAt: Date,
  auditHistory: [{ status: String, by: String, at: { type: Date, default: Date.now }, comment: String }]
}, { timestamps: true });

complaintSchema.index({ mineId: 1, createdAt: -1 });

export default mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
