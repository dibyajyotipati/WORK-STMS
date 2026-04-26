const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Valid status transitions
const VALID_TRANSITIONS = {
  booked: ['assigned', 'cancelled'],
  assigned: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// @desc    List shipments
// @route   GET /api/shipments
const listShipments = asyncHandler(async (req, res) => {
  const { status, q, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { trackingId: { $regex: q, $options: 'i' } },
      { customerName: { $regex: q, $options: 'i' } },
    ];
  }

  // Drivers can only see shipments assigned to them
  if (req.user.role === 'driver') {
    filter.driverId = req.user.driverProfileId || null;
  }

  const shipments = await Shipment.find(filter)
    .populate('vehicleId', 'vehicleNumber type')
    .populate('driverId', 'name phone')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json(shipments);
});

// @desc    Get shipment
// @route   GET /api/shipments/:id
const getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('vehicleId')
    .populate('driverId');
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }
  res.json(shipment);
});

// Helper: fetch AI estimates
const fetchAIEstimates = async ({ source, destination, vehicleType, mileage, weightKg }) => {
  const result = { distanceKm: 0, durationMin: 0, fuelLitres: 0, fuelCost: 0 };
  try {
    const routeRes = await axios.post(
      `${AI_URL}/route/estimate`,
      { source, destination },
      { timeout: 7000 }
    );
    result.distanceKm = routeRes.data.distance_km || 0;
    result.durationMin = routeRes.data.duration_min || 0;
  } catch (e) {
    console.warn('AI route estimate failed:', e.message);
  }

  if (result.distanceKm > 0) {
    try {
      const fuelRes = await axios.post(
        `${AI_URL}/predict/fuel`,
        {
          distance_km: result.distanceKm,
          vehicle_type: vehicleType || 'truck',
          mileage_kmpl: mileage || 10,
          load_kg: weightKg || 0,
        },
        { timeout: 7000 }
      );
      result.fuelLitres = fuelRes.data.fuel_litres || 0;
      result.fuelCost = fuelRes.data.fuel_cost || 0;
    } catch (e) {
      console.warn('AI fuel prediction failed:', e.message);
      // Fallback
      result.fuelLitres = result.distanceKm / (mileage || 10);
      result.fuelCost = result.fuelLitres * 100;
    }
  }

  return result;
};

// @desc    Create shipment (with AI estimates)
// @route   POST /api/shipments
const createShipment = asyncHandler(async (req, res) => {
  const { source, destination, weightKg, vehicleId } = req.body;

  if (!source || !destination) {
    res.status(400);
    throw new Error('Source and destination are required');
  }

  // If vehicle specified, get its details for better fuel estimate
  let vehicleType = 'truck';
  let mileage = 10;
  if (vehicleId) {
    const v = await Vehicle.findById(vehicleId);
    if (v) {
      vehicleType = v.type;
      mileage = v.mileage;
    }
  }

  const estimates = await fetchAIEstimates({
    source,
    destination,
    vehicleType,
    mileage,
    weightKg,
  });

  const shipment = await Shipment.create({
    ...req.body,
    distanceKm: estimates.distanceKm,
    durationMin: estimates.durationMin,
    fuelEstimateLitres: estimates.fuelLitres,
    fuelCostEstimate: estimates.fuelCost,
    status: vehicleId && req.body.driverId ? 'assigned' : 'booked',
    createdBy: req.user._id,
  });

  // If assigned, update driver & vehicle status
  if (shipment.status === 'assigned') {
    if (shipment.vehicleId) {
      await Vehicle.findByIdAndUpdate(shipment.vehicleId, { status: 'active' });
    }
    if (shipment.driverId) {
      await Driver.findByIdAndUpdate(shipment.driverId, { status: 'on_trip' });
    }
  }

  res.status(201).json(shipment);
});

// @desc    Update shipment
// @route   PUT /api/shipments/:id
const updateShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  // Prevent editing delivered / cancelled
  if (['delivered', 'cancelled'].includes(shipment.status)) {
    res.status(400);
    throw new Error(`Cannot update a ${shipment.status} shipment`);
  }

  Object.assign(shipment, req.body);
  await shipment.save();
  res.json(shipment);
});

// @desc    Update shipment status (lifecycle)
// @route   PUT /api/shipments/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }

  const allowed = VALID_TRANSITIONS[shipment.status] || [];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status transition: ${shipment.status} → ${status}`
    );
  }

  shipment.status = status;

  if (status === 'in_transit' && !shipment.startTime) {
    shipment.startTime = new Date();
  }
  if (status === 'delivered') {
    shipment.endTime = new Date();
    // Free up vehicle + driver
    if (shipment.vehicleId) {
      await Vehicle.findByIdAndUpdate(shipment.vehicleId, { status: 'idle' });
    }
    if (shipment.driverId) {
      await Driver.findByIdAndUpdate(shipment.driverId, { status: 'available' });
    }
  }
  if (status === 'cancelled') {
    if (shipment.vehicleId) {
      await Vehicle.findByIdAndUpdate(shipment.vehicleId, { status: 'idle' });
    }
    if (shipment.driverId) {
      await Driver.findByIdAndUpdate(shipment.driverId, { status: 'available' });
    }
  }

  await shipment.save();
  res.json(shipment);
});

// @desc    Assign vehicle + driver to shipment
// @route   PUT /api/shipments/:id/assign
const assignResources = asyncHandler(async (req, res) => {
  const { vehicleId, driverId } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }
  if (shipment.status !== 'booked') {
    res.status(400);
    throw new Error('Only booked shipments can be assigned');
  }

  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }
    if (vehicle.status !== 'idle') {
      res.status(400);
      throw new Error(`Vehicle is ${vehicle.status}, not available`);
    }
    shipment.vehicleId = vehicleId;
    vehicle.status = 'active';
    await vehicle.save();
  }

  if (driverId) {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      res.status(404);
      throw new Error('Driver not found');
    }
    if (driver.status !== 'available') {
      res.status(400);
      throw new Error(`Driver is ${driver.status}, not available`);
    }
    shipment.driverId = driverId;
    driver.status = 'on_trip';
    await driver.save();
  }

  shipment.status = 'assigned';
  await shipment.save();

  res.json(shipment);
});

// @desc    Delete shipment
// @route   DELETE /api/shipments/:id
const deleteShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findByIdAndDelete(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Shipment not found');
  }
  res.json({ message: 'Shipment removed' });
});

module.exports = {
  listShipments,
  getShipment,
  createShipment,
  updateShipment,
  updateStatus,
  assignResources,
  deleteShipment,
};