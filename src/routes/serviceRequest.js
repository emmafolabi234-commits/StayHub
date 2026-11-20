// src/routes/serviceRequest.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate } = require('../middleware/auth');

/** Create a new service request – guest or staff */
router.post(
  '/',
  authenticate,
  [
    body('guestId').isUUID(),
    body('roomId').optional().isUUID(),
    body('type').isString().notEmpty(),
    body('description').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { guestId, roomId, type, description } = req.body;
    // If guest role, ensure they are creating for themselves
    if (req.user.role === 'GUEST' && req.user.id !== guestId) {
      return res.status(403).json({ error: 'Guests may only create their own requests' });
    }
    try {
      const request = await prisma.serviceRequest.create({
        data: { guestId, roomId: roomId || null, type, description },
      });
      res.status(201).json(request);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** List service requests – staff can list all, guests only own */
router.get('/', authenticate, async (req, res) => {
  let where = {};
  if (req.user.role === 'GUEST') {
    where = { guestId: req.user.id };
  }
  const requests = await prisma.serviceRequest.findMany({ where, orderBy: { requestedAt: 'desc' } });
  res.json(requests);
});

/** Update status – staff only */
router.patch(
  '/:id/status',
  authenticate,
  [param('id').isUUID(), body('status').isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])],
  async (req, res) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF' && req.user.role !== 'RECEPTIONIST') {
      return res.status(403).json({ error: 'Staff only' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { status } = req.body;
    try {
      const updated = await prisma.serviceRequest.update({ where: { id }, data: { status } });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
