# RemindMe

Todo API with JWT auth (access token + rotating refresh cookie), task states
(pending / completed / overdue / deleted), an automatic overdue sweep, and
real-time + email notifications (in progress).

## Run locally
npm install
cp .env.example .env   # fill in values
npm run dev

## Known limitations
- Render free tier sleeps after ~15 minutes of no traffic. While asleep the
  overdue sweep can't run, so overdue notifications are delayed until the next
  request wakes the server. Task *state* is still correct: listing tasks runs a
  catch-up sweep for that user first.
- The brief says "username and password only", but email notifications need an
  address, so email is an optional signup field. Users without one get
  real-time notifications only.