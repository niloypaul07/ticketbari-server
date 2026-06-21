const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../lib/db');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const router = express.Router();

// GET /api/users — admin gets all users
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const users = await db
      .collection('users')
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me — get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/role — admin changes user role
router.patch('/:id/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { role } = req.body; // 'user' | 'vendor' | 'admin'
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { role } }
    );

    // Keep BetterAuth user record in sync for session role data
    await db.collection('user').updateOne(
      { email: user.email },
      { $set: { role } }
    );
    res.json({ message: `User role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/fraud — admin marks vendor as fraud
router.patch('/:id/fraud', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mark user as fraud
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isFraud: true } }
    );

    await db.collection('user').updateOne(
      { email: user.email },
      { $set: { isFraud: true } }
    );

    // Hide all tickets by this vendor
    await db.collection('tickets').updateMany(
      { vendorEmail: user.email },
      { $set: { isHidden: true } }
    );

    res.json({ message: 'Vendor marked as fraud and tickets hidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
