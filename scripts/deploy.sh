#!/usr/bin/env bash
# Серверт ажиллуулна: DockerHub-аас шинэ image татаж, контейнеруудыг шинэчилнэ.
# Ашиглах:  bash ~/nous/scripts/deploy.sh
#   эсвэл:  cd ~/nous && bash scripts/deploy.sh
set -e

SERVER_IMAGE="${SERVER_IMAGE:-nurlannn/love-server:latest}"
CLIENT_IMAGE="${CLIENT_IMAGE:-nurlannn/love-client:latest}"
NETWORK_NAME="${NETWORK_NAME:-nous-net}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-nous_uploads}"

run_compose_deploy() {
  local compose_cmd=("$@")

  echo "==> Шинэ image татаж байна..."
  "${compose_cmd[@]}" pull

  echo "==> Контейнеруудыг шинэчилж байна..."
  "${compose_cmd[@]}" up -d

  echo "==> Төлөв:"
  "${compose_cmd[@]}" ps

  echo "==> Server log (сүүлийн 15 мөр):"
  "${compose_cmd[@]}" logs --tail 15 server
}

run_docker_deploy() {
  echo "==> Docker Compose олдсонгүй. Шууд Docker run fallback ашиглаж байна..."

  test -f server/.env || {
    echo "server/.env файл олдсонгүй."
    exit 1
  }

  echo "==> Шинэ image татаж байна..."
  docker pull "$SERVER_IMAGE"
  docker pull "$CLIENT_IMAGE"

  echo "==> Network/volume бэлдэж байна..."
  docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true
  docker volume create "$UPLOADS_VOLUME" >/dev/null

  echo "==> Хуучин container-уудыг зогсоож байна..."
  docker rm -f nous-client nous-server >/dev/null 2>&1 || true

  echo "==> Server container асааж байна..."
  docker run -d \
    --name nous-server \
    --network "$NETWORK_NAME" \
    --network-alias server \
    --env-file server/.env \
    -e PORT=4000 \
    -v "$UPLOADS_VOLUME:/app/uploads" \
    --restart unless-stopped \
    "$SERVER_IMAGE"

  echo "==> Client container асааж байна..."
  docker run -d \
    --name nous-client \
    --network "$NETWORK_NAME" \
    -p 8080:80 \
    --restart unless-stopped \
    "$CLIENT_IMAGE"

  echo "==> Төлөв:"
  docker ps --filter "name=nous-"

  echo "==> Server log (сүүлийн 15 мөр):"
  docker logs --tail 15 nous-server
}

if docker compose version >/dev/null 2>&1; then
  run_compose_deploy docker compose -f docker-compose.prod.yml
elif command -v docker-compose >/dev/null 2>&1; then
  run_compose_deploy docker-compose -f docker-compose.prod.yml
else
  run_docker_deploy
fi

echo "==> Хуучин ашиглагдаагүй image-ийг цэвэрлэж байна..."
docker image prune -f >/dev/null 2>&1 || true
echo ""
echo "✓ Deploy дууслаа → http://16.171.134.139:8080"
