const express = require('express');
const router = express.Router();
const {
  listShipments,
  getShipment,
  createShipment,
  updateShipment,
  updateStatus,
  assignResources,
  deleteShipment,
} = require('../controllers/shipmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Admin + Manager: full CRUD. Driver: read-only (filtered in controller)
router.route('/')
  .get(listShipments)
  .post(authorize('admin', 'manager'), createShipment);

router.route('/:id')
  .get(getShipment)
  .put(authorize('admin', 'manager'), updateShipment)
  .delete(authorize('admin'), deleteShipment);

// Status update: manager can mark in_transit/delivered; admin can do all
router.put('/:id/status', authorize('admin', 'manager'), updateStatus);
router.put('/:id/assign', authorize('admin', 'manager'), assignResources);

module.exports = router;