#!/bin/sh
set -eu

echo "[entrypoint] waiting for database (if configured)..."

if [ -n "${DATABASE_URL:-}" ]; then
  # Optional wait-for-db using Python (no extra packages)
  python - <<'PY' || true
import os, sys, time
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "").strip()
if not url:
    sys.exit(0)

try:
    import psycopg2
except ImportError:
    sys.exit(0)

p = urlparse(url)
host = p.hostname or "localhost"
port = p.port or 5432
user = p.username or ""
password = p.password or ""
dbname = (p.path or "/").lstrip("/") or "postgres"

for i in range(30):
    try:
        conn = psycopg2.connect(
            host=host, port=port, user=user, password=password, dbname=dbname,
            connect_timeout=3,
        )
        conn.close()
        print("[entrypoint] database is ready")
        sys.exit(0)
    except Exception as e:
        print(f"[entrypoint] db not ready ({i+1}/30): {e}")
        time.sleep(2)
print("[entrypoint] database wait timed out – continuing anyway")
PY
fi

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  echo "[entrypoint] running migrations..."
  python manage.py migrate --noinput
fi

if [ "${RUN_COLLECTSTATIC:-0}" = "1" ]; then
  echo "[entrypoint] collectstatic..."
  python manage.py collectstatic --noinput
fi

echo "[entrypoint] starting: $*"
exec "$@"
