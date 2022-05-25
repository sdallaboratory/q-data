node build.mjs
docker compose down --rmi local --remove-orphans
docker compose build --no-cache
docker system prune -f
docker compose up --remove-orphans -d 