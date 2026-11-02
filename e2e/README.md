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

## Visual (screenshot) tests

These are separate from the suite above and need **no server, database or
seeded data**: they open the built client and answer every API call with fixed
fake data (`visual/mocks.ts`). They compare screenshots of the home, about,
login and sign-up pages (light and dark, desktop and phone) and the open phone
menu, and check that the loading screen plays only once per session.

```bash
cd client && NEXT_PUBLIC_SERVER_URI=http://localhost:8000/api/v1 npm run build
cd ../e2e
npm ci && npm run install-browsers
npm run test:visual            # compare with the saved screenshots
npm run test:visual:update     # save new ones after a change you meant to make
```

Screenshots depend on fonts and the operating system, so the saved ones come
from CI: open the **Actions** tab, pick *Update visual baselines*, and run it on
your branch. It commits the images to `e2e/visual/` - look at them in the pull
request before merging. Until the first images exist, the `visual` CI job is
skipped.
