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
  res.json({ message: "TicketBari Server is running! ðŸš€" });
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

// For local development
if (process.env.VERCEL !== '1') {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`ðŸš€ Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('â Œ Failed to connect to MongoDB:', err);
      process.exit(1);
    });
} else {
  // Pre-connect DB for serverless (warm start)
  connectDB().catch(console.error);
}

// Export for Vercel serverless
module.exports = app;
