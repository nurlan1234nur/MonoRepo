#!/usr/bin/env bash
# Серверт ажиллуулна: DockerHub-аас шинэ image татаж, контейнеруудыг шинэчилнэ.
# Ашиглах:  bash ~/nous/scripts/deploy.sh
#   эсвэл:  cd ~/nous && bash scripts/deploy.sh
set -e

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f docker-compose.prod.yml)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose -f docker-compose.prod.yml)
else
  echo "Docker Compose is not installed. Install the Docker Compose plugin or docker-compose."
  exit 1
fi

echo "==> Шинэ image татаж байна..."
"${COMPOSE[@]}" pull

echo "==> Контейнеруудыг шинэчилж байна..."
"${COMPOSE[@]}" up -d

echo "==> Хуучин ашиглагдаагүй image-ийг цэвэрлэж байна..."
docker image prune -f >/dev/null 2>&1 || true

echo "==> Төлөв:"
"${COMPOSE[@]}" ps

echo "==> Server log (сүүлийн 15 мөр):"
"${COMPOSE[@]}" logs --tail 15 server
echo ""
echo "✓ Deploy дууслаа → http://16.171.134.139:8080"
