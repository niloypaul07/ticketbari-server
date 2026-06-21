const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../lib/db');
const verifyToken = require('../middleware/verifyToken');
const verifyVendor = require('../middleware/verifyVendor');

const router = express.Router();

// POST /api/bookings — user books a ticket
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { ticketId, quantity } = req.body;

    const ticket = await db.collection('tickets').findOne({ _id: new ObjectId(ticketId) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.verificationStatus !== 'approved' || ticket.isHidden) {
      return res.status(400).json({ error: 'This ticket is not available for booking' });
    }
    if (ticket.quantity === 0) return res.status(400).json({ error: 'Ticket is sold out' });
    if (quantity > ticket.quantity) return res.status(400).json({ error: 'Requested quantity exceeds available tickets' });
    if (new Date(ticket.departureDateTime) < new Date()) {
      return res.status(400).json({ error: 'Cannot book — departure date has passed' });
    }

    const booking = {
      ticketId: new ObjectId(ticketId),
      ticketTitle: ticket.title,
      ticketImage: ticket.image,
      from: ticket.from,
      to: ticket.to,
      departureDateTime: ticket.departureDateTime,
      unitPrice: ticket.price,
      quantity: parseInt(quantity),
      totalPrice: ticket.price * parseInt(quantity),
      userId: req.user.id,
      userEmail: req.user.email,
      vendorEmail: ticket.vendorEmail,
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(booking);
    res.status(201).json({ insertedId: result.insertedId, ...booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/my — user's bookings
router.get('/my', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const bookings = await db
      .collection('bookings')
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/vendor — vendor sees all booking requests for their tickets
router.get('/vendor', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const bookings = await db
      .collection('bookings')
      .find({ vendorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bookings/:id/status — vendor accepts or rejects a booking
router.patch('/:id/status', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const { status } = req.body; // 'accepted' | 'rejected'
    const booking = await db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id),
      vendorEmail: req.user.email,
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: `Cannot change status from ${booking.status}` });
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id), vendorEmail: req.user.email },
      { $set: { status } }
    );
    res.json({ message: `Booking ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
