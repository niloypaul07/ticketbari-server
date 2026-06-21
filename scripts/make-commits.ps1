$ErrorActionPreference = "Stop"
$env:GIT_AUTHOR_NAME = "Niloy Paul"
$env:GIT_COMMITTER_NAME = "Niloy Paul"
$env:GIT_AUTHOR_EMAIL = "niloypaul81@gmail.com"
$env:GIT_COMMITTER_EMAIL = "niloypaul81@gmail.com"

Set-Location "C:\Users\Niloy\.gemini\antigravity-ide\scratch\ticketbari-server"

function Commit-Files($message, [string[]]$files) {
    git add @files
    git commit -m $message
}

# Commit 1
Commit-Files "chore: initialize Express project with dependencies and gitignore" @(
    "package.json", "package-lock.json", ".gitignore", "README.md"
)

# Commit 2
Commit-Files "feat: add MongoDB connection helper" @("lib/db.js")

# Commit 3
Commit-Files "feat: add User model with role support" @("models/User.js")

# Commit 4
Commit-Files "feat: add JWT verification middleware for auth roles" @(
    "middleware/verifyToken.js", "middleware/verifyAdmin.js", "middleware/verifyVendor.js"
)

# Commit 5
Commit-Files "feat: implement auth routes for register, login, and sync" @("routes/auth.routes.js")

# Commit 6
Commit-Files "feat: implement ticket CRUD and featured/advertise endpoints" @("routes/tickets.routes.js")

# Commit 7
Commit-Files "feat: implement booking request and status routes" @("routes/bookings.routes.js")

# Commit 8
Commit-Files "feat: implement admin user management routes" @("routes/users.routes.js")

# Commit 9
Commit-Files "feat: implement Stripe payment intent routes" @("routes/payments.routes.js")

# Commit 10 - initial index.js (simple CORS, no /api/health)
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

Commit-Files "feat: wire Express app with route mounting and error handling" @("index.js")

# Commit 11
Commit-Files "chore: add database seed scripts for users and tickets" @(
    "seed.js", "seed-tickets.js", "seed-better-auth.js", "check-db.js"
)

# Commit 12 - restore full index.js with multi-origin CORS and health check
Copy-Item -Path "index.js.final.bak" -Destination "index.js" -Force -ErrorAction SilentlyContinue
if (-not (Test-Path "index.js.final.bak")) {
    # Write final version directly
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
}

Commit-Files "fix: support multi-origin CORS and add health check endpoint" @("index.js")

# Commit 13
Commit-Files "chore: add Vercel deployment config and ticket image utility" @(
    "vercel.json", "update-ticket-images.js"
)

Write-Host "Server commits: $(git rev-list --count HEAD)"
git log --oneline
