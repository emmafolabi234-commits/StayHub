// scripts/seed.js
require('dotenv').config();
const prisma = require('../src/prisma/client');

async function main() {
  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.staff.deleteMany();

  // Create sample staff (admin)
  await prisma.staff.create({
    data: {
      email: 'admin@example.com',
      password: await require('bcryptjs').hash('AdminPass!123', 12),
      role: 'ADMIN',
    },
  });

  // Sample guests
  const guests = await Promise.all([
    prisma.guest.create({
      data: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: '555-0100',
      },
    }),
    prisma.guest.create({
      data: {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        phone: '555-0200',
      },
    }),
  ]);

  // Sample rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        roomNumber: '101',
        type: 'Single',
        capacity: 1,
        pricePerNightInt: 5000, // $50.00
        status: 'AVAILABLE',
      },
    }),
    prisma.room.create({
      data: {
        roomNumber: '102',
        type: 'Double',
        capacity: 2,
        pricePerNightInt: 8000, // $80.00
        status: 'AVAILABLE',
      },
    }),
  ]);

  // Sample booking for Alice
  const checkIn = new Date();
  const checkOut = new Date();
  checkOut.setDate(checkIn.getDate() + 3);
  await prisma.booking.create({
    data: {
      guestId: guests[0].id,
      roomId: rooms[0].id,
      checkIn,
      checkOut,
      totalAmountInt: rooms[0].pricePerNightInt * 3,
      status: 'PENDING',
    },
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
