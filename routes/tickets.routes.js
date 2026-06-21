const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../lib/db');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const verifyVendor = require('../middleware/verifyVendor');

const router = express.Router();

// GET /api/tickets — public, approved only, with search/filter/sort/pagination
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const {
      from, to, transportType, sortBy,
      page = 1, limit = 9,
    } = req.query;

    const query = { verificationStatus: 'approved', isHidden: { $ne: true } };

    if (from) query.from = { $regex: from, $options: 'i' };
    if (to) query.to = { $regex: to, $options: 'i' };
    if (transportType) query.transportType = transportType;

    let sortOption = { createdAt: -1 };
    if (sortBy === 'price_asc') sortOption = { price: 1 };
    if (sortBy === 'price_desc') sortOption = { price: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await db.collection('tickets').countDocuments(query);
    const tickets = await db
      .collection('tickets')
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({ tickets, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/advertised — 6 advertised tickets for homepage
router.get('/advertised', async (req, res) => {
  try {
    const db = getDB();
    const tickets = await db
      .collection('tickets')
      .find({ verificationStatus: 'approved', isAdvertised: true, isHidden: { $ne: true } })
      .limit(6)
      .toArray();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/latest — 6-8 latest tickets for homepage
router.get('/latest', async (req, res) => {
  try {
    const db = getDB();
    const tickets = await db
      .collection('tickets')
      .find({ verificationStatus: 'approved', isHidden: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/vendor — vendor's own tickets
router.get('/vendor', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const tickets = await db
      .collection('tickets')
      .find({ vendorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/admin/all — admin sees all tickets
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const tickets = await db.collection('tickets').find({}).sort({ createdAt: -1 }).toArray();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/vendor/revenue — vendor revenue stats (must be before /:id)
router.get('/vendor/revenue', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const totalTickets = await db.collection('tickets').countDocuments({ vendorEmail: req.user.email });
    const payments = await db.collection('payments').find({ vendorEmail: req.user.email }).toArray();
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSold = payments.reduce((sum, p) => sum + (p.quantity || 1), 0);
    res.json({ totalTickets, totalRevenue, totalSold, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id — single ticket details
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const ticket = await db.collection('tickets').findOne({ _id: new ObjectId(req.params.id) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets — vendor adds a ticket
router.post('/', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const vendor = await db.collection('users').findOne({ email: req.user.email });
    if (vendor?.isFraud) return res.status(403).json({ error: 'Fraud vendors cannot add tickets' });

    const { title, from, to, transportType, price, quantity, departureDateTime, perks, image } = req.body;
    const newTicket = {
      title, from, to, transportType,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      departureDateTime: new Date(departureDateTime),
      perks: perks || [],
      image: image || '',
      vendorEmail: req.user.email,
      vendorName: vendor?.name || '',
      verificationStatus: 'pending',
      isAdvertised: false,
      isHidden: false,
      createdAt: new Date(),
    };

    const result = await db.collection('tickets').insertOne(newTicket);
    res.status(201).json({ insertedId: result.insertedId, ...newTicket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id — vendor updates ticket
router.patch('/:id', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.collection('tickets').findOne({
      _id: new ObjectId(req.params.id),
      vendorEmail: req.user.email,
    });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    if (existing.verificationStatus === 'rejected') {
      return res.status(403).json({ error: 'Rejected tickets cannot be updated' });
    }

    const { title, from, to, transportType, price, quantity, departureDateTime, perks, image } = req.body;
    const updateFields = {};
    if (title) updateFields.title = title;
    if (from) updateFields.from = from;
    if (to) updateFields.to = to;
    if (transportType) updateFields.transportType = transportType;
    if (price) updateFields.price = parseFloat(price);
    if (quantity !== undefined) updateFields.quantity = parseInt(quantity);
    if (departureDateTime) updateFields.departureDateTime = new Date(departureDateTime);
    if (perks) updateFields.perks = perks;
    if (image) updateFields.image = image;

    await db.collection('tickets').updateOne(
      { _id: new ObjectId(req.params.id), vendorEmail: req.user.email },
      { $set: updateFields }
    );
    res.json({ message: 'Ticket updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id — vendor deletes ticket
router.delete('/:id', verifyToken, verifyVendor, async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.collection('tickets').findOne({
      _id: new ObjectId(req.params.id),
      vendorEmail: req.user.email,
    });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    if (existing.verificationStatus === 'rejected') {
      return res.status(403).json({ error: 'Rejected tickets cannot be deleted' });
    }

    await db.collection('tickets').deleteOne({
      _id: new ObjectId(req.params.id),
      vendorEmail: req.user.email,
    });
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id/verify — admin approves or rejects
router.patch('/:id/verify', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { status } = req.body; // 'approved' | 'rejected'
    await db.collection('tickets').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { verificationStatus: status } }
    );
    res.json({ message: `Ticket ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id/advertise — admin toggles advertise
router.patch('/:id/advertise', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { isAdvertised } = req.body;

    if (isAdvertised) {
      const count = await db.collection('tickets').countDocuments({ isAdvertised: true });
      if (count >= 6) return res.status(400).json({ error: 'Cannot advertise more than 6 tickets' });
    }

    await db.collection('tickets').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isAdvertised: Boolean(isAdvertised) } }
    );
    res.json({ message: 'Ticket advertisement updated', isAdvertised: Boolean(isAdvertised) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
