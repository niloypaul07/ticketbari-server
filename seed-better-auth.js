require('dotenv').config();
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { connectDB } = require('./lib/db');
const { hashPassword } = require('../ticketbari-client/node_modules/@better-auth/utils/dist/password.cjs');

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
  const db = await connectDB();

  for (const user of SEED_USERS) {
    const emailLower = user.email.toLowerCase();

    // 1. Clean up existing records in users (Express), user (BetterAuth), account (BetterAuth)
    await db.collection('users').deleteOne({ email: emailLower });
    
    const existingBetterUser = await db.collection('user').findOne({ email: emailLower });
    if (existingBetterUser) {
      await db.collection('account').deleteMany({ userId: existingBetterUser._id });
      await db.collection('user').deleteOne({ email: emailLower });
    }

    // 2. Generate same ObjectId for user
    const userId = new ObjectId();

    // 3. Hash passwords
    // BetterAuth hash (scrypt/pbkdf2 format)
    const betterAuthPasswordHash = await hashPassword(user.password);
    // Express/Bcrypt hash
    const bcryptPasswordHash = await bcrypt.hash(user.password, 12);

    const now = new Date();

    // 4. Insert into BetterAuth 'user' collection
    await db.collection('user').insertOne({
      _id: userId,
      name: user.name,
      email: emailLower,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      role: user.role,
      isFraud: false,
    });

    // 5. Insert into BetterAuth 'account' collection
    const accountId = new ObjectId();
    await db.collection('account').insertOne({
      _id: accountId,
      accountId: userId.toString(),
      providerId: 'credential',
      userId: userId,
      password: betterAuthPasswordHash,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Insert into Express 'users' collection
    await db.collection('users').insertOne({
      _id: userId,
      name: user.name,
      email: emailLower,
      passwordHash: bcryptPasswordHash,
      photo: '',
      role: user.role,
      isFraud: false,
      provider: 'credentials',
      createdAt: now,
    });

    console.log(`✅ Fully seeded ${user.role} (${user.email}) for both BetterAuth and Express!`);
  }

  console.log('\nSeed complete successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
