# TicketBari — Server

## Express.js + MongoDB Native Driver REST API

### 🔗 Base URL
`https://your-server.vercel.app/api`

### ⚙️ Environment Variables (`.env`)
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ticketbari
JWT_SECRET=your_super_secret
STRIPE_SECRET_KEY=sk_test_xxx
CLIENT_URL=https://ticketbari.vercel.app
PORT=5000
```

### 🚀 Running Locally
```bash
npm install
npm run dev    # uses nodemon
```

### 📦 npm Packages
| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `mongodb` | Native MongoDB driver (no Mongoose) |
| `jsonwebtoken` | JWT token signing & verification |
| `bcryptjs` | Password hashing |
| `stripe` | Stripe payment processing |
| `cors` | Cross-Origin Resource Sharing |
| `dotenv` | Environment variable loader |
| `nodemon` | Dev hot-reload (devDependency) |

### 🔐 API Routes

#### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/social-login` | Public |

#### Tickets
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/tickets` | Public (search/filter/sort/page) |
| GET | `/api/tickets/advertised` | Public |
| GET | `/api/tickets/latest` | Public |
| GET | `/api/tickets/vendor` | Vendor |
| GET | `/api/tickets/vendor/revenue` | Vendor |
| GET | `/api/tickets/admin/all` | Admin |
| GET | `/api/tickets/:id` | Public |
| POST | `/api/tickets` | Vendor |
| PATCH | `/api/tickets/:id` | Vendor |
| DELETE | `/api/tickets/:id` | Vendor |
| PATCH | `/api/tickets/:id/verify` | Admin |
| PATCH | `/api/tickets/:id/advertise` | Admin |

#### Bookings
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/bookings` | User |
| GET | `/api/bookings/my` | User |
| GET | `/api/bookings/vendor` | Vendor |
| PATCH | `/api/bookings/:id/status` | Vendor |

#### Payments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/payments/create-payment-intent` | User |
| POST | `/api/payments/confirm` | User |
| GET | `/api/payments/my` | User |

#### Users
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/users` | Admin |
| GET | `/api/users/me` | Authenticated |
| PATCH | `/api/users/:id/role` | Admin |
| PATCH | `/api/users/:id/fraud` | Admin |
