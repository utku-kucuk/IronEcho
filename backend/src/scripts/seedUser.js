const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ironecho';

async function seedUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@ironecho.com' });
    if (existingUser) {
      console.log('ℹ️  Test user already exists');
      console.log('Email: test@ironecho.com');
      console.log('Password: test123');
      await mongoose.connection.close();
      return;
    }

    // Create test user
    const testUser = new User({
      email: 'test@ironecho.com',
      password: 'test123', // Will be hashed by pre-save hook
      profile: {
        gender: 'male',
        units: 'metric',
        language: 'en'
      },
      role: 'user'
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST USER CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Email:    test@ironecho.com');
    console.log('  Password: test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedUser();

