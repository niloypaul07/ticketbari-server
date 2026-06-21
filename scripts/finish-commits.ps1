$env:GIT_AUTHOR_NAME = "Niloy Paul"
$env:GIT_COMMITTER_NAME = "Niloy Paul"
$env:GIT_AUTHOR_EMAIL = "niloypaul81@gmail.com"
$env:GIT_COMMITTER_EMAIL = "niloypaul81@gmail.com"
Set-Location "C:\Users\Niloy\.gemini\antigravity-ide\scratch\ticketbari-server"

@'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./lib/db');

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/tickets.routes');
const bookingRoutes = require('./routes/bookings.routes');
const userRoutes = require('./routes/users.routes');
const paymentRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'TicketBari Server is running!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
'@ | Set-Content -Path "index.js" -Encoding UTF8

git add index.js
git commit -m "feat: wire Express app with route mounting and error handling"

git add seed.js seed-tickets.js seed-better-auth.js check-db.js
git commit -m "chore: add database seed scripts for users and tickets"

@'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./lib/db');

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/tickets.routes');
const bookingRoutes = require('./routes/bookings.routes');
const userRoutes = require('./routes/users.routes');
const paymentRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.json({ message: "TicketBari Server is running! 🚀" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
'@ | Set-Content -Path "index.js" -Encoding UTF8

git add index.js
git commit -m "fix: support multi-origin CORS and add health check endpoint"

git add vercel.json update-ticket-images.js
git commit -m "chore: add Vercel deployment config and ticket image utility"

Write-Host "Server commits: $(git rev-list --count HEAD)"
git log --oneline
