# LEARNING MANAGEMENT SYSTEM
This repository is a full-stack Learning Management System built with Next.js on the frontend and Express, TypeScript, and MongoDB on the backend. It is designed around three user roles: Admin, Instructor, and Student.
## Current project status
This project is a working LMS MVP/core implementation, not a final, fully complete enterprise LMS. The core platform structure, dashboards, role-based access, course flow, assignments, enrollments, notifications, and quizzes are implemented and connected.
The README below reflects the current implementation state of the project as it exists in the codebase.
## Implemented features
### Authentication and access control
- User registration and activation flow.
- Login/logout with JWT + cookie-based auth.
- Role-based route protection for admin, instructor, and student.
- Redis-backed session/user retrieval.
- Admin-level role change management.
- Refresh tokens are rotated on every use; a refresh token used twice (a copied one) ends that login at once.
- Role permissions: an admin can switch off things a whole role may do (see "Role permissions" below).
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
- Departments: create, rename, delete (refused while a course or instructor is still in it), put instructors in a department.
- Permissions page: switch role permissions on and off.
- Completion rules for any course.
### Instructor features
- Instructor dashboard.
- Course creation and editing.
- Instructor-owned course listing.
- Student management for assigned courses.
- Assignment creation and grading.
- Quiz creation and results review.
- Course content access control.
- Upload a video file for a lesson (kept private; students watch it but can't download it).
- Attach course files to a lesson, or move them later.
- Completion rules: what a student must do to complete a course.
### Student features
- Student dashboard.
- Browse and view course list.
- Course content access after enrollment.
- Lesson completion tracking.
- Assignment submission and visibility.
- Quiz taking and attempts.
- Progress tracking.
- Upcoming deadline tracking.
- Questions about a lesson, right under it (they are course discussions about that lesson).
- The lesson page lists what is still needed for the certificate.
### Course and enrollment system
- Course catalog and details pages.
- Course search with filters for category, department, level, instructor, length ("Up to 2 hours", "2 to 10 hours", "Over 10 hours") and enrollment type.
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
- New notifications appear at once (Socket.io); the bell still re-checks now and then in case the live connection drops.
## Remaining gaps / not fully completed yet
Everything on the original list is now built. What is left is mostly verification and polish:
- **Not yet run against a real database.** The latest features (completion rules, permissions, video upload, real-time notifications, Urdu/Hindi certificate PDFs, lesson questions in Discussions, refresh-token rotation) were written and unit-tested without a running MongoDB, Cloudinary account or browser. Run the live API tests and the e2e suite (see "Tests") before relying on them.
- **Urdu/Hindi certificate PDFs** need the free Noto fonts copied into `server/fonts/` (see `server/fonts/README.md`). A name that mixes scripts (e.g. "Ali علی") still falls back to the browser's Print / Save as PDF.
- **Uploaded videos** pass through this server while they play (so the storage address stays secret). That is fine for a class or a school; for many viewers at once, a CDN with signed URLs (a paid Cloudinary feature) would take the load off.
- **Real-time notifications** assume one server process. Running several behind a load balancer needs the Socket.io Redis adapter.
- **Permissions** are per role, not per person.
## Decisions worth knowing
- **Editing a published course** keeps it published - no re-approval (by design).
- **Quiz time limits** are enforced by the server. When time runs out the attempt is used up with a score of 0, whether the student submits late or just leaves (a 10 second grace covers the auto-submit). Quizzes with no time limit are never timed out.
- **Completion rules**: a course without its own rules uses the original rule (every lesson, every quiz passed, assignments optional). Changing a course's rules never takes back certificates already issued; students who now qualify get theirs the next time they open the course. A course's "Completed" badge in My courses still means "every lesson finished"; the certificate follows the rules.
- **Role permissions** start with everything allowed, and admins can always do everything, so nobody can lock the platform out. Switching something off doesn't touch what people already made.
- **Lesson questions are Discussions**: the old per-lesson Q&A was retired. `npm run migrate:lesson-questions` copies old questions (with answers, names and dates) into threads about their lesson; see "Upgrading an existing database".
- **Refresh-token rotation** allows 20 seconds of overlap, so two tabs refreshing at the same moment both stay logged in.
- **Login sessions**: a login ends after 30 minutes with no activity, and never while the person is active (change the 30 with `SESSION_IDLE_MINUTES` in `server/.env`). The website warns a minute before an idle logout. There is no time cap by default; set `SESSION_MAX_HOURS` if you also want everyone logged out that many hours after logging in (the site then warns five minutes before).
## Departments and course length
- A **department** (e.g. Computer Science, Business School) is optional on both courses and instructors. Admins manage them under **Admin → Departments** and put instructors in one under **Admin → Instructors**.
- When an **instructor** creates a course and leaves the department as "No department", the course goes into the instructor's own department. An admin's "No department" is kept as is. Editing a course to "No department" takes it out of its department.
- A department can only be deleted once no course and no instructor belongs to it. Renaming one updates cached course pages straight away.
- A course's **length** is the "Total duration (hours)" the instructor typed in the course form. Only when that is empty is it the sum of the lessons' video minutes. Search cards and the course page show it, and the length filter uses it. A course with no known length (neither) is left out when a length filter is chosen.
- Length buckets: up to 2 hours (2 h exactly included), more than 2 up to 10 hours (10 h exactly included), over 10 hours.
- After deploying this change, clear the course cache once so older cached course pages pick up the department and length: `redis-cli DEL allCourses` (course pages expire on their own within a week, or run `npm run seed:stats -- --yes --reset` on a dev database, which clears them).
## Role permissions
Under **Admin → Permissions** an admin can switch off, for every instructor or every student at once:
- Instructors: create courses, edit their courses, submit courses for approval, manage course files, assignments, quizzes and announcements, enroll and remove students, reply to reviews.
- Students: enroll in or buy courses themselves, post in discussions, write reviews, flag posts.
Everything is on until switched off, and admins are never limited. A blocked request gets `403` with code `PERMISSION_DENIED` and a plain reason, and the website hides buttons a role can't use.
## Completion rules
Each course can say what completes it (**Completion rules** on the instructor dashboard, or **Rules** in Admin → All courses):
- the share of lessons to finish (1-100%),
- every quiz, only chosen quizzes, or none,
- assignments optional, every assignment submitted, or every assignment passed at a pass mark (a share of its marks).
The certificate is issued as soon as a student meets the rules (after a lesson, a quiz pass, a submission or a grade), and the lesson page lists what is still missing.
## Lesson videos
Besides a video link (YouTube, Vimeo, an .mp4 address), a saved lesson can have an **uploaded video file** (Edit course → the lesson → Upload video). It goes from the browser straight to Cloudinary in 20 MB pieces, signed by the server and stored privately; the server checks the result before attaching it. Students get a link that works only for them, for that lesson, for two hours; the server checks their access on every request and streams the video (seeking works). Removing the lesson or the course deletes the video from storage.
Settings in `server/.env` (all optional): `VIDEO_MAX_MB` (default 500), `VIDEO_MAX_MINUTES` (240), `VIDEO_LINK_MINUTES` (120), `VIDEO_TOKEN_SECRET` (defaults to one derived from `ACCESS_TOKEN`). Your Cloudinary plan's own upload limits also apply (the free plan allows 100 MB per video).
## Certificate PDFs in Urdu and Hindi
Certificate PDFs use built-in fonts for Latin names. Copy the Noto Naskh Arabic and Noto Sans Devanagari font files into `server/fonts/` (instructions and links in `server/fonts/README.md`) and names in Urdu/Arabic script and Hindi/Devanagari are drawn with them. Without the fonts those certificates use the browser's Print / Save as PDF, as before.
## Upgrading an existing database
After pulling these changes:
```bash
cd server && npm install && cd ../client && npm install     # new packages: socket.io, socket.io-client, test tools
cd ../server
npm run migrate:lesson-questions             # copy old lesson Q&A into Discussions (safe to re-run)
npm run migrate:lesson-questions -- --clear  # then remove the old Q&A from lessons
redis-cli DEL allCourses                     # refresh cached course pages
```
Commit the updated `package-lock.json` files. Logins from before refresh-token rotation keep working; their next refresh starts rotating.
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
- It adds about 150 students, 6 instructors, 17 courses (12 published, a few pending / draft / archived / rejected) and roughly 350 enrolments. It also creates four departments (Computer Science, Data & Analytics, Business School, Arts & Design), puts every instructor in one, and every course in its instructor's department, with one course in a different department and one published course with none, so the filters have edge cases to show. Use `--students=300` for more, and `--seed=7` for a different (but repeatable) set.
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
```bash
cd server
npm run seed              # only the admin account: admin@ledger.dev / admin1234
npm run seed -- --demo    # also demo users and three sample courses (development only)
```
With `--demo` it also creates:
- Instructor: `instructor@ledger.dev` / `demo1234`
- Student: `student@ledger.dev` / `demo1234`
- categories, the departments Computer Science, Business School and Arts & Design (the demo instructor goes in Computer Science unless they already have a department), and three sample courses, each with a category and a department.
For realistic statistics (150 students, 6 instructors, 17 courses), use `npm run seed:stats` instead or as well; see "Sample data for the statistics pages".
## Useful scripts
### Server
```bash
npm run dev
npm run build
npm run start
npm run seed                      # admin only; add -- --demo for demo users and courses
npm run seed:stats -- --yes       # realistic sample activity
npm run migrate:lesson-questions  # old lesson Q&A -> Discussions
npm test                          # unit tests
npm run test:api                  # live API tests - see "Tests" below
```
### Client
```bash
npm run dev
npm run build
npm run start
npm run lint
npm test            # unit + component tests - see "Tests" below
```
## Tests
**Unit tests** - `cd server && npm test`, `cd client && npm test` (the client's include component tests in jsdom). CI runs both, plus type-checks.
**Live API tests** - run against a real server, comparing answers with what MongoDB holds: departments and search filters, refresh-token rotation, role permissions, protected video links, and real-time notifications.
```bash
cd server
npm run seed
npm run seed:stats -- --yes --reset
npm run dev                 # in another terminal
npm run test:api            # API_URL defaults to http://localhost:8000/api/v1
```
They log in as `admin@ledger.dev` / `admin1234` (override with `API_ADMIN_EMAIL` / `API_ADMIN_PASSWORD`) and as seeded people. Records they create are named `zz-api-test…` and removed; anything they change (an instructor's department, permissions) is put back. The video test streams a real video only when `API_VIDEO_COURSE` and `API_VIDEO_LESSON` point at a lesson with an uploaded video.
**End-to-end tests** - Playwright drives the website in Chromium (desktop and phone): see `e2e/README.md`.
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
- departments
- assignments
- quizzes
- certificates, discussions, reviews, reports, materials, settings
- permissions
- lesson videos (upload, watch links, streaming)
Real-time events use Socket.io on the same host and port as the API.
## Notes
- The app uses strict role-based access checks in backend routes.
- Frontend route guards exist for convenience, but the real authorization is enforced by server middleware.
- MongoDB and Redis are required for the full app flow.
- Socket.io shares the API's port; behind a proxy, allow WebSocket upgrades for it.
## License
This project is intended for educational and academic use.
