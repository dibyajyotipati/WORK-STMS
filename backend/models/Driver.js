const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+\d][\d\s-]{6,}$/, 'Invalid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    licenseExpiry: { type: Date },
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, 'Experience years cannot be negative'],
    },
    status: {
      type: String,
      enum: ['available', 'on_trip', 'off_duty'],
      default: 'available',
    },
  },
  { timestamps: true }
);

driverSchema.index({ status: 1 });
driverSchema.index({ name: 'text' }); // text search support

module.exports = mongoose.model('Driver', driverSchema);