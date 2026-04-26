const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  listUsers,
  changeRole,
  toggleActive,
  deleteUser,
  registerValidation,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public
router.post('/login', login);

// Protected: Admin creates managers/admins; Manager creates drivers
router.post('/register', protect, authorize('admin', 'manager'), registerValidation, register);
router.get('/me', protect, getMe);

// Admin-only user management
router.get('/users', protect, authorize('admin'), listUsers);
router.put('/users/:id/role', protect, authorize('admin'), changeRole);
router.put('/users/:id/active', protect, authorize('admin'), toggleActive);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;