const asyncHandler = require('express-async-handler');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// @desc    Dashboard stats
// @route   GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const isDriver = req.user.role === 'driver';

  // Drivers get a lightweight personal view
  if (isDriver) {
    const driverProfileId = req.user.driverProfileId;
    const [myActive, myDelivered, myTotal] = await Promise.all([
      Shipment.countDocuments({ driverId: driverProfileId, status: { $in: ['assigned', 'in_transit'] } }),
      Shipment.countDocuments({ driverId: driverProfileId, status: 'delivered' }),
      Shipment.countDocuments({ driverId: driverProfileId }),
    ]);
    const recentShipments = await Shipment.find({ driverId: driverProfileId })
      .sort({ createdAt: -1 }).limit(5)
      .populate('vehicleId', 'vehicleNumber');

    return res.json({
      role: 'driver',
      shipments: { total: myTotal, active: myActive, delivered: myDelivered, byStatus: {} },
      recentShipments,
    });
  }

  const [
    totalShipments,
    activeShipments,
    deliveredShipments,
    totalVehicles,
    activeVehicles,
    totalDrivers,
    availableDrivers,
    revenueAgg,
    fuelAgg,
    statusBreakdown,
    recentShipments,
  ] = await Promise.all([
    Shipment.countDocuments(),
    Shipment.countDocuments({ status: { $in: ['booked', 'assigned', 'in_transit'] } }),
    Shipment.countDocuments({ status: 'delivered' }),
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'active' }),
    Driver.countDocuments(),
    Driver.countDocuments({ status: 'available' }),
    Shipment.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$fareAmount' } } },
    ]),
    Shipment.aggregate([
      { $group: { _id: null, total: { $sum: '$fuelCostEstimate' } } },
    ]),
    Shipment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Shipment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vehicleId', 'vehicleNumber')
      .populate('driverId', 'name'),
  ]);

  res.json({
    role: req.user.role,
    shipments: {
      total: totalShipments,
      active: activeShipments,
      delivered: deliveredShipments,
      byStatus: statusBreakdown.reduce(
        (acc, s) => ({ ...acc, [s._id]: s.count }),
        {}
      ),
    },
    vehicles: {
      total: totalVehicles,
      active: activeVehicles,
      idle: totalVehicles - activeVehicles,
    },
    drivers: {
      total: totalDrivers,
      available: availableDrivers,
    },
    finance: {
      revenue: revenueAgg[0]?.total || 0,
      fuelCost: fuelAgg[0]?.total || 0,
    },
    recentShipments,
  });
});

module.exports = { getStats };