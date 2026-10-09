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
    enum: ['labour', 'supervisor', 'admin', 'medical'],
    required: true,
    default: 'labour'
  },
  passwordHash: {
    type: String,
    // not required initially because older mocked users might not have it
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  mineId: {
    type: String,
    trim: true
  },
  zoneId: {
    type: String,
    trim: true
  },
  shift: {
    type: String,
    trim: true
  },
  contractorId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  profilePhoto: {
    type: String,
  },
  emergencyContact: {
    type: String,
    trim: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    trim: true
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
