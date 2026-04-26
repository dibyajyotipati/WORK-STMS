const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Create a user account (no public self-registration)
// @route   POST /api/auth/register
// @access  Admin → can create admin/manager accounts
//          Manager → can only create driver accounts
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(', '));
  }

  const { name, email, password, phone, role, driverProfileId } = req.body;

  if (req.user.role === 'manager' && role !== 'driver') {
    res.status(403);
    throw new Error('Managers can only create driver accounts');
  }

  // Admin can only create manager or driver accounts — not another admin
  if (req.user.role === 'admin' && role === 'admin') {
    res.status(403);
    throw new Error('Cannot create another admin account');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'manager',
    phone,
    driverProfileId: driverProfileId || null,
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    driverProfileId: user.driverProfileId,
  });
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.active) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const match = await user.matchPassword(password);
  if (!match) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    driverProfileId: user.driverProfileId,
    token: generateToken(user._id, user.role),
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @desc    List all users
// @route   GET /api/auth/users
// @access  Admin only
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select('-password');
  res.json(users);
});

// @desc    Change a user's role
// @route   PUT /api/auth/users/:id/role
// @access  Admin only
const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'manager', 'driver'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role. Must be admin, manager, or driver');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
    res.status(400);
    throw new Error('You cannot change your own role');
  }

  user.role = role;
  await user.save();

  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

// @desc    Toggle user active/inactive
// @route   PUT /api/auth/users/:id/active
// @access  Admin only
const toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot deactivate yourself');
  }
  user.active = !user.active;
  await user.save();
  res.json({ _id: user._id, name: user.name, active: user.active });
});

// @desc    Delete a user permanently (when they leave the company)
// @route   DELETE /api/auth/users/:id
// @access  Admin only
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Admin cannot delete themselves
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    message: `User "${user.name}" has been permanently removed`,
    _id: user._id,
  });
});

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').optional().isIn(['admin', 'manager', 'driver']).withMessage('Invalid role'),
];

module.exports = { register, login, getMe, listUsers, changeRole, toggleActive, deleteUser, registerValidation };