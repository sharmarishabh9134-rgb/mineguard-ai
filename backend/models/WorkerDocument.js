import mongoose from 'mongoose';
const workerDocumentSchema = new mongoose.Schema({
  workerId: { type: String, required: true, index: true }, workerName: String,
  mineId: { type: String, index: true }, zoneId: String,
  docType: { type: String, required: true, trim: true, maxlength: 160 }, regCode: { type: String, trim: true, maxlength: 100 },
  issueDate: { type: Date }, expiryDate: { type: Date, required: true, index: true },
  file: { name: String, mimeType: String, data: String },
  status: { type: String, enum: ['PENDING_REVIEW','VERIFIED','REJECTED'], default: 'PENDING_REVIEW', index: true },
  verificationNote: { type: String, maxlength: 1000 }, verifiedBy: String, verificationDate: Date,
  auditHistory: [{ action: String, by: String, at: { type: Date, default: Date.now }, note: String }]
}, { timestamps: true });
workerDocumentSchema.index({ mineId: 1, expiryDate: 1 });
workerDocumentSchema.index({ workerId: 1, expiryDate: 1 });
export default mongoose.models.WorkerDocument || mongoose.model('WorkerDocument', workerDocumentSchema);
