require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, getDB } = require('./lib/db');

const SEED_USERS = [
  {
    name: 'TicketBari Admin',
    email: 'admin@ticketbari.com',
    password: 'Admin@123456',
    role: 'admin',
  },
  {
    name: 'TicketBari Vendor',
    email: 'vendor@ticketbari.com',
    password: 'Vendor@123456',
    role: 'vendor',
  },
];

async function seed() {
  await connectDB();
  const db = getDB();

  for (const user of SEED_USERS) {
    const existing = await db.collection('users').findOne({ email: user.email });
    if (existing) {
      console.log(`⏭️  ${user.email} already exists`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 12);
    await db.collection('users').insertOne({
      name: user.name,
      email: user.email,
      passwordHash,
      photo: '',
      role: user.role,
      isFraud: false,
      provider: 'credentials',
      createdAt: new Date(),
    });
    console.log(`✅ Created ${user.role}: ${user.email}`);
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
