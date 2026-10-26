# End-to-end tests

Playwright drives the real website in Chromium: departments, catalogue
filters, permissions, lesson questions, completion rules, and the phone menu.

They need the whole app running with seeded data:

```bash
# terminal 1
cd server
npm run seed                          # admin account
npm run seed:stats -- --yes --reset   # departments, instructors, courses, students
npm run dev

# terminal 2
cd client && npm run dev

# terminal 3
cd e2e
npm install
npm run install-browsers              # once: downloads Chromium
DB_URL=mongodb://localhost:27017/lms npm test
```

Settings (environment variables): `E2E_BASE_URL` (default
`http://localhost:3000`), `E2E_API_URL` (default `http://localhost:8000/api/v1`),
`DB_URL` (same database as the server), `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`, `SEED_PASSWORD`.

Records the tests create are named `zz-e2e…` and removed afterwards; anything
they change (permissions, a course's completion rules) is put back.
