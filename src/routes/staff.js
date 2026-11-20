// src/routes/staff.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

/** List all staff – admin only */
router.get(
  '/',
  authenticate,
  authorize(['ADMIN']),
  async (req, res) => {
    const staff = await prisma.staff.findMany({ select: { id: true, email: true, role: true, createdAt: true } });
    res.json(staff);
  }
);

/** Create staff – admin only (register endpoint also exists in auth.js) */
router.post(
  '/',
  authenticate,
  authorize(['ADMIN']),
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['ADMIN', 'STAFF', 'RECEPTIONIST']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password, role } = req.body;
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 12);
    try {
      const staff = await prisma.staff.create({ data: { email, password: hashed, role } });
      res.status(201).json({ id: staff.id, email: staff.email, role: staff.role, createdAt: staff.createdAt });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Update staff role – admin only */
router.patch(
  '/:id/role',
  authenticate,
  authorize(['ADMIN']),
  [param('id').isUUID(), body('role').isIn(['ADMIN', 'STAFF', 'RECEPTIONIST'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { role } = req.body;
    try {
      const updated = await prisma.staff.update({ where: { id }, data: { role } });
      res.json({ id: updated.id, email: updated.email, role: updated.role });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Delete staff – admin only */
router.delete(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  param('id').isUUID(),
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.staff.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
