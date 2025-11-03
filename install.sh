#!/bin/bash
set -e
APP_DIR="/opt/advent-friends"
BACKUP_DIR="/opt/advent-friends-backups"

echo "📦 Instalacja Wyzwanie Świąteczne 2025 (v7 - uproszczony login)"

sudo mkdir -p "$BACKUP_DIR"

if [ -d "$APP_DIR" ]; then
  TS=$(date +"%Y%m%d-%H%M%S")
  BKP="$BACKUP_DIR/advent-friends-$TS.tar.gz"
  echo "🟡 Istniejąca instalacja – robię kopię: $BKP"
  sudo tar czf "$BKP" -C /opt advent-friends
  echo "✅ Kopia zapasowa zapisana."
fi

sudo mkdir -p "$APP_DIR"
sudo chown "$USER":"$USER" "$APP_DIR"

cp -R ./* "$APP_DIR"/

cd "$APP_DIR"

npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run build:css || true

echo "✅ Gotowe. Uruchom: npm run dev  (albo: pm2 start server.js --name advent-friends)"
