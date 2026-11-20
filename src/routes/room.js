const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { authenticate } = require('../middleware/auth');

// List rooms with optional date filter for availability
router.get('/', authenticate, async (req, res) => {
  const { checkIn, checkOut } = req.query;
  if (checkIn && checkOut) {
    // Find rooms that have no conflicting bookings in the given range
    const rooms = await prisma.room.findMany({
      where: {
        bookings: {
          none: {
            AND: [
              { checkIn: { lt: new Date(checkOut) } },
              { checkOut: { gt: new Date(checkIn) } },
              { status: { in: ['PENDING', 'CONFIRMED'] } }
            ]
          }
        }
      }
    });
    return res.json(rooms);
  }
  // No date filter – return all rooms (basic info only)
  const rooms = await prisma.room.findMany({ select: { id: true, roomNumber: true, type: true, capacity: true, status: true } });
  res.json(rooms);
});

module.exports = router;
