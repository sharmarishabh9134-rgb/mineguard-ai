import mongoose from 'mongoose';

const mineMapSchema = new mongoose.Schema({
  mineId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mapUrl: { type: String },
  svgContent: { type: String },
  boundaries: { type: Object },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  zones: [{
    zoneId: { type: String },
    name: { type: String },
    type: { type: String, enum: ['SAFE', 'RESTRICTED', 'DANGER', 'EMERGENCY_EXIT'] },
    coordinates: { type: Object }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }
}, {
  timestamps: true
});

const MineMap = mongoose.models.MineMap || mongoose.model('MineMap', mineMapSchema);

export default MineMap;
