#!/usr/bin/env bash
# Installed on the VPS as the forced command for the deployment-only SSH key.
set -euo pipefail
umask 077

exec 9>/run/lock/quiz-sp-deploy.lock
flock -w 600 9

project=/opt/quiz-sp
staging=$(mktemp -d /opt/quiz-sp-deploy.XXXXXX)
trap 'rm -rf "$staging"' EXIT
tar -xzf - -C "$staging" --no-same-owner

if [[ "${SSH_ORIGINAL_COMMAND:-deploy-backend}" == "deploy-frontend" ]]; then
  test -f "$staging/dist/index.html"
  test -f /etc/quiz-pages.env
  set -a
  source /etc/quiz-pages.env
  set +a
  rsync -a --delete "$staging/dist/" /var/lib/quiz-pages/site/
  chown -R quiz-pages:quiz-pages /var/lib/quiz-pages/site
  cd /var/lib/quiz-pages
  runuser -u quiz-pages -- env CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
    /opt/quiz-pages-tools/node_modules/.bin/wrangler pages deploy site \
    --project-name lwent --branch main
  exit
fi

[[ "${SSH_ORIGINAL_COMMAND:-deploy-backend}" == "deploy-backend" ]] || { echo 'Unsupported deployment command.'; exit 1; }
test -f "$staging/backend/Dockerfile"
test -f "$staging/compose.production.yaml"
test -f "$project/.env"

mkdir -p "$project/backups"
if docker compose --project-directory "$project" -f "$project/compose.production.yaml" ps --status running --services | grep -qx db; then
  docker compose --project-directory "$project" -f "$project/compose.production.yaml" exec -T db \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    | gzip > "$project/backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
fi

rsync -a --delete --exclude=.env --exclude='.env.*' "$staging/backend/" "$project/backend/"
install -m 600 "$staging/compose.production.yaml" "$project/compose.production.yaml"
cd "$project"
docker compose --progress plain -f compose.production.yaml up -d --build --wait --wait-timeout 180
curl --fail --silent --show-error --retry 5 --retry-delay 3 http://127.0.0.1:8000/health
docker compose -f compose.production.yaml ps
