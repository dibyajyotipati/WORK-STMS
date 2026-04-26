const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');

// Whitelist of fields allowed from request body
const ALLOWED_CREATE = ['name', 'phone', 'email', 'licenseNumber', 'licenseExpiry', 'experienceYears', 'status'];
const ALLOWED_UPDATE = ['name', 'phone', 'email', 'licenseExpiry', 'experienceYears', 'status'];

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

// @desc    List drivers
// @route   GET /api/drivers
// @access  Private
const listDrivers = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q)      filter.name = { $regex: q, $options: 'i' };

  const drivers = await Driver.find(filter)
    .select('-userId -__v')       // hide internal linking fields
    .sort({ createdAt: -1 });

  res.json({ success: true, count: drivers.length, data: drivers });
});

// @desc    Get driver
// @route   GET /api/drivers/:id
// @access  Private
const getDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id).select('-__v');
  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }
  res.json({ success: true, data: driver });
});

// @desc    Create driver
// @route   POST /api/drivers
// @access  Admin, Manager
const createDriver = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_CREATE);
  const driver = await Driver.create(data);
  res.status(201).json({ success: true, data: driver });
});

// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Admin, Manager
const updateDriver = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_UPDATE);

  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    data,
    { new: true, runValidators: true }
  ).select('-__v');

  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }
  res.json({ success: true, data: driver });
});

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Admin
const deleteDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }

  // Prevent deleting a driver who is currently on a trip
  if (driver.status === 'on_trip') {
    res.status(400);
    throw new Error('Cannot delete a driver who is currently on a trip');
  }

  await driver.deleteOne();
  res.json({ success: true, message: 'Driver removed successfully' });
});

module.exports = { listDrivers, getDriver, createDriver, updateDriver, deleteDriver };