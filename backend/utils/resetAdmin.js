require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const reset = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  await User.deleteOne({ email: 'admin@stms.com' });
  console.log('Old admin deleted');

  await User.create({
    name: 'STMS Admin',
    email: 'admin@stms.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '+910000000000',
  });
  console.log('New admin created: admin@stms.com / Admin@123');

  process.exit(0);
};

reset();