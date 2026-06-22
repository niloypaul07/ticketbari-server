# 🎫 TicketBari — Server

> RESTful API backend for the TicketBari transport ticket booking platform, built with **Express.js 5** and **MongoDB**.

**Live API:** [https://ticketbari-server-mauve.vercel.app](https://ticketbari-server-mauve.vercel.app)  
**Frontend:** [https://ticketbari-client-ivory.vercel.app](https://ticketbari-client-ivory.vercel.app)

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure token-based auth with 7-day expiry
- 👥 **Role-based Access Control** — `user`, `vendor`, `admin` roles
- 🎟️ **Ticket Management** — Full CRUD for vendors, approval workflow for admins
- 📦 **Booking System** — Seat availability checks, vendor accept/reject flow
- 💳 **Stripe Payments** — Checkout sessions + webhook handling
- 🚨 **Fraud Detection** — Admin can mark vendors as fraud (hides all their tickets)
- ☁️ **Serverless Ready** — Deployed on Vercel with per-request DB connection pooling

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 5 |
| Database | MongoDB (native driver) |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password Hashing | bcryptjs |
| Payments | Stripe |
| Environment | dotenv |
| Dev Server | nodemon |
| Deployment | Vercel (Serverless Functions) |

---

## 📁 Project Structure

```
ticketbari-server/
├── index.js                  # App entry point, middleware, route mounting
├── vercel.json               # Vercel serverless config
├── lib/
│   └── db.js                 # MongoDB connection (singleton + pooling)
├── middleware/
│   ├── verifyToken.js        # JWT verification middleware
│   ├── verifyAdmin.js        # Admin role guard
│   └── verifyVendor.js       # Vendor role guard
└── routes/
    ├── auth.routes.js        # Register, login, Better Auth sync
    ├── tickets.routes.js     # Ticket CRUD + admin controls
    ├── bookings.routes.js    # Booking creation + vendor management
    ├── users.routes.js       # User management (admin)
    └── payments.routes.js    # Stripe checkout + webhook
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)
- Stripe account (for payments)

### 1. Clone the repository

```bash
git clone https://github.com/niloypaul07/ticketbari-server.git
cd ticketbari-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ticketbari

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS — comma-separated list of allowed frontend origins
CLIENT_URL=http://localhost:3000,https://ticketbari-client-ivory.vercel.app

# Port (local dev only)
PORT=5000
```

### 4. Run the development server

```bash
npm run dev
```

Server starts at [http://localhost:5000](http://localhost:5000)

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start production server |
| `npm run seed` | Seed the database with sample data |

---

## 🔌 API Reference

Base URL: `https://ticketbari-server-mauve.vercel.app/api`

### 🔑 Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | ❌ | Register with email & password |
| `POST` | `/login` | ❌ | Login with email & password |
| `POST` | `/sync` | ❌ | Sync Better Auth session → Express JWT |
| `POST` | `/social-login` | ❌ | Social login sync (Google) |

**Register / Login response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "user", "photo": "..." }
}
```

---

### 🎟️ Tickets — `/api/tickets`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/` | ❌ | — | Browse approved tickets (search, filter, paginate) |
| `GET` | `/advertised` | ❌ | — | Up to 6 advertised tickets (homepage) |
| `GET` | `/latest` | ❌ | — | 8 latest tickets (homepage) |
| `GET` | `/:id` | ❌ | — | Single ticket details |
| `GET` | `/vendor` | ✅ | vendor | Vendor's own tickets |
| `GET` | `/vendor/revenue` | ✅ | vendor | Revenue stats + payment history |
| `GET` | `/admin/all` | ✅ | admin | All tickets (including pending/rejected) |
| `POST` | `/` | ✅ | vendor | Add a new ticket |
| `PATCH` | `/:id` | ✅ | vendor | Update own ticket |
| `DELETE` | `/:id` | ✅ | vendor | Delete own ticket |
| `PATCH` | `/:id/verify` | ✅ | admin | Approve or reject a ticket |
| `PATCH` | `/:id/advertise` | ✅ | admin | Toggle homepage advertisement |

**Query params for `GET /api/tickets`:**
```
?from=Dhaka&to=Chittagong&transportType=Bus&sortBy=price_asc&page=1&limit=9
```

---

### 📦 Bookings — `/api/bookings`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/` | ✅ | user | Book a ticket (validates availability) |
| `GET` | `/my` | ✅ | user | User's own booking history |
| `GET` | `/vendor` | ✅ | vendor | All booking requests for vendor's tickets |
| `PATCH` | `/:id/status` | ✅ | vendor | Accept or reject a booking |

**Book a ticket:**
```json
POST /api/bookings
{ "ticketId": "...", "quantity": 2 }
```

---

### 👥 Users — `/api/users`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/` | ✅ | admin | List all users |
| `GET` | `/me` | ✅ | any | Get own profile |
| `PATCH` | `/:id/role` | ✅ | admin | Change user role (`user` / `vendor` / `admin`) |
| `PATCH` | `/:id/fraud` | ✅ | admin | Mark vendor as fraud (hides all their tickets) |

---

### 💳 Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/create-checkout-session` | ✅ | Create Stripe checkout session |
| `POST` | `/webhook` | ❌ | Handle Stripe webhook events |
| `GET` | `/my-transactions` | ✅ | User's payment history |

---

## 🔒 Authentication

All protected routes require:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued by `/api/auth/login`, `/api/auth/register`, or `/api/auth/sync` and expire after **7 days**.

### Middleware Chain

```
Request → verifyToken → verifyAdmin/verifyVendor → Route Handler
```

| Middleware | Checks |
|------------|--------|
| `verifyToken` | Valid JWT in Authorization header |
| `verifyAdmin` | `req.user.role === 'admin'` |
| `verifyVendor` | `req.user.role === 'vendor'` |

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `CLIENT_URL` | ✅ | Comma-separated allowed CORS origins |
| `PORT` | ⚠️ | Local dev port (default: 5000) |

---

## 🌐 Deployment (Vercel)

This server is configured as a **Vercel Serverless Function** via `vercel.json`:

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

The app automatically detects the Vercel environment (`process.env.VERCEL === '1'`) and skips `app.listen()` in favor of exporting the Express app as a module.

### Deploy steps

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy

---

## 🏥 Health Check

```
GET /api/health
→ { "status": "ok", "timestamp": "2026-06-22T07:00:00.000Z" }
```

---

## 📄 License

MIT © [Niloy Paul](https://github.com/niloypaul07)
