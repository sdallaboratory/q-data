docker compose down --rmi local --remove-orphans
docker system prune -f
docker compose up --remove-orphans -d 