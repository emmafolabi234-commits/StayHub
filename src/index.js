// src/index.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { json, urlencoded } = express;

// Import routers
const authRouter = require('./routes/auth');
const guestRouter = require('./routes/guest');
const roomRouter = require('./routes/room');
const bookingRouter = require('./routes/booking');
const paymentRouter = require('./routes/payment');
const serviceRequestRouter = require('./routes/serviceRequest');
const staffRouter = require('./routes/staff');

const app = express();

// Global middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(morgan('dev'));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/guests', guestRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/service-requests', serviceRequestRouter);
app.use('/api/staff', staffRouter);

// Swagger UI for OpenAPI docs (generated later)
app.use('/api-docs', require('./middleware/swagger') );

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StayHub backend listening on port ${PORT}`);
});

module.exports = app; // for testing
