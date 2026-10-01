#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

image_tag=${1:?Expected image tag}
if [[ ! "$image_tag" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; then
  echo 'Invalid image tag' >&2
  exit 1
fi

cd /home/api
# Prevent overlap with a separately started copy of this script.
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
test -f docker-compose.vps.yml
test -f .main.env
test -f .files.env

candidate=$(mktemp /home/api/.compose-release.XXXXXX.yml)
trap 'rm -f "$candidate"' EXIT
cat > "$candidate" <<YAML
services:
  main:
    image: chites/lumos-main:${image_tag}
  files:
    image: chites/lumos-files:${image_tag}
YAML

compose=(docker compose -f docker-compose.vps.yml -f "$candidate")
"${compose[@]}" config --quiet
"${compose[@]}" pull main files

# Use production environment from Compose, not the development.local npm script.
# Failure here leaves the existing application containers running.
"${compose[@]}" run --rm --no-deps -T main \
  pnpm exec prisma migrate deploy --config apps/main/prisma.config.ts < /dev/null

# Keep the selected images for subsequent manual Compose commands.
if [[ -f docker-compose.release.yml ]]; then
  cp -p docker-compose.release.yml docker-compose.release.previous.yml
fi
mv "$candidate" docker-compose.release.yml
compose=(docker compose -f docker-compose.vps.yml -f docker-compose.release.yml)
"${compose[@]}" up -d --no-deps --wait --wait-timeout 120 main files

# Without application healthchecks this catches only immediate crash loops.
sleep 15
for service in main files; do
  container_id=$("${compose[@]}" ps -q "$service")
  test -n "$container_id"
  state=$(docker inspect --format '{{.State.Status}} {{.RestartCount}}' "$container_id")
  if [[ "$state" != 'running 0' ]]; then
    echo "Service $service failed the startup check: $state" >&2
    exit 1
  fi
done
"${compose[@]}" ps
echo "Deployment completed: $image_tag"