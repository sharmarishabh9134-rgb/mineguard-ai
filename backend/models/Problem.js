import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, required: true },
  data: { type: String, required: true },
  note: { type: String, maxlength: 1000 }
}, { timestamps: true });

const problemSchema = new mongoose.Schema({
  problemId: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, required: true, enum: ['Safety Hazard','Equipment Failure','Environmental Issue','Infrastructure Damage','Compliance Violation','Worker Safety','Operational Issue','Electrical Issue','Fire/Gas Hazard','Water/Flooding','Other'] },
  priority: { type: String, required: true, enum: ['Low','Medium','High','Critical'] },
  severity: { type: String, required: true, enum: ['Minor','Moderate','Major','Critical'] },
  status: { type: String, enum: ['OPEN','ACKNOWLEDGED','ASSIGNED','IN_PROGRESS','RESOLVED','VERIFIED','CLOSED','REJECTED'], default: 'OPEN', index: true },
  mineId: { type: String, required: true, trim: true, index: true },
  zoneId: { type: String, trim: true, default: '' , index: true },
  location: {
    latitude: { type: Number, min: -90, max: 90 }, longitude: { type: Number, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 }, source: { type: String, enum: ['gps','map_selection','manual'] }, capturedAt: Date
  },
  reportedBy: { workerId: String, name: String }, assignedTo: { workerId: String, name: String },
  evidence: [evidenceSchema],
  correctiveAction: {
    description: String, assignedTo: { workerId: String, name: String }, dueDate: Date,
    priority: { type: String, enum: ['Low','Medium','High','Critical'] }, status: { type: String, enum: ['OPEN','COMPLETED'], default: 'OPEN' },
    comments: [{ text: String, by: String, at: { type: Date, default: Date.now } }], completionEvidence: [evidenceSchema], completedAt: Date
  },
  verification: { verifiedBy: String, verifiedAt: Date, comment: String },
  auditHistory: [{ previousStatus: String, newStatus: String, changedBy: String, changedAt: { type: Date, default: Date.now }, comment: String }],
  clientEventId: { type: String, unique: true, sparse: true, index: true }, closedAt: Date
}, { timestamps: true });

problemSchema.index({ mineId: 1, createdAt: -1 });
problemSchema.index({ mineId: 1, zoneId: 1, status: 1, priority: 1 });
problemSchema.pre('validate', async function () {
  if (this.problemId) return;
  const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: 'problemId' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' }
  );
  this.problemId = `MG-PRB-${String(counter.seq).padStart(4, '0')}`;
});

export default mongoose.models.Problem || mongoose.model('Problem', problemSchema);
