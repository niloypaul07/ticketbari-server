const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../lib/db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const db = getDB();
    const { name, email, password, photo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = {
      name,
      email: email.toLowerCase(),
      passwordHash,
      photo: photo || '',
      role: 'user',
      isFraud: false,
      provider: 'credentials',
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    const token = jwt.sign(
      { id: result.insertedId, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.insertedId, name, email: newUser.email, role: newUser.role, photo: newUser.photo },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, photo: user.photo },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared handler: BetterAuth session → Express JWT
async function syncBetterAuthUser(req, res) {
  try {
    const db = getDB();
    const { name, email, photo, provider } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      const newUser = {
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: null,
        photo: photo || '',
        role: 'user',
        isFraud: false,
        provider: provider || 'betterauth',
        createdAt: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
        isFraud: user.isFraud,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/sync', syncBetterAuthUser);
router.post('/social-login', syncBetterAuthUser);

module.exports = router;
