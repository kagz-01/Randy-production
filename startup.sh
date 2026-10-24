#!/bin/sh
set -eu
cd "$(dirname "$0")"
PORT=8080
HEALTH_URL="http://127.0.0.1:${PORT}/"

node scripts/preview.mjs stop >/dev/null 2>&1 || true

if curl -fsS --max-time 3 "$HEALTH_URL" | grep -qi 'Randy Production'; then
  exit 0
fi

if command -v ss >/dev/null 2>&1; then
  pids=$(ss -lntp "sport = :${PORT}" 2>/dev/null | awk 'NR > 1 {print $NF}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u || true)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true); do
    kill "$pid" 2>/dev/null || true
    kill -9 "$pid" 2>/dev/null || true
  done
fi

# Clear stale Vite processes from older workspaces that may still be holding 8080.
for pid in $(ps -eo pid,cmd --no-headers | awk '$0 ~ /vite dev --host 0.0.0.0 --port 8080/ || $0 ~ /0.0.0.0 --port 8080/ {print $1}' | sort -u 2>/dev/null || true); do
  kill "$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true
done

nohup npm run dev >>/tmp/app-startup.log 2>&1 &

for _ in $(seq 1 90); do
  if curl -fsS --max-time 3 "$HEALTH_URL" | grep -qi 'Randy Production'; then
    exit 0
  fi
  sleep 1
done

echo 'Randy Production did not come up on port 8080' >&2
exit 1
