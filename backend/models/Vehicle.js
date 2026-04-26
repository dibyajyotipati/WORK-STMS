const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['truck', 'van', 'mini_truck', 'container', 'tanker'],
      required: true,
    },
    model: { type: String, trim: true },
    capacity: {
      type: Number,
      required: [true, 'Capacity (kg) is required'],
      min: 0,
    },
    mileage: { type: Number, default: 10, min: 0 }, // km per litre
    status: {
      type: String,
      enum: ['active', 'idle', 'maintenance'],
      default: 'idle',
    },
    lastServiceDate: { type: Date },
    currentLocation: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
