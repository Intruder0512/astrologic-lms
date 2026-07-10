const mongoose = require('mongoose');

const DEFAULT_DB_NAME = 'astrologic_lms';

// Hostinger's MongoDB Atlas connector auto-injects the connection string as an
// environment variable once linked in the dashboard, but the exact variable
// name isn't documented, so we check the common conventions in priority order.
const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_CONNECTION_STRING ||
    process.env.MONGO_URL
  );
};

// Atlas connection strings copy/pasted from the UI (and Hostinger's
// auto-injected value) often omit the database name, e.g.
// "mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?appName=Cluster0"
// Without a name, Mongoose silently connects to a database called "test".
// This inserts DEFAULT_DB_NAME if the URI doesn't already specify one.
const ensureDbName = (uri) => {
  const [base, query] = uri.split('?');
  const afterProtocol = base.split('://')[1] || '';
  const hostAndPath = afterProtocol.split('@').pop(); // strip credentials
  const hasDbName = hostAndPath.includes('/') && hostAndPath.split('/')[1]?.length > 0;

  if (hasDbName) return uri;

  const separator = base.endsWith('/') ? '' : '/';
  const newBase = `${base}${separator}${DEFAULT_DB_NAME}`;
  return query ? `${newBase}?${query}` : newBase;
};

const connectDB = async () => {
  const rawUri = getMongoUri();

  if (!rawUri) {
    console.error(
      'No MongoDB connection string found. Checked MONGODB_URI, MONGO_URI, ' +
      'DATABASE_URL, MONGODB_CONNECTION_STRING, MONGO_URL - none are set.'
    );
    process.exit(1);
  }

  const uri = ensureDbName(rawUri);
  if (uri !== rawUri) {
    console.log(`Connection string had no database name - using "${DEFAULT_DB_NAME}"`);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
