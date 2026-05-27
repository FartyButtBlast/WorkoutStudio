# WorkoutStudio

A browser-ready SaaS prototype for building, tracking, and reviewing workouts across desktop and mobile.

## Run it

Serve the folder locally:

```sh
npm start
```

Then visit `http://127.0.0.1:5174`.

Do not open `index.html` directly with a `file://` URL. Supabase authentication and cross-device sync need the app to run from a web address.

## Supabase setup

Authentication is wired to Supabase. To sync workouts, custom activities, and sessions across devices, run `supabase-schema.sql` in the Supabase SQL Editor for the connected project.

The schema creates:

- `workoutstudio_profiles`
- `workoutstudio_workouts`
- `workoutstudio_custom_activities`
- `workoutstudio_sessions`

Each table has row-level security so signed-in users can only access their own data.

## Included

- Supabase registration, email confirmation, logon, password recovery, and sign out.
- Cross-device cloud sync for each user's workouts, custom activities, and completed sessions once the schema is installed.
- Create, update, delete, and list workout templates.
- Built-in TrainingPeaks exercise library with searchable tags and exercise instructions.
- Workout session timer with sets, reps, time, distance, and load entry.
- Previous best metrics per activity.
- Completion summary with muscles worked and a simple human body map.

## Production Notes

Next production steps:

- Move Supabase project URL and public anon key into environment-specific config for each deployment.
- Add hosted deployment previews and production build tooling.
- Add account settings, profile management, and data export/delete controls.
- Add deeper analytics over session history for progress charts, personal records, and training load trends.
