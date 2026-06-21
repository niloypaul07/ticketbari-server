const express = require('express');
const { ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDB } = require('../lib/db');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// POST /api/payments/create-payment-intent
router.post('/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const db = getDB();

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userEmail !== req.user.email) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'accepted') return res.status(400).json({ error: 'Booking is not accepted yet' });
    if (new Date(booking.departureDateTime) < new Date()) {
      return res.status(400).json({ error: 'Cannot pay — departure date has passed' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // convert to cents
      currency: 'usd',
      metadata: {
        bookingId: bookingId.toString(),
        userEmail: req.user.email,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/confirm — save payment record after successful Stripe payment
router.post('/confirm', verifyToken, async (req, res) => {
  try {
    const { bookingId, transactionId, amount } = req.body;
    const db = getDB();

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userEmail !== req.user.email) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status === 'paid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    const existingPayment = await db.collection('payments').findOne({ bookingId: new ObjectId(bookingId) });
    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already recorded' });
    }

    // Update booking status to paid
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: 'paid' } }
    );

    // Reduce ticket quantity
    await db.collection('tickets').updateOne(
      { _id: new ObjectId(booking.ticketId) },
      { $inc: { quantity: -booking.quantity } }
    );

    // Record the payment
    const payment = {
      transactionId,
      bookingId: new ObjectId(bookingId),
      ticketId: booking.ticketId,
      ticketTitle: booking.ticketTitle,
      userId: req.user.id,
      userEmail: req.user.email,
      vendorEmail: booking.vendorEmail,
      amount: parseFloat(amount),
      quantity: booking.quantity,
      paymentDate: new Date(),
    };

    await db.collection('payments').insertOne(payment);
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
