# StayHub Backend

StayHub is a Node.js REST API for a digital guest experience platform. It provides staff authentication, guest profiles, room and booking management, Paystack payment initiation and webhooks, service requests, and Swagger API documentation.

## Features

- JWT-based staff authentication and refresh tokens
- Role-based access control for `ADMIN`, `STAFF`, and `RECEPTIONIST` users
- Guest profile creation and updates
- Room availability searches
- Booking creation, overlap prevention, and status updates
- Paystack payment initialization and signed webhook handling
- Guest service request management
- Staff management for administrators
- Prisma/PostgreSQL data access
- Swagger UI and OpenAPI 3.0 documentation
- Helmet, CORS, request logging, input validation, and rate limiting

## Technology Stack

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- PostgreSQL database support
- JSON Web Tokens
- bcryptjs
- express-validator
- Nodemailer
- Paystack REST API
- Swagger UI Express
- Jest, Supertest, and ESLint

## Project Structure

```text
stayhub-backend/
|-- docs/
|   `-- openapi.json          # Swagger/OpenAPI specification
|-- prisma/
|   `-- schema.prisma         # Database models and enums
|-- scripts/
|   `-- seed.js               # Development database seed script
|-- src/
|   |-- index.js              # Application entry point
|   |-- middleware/
|   |   |-- auth.js           # JWT authentication and authorization
|   |   `-- swagger.js        # Swagger UI middleware
|   |-- prisma/
|   |   `-- client.js         # Shared Prisma client
|   |-- routes/
|   |   |-- auth.js
|   |   |-- booking.js
|   |   |-- guest.js
|   |   |-- payment.js
|   |   |-- room.js
|   |   |-- serviceRequest.js
|   |   `-- staff.js
|   `-- utils/
|       `-- email.js          # Nodemailer email helper
|-- .env                      # Local environment configuration
|-- .eslintrc.json
|-- package.json
`-- package-lock.json
```

## Prerequisites

- Node.js 18 or newer
- npm
- A PostgreSQL database
- A PostgreSQL provider of your choice
- Optional: Paystack sandbox account
- Optional: SMTP server or MailHog for email testing

## Installation

Generate the Prisma client:

```powershell
npm run prisma:generate
```

## Environment Configuration

Create or update `.env` in the project root. The following variables are supported.

```dotenv
# PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# Authentication
JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"

# Paystack
PAYSTACK_PUBLIC_KEY="pk_test_xxxxxx"
PAYSTACK_SECRET_KEY="sk_test_xxxxxx"

# Email
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""

# Server
PORT=3000
CORS_ORIGIN="http://localhost:3000"

# Global request limiter
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

The rate limit defaults to 100 requests per 15-minute window per IP. `RATE_LIMIT_WINDOW_MS` is expressed in milliseconds.

Never commit real secrets or API keys to source control.

## KYC Document Storage

KYC document upload and storage are not implemented in the current codebase. To avoid paid services, use a private directory on hardware you already own; a self-hosted, open-source object-storage server is another option if you can operate it yourself. Keep uploaded documents outside source control and the public web root, restrict access, encrypt storage and backups, and define a retention/deletion policy appropriate to your legal requirements. Local disk storage is free but requires you to manage backups, access controls, and disk capacity. Do not store identity documents directly in PostgreSQL or expose a public directory.

## Database Setup

Run migrations:

```powershell
npm run prisma:migrate
```

Seed the database with sample users, guests, rooms, and a booking:

```powershell
npm run db:seed
```

The seed script creates this administrator:

```text
Email: admin@example.com
Password: AdminPass!123
Role: ADMIN
```

Change or remove the seed credentials before using a shared or production environment.

## Running the Server

Development mode with automatic restarts:

```powershell
npm run dev
```

Production-style local start:

```powershell
npm start
```

The API listens on `http://localhost:3000` by default.

Useful URLs:

- API status: `http://localhost:3000/`
- API base path: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`

## API Routes

Unless noted otherwise, request bodies are JSON. For protected routes, send:

```text
Authorization: Bearer <accessToken>
```

For local testing, the seed script creates an admin account with the credentials documented in [Database Setup](#database-setup). Its generated IDs vary each time it runs; use IDs returned by API responses or query your local database where an ID is needed. The seed script deletes existing records from its tables before creating sample data.

### Root and Documentation

| Method and route | Inputs | Purpose |
|---|---|---|
| `GET /` | None | Returns the API name, status, and documentation path. |
| `GET /api-docs` | None | Opens Swagger UI. |

### Authentication

These authentication endpoints are public. Registration creates a staff account and sends a welcome email.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `POST /api/auth/register` | `email` | Required | JSON body; valid email |
|  | `password` | Required | JSON body; at least 8 characters |
|  | `role` | Required | JSON body; `ADMIN`, `STAFF`, or `RECEPTIONIST` |
| `POST /api/auth/login` | `email` | Required | JSON body; valid email |
|  | `password` | Required | JSON body |
| `POST /api/auth/refresh` | `refreshToken` | Required | JSON body; valid refresh JWT |

Register example:

```json
{
  "email": "newstaff@example.com",
  "password": "StrongPass123!",
  "role": "STAFF"
}
```

Login example:

```json
{
  "email": "admin@example.com",
  "password": "AdminPass!123"
}
```

Refresh example:

```json
{
  "refreshToken": "<refreshToken returned by login or register>"
}
```

Login and registration return `accessToken` and `refreshToken`. Use the access token in the `Authorization` header for protected endpoints.

### Guests

Guest creation is public. Profile retrieval and updates require a bearer token; guests may access only their own profile, while staff may access guest profiles.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `POST /api/guests` | `firstName` | Required | JSON body; non-empty string |
|  | `lastName` | Required | JSON body; non-empty string |
|  | `email` | Required | JSON body; valid email |
|  | `phone` | Optional | JSON body; string |
|  | `address` | Optional | JSON body; string |
| `GET /api/guests/:id` | `id` | Required | URL path parameter; UUID |
| `PUT /api/guests/:id` | `id` | Required | URL path parameter; UUID |
|  | `firstName`, `lastName` | Optional | JSON body; strings |
|  | `email` | Optional | JSON body; valid email |
|  | `phone`, `address` | Optional | JSON body; strings |

Guest creation example:

```json
{
  "firstName": "Jamie",
  "lastName": "Taylor",
  "email": "jamie.taylor@example.com",
  "phone": "555-0101",
  "address": "10 Main Street"
}
```

For `PUT`, send only the fields to change. The route permits an empty body, but at least one field should be supplied to make a useful update.

### Rooms

Room listing requires a bearer token.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `GET /api/rooms` | `checkIn` | Optional | Query parameter; provide together with `checkOut` to search availability |
|  | `checkOut` | Optional | Query parameter; provide together with `checkIn` |

Example: `GET /api/rooms?checkIn=2026-12-10&checkOut=2026-12-13`. Without both dates, the API lists basic room information. The route currently does not validate query date formats.

### Bookings

Booking endpoints require a bearer token. A guest may create or retrieve only their own booking; `ADMIN` and `STAFF` can update booking status.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `POST /api/bookings` | `guestId` | Required | JSON body; UUID of an existing guest |
|  | `roomId` | Required | JSON body; UUID of an existing room |
|  | `checkIn` | Required | JSON body; ISO 8601 date/time |
|  | `checkOut` | Required | JSON body; ISO 8601 date/time, later than `checkIn` |
|  | `promoCode` | Optional | JSON body; string |
| `GET /api/bookings/:id` | `id` | Required | URL path parameter; UUID |
| `PATCH /api/bookings/:id/status` | `id` | Required | URL path parameter; UUID |
|  | `status` | Required | JSON body; `PENDING`, `CONFIRMED`, `CANCELLED`, or `COMPLETED` |

Booking creation example (replace the IDs with real guest and room IDs):

```json
{
  "guestId": "<existing-guest-uuid>",
  "roomId": "<existing-room-uuid>",
  "checkIn": "2026-12-10T15:00:00.000Z",
  "checkOut": "2026-12-13T11:00:00.000Z",
  "promoCode": "WINTER"
}
```

For test IDs, create a guest with `POST /api/guests` and copy the returned `id`. Log in to get an access token, then call `GET /api/rooms` with that token and copy a room `id` from its response. Use those IDs for the booking request.

The API calculates the total from the room price and dates; do not send `totalAmountInt` or a booking status when creating a booking.

Status update example:

```json
{
  "status": "CONFIRMED"
}
```

Booking status values:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

### Payments

Payment initiation requires a bearer token and permits the booking guest or staff. The webhook is called by Paystack and is authenticated by its signature header rather than a bearer token.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `POST /api/payments/initiate` | `bookingId` | Required | JSON body; UUID of an existing booking |
| `POST /api/payments/webhook` | `x-paystack-signature` | Required | HTTP header; must be a valid signature for the exact request body |
|  | Paystack event object | Required | JSON body; expected fields include `event`, `data.reference`, and `data.status` |

Payment initiation example:

```json
{
  "bookingId": "<existing-booking-uuid>"
}
```

The webhook expects `event` to be `charge.success` to process a payment. A valid signature must be generated by Paystack using the configured secret key; an unsigned sample request will be rejected. It marks the matching payment as `SUCCESS` or `FAILED` and confirms the booking on success.

Expected webhook JSON shape:

```json
{
  "event": "charge.success",
  "data": {
    "reference": "<reference returned by payment initiation>",
    "status": "success"
  }
}
```

This JSON is only the body shape; testing the webhook also requires a valid `x-paystack-signature` for the exact body.

### Service Requests

Service request endpoints require a bearer token. Guests can list only their own requests; `ADMIN`, `STAFF`, and `RECEPTIONIST` can update request statuses.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `POST /api/service-requests` | `guestId` | Required | JSON body; UUID of an existing guest |
|  | `roomId` | Optional | JSON body; UUID of an existing room |
|  | `type` | Required | JSON body; non-empty string |
|  | `description` | Optional | JSON body; string |
| `GET /api/service-requests` | None | — | No body, path parameter, or query parameter |
| `PATCH /api/service-requests/:id/status` | `id` | Required | URL path parameter; UUID |
|  | `status` | Required | JSON body; `OPEN`, `IN_PROGRESS`, `RESOLVED`, or `CLOSED` |

Create request example:

```json
{
  "guestId": "<existing-guest-uuid>",
  "roomId": "<existing-room-uuid>",
  "type": "Extra towels",
  "description": "Please bring two extra towels."
}
```

Status update example:

```json
{
  "status": "IN_PROGRESS"
}
```

Service request status values:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

### Staff

All staff-management endpoints require an `ADMIN` bearer token.

| Method and route | Input | Required? | Source and validation |
|---|---|---|---|
| `GET /api/staff` | None | — | No body, path parameter, or query parameter; `ADMIN` only |
| `POST /api/staff` | `email` | Required | JSON body; valid email; `ADMIN` only |
|  | `password` | Required | JSON body; at least 8 characters |
|  | `role` | Required | JSON body; `ADMIN`, `STAFF`, or `RECEPTIONIST` |
| `PATCH /api/staff/:id/role` | `id` | Required | URL path parameter; UUID |
|  | `role` | Required | JSON body; `ADMIN`, `STAFF`, or `RECEPTIONIST` |
| `DELETE /api/staff/:id` | `id` | Required | URL path parameter; UUID |

Create staff example:

```json
{
  "email": "staff@example.com",
  "password": "StrongPass123!",
  "role": "STAFF"
}
```

Role update example:

```json
{
  "role": "RECEPTIONIST"
}
```

Staff role values:

```text
ADMIN
STAFF
RECEPTIONIST
```

## Database Models

### Guest

Stores guest identity, contact details, address, loyalty points, and relationships to bookings and service requests.

### Staff

Stores staff credentials and role. Passwords are hashed with bcrypt before persistence.

### Room

Stores room number, type, capacity, price in minor currency units, and room status.

Room status values:

```text
AVAILABLE
MAINTENANCE
OCCUPIED
```

### Booking

Stores the guest, room, date range, status, minor-unit total, and optional promotion code. Prisma and application logic are used to prevent overlapping active bookings.

### Payment

Stores a one-to-one payment record per booking, the Paystack reference, amount, status, and optional webhook payload.

### ServiceRequest

Stores a guest request, optional room, request type, description, status, and timestamps.

## Validation and Error Responses

Request validation is handled with `express-validator`. Validation failures generally return `400` with an `errors` array.

Common responses:

```json
{ "error": "Invalid credentials" }
```

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

The global middleware can also return:

```json
{ "error": "Too many requests, please try again later." }
```

## Testing and Quality Checks

Run lint checks:

```powershell
npm run lint
```

Run Jest tests:

```powershell
npm test
```

The project currently passes with no test files. Add tests under `src/**/__tests__` or with `.test.js`/`.spec.js` filenames.

## Local Email Testing

For MailHog-style local email testing:

```dotenv
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
```

The application currently uses a simple Nodemailer transport and sends a welcome email during staff registration.

## Security Notes

- Use a strong, unique `JWT_SECRET`.
- Set `CORS_ORIGIN` explicitly in production.
- Keep Paystack and storage-provider credentials server-side.
- Add the Paystack webhook URL to the Paystack dashboard.
- Replace seed credentials before deployment.
- Terminate HTTPS at a reverse proxy or hosting platform in production.
- Review and lower or raise rate limits according to traffic requirements.
- Keep npm dependencies and Prisma versions updated.

## Production Checklist

1. Configure all environment variables with production values.
2. Run migrations against the production database.
3. Generate the Prisma client.
4. Use HTTPS for the API and webhook endpoints.
5. Configure SMTP credentials.
6. Configure CORS for the actual frontend origin.
7. Store secrets in the hosting provider's secret manager.
8. Configure Paystack webhook signing and callback URLs.
9. Add automated tests and CI checks.
10. Run `npm audit` and address reported vulnerabilities.
