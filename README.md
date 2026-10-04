# LMS Project

This repository is a full-stack Learning Management System built with Next.js on the frontend and Express + TypeScript + MongoDB on the backend. It is designed around three user roles: Admin, Instructor, and Student.

## Current project status

This project is a working LMS MVP/core implementation, not a final fully-complete enterprise LMS. The core platform structure, dashboards, role-based access, course flow, assignments, enrollments, notifications, and quizzes are implemented and connected.

The README below reflects the current implementation state of the project as it exists in the codebase.

## Implemented features

### Authentication and access control
- User registration and activation flow
- Login/logout with JWT + cookie-based auth
- Role-based route protection for admin, instructor, and student
- Redis-backed session/user retrieval
- Admin-level role change management

### Admin features
- Admin dashboard overview
- Admin course management
- Course approval/status handling
- User management
- Enrollment monitoring
- Analytics dashboard cards
- Announcements management
- Notifications page
- Activity log view
- Categories management

### Instructor features
- Instructor dashboard
- Course creation and editing
- Instructor-owned course listing
- Student management for assigned courses
- Assignment creation and grading
- Quiz creation and results review
- Course content access control

### Student features
- Student dashboard
- Browse and view course list
- Course content access after enrollment
- Lesson completion tracking
- Assignment submission and visibility
- Quiz taking and attempts
- Progress tracking
- Upcoming deadline tracking

### Course and enrollment system
- Course catalog and details pages
- Student enrollment flow
- Instructor/manual enrollment support
- Course status lifecycle: Draft, Pending Approval, Published, Rejected, Archived
- Access gating for course content

### Assignment and quiz system
- Create / edit / delete assignments
- Submit assignments and grade them
- Quiz creation with question types and attempt tracking
- Basic result/score tracking

### Notifications and announcements
- Announcement posting and listing
- Notification read flow
- Notification creation for key events

## Remaining gaps / not fully completed yet

The following items from the original assignment specification are still not fully implemented in this project:

- Certificate generation and certificate pages
- Full discussion/forum system for courses
- Forgot password and reset password flow
- Full review moderation workflow
- Advanced analytics and reports beyond basic dashboard counts
- Full admin/instructor/student profile management pages
- Complete end-to-end email verification/reset UX

These are the next major features to implement if the project is to match the original full-scale LMS specification closely.

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
