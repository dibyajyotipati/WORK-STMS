const express = require('express');
const router = express.Router();
const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(listDrivers)
  .post(authorize('admin', 'manager'), createDriver);

router
  .route('/:id')
  .get(getDriver)
  .put(authorize('admin', 'manager'), updateDriver)
  .delete(authorize('admin'), deleteDriver);

module.exports = router;
