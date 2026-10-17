# Production deployment

Frontend: Cloudflare Pages project `lwent`. Backend and PostgreSQL: Docker Compose on the VPS.

## GitHub Actions

`.github/workflows/deploy.yml` tests the backend and builds the frontend on pull requests. Pushes to `main` and manual workflow runs also deploy the backend and then publish the frontend.

Repository variables:

- `VPS_HOST`: VPS address.
- `VITE_API_URL`: public HTTPS API URL ending in `/quiz/api/v1`.
- `CLOUDFLARE_ACCOUNT_ID`: account owning the Pages project.

Repository secrets:

- `VPS_SSH_KEY`: dedicated deployment SSH private key.
- `VPS_KNOWN_HOSTS`: verified SSH host-key entry.
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Account / Cloudflare Pages / Edit permission.

Credentials and server addresses are configured in GitHub settings and ignored environment files, never in tracked application source. The Pages token is separate from local Wrangler browser login.

## VPS setup

Keep runtime credentials in `/opt/quiz-sp/.env` with mode `0600`. Configure `POSTGRES_SERVER=db`, `POSTGRES_PORT=5432`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, a random `SECRET_KEY`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, optional `ADMIN_LOGIN_USERNAME`, and `CORS_ORIGINS` as a JSON list of allowed frontend origins.

Install `scripts/deploy-backend.sh` as `/usr/local/sbin/quiz-sp-actions-deploy`, owned by root and executable only by root. Restrict the deployment key in `authorized_keys` with `restrict,command="/usr/local/sbin/quiz-sp-actions-deploy"`. The deployment helper accepts a source archive over SSH stdin, backs up PostgreSQL, updates backend source, builds Docker, and waits for health checks. It preserves `.env` and named data volumes.

```sh
cd /opt/quiz-sp
docker compose -f compose.production.yaml up -d --build --wait
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml logs --tail 100 backend
```

The API listens only on VPS loopback port 8000. PostgreSQL has no published host port. Configure Nginx HTTPS to proxy `/quiz/` to `http://127.0.0.1:8000/`, stripping the prefix and forwarding the original host and scheme. The API runs with root path `/quiz`; health is `/quiz/health`.

Database and uploaded media persist in named volumes. Never use `docker compose down --volumes` unless deliberately deleting all application data. Pre-deployment backups are stored privately under `/opt/quiz-sp/backups/`.

## Empty initial data

Startup initializes tables and creates the first administrator on an empty database. No courses, topics, lessons, questions, or quizzes are inserted automatically. Content appears only after an administrator creates or imports it. Restarting or deploying preserves existing data and passwords.

Changing this startup behavior does not delete old data; removing previously seeded records is a separate operation with a backup.

## Local frontend build

Set the public API URL in ignored `frontend/.env.production` using `VITE_API_URL`. Vite bundles this public address, so no secrets may go into Vite variables.

```sh
cd frontend
npm ci
npm run build
npx wrangler pages deploy dist --project-name lwent --branch main
```
