import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
  mineId: { type: String, required: true, index: true },
  zoneId: { type: String },
  date: { type: Date, required: true },
  shift: { type: String, enum: ['Shift A', 'Shift B', 'Shift C'] },
  targetTonnes: { type: Number, required: true },
  actualTonnes: { type: Number, required: true },
  variance: { type: Number },
  enteredBy: { type: String },
  status: { type: String, default: 'PENDING' }
}, {
  timestamps: true
});

// Virtual for achievement percent (one decimal)
productionSchema.virtual('achievementPercent').get(function() {
  if (this.targetTonnes && this.targetTonnes > 0) {
    return Math.round((this.actualTonnes / this.targetTonnes) * 1000) / 10;
  }
  return 0;
});

// Include virtuals in JSON/Object outputs
productionSchema.set('toJSON', { virtuals: true });
productionSchema.set('toObject', { virtuals: true });

const Production = mongoose.models.Production || mongoose.model('Production', productionSchema);

export default Production;
