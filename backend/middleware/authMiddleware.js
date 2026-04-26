const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect: verify JWT and load user onto req.user
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  // Let JWT errors bubble up to errorMiddleware
  // which will distinguish expired vs invalid tokens
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    res.status(401);
    throw new Error('User no longer exists');
  }

  if (!user.active) {
    res.status(401);
    throw new Error('Your account has been deactivated. Contact admin.');
  }

  req.user = user;
  next();
});

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user?.role}`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };