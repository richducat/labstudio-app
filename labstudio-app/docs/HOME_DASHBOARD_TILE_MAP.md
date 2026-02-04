# LabStudio — Home Dashboard (Tile Map)

This doc inventories every Home dashboard widget and its backing data source.

## Data sources
- Primary: `GET /api/lab/home`
- Secondary (coach focus): `GET/POST /api/lab/coach-focus`

## Widgets

### Next Mission
- Source: `home.nextBooking` + `home.upcomingBookings`
- Backing: iCal feed (`LABSTUDIO_BOOKINGS_ICAL_URL`)

### Coach Plan — Today’s Focus
- Source: `/api/lab/coach-focus`
- Backing: `lab_coach_focus`

### Current Rank (Level/XP)
- Source: server-rendered initial props from `/members` (DB)
- Backing: `lab_users` (`xp`, `level`)

### Profile header (name/goal/weight/BF)
- Goal: `home.profile.goal` → `lab_user_profile.goal`
- Weight/BF: `home.latestStats` → latest row in `lab_daily_stats`

### Nutrition Today
- Source: `home.nutrition` (today ET)
- Backing: `lab_nutrition_log`

### Session Log
- Booked (next 30d): iCal
- Completed (last 7d): `lab_workout_log`
- Missed (approx 30d): iCal past 30d – workouts completed 7d

### Workouts (Completed last 7 days)
- Source: `home.recentWorkouts`
- Backing: `lab_workout_log`

### Daily Check-in (Quick Log)
- Writes:
  - `POST /api/lab/daily-stats` → `lab_daily_stats`
  - `POST /api/lab/progress-photos` → `lab_progress_photos`
- Refresh: re-fetch `GET /api/lab/home`

### My Progress tiles
- Weight: `home.latestStats.weight_lbs`
- Body Fat: `home.latestStats.body_fat_pct`
- Resting HR: `home.latestStats.resting_hr`
- Progress Photos (30d): `home.progress.photos30d` → `lab_progress_photos`
- Nutrition Avg (7d): `home.progress.calories7dAvg` → computed from `lab_nutrition_log`
- Strength PRs: `home.progress.latestPr` → `lab_strength_prs`
