require('dotenv').config();
const { connectDB } = require('./lib/db');

async function main() {
  const db = await connectDB();
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const usersCount = await db.collection('users').countDocuments();
  console.log('Count in users (Express/Sync):', usersCount);

  const betterUsersCount = await db.collection('user').countDocuments();
  console.log('Count in user (BetterAuth):', betterUsersCount);

  const adminInUsers = await db.collection('users').find({}).toArray();
  console.log('Users in users collection:');
  adminInUsers.forEach(u => console.log(`- ${u.email} (Role: ${u.role}, Provider: ${u.provider})`));

  if (collections.some(c => c.name === 'user')) {
    const adminInBetter = await db.collection('user').find({}).toArray();
    console.log('Users in user (BetterAuth) collection:');
    adminInBetter.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
    
    console.log('\n--- Detail for niloy@example.com in user collection ---');
    const uDetail = await db.collection('user').findOne({ email: 'niloy@example.com' });
    console.log(uDetail);

    console.log('\n--- Detail for niloy@example.com in account collection ---');
    if (collections.some(c => c.name === 'account')) {
      const accDetails = await db.collection('account').find({}).toArray();
      console.log(accDetails);
    }
  }

  process.exit(0);
}

main().catch(console.error);
