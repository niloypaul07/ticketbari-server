require('dotenv').config();
const { connectDB } = require('./lib/db');

// Verified transport-specific image URLs (tested working)
const IMAGES = {
  Bus: [
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',   // coach bus
    'https://images.unsplash.com/photo-1609592806621-78e9dbf4c5c1?w=800&q=80', // night bus
    'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=800&q=80', // bus road
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80', // city bus front
    'https://images.unsplash.com/photo-1625571018822-72bf461ca9bc?w=800&q=80', // red bus
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', // highway bus
  ],
  Train: [
    'https://images.unsplash.com/photo-1474487548417-781cb6d646df?w=800&q=80', // train track
    'https://images.unsplash.com/photo-1553267751-1c148a7280a1?w=800&q=80',    // train station
    'https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?w=800&q=80', // express train
  ],
  Launch: [
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80', // ferry boat
    'https://images.unsplash.com/photo-1534802046520-4f27db7f3ae5?w=800&q=80', // river cruise
  ],
  Plane: [
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80', // plane sky
    'https://images.unsplash.com/photo-1490430657723-4d607dc1394b?w=800&q=80', // plane wing
  ],
};

function getImage(transportType, index) {
  const imgs = IMAGES[transportType] || IMAGES['Bus'];
  return imgs[index % imgs.length];
}

async function fixImages() {
  const db = await connectDB();
  const tickets = await db.collection('tickets').find({}).sort({ createdAt: 1 }).toArray();
  console.log(`Found ${tickets.length} tickets...\n`);

  const typeCounts = {};
  let updated = 0;

  for (const ticket of tickets) {
    const type = ticket.transportType || 'Bus';
    typeCounts[type] = typeCounts[type] || 0;
    const imageUrl = getImage(type, typeCounts[type]);
    typeCounts[type]++;

    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      { $set: { image: imageUrl } }
    );
    updated++;
    console.log(`✅ [${updated}] ${ticket.title} (${type})`);
  }

  console.log(`\n🎉 Fixed images for ${updated} tickets!`);
  process.exit(0);
}

fixImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
