# WorkoutStudio

A browser-ready prototype for a multi-user weight training SaaS product.

## Run it

Open `index.html` directly in a browser, or serve the folder locally:

```sh
python3 -m http.server 5173
```

Then visit `http://127.0.0.1:5173`.

## Demo login

- Email: `demo@workoutstudio.local`
- Password: `demo123`

## Included

- User registration, simulated email verification, logon, and password reset flow.
- Multiple users with separate workout templates and sessions in browser storage.
- Create, update, delete, and list workout templates.
- Seeded activity library for stretching, cardio, and weight lifting.
- Workout session timer with sets, reps, time, distance, and load entry.
- Previous best metrics per activity.
- Completion summary with muscles worked and a simple human body map.

## Production Notes

This is a front-end prototype. To turn it into a real SaaS product, replace the local browser store with a backend and add:

- Auth provider or server-managed auth with real email verification and password reset.
- Database tables for tenants, users, activities, workouts, workout activities, sessions, and session entries.
- Server-side authorization so users can only access their own data.
- A curated exercise taxonomy and muscle mapping source rather than the starter activity list.
- Analytics over session history for progress charts, personal records, and training load trends.
