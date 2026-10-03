# Learning Management System (LMS)

A full-stack learning management system built with Next.js on the frontend and Express + TypeScript + MongoDB on the backend. The platform is designed for course delivery, user management, instructor workflows, analytics, notifications, and role-based access.

## Overview

This project includes:

- Student-facing course browsing and enrollment flows.
- Instructor dashboard for course and content management.
- Admin dashboard for platform oversight and analytics.
- Role-based authentication and access control.
- Course, order, announcement, and notification APIs.
- Redis-backed caching support and MongoDB persistence.
- Email-based account activation and notifications.
- Cloudinary integration for media uploads.

## Tech Stack

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

## Project Structure

```text
lms-project/
├── client/                  # Next.js frontend
│   ├── src/
│   ├── package.json
│   ├── .env.local.example
│   └── next.config.ts
├── server/                  # Express API backend
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   └── tsconfig.json
├── README.md
├── rbac-phase1.patch
└── .git/
```

## Key Features

- Authentication and account activation
- Role-based access for admin, instructor, and student users
- Course catalog and course detail pages
- Order and enrollment management
- Dashboard analytics
- Announcement and notification system
- Audit log tracking
- Secure cookie-based session handling

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or later
- npm
- MongoDB running locally or remotely
- Redis running locally or via a hosted service
- Cloudinary account for media uploads
- SMTP credentials for email sending

## Environment Setup

### 1. Backend environment

Create a `.env` file in the `server` folder based on `.env.example`:

```bash
cd server
copy .env.example .env
```

Update the values for:

- `DB_URL`
- `REDIS_URL`
- `ACTIVATION_SECRET`
- `ACCESS_TOKEN`
- `REFRESH_TOKEN`
- `CLOUD_NAME`
- `CLOUD_API_KEY`
- `CLOUD_SECRET_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_MAIL`, `SMTP_PASSWORD`
- `ORIGIN` (frontend URL, usually `http://localhost:3000`)

### 2. Frontend environment

Create a `.env.local` file in the `client` folder based on `.env.local.example`:

```bash
cd client
copy .env.local.example .env.local
```

Set the frontend API URL:

```env
NEXT_PUBLIC_SERVER_URI=http://localhost:8000/api/v1
```

## Installation

Install dependencies for both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Running the Project

Open two terminals.

### Terminal 1: Start backend

```bash
cd server
npm run dev
```

The backend runs on:

- http://localhost:8000

### Terminal 2: Start frontend

```bash
cd client
npm run dev
```

The frontend runs on:

- http://localhost:3000

## Optional Data Seeding

If the project includes seed data for demo users or sample content, run:

```bash
cd server
npm run seed
```

## Production Build

Frontend:

```bash
cd client
npm run build
npm run start
```

Backend:

```bash
cd server
npm run build
npm run start
```

## Available Backend API Areas

The server mounts routes under `/api/v1` for:

- users
- courses
- orders
- notifications
- analytics
- layout data
- announcements
- audit logs

## Notes

- The frontend and backend are intentionally separated for clean API boundaries.
- The backend uses CORS validation with `ORIGIN` from the environment.
- JWT tokens, cookies, and cloud uploads are configured through environment variables.
- Redis and MongoDB are required for the full application flow.

## License

This project is for educational and academic use.
