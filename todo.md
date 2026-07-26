# Bench Press Tracker — TODO

- [x] Initial static app with Iron Lab dark industrial design
- [x] Set logging (weight + reps), volume calculation, animated numbers
- [x] 100-rep goal progress bar with glowing fill
- [x] Session history panel with comparison vs last session
- [x] Trophy/goal-met banner when 100 reps reached
- [x] Upgrade to full-stack (tRPC + MySQL database + Manus OAuth)
- [x] Database schema: workout_sessions and workout_sets tables
- [x] Backend API routes: getTodaySession, getSessions, addSet, deleteSet, resetToday
- [x] Frontend migrated from localStorage to tRPC API calls
- [x] Login gate for unauthenticated users
- [x] Pre-loaded Jeff's two sets (45×20, 95×15) into database
- [x] Vitest tests for all workout router procedures (6 tests passing)
- [ ] Remove mandatory login — allow guest use with localStorage, optional login for cloud sync
- [ ] Restore Jeff's completed 100-rep session (today's date, all sets)
