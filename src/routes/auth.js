// src/routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const sendEmail = require('../utils/email');

const router = express.Router();

// Helper to generate JWTs
function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  // Opaque token stored hashed in DB (for demo we keep simple)
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return token;
}

/** Register a new staff/admin account */
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['ADMIN', 'STAFF', 'RECEPTIONIST']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, role } = req.body;
    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const staff = await prisma.staff.create({
      data: { email, password: hashed, role },
    });
    // Send a welcome email (demo using MailHog)
    await sendEmail({
      to: email,
      subject: 'Welcome to StayHub staff portal',
      text: `Your account has been created with role ${role}.`,
    });
    const access = generateAccessToken(staff);
    const refresh = generateRefreshToken(staff);
    res.status(201).json({ accessToken: access, refreshToken: refresh });
  }
);

/** Login */
router.post(
  '/login',
  [body('email').isEmail(), body('password').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const staff = await prisma.staff.findUnique({ where: { email } });
    if (!staff) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, staff.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const access = generateAccessToken(staff);
    const refresh = generateRefreshToken(staff);
    res.json({ accessToken: access, refreshToken: refresh });
  }
);

/** Token refresh */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const staff = await prisma.staff.findUnique({ where: { id: payload.id } });
    if (!staff) return res.status(401).json({ error: 'Invalid token' });
    const newAccess = generateAccessToken(staff);
    res.json({ accessToken: newAccess });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Placeholder for future LLM integration – keep stub comment in code
// TODO: LLM integration endpoint will be added here (see design guide)

module.exports = router;
