// Auto-provisions the first admin account on server startup, since Hostinger
// deployments typically don't give shell access to run `npm run seed`
// manually. Only runs if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set
// as environment variables, and only if no admin account exists yet - safe
// to leave these env vars set permanently, it won't create duplicates or
// touch an existing admin.
const User = require('../models/User');

const autoSeedAdmin = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) return;

    await User.create({
      name: 'ICAS Admin',
      email,
      password,
      role: 'admin',
      phone: '0000000000',
    });
    console.log(`Auto-seeded admin account: ${email}`);
  } catch (err) {
    console.error(`Auto-seed admin failed: ${err.message}`);
  }
};

module.exports = autoSeedAdmin;
