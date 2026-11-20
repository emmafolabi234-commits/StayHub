// src/routes/payment.js
const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate } = require('../middleware/auth');

/** Initialise a Paystack payment (client receives the authorization URL) */
router.post(
  '/initiate',
  authenticate,
  [body('bookingId').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Only guest who owns the booking or staff may init payment
    if (req.user.role === 'GUEST' && req.user.id !== booking.guestId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const amount = booking.totalAmountInt; // Paystack expects amount in kobo
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        { email: booking.guest.email, amount },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      const { authorization_url, reference } = response.data.data;
      // Store payment record (pending)
      await prisma.payment.create({
        data: {
          bookingId,
          paystackReference: reference,
          amountInt: amount,
          status: 'PENDING',
        },
      });
      res.json({ authorizationUrl: authorization_url, reference });
    } catch (e) {
      res.status(500).json({ error: 'Paystack init failed', details: e.message });
    }
  }
);

/** Paystack webhook (demo – idempotent) */
router.post(
  '/webhook',
  async (req, res) => {
    // Verify Paystack signature
    const signature = req.headers['x-paystack-signature'];
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    if (signature !== expected) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const event = req.body;
    if (event.event !== 'charge.success') {
      return res.json({ status: 'ignored' });
    }
    const { reference, status } = event.data;
    // Idempotent upsert of payment status
    const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    await prisma.payment.update({
      where: { paystackReference: reference },
      data: { status: status === 'success' ? 'SUCCESS' : 'FAILED', webhookPayload: event },
    });
    // If succeeded, mark booking as CONFIRMED
    if (status === 'success') {
      await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED' } });
    }
    res.json({ status: 'ok' });
  }
);

module.exports = router;
