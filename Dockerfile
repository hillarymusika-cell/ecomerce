# syntax=docker/dockerfile:1.7

# =============================================================================
# Backend – optimized multi-stage image
#
# Stages:
#   deps     – install Python packages into a venv (cached aggressively)
#   runtime  – slim image with venv + app code only
#
# Build:
#   docker build -t ecomerce-backend .
#   DOCKER_BUILDKIT=1 docker build --target runtime -t ecomerce-backend .
# =============================================================================

ARG PYTHON_VERSION=3.12

# -----------------------------------------------------------------------------
# deps: pure dependency layer (invalidates only when requirements.txt changes)
# -----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-bookworm AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /build

# System build tools only in this stage (not shipped to runtime).
# psycopg2-binary & Pillow ship wheels on manylinux — keep a minimal toolchain
# for the rare sdist fallback.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev

COPY backend/requirements.txt /build/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    python -m venv /opt/venv \
    && pip install --upgrade pip setuptools wheel \
    && pip install -r /build/requirements.txt \
    && find /opt/venv -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true \
    && find /opt/venv -type f -name "*.pyc" -delete 2>/dev/null || true \
    && find /opt/venv -type f -name "*.pyo" -delete 2>/dev/null || true \
    && find /opt/venv -type d -name "tests" -path "*/site-packages/*" -exec rm -rf {} + 2>/dev/null || true \
    && find /opt/venv -type d -name "test" -path "*/site-packages/*" -exec rm -rf {} + 2>/dev/null || true

# -----------------------------------------------------------------------------
# runtime: minimal footprint, non-root, production-ready
# -----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ARG PYTHON_VERSION=3.12

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    APP_HOME=/app \
    DJANGO_SETTINGS_MODULE=project.settings \
    # Prefer bytecode for faster cold starts in the running container
    PYTHONOPTIMIZE=1

# Runtime shared libs only — no compilers, no headers
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
        tini \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app

WORKDIR /app

# venv first (large, changes rarely) then app source (changes often)
COPY --from=deps --chown=app:app /opt/venv /opt/venv

# Copy only what Django needs at runtime (keeps context small + clear intent)
COPY --chown=app:app backend/src/manage.py /app/manage.py
COPY --chown=app:app backend/src/project /app/project
COPY --chown=app:app backend/src/app /app/app
COPY --chown=app:app docker/entrypoint.sh /entrypoint.sh

RUN chmod 755 /entrypoint.sh \
    && DJANGO_SECRET_KEY=build-collectstatic-only \
       DJANGO_DEBUG=False \
       python manage.py collectstatic --noinput \
    && chown -R app:app /app/staticfiles

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health/ || exit 1

ENTRYPOINT ["tini", "--", "/entrypoint.sh"]

# Workers/threads tunable via env at orchestrator level if needed
CMD ["sh", "-c", "gunicorn project.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 --graceful-timeout 30 --access-logfile - --error-logfile - --capture-output"]     
