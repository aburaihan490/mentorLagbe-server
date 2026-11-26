# MentorLagbe — Server (Backend API)

MentorLagbe is a tutor–student marketplace. This repository is the backend REST API that powers it. It is built with **Express.js (ESM)** and **MongoDB**, handles JWT-based authentication (verified via the client's JWKS endpoint), tuition listings, student applications, and premium subscriptions through **Stripe**.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication & Roles](#authentication--roles)
- [API Endpoints](#api-endpoints)
- [Subscription Plans](#subscription-plans)
- [Payments (Stripe)](#payments-stripe)
- [Deployment](#deployment)
- [Scripts](#scripts)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js (ES modules) |
| Framework | Express.js 5 |
| Database | MongoDB (native `mongodb` driver) |
| Auth | JWT verification with `jose` (remote JWKS) |
| Payments | Stripe Checkout + Webhooks |
| Middleware | `cors`, `dotenv` |
| Tooling | `nodemon` for development |
| Hosting | Vercel (`@vercel/node`) |

## Project Structure

```
.
├── index.js                 # Entry point: connects MongoDB and starts the server
├── app.js                   # Express app setup (middleware, routers, Stripe webhook)
├── config/
│   ├── env.js               # Validated environment variables
│   └── strip.js             # Configured Stripe client
├── src/
│   ├── db/mongodb.js        # MongoDB client / connection helper (db: "mentorlagbe")
│   ├── middleware/          # verifyToken, verifyAdmin, verifyStudent, verifyTutor
│   ├── controller/          # Route handlers (user, tuition, tutor, application, payments)
│   └── routes/
│       ├── index.js         # Root router mounted at /api/v1
│       └── api/             # Feature routers (auth, tuition, tutor, applications, checkout)
├── .env.example             # Environment variable template (if present)
└── vercel.json              # Vercel deployment config
```

MongoDB collections used: `user`, `tuitions`, `applications`, `subscriptions`.

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- A MongoDB connection string (e.g. MongoDB Atlas)
- A Stripe account with secret key and webhook secret
- A running client app that exposes `GET /api/auth/jwks` for token verification

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd server

# Install dependencies
npm install

# Create your environment file
cp .env.example .env      # or create .env manually with the variables below

# Start the development server
npm run dev

# Or start in production mode
npm start
```

The server will run at `http://localhost:<PORT>` and all API routes are prefixed with `/api/v1`.

## Environment Variables

All variables are required — the app throws an error at startup if any are missing (`config/env.js`).

| Variable | Description |
| --- | --- |
| `PORT` | Port the server listens on (e.g. `4000`) |
| `MONGODB_URL` | MongoDB connection URI |
| `CLIENT_URL` | Frontend origin used for CORS **and** to build the JWKS URL (`${CLIENT_URL}/api/auth/jwks`) |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for verifying events |

Example `.env`:

```env
PORT=4000
MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> `.env` is git-ignored. Never commit real credentials.

## Authentication & Roles

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <JWT>
```

`verifyToken` verifies the JWT against the remote JWKS published by the client app (`${CLIENT_URL}/api/auth/jwks`) and attaches the decoded payload to `req.user` (containing `id`, `email`, `name`, `role`, etc.).

Roles used by the role guards (`verifyStudent`, `verifyTutor`, `verifyAdmin`):

- `student` — can create/delete their own applications
- `tutor` — can create/manage tuitions and respond to applications
- `admin` — can view all transactions

## API Endpoints

Base URL: `/api/v1`

### Users (Auth)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/auth/all-users` | Public* | List all users (password hash excluded) |

\* The admin checks in this handler are currently commented out — restrict this route before production use.

### Tuitions (Public)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/tuition/all-tuitions` | Public | List approved, active tuitions with search/filter/pagination |
| GET | `/tuition/single-tuition/:id` | Public | Get a single approved, active tuition |

Query params for `all-tuitions`: `search`, `subject`, `class`, `mode`, `page` (default 1), `limit` (default 6). Response includes a `pagination` object.

### Tuitions (Tutor only)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/tutor/create-tuition` | Create a tuition (status: `pending`, needs admin approval) |
| GET | `/tutor/tutor-all-tutions` | List the logged-in tutor's tuitions |
| PATCH | `/tutor/update-tuitions/:id` | Edit one of your tuitions |
| PATCH | `/tutor/toggle-tuition/:id` | Toggle `isActive` (only when approved) |
| DELETE | `/tutor/delete-tuition/:id` | Delete one of your tuitions |

All tutor routes use `verifyToken` + `verifyTutor`.

### Applications

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/applications/student-application` | Student | Apply to an approved, active tuition |
| GET | `/applications/get-student-application` | Student | List your applications |
| GET | `/applications/get-application` | Tutor | List applications for your tuitions |
| PATCH | `/applications/update-application/:id` | Tutor | Set status to `accepted` or `rejected` |
| DELETE | `/applications/delete-application/:id` | Student | Cancel a pending application |

### Payments / Checkout

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/checkout/create-checkout-session` | Authenticated | Create a Stripe subscription checkout session |
| GET | `/checkout/get-student-payments` | Authenticated | Student's payment history and summary |
| GET | `/checkout/admin/transactions` | Admin | All transactions with revenue stats |

### Stripe Webhook

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/webhooks/stripe` | Receives Stripe events (raw JSON body, signature verified) |

Handled events:

- `checkout.session.completed` → marks subscription `paid` and upgrades the user to `premium`
- `invoice.payment_failed` → marks subscription `past_due` / `failed`
- `customer.subscription.deleted` → cancels the subscription and downgrades the user to `free`

For local development, forward webhooks with the Stripe CLI:

```bash
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe
```

## Subscription Plans

| Plan | Tutor | Student |
| --- | --- | --- |
| Free | 2 tuition posts per month | 2 applications per month |
| Premium | Unlimited | Unlimited |

Premium is a monthly Stripe subscription: **$10/month for students** (1000 cents) and **$15/month for tutors** (1500 cents).

## Payments (Stripe)

`POST /checkout/create-checkout-session` uses the logged-in user's role and email to create a Stripe Checkout subscription session, saves a `pending` record in the `subscriptions` collection, and returns a `url` to redirect the user to. Success/cancel URLs are `${CLIENT_URL}/checkout/success` and `${CLIENT_URL}/checkout/cancel`.

## Deployment

The project includes a `vercel.json` that builds `index.js` with `@vercel/node` and routes all requests to it. Set the environment variables in your Vercel project settings, then:

```bash
npx vercel deploy --prod
```

Remember to register the production webhook URL (`https://<your-domain>/api/webhooks/stripe`) in Stripe.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the server with `node index.js` |
| `npm run dev` | Run with `nodemon` (auto-reload on changes) |
