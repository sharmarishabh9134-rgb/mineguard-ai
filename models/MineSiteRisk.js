import mongoose from 'mongoose';

const mineSiteRiskSchema = new mongoose.Schema({
  zoneId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  rainfallMm: {
    type: Number,
    default: 0
  },
  openViolationsCount: {
    type: Number,
    default: 0
  },
  calculatedRiskScore: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const MineSiteRisk = mongoose.models.MineSiteRisk || mongoose.model('MineSiteRisk', mineSiteRiskSchema);

export default MineSiteRisk;
