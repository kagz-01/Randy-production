#!/bin/sh
set -eu
cd "$(dirname "$0")"
PORT=8080
HEALTH_URL="http://127.0.0.1:${PORT}/"

if curl -fsS --max-time 3 "$HEALTH_URL" | grep -qi 'Randy Production'; then
  exit 0
fi

nohup npm run dev:fixtures -- admin >>/tmp/app-startup.log 2>&1 &

for _ in $(seq 1 90); do
  if curl -fsS --max-time 3 "$HEALTH_URL" | grep -qi 'Randy Production'; then
    exit 0
  fi
  sleep 1
done

echo 'Randy Production did not come up on port 8080' >&2
exit 1
