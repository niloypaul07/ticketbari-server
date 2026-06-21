const express = require('express');
const { ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDB } = require('../lib/db');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

const clientBaseUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();

async function getPayableBooking(db, bookingId, userEmail) {
  const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
  if (!booking) return { error: { status: 404, message: 'Booking not found' } };
  if (booking.userEmail !== userEmail) return { error: { status: 403, message: 'Forbidden' } };
  if (booking.status !== 'accepted') return { error: { status: 400, message: 'Booking is not accepted yet' } };
  if (new Date(booking.departureDateTime) < new Date()) {
    return { error: { status: 400, message: 'Cannot pay — departure date has passed' } };
  }
  return { booking };
}

async function recordPayment(db, booking, bookingId, transactionId, user) {
  if (booking.status === 'paid') {
    const existingPayment = await db.collection('payments').findOne({ bookingId: new ObjectId(bookingId) });
    if (existingPayment) return { alreadyPaid: true, payment: existingPayment };
  }

  const existingPayment = await db.collection('payments').findOne({ bookingId: new ObjectId(bookingId) });
  if (existingPayment) return { alreadyPaid: true, payment: existingPayment };

  await db.collection('bookings').updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { status: 'paid' } }
  );

  await db.collection('tickets').updateOne(
    { _id: new ObjectId(booking.ticketId) },
    { $inc: { quantity: -booking.quantity } }
  );

  const payment = {
    transactionId,
    bookingId: new ObjectId(bookingId),
    ticketId: booking.ticketId,
    ticketTitle: booking.ticketTitle,
    userId: user.id,
    userEmail: user.email,
    vendorEmail: booking.vendorEmail,
    amount: parseFloat(booking.totalPrice),
    quantity: booking.quantity,
    paymentDate: new Date(),
  };

  await db.collection('payments').insertOne(payment);
  return { alreadyPaid: false, payment };
}

// POST /api/payments/create-checkout-session — redirect to Stripe hosted checkout
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const db = getDB();

    const result = await getPayableBooking(db, bookingId, req.user.email);
    if (result.error) return res.status(result.error.status).json({ error: result.error.message });

    const { booking } = result;
    const baseUrl = clientBaseUrl();

    // Stripe BDT uses poisha (2 decimal places): ৳280 → unit_amount 28000
    const amountInPoisha = Math.round(Number(booking.totalPrice) * 100);
    if (amountInPoisha < 5000) {
      return res.status(400).json({
        error: 'Amount is too low for Stripe checkout (minimum ~৳50)',
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: booking.ticketTitle,
              description: `${booking.from} → ${booking.to} · Qty ${booking.quantity}`,
            },
            unit_amount: amountInPoisha,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: req.user.email,
      success_url: `${baseUrl}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/user/my-bookings`,
      metadata: {
        bookingId: bookingId.toString(),
        userEmail: req.user.email,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/verify-session?session_id=... — confirm after Stripe redirect
router.get('/verify-session', verifyToken, async (req, res) => {
  try {
    const { session_id: sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'session_id is required' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    if (session.metadata?.userEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bookingId = session.metadata.bookingId;
    const db = getDB();
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const transactionId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || sessionId;

    const { alreadyPaid, payment } = await recordPayment(db, booking, bookingId, transactionId, req.user);

    res.json({
      message: alreadyPaid ? 'Payment already recorded' : 'Payment confirmed',
      transactionId,
      payment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/confirm — legacy embedded payment flow
router.post('/confirm', verifyToken, async (req, res) => {
  try {
    const { bookingId, transactionId, amount } = req.body;
    const db = getDB();

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userEmail !== req.user.email) return res.status(403).json({ error: 'Forbidden' });

    const { alreadyPaid, payment } = await recordPayment(db, booking, bookingId, transactionId, req.user);

    if (alreadyPaid) {
      return res.status(400).json({ error: 'Payment already recorded' });
    }

    res.status(201).json({ message: 'Payment confirmed', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/my — user's transaction history
router.get('/my', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const payments = await db
      .collection('payments')
      .find({ userEmail: req.user.email })
      .sort({ paymentDate: -1 })
      .toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
