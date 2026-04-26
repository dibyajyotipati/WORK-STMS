const mongoose = require('mongoose');
const Counter = require('./Counter');

const shipmentSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      unique: true,
      sparse: true,   // allows null during pre-save, before ID is generated
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    cargoType: { type: String, trim: true, default: 'general' },
    weightKg: { type: Number, required: true, min: 0 },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    status: {
      type: String,
      enum: ['booked', 'assigned', 'in_transit', 'delivered', 'cancelled'],
      default: 'booked',
    },
    distanceKm: { type: Number, default: 0, min: 0 },
    durationMin: { type: Number, default: 0, min: 0 },
    fuelEstimateLitres: { type: Number, default: 0 },
    fuelCostEstimate: { type: Number, default: 0 },
    fareAmount: { type: Number, default: 0 },
    route: {
      polyline: { type: String },
      waypoints: [{ lat: Number, lng: Number }],
    },
    startTime: { type: Date },
    endTime: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Generate systematic tracking ID: STMS-YYYYMMDD-XXXX (atomic counter)
shipmentSchema.pre('save', async function (next) {
  if (!this.trackingId) {
    const now = new Date();
    const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const counter = await Counter.findOneAndUpdate(
      { _id: `shipment-${dateKey}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.trackingId = `STMS-${dateKey}-${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

shipmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Shipment', shipmentSchema);