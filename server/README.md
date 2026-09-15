# LMS Backend (Express + TypeScript + MongoDB + Redis)

## Setup

1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DB_URL` — MongoDB Atlas connection string (or `mongodb://localhost:27017/lms` for local Mongo)
   - `REDIS_URL` — Upstash Redis URL (or `redis://localhost:6379` for local Redis)
   - `ACTIVATION_SECRET`, `ACCESS_TOKEN`, `REFRESH_TOKEN` — any long random strings
   - `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_SECRET_KEY` — from your Cloudinary dashboard
   - `SMTP_MAIL`, `SMTP_PASSWORD` — a Gmail address + an **App Password** (not your real password; requires 2-step verification enabled on the Google account)
3. `npm run dev` — starts the server on `http://localhost:8000` with hot reload
4. Test it's alive: `GET http://localhost:8000/test`

## Build for production

`npm run build` compiles TypeScript to `dist/` and copies the EJS mail templates alongside it, then `npm start` runs the compiled server.

## API overview

All routes are prefixed with `/api/v1`.

| Area | Routes |
|---|---|
| Auth | `POST /registration`, `POST /activate-user`, `POST /login`, `GET /logout`, `GET /refresh`, `GET /me`, `POST /social-auth` |
| Profile | `PUT /update-user-info`, `PUT /update-user-password`, `PUT /update-user-avatar` |
| Courses | `POST /create-course`, `PUT /edit-course/:id`, `GET /get-course/:id`, `GET /get-courses`, `GET /get-course-content/:id`, `DELETE /delete-course/:id` |
| Q&A / Reviews | `PUT /add-question`, `PUT /add-answer`, `PUT /add-review/:id`, `PUT /add-reply-review` |
| Orders | `POST /create-order`, `GET /admin/orders` |
| Notifications | `GET /admin/notifications`, `PUT /admin/update-notification/:id` |
| Analytics | `GET /admin/users-analytics`, `GET /admin/courses-analytics`, `GET /admin/orders-analytics` |
| Layout (CMS) | `POST /create-layout`, `PUT /edit-layout`, `POST /get-layout` |
| Admin - users | `GET /admin/users`, `PUT /admin/update-user-role`, `DELETE /admin/user/:id` |

Routes under `/admin/*` and anything using `authorizeRoles("admin")` require the logged-in user's role to be `admin`. Set this manually in your database on your first account, since there's no bootstrap step for the first admin yet.

## Notable design decisions (vs. the tutorial this is based on)

- **Password is not `required: true`** on the User model — social-auth users have no local password, and requiring it there broke that flow in the original.
- **`isAuthenticated` verifies the access token's signature** (`jwt.verify`) rather than just decoding it — decoding alone doesn't confirm the token wasn't tampered with.
- **Redis sessions use a rolling 7-day TTL**, refreshed on every login and token refresh, so active users are never logged out but idle sessions clean themselves up instead of living forever.
- **Course-detail and all-courses caching uses TTLs** rather than caching every record indefinitely, so Redis doesn't grow unbounded as the course catalog grows.
- **Old, read notifications are purged nightly via `node-cron`** (30-day retention) so the notifications collection doesn't grow forever.

## What's not built yet (next steps)

- Payment gateway integration (Stripe) inside `createOrder` — `payment_info` is currently just stored as-is
- Rate limiting / request throttling
- Input validation layer (e.g. `zod` or `express-validator`) — right now validation relies on Mongoose schema rules
- Seed script for creating the first admin user
- The Next.js frontend (not started)
