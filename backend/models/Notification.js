import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  recipientWorkerId: { type: String, required: true, index: true },
  mineId: { type: String, required: true, index: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  kind: { type: String, enum: ['HIGH_PRIORITY_PROBLEM','OVERDUE_CORRECTIVE_ACTION'], required: true },
  message: { type: String, required: true },
  dedupeKey: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
});
notificationSchema.index({ recipientWorkerId: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
