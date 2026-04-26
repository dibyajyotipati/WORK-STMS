const express = require('express');
const router = express.Router();
const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(listVehicles)
  .post(authorize('admin', 'manager'), createVehicle);

router
  .route('/:id')
  .get(getVehicle)
  .put(authorize('admin', 'manager'), updateVehicle)
  .delete(authorize('admin'), deleteVehicle);

module.exports = router;
