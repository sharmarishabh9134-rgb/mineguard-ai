import mongoose from 'mongoose';

const qualificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  regCode: { type: String },
  expiryDate: { type: Date },
  status: { type: String, default: 'VALID' }
}, { _id: false });

const workerSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['labour', 'manager', 'hospital'],
    required: true,
    default: 'labour'
  },
  assignedMineLocation: {
    type: String,
    default: 'Jharia Coalfields'
  },
  safetyClearance: {
    type: Boolean,
    default: true
  },
  qualifications: [qualificationSchema]
}, {
  timestamps: true
});

const Worker = mongoose.models.Worker || mongoose.model('Worker', workerSchema);

export default Worker;
