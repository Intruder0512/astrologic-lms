const mongoose = require('mongoose');

const DEFAULT_DB_NAME = 'astrologic_lms';
const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;

// Fail fast instead of silently queuing operations for up to 10s (Mongoose's
// default buffering behavior) when the DB is down - paired with the
// requireDb middleware, this means requests get a clear 503 immediately
// instead of hanging.
mongoose.set('bufferCommands', false);

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

let retryDelay = INITIAL_RETRY_DELAY_MS;
let retryTimer = null;
let initialConnectAttempted = false;

const scheduleRetry = () => {
  clearTimeout(retryTimer);
  console.log(`Retrying MongoDB connection in ${retryDelay / 1000}s...`);
  retryTimer = setTimeout(attemptConnect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
};

const attemptConnect = async () => {
  const rawUri = getMongoUri();

  if (!rawUri) {
    console.error(
      'No MongoDB connection string found. Checked MONGODB_URI, MONGO_URI, ' +
      'DATABASE_URL, MONGODB_CONNECTION_STRING, MONGO_URL - none are set. ' +
      'Server will keep running and retrying, but all database-backed routes ' +
      'will return 503 until a connection string is configured.'
    );
    scheduleRetry();
    return;
  }

  const uri = ensureDbName(rawUri);
  if (uri !== rawUri && !initialConnectAttempted) {
    console.log(`Connection string had no database name - using "${DEFAULT_DB_NAME}"`);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    retryDelay = INITIAL_RETRY_DELAY_MS; // reset backoff after a successful connect
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    scheduleRetry();
  } finally {
    initialConnectAttempted = true;
  }
};

// Once initially connected, the MongoDB driver has its own reconnection
// logic for transient network issues - these listeners just log state
// changes so it's visible in runtime logs, they don't trigger extra retries.
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected - driver will attempt to reconnect automatically');
});
mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Fire-and-forget: does NOT block server startup and never calls
// process.exit(). The app starts listening immediately regardless of DB
// status, and requireDb middleware protects routes that need the database.
const connectDB = () => {
  attemptConnect();
};

const isDbConnected = () => mongoose.connection.readyState === 1;

// For scripts that need to wait for an actual connection before running
// (seed scripts, one-off maintenance tasks) - NOT used by server.js, which
// deliberately does not wait so the HTTP server can start listening
// immediately regardless of database status.
const waitForConnection = (timeoutMs = 20000) => {
  return new Promise((resolve, reject) => {
    if (isDbConnected()) return resolve();

    const timer = setTimeout(() => {
      mongoose.connection.off('connected', onConnected);
      reject(new Error(`Timed out waiting for MongoDB connection after ${timeoutMs}ms`));
    }, timeoutMs);

    const onConnected = () => {
      clearTimeout(timer);
      resolve();
    };
    mongoose.connection.once('connected', onConnected);
  });
};

module.exports = { connectDB, isDbConnected, waitForConnection };
