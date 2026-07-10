const mongoose = require('mongoose');

// Hostinger's MongoDB Atlas connector auto-injects the connection string as an
// environment variable once linked in the dashboard, but the exact variable
// name isn't documented, so we check the common conventions in priority order.
const getMongoUri = () => {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_CONNECTION_STRING ||
    process.env.MONGO_URL
  );
};

const connectDB = async () => {
  const uri = getMongoUri();

  if (!uri) {
    console.error(
      'No MongoDB connection string found. Checked MONGO_URI, MONGODB_URI, ' +
      'DATABASE_URL, MONGODB_CONNECTION_STRING, MONGO_URL - none are set.'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
