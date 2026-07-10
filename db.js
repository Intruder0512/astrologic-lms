// This file exists to satisfy Hostinger's "Connect from your Web App" wizard
// for MongoDB Atlas, which asks for a db.js file at the project root.
//
// It is NOT used by the actual application - the real Mongoose connection
// logic lives in src/config/db.js and is loaded by src/server.js. This file
// is a lightweight, standalone way to verify Atlas connectivity independent
// of the main app if ever needed (e.g. `node db.js` from the project root).
//
// It checks the same set of possible env var names as src/config/db.js,
// since Hostinger's exact variable naming for the auto-injected connection
// string isn't documented.

const { MongoClient } = require('mongodb');

const uri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGODB_CONNECTION_STRING ||
  process.env.MONGO_URL;

async function verifyConnection() {
  if (!uri) {
    console.error('No MongoDB connection string found in environment variables.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    console.log('MongoDB Atlas connection verified successfully.');
  } catch (err) {
    console.error('MongoDB Atlas connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  verifyConnection();
}

module.exports = { verifyConnection };
