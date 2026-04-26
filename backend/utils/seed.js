require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Admin user
    const adminEmail = 'admin@stms.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'STMS Admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin',
        phone: '+910000000000',
      });
      console.log(`✅ Admin created: ${adminEmail} / Admin@123`);
    } else {
      console.log('ℹ️  Admin already exists');
    }

    // Manager user
    const managerEmail = 'manager@stms.com';
    if (!(await User.findOne({ email: managerEmail }))) {
      await User.create({
        name: 'Sample Manager',
        email: managerEmail,
        password: 'Manager@123',
        role: 'manager',
      });
      console.log(`✅ Manager created: ${managerEmail} / Manager@123`);
    }

    // Sample vehicles
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      await Vehicle.insertMany([
        { vehicleNumber: 'OD02AB1234', type: 'truck', model: 'Tata LPT', capacity: 5000, mileage: 8, status: 'idle' },
        { vehicleNumber: 'OD02CD5678', type: 'van', model: 'Eicher Pro', capacity: 2000, mileage: 12, status: 'idle' },
        { vehicleNumber: 'OD02EF9012', type: 'mini_truck', model: 'Ashok Leyland Dost', capacity: 1000, mileage: 15, status: 'idle' },
        { vehicleNumber: 'OD02GH3456', type: 'container', model: 'Bharat Benz', capacity: 10000, mileage: 6, status: 'maintenance' },
      ]);
      console.log('✅ Sample vehicles created');
    }

    // Sample drivers
    const driverCount = await Driver.countDocuments();
    if (driverCount === 0) {
      await Driver.insertMany([
        { name: 'Ramesh Kumar', phone: '+919876543210', licenseNumber: 'OD0120230001', experienceYears: 5, status: 'available' },
        { name: 'Suresh Patra', phone: '+919876543211', licenseNumber: 'OD0120230002', experienceYears: 8, status: 'available' },
        { name: 'Mohan Das', phone: '+919876543212', licenseNumber: 'OD0120230003', experienceYears: 3, status: 'available' },
      ]);
      console.log('✅ Sample drivers created');
    }

    console.log('🎉 Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();
