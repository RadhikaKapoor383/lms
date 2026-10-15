# LEARNING MANAGEMENT SYSTEM 

This repository is a full-stack Learning Management System built with Next.js on the frontend and Express + TypeScript + MongoDB on the backend. It is designed around three user roles: Admin, Instructor, and Student.

## Current project status

This project is a working LMS MVP/core implementation, not a final fully-complete enterprise LMS. The core platform structure, dashboards, role-based access, course flow, assignments, enrollments, notifications, and quizzes are implemented and connected.

The README below reflects the current implementation state of the project as it exists in the codebase.

## Implemented features

### Authentication and access control
- User registration and activation flow.
- Login/logout with JWT + cookie-based auth.
- Role-based route protection for admin, instructor, and student.
- Redis-backed session/user retrieval.
- Admin-level role change management.

### Admin features
- Admin dashboard overview.
- Admin course management.
- Course approval/status handling.
- User management.
- Enrollment monitoring.
- Analytics dashboard cards.
- Announcements management.
- Notifications page.
- Activity log view.
- Categories management.

### Instructor features
- Instructor dashboard.
- Course creation and editing.
- Instructor-owned course listing.
- Student management for assigned courses.
- Assignment creation and grading.
- Quiz creation and results review.
- Course content access control.

### Student features
- Student dashboard.
- Browse and view course list.
- Course content access after enrollment.
- Lesson completion tracking.
- Assignment submission and visibility.
- Quiz taking and attempts.
- Progress tracking.
- Upcoming deadline tracking.

### Course and enrollment system
- Course catalog and details pages.
- Student enrollment flow.
- Instructor/manual enrollment support.
- Course status lifecycle: Draft, Pending Approval, Published, Rejected, Archived.
- Access gating for course content.

### Assignment and quiz system
- Create / edit / delete assignments.
- Submit assignments and grade them.
- Quiz creation with question types and attempt tracking.
- Basic result/score tracking.

### Notifications and announcements
- Announcement posting and listing.
- Notification read flow.
- Notification creation for key events.

## Remaining gaps / not fully completed yet

Certificates, discussions, forgot/reset password, review moderation, analytics and profiles all exist now. What is still open compared with the original specification:

**Content**
- Videos are still links (YouTube / Vimeo etc.); uploading videos and protected video delivery (signed / expiring URLs) is not built. Document materials (PDF / Word / PowerPoint / Excel, 10 MB) are done: stored privately and downloaded only through an enrollment check.
- Materials attach to a course (the model also supports a lesson, but the pages don't pick one yet).
- Certificate PDFs only work for names in Latin letters (Urdu / Hindi / Chinese names fall back to the browser's Print / Save as PDF).
- Departments (only categories exist) and a search filter for course duration.
- Configurable completion requirements per course (the rule is fixed: all lessons + every quiz passed).

**Platform**
- Fine-grained permissions (roles exist; there is no per-permission editor).
- Real-time notifications (Socket.io) - notifications are saved and polled.
- Global instructor pages that gather all students / assignments / quizzes in one place (today an instructor opens them one course at a time; students already have global Assignments and Quizzes pages).
- The old lesson Q&A and the newer Discussions system overlap; one of them should be retired.

**Security follow-ups**
- Refresh tokens are not rotated on every use (they are tied to a login session, which can be ended individually).
- Only pure logic has automated tests (`npm test` in `server/`); there are no API-level integration tests yet.

## Decisions worth knowing

- **Editing a published course** keeps it published - no re-approval (by design).
- **Quiz time limits** are enforced by the server. When time runs out the attempt is used up with a score of 0, whether the student submits late or just leaves (a 10 second grace covers the auto-submit). Quizzes with no time limit are never timed out.
- **Login sessions**: a login ends after 30 minutes with no activity, and never while the person is active (change the 30 with `SESSION_IDLE_MINUTES` in `server/.env`). The website warns a minute before an idle logout. There is no time cap by default; set `SESSION_MAX_HOURS` if you also want everyone logged out that many hours after logging in (the site then warns five minutes before).

## Sample data for the statistics pages

An empty database makes the admin and instructor statistics look empty. This script fills it with realistic activity, written straight into MongoDB (not through the website): six months of sign-ups, enrolments, lesson progress, quiz attempts, assignment grades, reviews, certificates, discussions, payments and the activity log.

```bash
cd server
npm run seed                          # once, if you have no admin yet
npm run seed:stats                    # shows what it would do and changes nothing
npm run seed:stats -- --yes           # add the data
npm run seed:stats -- --yes --reset   # remove what it added, then add it again
npm run seed:stats -- --yes --remove  # just remove it
```

- It adds about 150 students, 6 instructors, 17 courses (12 published, a few pending / draft / archived / rejected) and roughly 350 enrolments. Use `--students=300` for more, and `--seed=7` for a different (but repeatable) set.
- Every seeded account uses the password `Learn@2026` (change it with `SEED_PASSWORD` in `.env`). Instructors: `sana.ahmed@faculty.ledger.example`, `imran.qureshi@...`, and so on. Students: any `...@learners.ledger.example` address.
- The e-mail addresses end in the reserved `.example` domain, so nothing sent by the platform can reach a real person.
- `--remove` deletes only what the script added (those accounts, their courses and everything attached to them). Your own accounts and courses are never touched.
- It refuses to run when `NODE_ENV=production` unless you add `--force`.
- The website keeps the public course list in Redis for a week. After adding or removing data the script clears that cache (the course list and each course page) so Browse courses shows the change at once. If Redis can't be reached it says so, and you can clear it yourself with `redis-cli DEL allCourses`.

## Tech stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Recharts
- Formik + Yup

### Backend
- Node.js
- Express.js
- TypeScript
- MongoDB with Mongoose
- Redis
- JWT authentication
- Cloudinary
- Nodemailer

## Project structure

```text
lms-project/
├── client/                 # Next.js frontend
│   ├── src/
│   ├── package.json
│   ├── .env.local.example
│   └── next.config.ts
├── server/                 # Express API backend
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   └── tsconfig.json
├── README.md
└── .git/
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+
- npm
- MongoDB running locally or remotely
- Redis running locally or via a hosted service
- Cloudinary account
- SMTP credentials for email sending

## Environment setup

### Backend
Create a `.env` file in the `server` folder based on `.env.example`:

```bash
cd server
copy .env.example .env
```

Set values for:

- `DB_URL`
- `REDIS_URL`
- `ACTIVATION_SECRET`
- `ACCESS_TOKEN`
- `REFRESH_TOKEN`
- `CLOUD_NAME`
- `CLOUD_API_KEY`
- `CLOUD_SECRET_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_MAIL`
- `SMTP_PASSWORD`
- `ORIGIN`

### Frontend
Create a `.env.local` file in the `client` folder:

```bash
cd client
copy .env.local.example .env.local
```

Set:

```env
NEXT_PUBLIC_SERVER_URI=http://localhost:8000/api/v1
```

## Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

## Run the project

### Terminal 1: backend

```bash
cd server
npm run dev
```

### Terminal 2: frontend

```bash
cd client
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:8000

## Seed demo data

The project includes a seed script for demo users and sample content.

```bash
cd server
npm run seed
```

Demo users created by the seed script:

- Admin: `admin@ledger.dev` / `admin1234`
- Instructor: `instructor@ledger.dev` / `demo1234`
- Student: `student@ledger.dev` / `demo1234`

## Useful scripts

### Server
```bash
npm run dev
npm run build
npm run start
npm run seed
```

### Client
```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Backend route groups

The server mounts routes under `/api/v1` for:

- users
- courses
- enrollments
- orders
- notifications
- analytics
- announcements
- audit logs
- categories
- assignments
- quizzes

## Notes

- The app uses strict role-based access checks in backend routes.
- Frontend route guards exist for convenience, but the real authorization is enforced by server middleware.
- MongoDB and Redis are required for the full app flow.
- The project is suitable as a strong LMS MVP and can be extended with certificates, discussion forums, and richer analytics.

## License

This project is intended for educational and academic use.
