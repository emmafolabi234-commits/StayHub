// src/routes/booking.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate } = require('../middleware/auth');

/** Create a new booking – only authenticated guests or staff */
router.post(
  '/',
  authenticate,
  [
    body('guestId').isUUID(),
    body('roomId').isUUID(),
    body('checkIn').isISO8601(),
    body('checkOut').isISO8601(),
    body('promoCode').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { guestId, roomId, checkIn, checkOut, promoCode } = req.body;
    // Guests can only book for themselves unless staff role
    if (req.user.role === 'GUEST' && req.user.id !== guestId) {
      return res.status(403).json({ error: 'Guests may only create their own bookings' });
    }
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ error: 'checkOut must be after checkIn' });
    }
    // Overlap prevention – transaction ensures consistency
    try {
      const booking = await prisma.$transaction(async (tx) => {
        // Verify room exists
        const room = await tx.room.findUnique({ where: { id: roomId } });
        if (!room) throw new Error('Room not found');
        // Ensure no overlapping ACTIVE bookings for this room
        const conflict = await tx.booking.findFirst({
          where: {
            roomId,
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
            AND: [
              { checkIn: { lt: checkOutDate } },
              { checkOut: { gt: checkInDate } },
            ],
          },
        });
        if (conflict) throw new Error('Room already booked for the selected dates');
        // Compute total amount (price per night * nights)
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalAmountInt = room.pricePerNightInt * nights; // stored in minor units
        return await tx.booking.create({
          data: {
            guestId,
            roomId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            totalAmountInt,
            promoCode: promoCode || null,
            status: 'PENDING',
          },
        });
      });
      res.status(201).json(booking);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Get booking by id – staff can view any; guest only own */
router.get(
  '/:id',
  authenticate,
  param('id').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (req.user.role === 'GUEST' && req.user.id !== booking.guestId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(booking);
  }
);

/** Update booking status – staff only */
router.patch(
  '/:id/status',
  authenticate,
  [param('id').isUUID(), body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])],
  async (req, res) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'Only staff may update status' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { status } = req.body;
    try {
      const updated = await prisma.booking.update({ where: { id }, data: { status } });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
