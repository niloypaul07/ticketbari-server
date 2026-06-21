const dns = require('dns');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Windows/router DNS often fails SRV lookups for mongodb+srv:// — use public DNS
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let db = null;
let client = null;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env');

  if (uri.includes('mongodb+srv://') && !uri.includes('retryWrites=')) {
    const joiner = uri.includes('?') ? '&' : '?';
    return `${uri}${joiner}retryWrites=true&w=majority`;
  }
  return uri;
}

async function connectDB() {
  if (db) return db;

  const uri = getMongoUri();

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    family: 4,
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  });

  await client.connect();
  db = client.db('ticketbari');
  console.log('✅ Connected to MongoDB Atlas');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialised. Call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB };
