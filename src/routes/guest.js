// src/routes/guest.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate } = require('../middleware/auth');

/** Create a new guest (public – no auth needed, but can be protected later) */
router.post(
  '/',
  [
    body('firstName').isString().notEmpty(),
    body('lastName').isString().notEmpty(),
    body('email').isEmail(),
    body('phone').optional().isString(),
    body('address').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { firstName, lastName, email, phone, address } = req.body;
    try {
      const guest = await prisma.guest.create({
        data: { firstName, lastName, email, phone, address },
      });
      res.status(201).json(guest);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Get guest profile – authenticated users only (guest themselves or staff) */
router.get(
  '/:id',
  authenticate,
  param('id').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    // guests can view their own record; staff can view any
    if (req.user.role === 'GUEST' && req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json(guest);
  }
);

/** Update guest profile – guest owns the record or staff */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('address').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    if (req.user.role === 'GUEST' && req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = req.body;
    try {
      const updated = await prisma.guest.update({ where: { id }, data });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
