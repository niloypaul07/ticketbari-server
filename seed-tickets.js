require('dotenv').config();
const { connectDB } = require('./lib/db');

const TICKETS = [
  {
    title: 'Dhaka Express Night Coach',
    from: 'Dhaka', to: 'Chittagong',
    transportType: 'Bus', price: 650, quantity: 40,
    departureDateTime: new Date('2026-07-01T22:00:00'),
    perks: ['AC', 'WiFi', 'Charging Point'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Sundarban Express Train',
    from: 'Dhaka', to: 'Khulna',
    transportType: 'Train', price: 420, quantity: 60,
    departureDateTime: new Date('2026-07-02T07:30:00'),
    perks: ['AC', 'Breakfast', 'Recliner Seat'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Rocket Launch Barisal',
    from: 'Dhaka', to: 'Barisal',
    transportType: 'Launch', price: 350, quantity: 80,
    departureDateTime: new Date('2026-07-03T18:00:00'),
    perks: ['Food', 'WiFi'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Sylhet Shatabdi Express',
    from: 'Dhaka', to: 'Sylhet',
    transportType: 'Train', price: 380, quantity: 50,
    departureDateTime: new Date('2026-07-04T06:00:00'),
    perks: ['AC', 'Breakfast'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Rajshahi Royal Coach',
    from: 'Dhaka', to: 'Rajshahi',
    transportType: 'Bus', price: 580, quantity: 45,
    departureDateTime: new Date('2026-07-05T21:00:00'),
    perks: ['AC', 'Charging Point', 'Blanket & Pillow'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Cox\'s Bazar Beach Special',
    from: 'Chittagong', to: "Cox's Bazar",
    transportType: 'Bus', price: 280, quantity: 35,
    departureDateTime: new Date('2026-07-06T08:00:00'),
    perks: ['AC', 'WiFi', 'Snacks'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Biman Dhaka to Cox\'s Bazar',
    from: 'Dhaka', to: "Cox's Bazar",
    transportType: 'Plane', price: 4500, quantity: 120,
    departureDateTime: new Date('2026-07-07T10:00:00'),
    perks: ['AC', 'Breakfast', 'WiFi'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Mymensingh City Link',
    from: 'Dhaka', to: 'Mymensingh',
    transportType: 'Bus', price: 220, quantity: 40,
    departureDateTime: new Date('2026-07-08T09:00:00'),
    perks: ['AC'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Patuakhali River Cruise',
    from: 'Barisal', to: 'Patuakhali',
    transportType: 'Launch', price: 180, quantity: 100,
    departureDateTime: new Date('2026-07-09T14:00:00'),
    perks: ['Food', 'WiFi', 'Snacks'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Comilla Premium Express',
    from: 'Dhaka', to: 'Comilla',
    transportType: 'Bus', price: 250, quantity: 45,
    departureDateTime: new Date('2026-07-10T07:00:00'),
    perks: ['AC', 'Charging Point'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Jessore Intercity Train',
    from: 'Dhaka', to: 'Jessore',
    transportType: 'Train', price: 360, quantity: 55,
    departureDateTime: new Date('2026-07-11T08:30:00'),
    perks: ['AC', 'Breakfast', 'Recliner Seat', 'Blanket & Pillow'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
  {
    title: 'Rangpur Luxury Sleeper',
    from: 'Dhaka', to: 'Rangpur',
    transportType: 'Bus', price: 700, quantity: 30,
    departureDateTime: new Date('2026-07-12T22:30:00'),
    perks: ['AC', 'WiFi', 'Charging Point', 'Blanket & Pillow', 'Snacks'],
    image: 'https://i.ibb.co/4ZzQ2Qs/bus1.jpg',
  },
];

async function seedTickets() {
  const db = await connectDB();

  const vendor = await db.collection('users').findOne({ role: 'vendor' });
  if (!vendor) {
    console.error('❌ No vendor found. Run seed-better-auth.js first.');
    process.exit(1);
  }

  let inserted = 0;
  for (const t of TICKETS) {
    await db.collection('tickets').insertOne({
      ...t,
      vendorEmail: vendor.email,
      vendorName: vendor.name,
      verificationStatus: 'approved',
      isAdvertised: false,
      isHidden: false,
      createdAt: new Date(),
    });
    inserted++;
    console.log(`✅ [${inserted}] ${t.title}`);
  }

  console.log(`\n🎉 ${inserted} tickets seeded successfully!`);
  process.exit(0);
}

seedTickets().catch((err) => {
  console.error(err);
  process.exit(1);
});
