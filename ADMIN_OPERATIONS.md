# Administration

Open `/admin/analytics` as an ADMIN. Sidebar pages cover overview, accounts,
recently active users, sessions, activity, security/configuration, server health,
practice reports, notices, and the existing backup/restore screen.

## Charts and account metrics

- Overview supports 7, 30 and 90 days. Charts and CSV exports use UTC dates.
- Account charts count records currently present in `users`, including locked
  accounts. Growth reconstructs creation dates of those records, not deleted users.
- Enabled accounts are labelled “Được phép truy cập”; this is not an online count.
- Recently active users are distinct users with a valid tracked session and an
  authenticated request in the last ten minutes. Notification polling does not
  extend activity/idle timestamps. The activity list refreshes every 30 seconds.
- Practice reports include submitted/graded student attempts only. Percentage
  distributions exclude attempts with a zero maximum score.

## Enforcement

- All operational routes are ADMIN-only; inbox routes use the signed-in user's
  audience. Account creation only permits ADMIN/STUDENT.
- Persisted policy controls registration, session duration, idle expiry, failed
  login window/threshold, and temporary lock duration. Session duration changes
  apply at the next login; idle limits apply on subsequent authenticated requests.
- New logins issue tokens linked to a database session. Revocation/logout rejects
  access and refresh tokens from that session. Password reset invalidates all
  tokens via password fingerprint and revokes tracked sessions.
- Tokens from before session tracking remain valid until their original expiry;
  refresh migrates them into a tracked session. Password reset invalidates legacy
  tokens immediately. The session page explicitly describes this transition.
- Only session metadata, identifiers and action outcomes are logged. Passwords,
  credential hashes, JWTs, raw IPs and request bodies are not returned in admin logs.
- Existing infrastructure security and SMTP credentials remain environment-only.
  This UI does not claim to implement 2FA, Google SSO, scheduled backups, or SMTP
  administration merely by presenting nonfunctional switches.

## Data and verification

New tables are created by the existing `app.seed` startup step; no existing user
columns are rewritten. Operational tables are included in database backups.
Older backups can omit these new tables and initialize them empty on restore.
Health metrics describe what the backend process sees, not guaranteed container
or VPS resource quotas.

Run backend tests with a private signing key supplied through the environment:
`python -m pytest -q -k 'not trio'` from `backend`, and build with
`npm --prefix frontend run build`. Do not use production credentials in tests.
