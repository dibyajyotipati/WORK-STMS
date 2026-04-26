const asyncHandler = require('express-async-handler');
const Vehicle = require('../models/Vehicle');

// Whitelist of fields allowed from request body
const ALLOWED_CREATE = ['vehicleNumber', 'type', 'model', 'capacity', 'mileage', 'status', 'lastServiceDate', 'currentLocation'];
const ALLOWED_UPDATE = ['type', 'model', 'capacity', 'mileage', 'status', 'lastServiceDate', 'currentLocation'];

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

// @desc    List vehicles
// @route   GET /api/vehicles
// @access  Private
const listVehicles = asyncHandler(async (req, res) => {
  const { status, type, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type)   filter.type = type;
  if (q)      filter.vehicleNumber = { $regex: q, $options: 'i' };

  const vehicles = await Vehicle.find(filter)
    .select('-createdBy -__v')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: vehicles.length, data: vehicles });
});

// @desc    Get vehicle by id
// @route   GET /api/vehicles/:id
// @access  Private
const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).select('-__v');
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }
  res.json({ success: true, data: vehicle });
});

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Admin, Manager
const createVehicle = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_CREATE);
  data.createdBy = req.user._id;

  const vehicle = await Vehicle.create(data);
  res.status(201).json({ success: true, data: vehicle });
});

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Admin, Manager
const updateVehicle = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_UPDATE);

  const vehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    data,
    { new: true, runValidators: true }
  ).select('-__v');

  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }
  res.json({ success: true, data: vehicle });
});

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Admin
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }

  // Prevent deleting a vehicle that is currently active
  if (vehicle.status === 'active') {
    res.status(400);
    throw new Error('Cannot delete a vehicle that is currently on a trip');
  }

  await vehicle.deleteOne();
  res.json({ success: true, message: 'Vehicle removed successfully' });
});

module.exports = { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };