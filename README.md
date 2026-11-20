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
- Supabase/PostgreSQL hosting support
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
- Optional: Supabase project for hosted PostgreSQL
- Optional: Paystack sandbox account
- Optional: SMTP server or MailHog for email testing

## Installation

From Windows PowerShell:

```powershell
cd C:\Users\emman\OneDrive\Desktop\Stayhub\stayhub-backend
npm install
```

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

# Supabase
SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

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

Never commit real secrets or service-role keys to source control.

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

- API root: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`

## API Routes

All routes use JSON request bodies unless otherwise noted. Authenticated routes require:

```text
Authorization: Bearer <accessToken>
```

### Authentication

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a staff account |
| `POST` | `/api/auth/login` | Public | Log in and receive access and refresh tokens |
| `POST` | `/api/auth/refresh` | Public | Exchange a refresh token for a new access token |

Example login:

```powershell
curl -X POST "http://localhost:3000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"AdminPass!123\"}'
```

### Guests

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/guests` | Public | Create a guest profile |
| `GET` | `/api/guests/:id` | Authenticated guest or staff | Get a guest profile |
| `PUT` | `/api/guests/:id` | Authenticated guest or staff | Update a guest profile |

### Rooms

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/rooms` | Authenticated | List rooms |
| `GET` | `/api/rooms?checkIn=<ISO date>&checkOut=<ISO date>` | Authenticated | Find rooms without conflicting bookings |

### Bookings

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Authenticated | Create a booking |
| `GET` | `/api/bookings/:id` | Authenticated guest or staff | Get a booking |
| `PATCH` | `/api/bookings/:id/status` | `ADMIN` or `STAFF` | Update booking status |

Booking status values:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

### Payments

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/payments/initiate` | Authenticated | Initialize a Paystack transaction |
| `POST` | `/api/payments/webhook` | Paystack webhook | Verify and process a successful payment event |

Paystack webhook requests must include a valid `x-paystack-signature` header. The webhook marks matching payments as `SUCCESS` or `FAILED` and confirms the booking on successful payment.

### Service Requests

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/service-requests` | Authenticated | Create a service request |
| `GET` | `/api/service-requests` | Authenticated | List requests; guests receive only their own |
| `PATCH` | `/api/service-requests/:id/status` | Staff roles | Update a service request status |

Service request status values:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

### Staff

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/staff` | `ADMIN` | List staff |
| `POST` | `/api/staff` | `ADMIN` | Create staff |
| `PATCH` | `/api/staff/:id/role` | `ADMIN` | Update a staff role |
| `DELETE` | `/api/staff/:id` | `ADMIN` | Delete a staff account |

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
- Keep Paystack and Supabase secret keys server-side.
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
