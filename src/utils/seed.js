require('dotenv').config();
const { connectDB, waitForConnection } = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  connectDB();
  await waitForConnection();

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    process.exit(0);
  }

  await User.create({
    name: 'ICAS AstroLogic Admin',
    email,
    password,
    role: 'admin',
    phone: '0000000000',
  });

  console.log(`Admin user created: ${email}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
