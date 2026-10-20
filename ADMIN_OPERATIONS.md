# Administration

Open `/admin/analytics` as an ADMIN. Sidebar pages cover overview, accounts,
recently active users, sessions, activity, security/configuration, server health,
practice reports, notices, and the existing backup/restore screen.

## Charts and account metrics

- Overview supports 7, 30 and 90 days. Charts and CSV exports use UTC dates.
- Account charts count records currently present in `users`, including locked
  accounts. Growth reconstructs creation dates of those records, not deleted users.
- Enabled accounts are labelled “Được phép truy cập”; this is not an online count.
- Online users are distinct users with a visible-tab presence heartbeat. Tabs
  send heartbeats every 15 seconds and signal hiding/closing independently.
  Admins receive snapshots over authenticated SSE every three seconds; abrupt
  disconnections expire after 45 seconds. Background presence and notification
  traffic does not extend the authentication idle timeout.
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
- Security policy, AI and SMTP controls share the Bảo mật & cấu hình admin page.
  Legacy AI/email tab links redirect to this shared page. Non-secret settings are
  persisted in the database; credentials are write-only and stored encrypted in
  a private environment file in a separate Docker volume, outside public media
  and DB backups. The environment-only SECRET_KEY derives domain-separated
  encryption keys. Preserve that key and the private volume across rebuilds;
  changing the master key requires re-entering integration credentials.
- AI settings apply to both tutor endpoints. AI tests make one model request;
  SMTP tests send only to the administrator-specified address using verified
  SSL/TLS or STARTTLS. Blank secret inputs preserve the existing credential.
- The UI does not claim to implement 2FA, Google SSO or scheduled backups.
- New self-registered and administrator-created accounts receive a single-use
  email verification link valid for 24 hours. Login is blocked until confirmation;
  existing accounts remain usable. Resending is limited to once per minute per
  account and rotates the token. Only the token hash is stored in the database.
  SMTP must be configured before creating accounts; delivery failure rolls back
  creation. `PUBLIC_APP_URL` is the trusted frontend address for these links
  (local default `http://localhost:5173`; production compose uses the website).
  Opening the link does not consume it: users explicitly confirm on the page.
- Both roles open profile and logout actions through the avatar dropdown.

## Data and verification

New tables are created by the existing `app.seed` startup step; no existing user
columns are rewritten. Operational tables are included in database backups.
Older backups can omit these new tables and initialize them empty on restore.
Health metrics describe what the backend process sees, not guaranteed container
or VPS resource quotas.

Run backend tests with a private signing key supplied through the environment:
`python -m pytest -q -k 'not trio'` from `backend`, and build with
`npm --prefix frontend run build`. Do not use production credentials in tests.
