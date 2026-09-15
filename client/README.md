# Ledger — LMS Frontend (Next.js 14 + TypeScript)

## Setup

1. `cd client && npm install`
2. Copy `.env.local.example` to `.env.local` and point `NEXT_PUBLIC_SERVER_URI` at your running backend (default: `http://localhost:8000/api/v1`)
3. `npm run dev` — starts on `http://localhost:3000`

Make sure the backend server is running first (see `../server/README.md`), otherwise course data won't load.

## What's built

- **App Router + TypeScript**, Tailwind CSS with a custom design system (`ink`/`parchment`/`mustard`/`clay` tokens in `tailwind.config.js`)
- **Redux Toolkit + RTK Query**, including a `baseQueryWithReauth` wrapper (`src/redux/features/api/apiSlice.ts`) that automatically calls `/refresh` and retries a request once if the access token has expired — this matches the backend's short-lived access token / long-lived refresh token pattern
- **Formik + Yup** for the login and sign-up forms
- Pages: home (`/`), course catalog (`/courses`), course details (`/course/[id]`, public/sanitized preview), sign-up (`/sign-up`), OTP activation (`/activation`), login (`/login`), FAQ (`/faq`, pulled live from the backend's layout/CMS endpoint), profile (`/profile`), course content viewer (`/course-access/[id]`, purchase-gated: lesson sidebar, video player, and per-lesson Q&A)
- **Enroll flow**: the "Enroll now" button on a course page calls the backend's `/create-order` directly and then routes into `/course-access/[id]`. There's no payment gateway wired in yet — see below.
- Dark/light theme toggle via `next-themes`

## Note on "Enroll now"

There's no Stripe (or other payment gateway) integration yet — `/create-order` on the backend accepts a `payment_info` object of any shape, so right now the frontend just sends `{}` and the order goes through immediately. This is fine for local development and testing the rest of the flow (content access, Q&A), but **do not ship this as-is** — swap `handleEnroll` in `src/app/course/[id]/page.tsx` for a real payment confirmation before charging real money.


## Design notes

Typefaces are **Fraunces** (display/headlines) and **Work Sans** (body/UI), loaded via `next/font/google` — no local font files needed, but you do need internet access at build time for Next.js to fetch them once and self-host the result.

Course cards use a colored left-edge tag by category instead of a generic rounded shadow card, and the homepage hero avoids the default gradient-hero treatment in favor of a stat-card layout listing top categories.

## What's not built yet (next steps)

- Real payment gateway (Stripe or similar) — see the note above, enrollment currently skips payment entirely
- Reviews UI on the course details page (backend endpoint exists: `/add-review/:id`, `/add-reply-review`)
- Admin dashboard (course creation/editing, analytics charts, user management, notifications) — none of this has a frontend yet, only backend routes
- Social login (Google/GitHub) — backend has `/social-auth` ready to receive `{ name, email, avatar }`, but no OAuth provider is wired up on the frontend
- Avatar upload / profile editing UI
- DRM / video protection — `VideoPlayer` plays whatever URL is stored (direct file or embeddable iframe URL), with no download/screenshot protection
